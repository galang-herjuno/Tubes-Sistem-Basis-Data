const express = require('express');
const router = express.Router();
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authMiddleware, authorizeRole } = require('../middlewares/auth');

// Get Recent Transactions with Details
router.get('/api/transactions', authMiddleware, authorizeRole('Admin', 'Resepsionis'), async (req, res) => {
    try {
        const query = `
            SELECT t.*, p.nama_pemilik 
            FROM transaksi t 
            LEFT JOIN pemilik p ON t.id_pemilik = p.id_pemilik 
            ORDER BY t.tgl_transaksi DESC
            LIMIT 50
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Get Transaction Details
router.get('/api/transactions/:id/details', authMiddleware, authorizeRole('Admin', 'Resepsionis'), async (req, res) => {
    try {
        const [transaction] = await db.query(
            'SELECT t.*, p.nama_pemilik, p.no_hp FROM transaksi t LEFT JOIN pemilik p ON t.id_pemilik = p.id_pemilik WHERE t.id_transaksi = ?',
            [req.params.id]
        );

        const [details] = await db.query(`
            SELECT dt.*, 
                l.nama_layanan,
                b.nama_barang, b.satuan
            FROM detail_transaksi dt
            LEFT JOIN layanan l ON dt.id_layanan = l.id_layanan
            LEFT JOIN barang b ON dt.id_barang = b.id_barang
            WHERE dt.id_transaksi = ?
        `, [req.params.id]);

        res.json({ transaction: transaction[0], details });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch transaction details' });
    }
});

// Create Transaction
router.post('/api/transactions', authMiddleware, async (req, res) => {
    const { id_pemilik, id_daftar, metode_bayar, items, diskon } = req.body;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Calculate total
        let total = 0;
        for (const item of items) {
            total += item.harga * item.qty;
        }
        total -= (diskon || 0);

        // Create transaction
        const [txResult] = await connection.query(
            'INSERT INTO transaksi (id_pemilik, id_daftar, metode_bayar, total_biaya, diskon) VALUES (?, ?, ?, ?, ?)',
            [id_pemilik || null, id_daftar || null, metode_bayar, total, diskon || 0]
        );

        const txId = txResult.insertId;

        // Insert details
        for (const item of items) {
            const subtotal = item.harga * item.qty;
            await connection.query(
                'INSERT INTO detail_transaksi (id_transaksi, jenis_item, id_layanan, id_barang, harga_saat_ini, qty, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [txId, item.jenis, item.id_layanan || null, item.id_barang || null, item.harga, item.qty, subtotal]
            );

            // Update stock if item is barang
            if (item.jenis === 'Barang' && item.id_barang) {
                await connection.query(
                    'UPDATE barang SET stok = stok - ? WHERE id_barang = ?',
                    [item.qty, item.id_barang]
                );
            }
        }

        await connection.commit();
        res.json({ message: 'Transaction created successfully', id: txId });
    } catch (err) {
        await connection.rollback();
        console.error('Create transaction error:', err);
        res.status(500).json({ error: 'Failed to create transaction' });
    } finally {
        connection.release();
    }
});

// Delete Transaction
router.delete('/api/transactions/:id', authMiddleware, async (req, res) => {
    if (req.session.role !== 'Admin' && req.session.role !== 'Resepsionis') {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        await db.query('DELETE FROM transaksi WHERE id_transaksi = ?', [req.params.id]);
        res.json({ message: 'Transaction deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete transaction' });
    }
});

// ========================================
// BILLING SYSTEM - Preview & Generate Bill
// ========================================

// GET Bill Preview - Show details before confirming
router.get('/api/billing/preview/:id_daftar', authMiddleware, async (req, res) => {
    const { id_daftar } = req.params;
    const userRole = req.session.role;

    if (userRole !== 'Admin' && userRole !== 'Resepsionis') {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        // Check if transaction already exists
        const [existing] = await db.query(
            'SELECT id_transaksi FROM transaksi WHERE id_daftar = ?',
            [id_daftar]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'Transaction already exists for this appointment' });
        }

        // Get complete appointment details with owner and pet info
        const [appointment] = await db.query(`
            SELECT 
                p.id_daftar,
                p.keluhan_awal,
                p.tgl_kunjungan,
                p.status,
                h.nama_hewan,
                h.jenis_hewan,
                h.ras,
                pm.id_pemilik,
                pm.nama_pemilik,
                pm.no_hp,
                pm.email,
                pg.nama_lengkap as dokter_nama
            FROM pendaftaran p
            JOIN hewan h ON p.id_hewan = h.id_hewan
            JOIN pemilik pm ON h.id_pemilik = pm.id_pemilik
            LEFT JOIN pegawai pg ON p.id_pegawai = pg.id_pegawai
            WHERE p.id_daftar = ?
        `, [id_daftar]);

        if (appointment.length === 0) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        if (appointment[0].status !== 'Selesai') {
            return res.status(400).json({ message: 'Can only generate bill for completed appointments' });
        }

        const appointmentData = appointment[0];
        let totalBiaya = 0;
        const items = [];

        // Parse service from keluhan_awal (Format: [ServiceName] ...)
        let serviceName = "Konsultasi Umum"; // Default
        const keluhan = appointmentData.keluhan_awal || "";
        const match = keluhan.match(/^\[(.*?)\]/);
        if (match && match[1]) {
            serviceName = match[1];
        }

        // Get service price from database
        const [service] = await db.query(
            'SELECT id_layanan, nama_layanan, harga_dasar FROM layanan WHERE nama_layanan = ? LIMIT 1',
            [serviceName]
        );

        // Fallback if specific service not found (e.g., changed name), try default
        let selectedService = service[0];
        if (!selectedService) {
            const [defaultService] = await db.query(
                'SELECT id_layanan, nama_layanan, harga_dasar FROM layanan WHERE nama_layanan = "Konsultasi Umum" LIMIT 1'
            );
            selectedService = defaultService[0];
        }

        if (selectedService) {
            const hargaLayanan = parseFloat(selectedService.harga_dasar);
            totalBiaya += hargaLayanan;
            items.push({
                jenis_item: 'Layanan',
                nama: selectedService.nama_layanan,
                id_layanan: selectedService.id_layanan,
                id_barang: null,
                harga: hargaLayanan,
                qty: 1,
                subtotal: hargaLayanan
            });
        }

        // Get prescriptions with medicine details
        const [prescriptions] = await db.query(`
            SELECT 
                ro.id_barang,
                ro.jumlah,
                ro.aturan_pakai,
                b.nama_barang,
                b.harga_satuan,
                b.satuan
            FROM rekam_medis rm
            JOIN resep_obat ro ON rm.id_rekam = ro.id_rekam
            JOIN barang b ON ro.id_barang = b.id_barang
            WHERE rm.id_daftar = ?
        `, [id_daftar]);

        // Add prescriptions to items
        for (const rx of prescriptions) {
            const hargaSatuan = parseFloat(rx.harga_satuan);
            const qty = parseInt(rx.jumlah);
            const subtotal = hargaSatuan * qty;

            totalBiaya += subtotal;

            items.push({
                jenis_item: 'Barang',
                nama: rx.nama_barang,
                id_layanan: null,
                id_barang: rx.id_barang,
                harga: hargaSatuan,
                qty: qty,
                satuan: rx.satuan,
                aturan_pakai: rx.aturan_pakai,
                subtotal: subtotal
            });
        }

        // Return complete preview data
        res.json({
            appointment: {
                id_daftar: appointmentData.id_daftar,
                tanggal: appointmentData.tgl_kunjungan,
                status: appointmentData.status
            },
            owner: {
                id_pemilik: appointmentData.id_pemilik,
                nama: appointmentData.nama_pemilik,
                no_hp: appointmentData.no_hp,
                email: appointmentData.email
            },
            pet: {
                nama: appointmentData.nama_hewan,
                jenis: appointmentData.jenis_hewan,
                ras: appointmentData.ras
            },
            doctor: {
                nama: appointmentData.dokter_nama || 'Unknown'
            },
            items: items,
            total_biaya: totalBiaya
        });

    } catch (err) {
        console.error('Bill preview error:', err);
        res.status(500).json({ message: 'Failed to generate bill preview' });
    }
});



module.exports = router;
