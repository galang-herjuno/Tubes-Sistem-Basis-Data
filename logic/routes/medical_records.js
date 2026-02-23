const express = require('express');
const router = express.Router();
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authMiddleware, authorizeRole } = require('../middlewares/auth');

// Add Medical Record with Prescriptions & Stock Check
router.post('/api/medical-records', authMiddleware, async (req, res) => {
    const { id_daftar, diagnosa, tindakan, catatan_dokter, prescriptions } = req.body;
    const userRole = req.session.role;

    if (userRole !== 'Dokter' && userRole !== 'Admin' && userRole !== 'Groomer') {
        return res.status(403).json({ message: 'Access denied' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Insert Rekam Medis
        const [rmResult] = await connection.query(
            'INSERT INTO rekam_medis (id_daftar, tgl_periksa, diagnosa, tindakan, catatan_dokter) VALUES (?, NOW(), ?, ?, ?)',
            [id_daftar, diagnosa, tindakan, catatan_dokter]
        );
        const idRekam = rmResult.insertId;

        // Process Prescriptions
        if (prescriptions && prescriptions.length > 0) {
            for (const rx of prescriptions) {
                // Check stock & lock row
                const [item] = await connection.query('SELECT stok, nama_barang FROM barang WHERE id_barang = ? FOR UPDATE', [rx.id_barang]);

                if (item.length === 0) {
                    throw new Error(`Item ID ${rx.id_barang} not found`);
                }

                // Server-side stock validation
                if (item[0].stok < rx.jumlah) {
                    throw new Error(`Stok tidak cukup untuk ${item[0].nama_barang}. Sisa: ${item[0].stok}`);
                }

                // Insert Prescription
                await connection.query(
                    'INSERT INTO resep_obat (id_rekam, id_barang, jumlah, aturan_pakai) VALUES (?, ?, ?, ?)',
                    [idRekam, rx.id_barang, rx.jumlah, rx.aturan_pakai]
                );

                // Deduct Stock (Auto-Deduct)
                await connection.query(
                    'UPDATE barang SET stok = stok - ? WHERE id_barang = ?',
                    [rx.jumlah, rx.id_barang]
                );
            }
        }

        // Update Appointment Status to 'Selesai'
        await connection.query('UPDATE pendaftaran SET status = "Selesai" WHERE id_daftar = ?', [id_daftar]);

        await connection.commit();
        res.json({ message: 'Medical record saved successfully' });
    } catch (err) {
        await connection.rollback();
        console.error('Medical record error:', err);
        res.status(500).json({ message: 'Failed to save medical record: ' + err.message });
    } finally {
        connection.release();
    }
});

// POST Generate Bill - Confirm and create transaction
router.post('/api/billing/generate', authMiddleware, async (req, res) => {
    const { id_daftar, diskon = 0, tipe_diskon = 'nominal', metode_bayar = 'Cash' } = req.body;
    const userRole = req.session.role;

    // Only Admin and Resepsionis can generate bills
    if (userRole !== 'Admin' && userRole !== 'Resepsionis') {
        return res.status(403).json({ message: 'Access denied' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Check if transaction already exists
        const [existing] = await connection.query(
            'SELECT id_transaksi FROM transaksi WHERE id_daftar = ?',
            [id_daftar]
        );

        if (existing.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Transaction already exists for this appointment' });
        }

        // Get appointment details
        const [appointment] = await connection.query(`
            SELECT p.id_daftar, p.id_hewan, h.id_pemilik, p.id_pegawai, p.status, p.keluhan_awal
            FROM pendaftaran p
            JOIN hewan h ON p.id_hewan = h.id_hewan
            WHERE p.id_daftar = ?
            `, [id_daftar]);

        if (appointment.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Appointment not found' });
        }

        if (appointment[0].status !== 'Selesai') {
            await connection.rollback();
            return res.status(400).json({ message: 'Can only generate bill for completed appointments' });
        }

        const { id_pemilik } = appointment[0];

        let totalBiaya = 0;
        const items = [];

        // Parse service from keluhan_awal
        let serviceName = "Konsultasi Umum";
        const keluhan = appointment[0].keluhan_awal || "";
        const match = keluhan.match(/^\[(.*?)\]/);
        if (match && match[1]) {
            serviceName = match[1];
        }

        // Get service price 
        const [service] = await connection.query(
            'SELECT id_layanan, harga_dasar FROM layanan WHERE nama_layanan = ? LIMIT 1',
            [serviceName]
        );

        // Fallback 
        let selectedService = service[0];
        if (!selectedService) {
            const [defaultService] = await connection.query(
                'SELECT id_layanan, harga_dasar FROM layanan WHERE nama_layanan = "Konsultasi Umum" LIMIT 1'
            );
            selectedService = defaultService[0];
        }

        // Add service to items
        if (selectedService) {
            const hargaLayanan = parseFloat(selectedService.harga_dasar);
            totalBiaya += hargaLayanan;
            items.push({
                jenis_item: 'Layanan',
                id_layanan: selectedService.id_layanan,
                id_barang: null,
                harga_saat_ini: hargaLayanan,
                qty: 1,
                subtotal: hargaLayanan
            });
        }

        // Get prescriptions from medical record
        const [prescriptions] = await connection.query(`
            SELECT ro.id_barang, ro.jumlah, b.harga_satuan
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
                id_layanan: null,
                id_barang: rx.id_barang,
                harga_saat_ini: rx.harga_satuan,
                qty: rx.jumlah,
                subtotal: subtotal
            });
        }

        // Create transaction
        // Calculate Discount
        const inputDiskon = parseFloat(diskon) || 0;
        let discountAmount = 0;

        if (tipe_diskon === 'persen') {
            // Percent (e.g., 10 means 10%)
            discountAmount = totalBiaya * (inputDiskon / 100);
        } else {
            // Nominal
            discountAmount = inputDiskon;
        }

        const finalTotal = Math.max(0, totalBiaya - discountAmount);

        const [txResult] = await connection.query(`
            INSERT INTO transaksi(id_daftar, id_pemilik, tgl_transaksi, total_biaya, diskon, tipe_diskon, input_diskon, metode_bayar)
        VALUES(?, ?, NOW(), ?, ?, ?, ?, ?)
            `, [id_daftar, id_pemilik, finalTotal, discountAmount, tipe_diskon, inputDiskon, metode_bayar]);

        const transactionId = txResult.insertId;

        // Insert transaction details with price snapshots
        for (const item of items) {
            await connection.query(`
                INSERT INTO detail_transaksi(id_transaksi, jenis_item, id_layanan, id_barang, harga_saat_ini, qty, subtotal)
        VALUES(?, ?, ?, ?, ?, ?, ?)
            `, [transactionId, item.jenis_item, item.id_layanan, item.id_barang, item.harga_saat_ini, item.qty, item.subtotal]);
        }

        await connection.commit();
        res.json({
            message: 'Transaction generated successfully',
            id_transaksi: transactionId,
            total_biaya: finalTotal,
            diskon: discountAmount,
            tipe_diskon: tipe_diskon,
            input_diskon: inputDiskon,
            metode_bayar: metode_bayar
        });

    } catch (err) {
        await connection.rollback();
        console.error('Billing generation error:', err);
        res.status(500).json({ message: 'Failed to generate transaction' });
    } finally {
        connection.release();
    }
});
// ========================================
// END BILLING SYSTEM
// ========================================


// Get Services (for transaction form)
router.get('/api/services', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM layanan ORDER BY nama_layanan');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
});


// ==========================================
// INVENTORY MANAGEMENT
// ==========================================

// Get Inventory (with pagination & filtering)
router.get('/api/inventory', authMiddleware, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const category = req.query.category || '';

        let query = 'SELECT * FROM barang';
        let countQuery = 'SELECT COUNT(*) as total FROM barang';
        const params = [];
        const countParams = [];

        const conditions = [];
        if (search) {
            conditions.push('nama_barang LIKE ?');
            params.push(`%${search}%`);
            countParams.push(`%${search}%`);
        }
        if (category) {
            conditions.push('kategori = ?');
            params.push(category);
            countParams.push(category);
        }

        if (conditions.length > 0) {
            const whereClause = ' WHERE ' + conditions.join(' AND ');
            query += whereClause;
            countQuery += whereClause;
        }

        query += ' ORDER BY nama_barang ASC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        const [countResult] = await db.query(countQuery, countParams);
        const totalRecords = countResult[0].total;
        const totalPages = Math.ceil(totalRecords / limit);

        const [rows] = await db.query(query, params);

        res.json({
            data: rows,
            pagination: {
                totalRecords,
                totalPages,
                currentPage: page,
                limit
            }
        });
    } catch (err) {
        console.error('Inventory API Error:', err);
        res.status(500).json({ error: 'Failed to fetch inventory: ' + err.message });
    }
});

// Add Item
router.post('/api/inventory', authMiddleware, async (req, res) => {
    const { nama_barang, kategori, stok, harga_satuan, satuan } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO barang (nama_barang, kategori, stok, harga_satuan, satuan) VALUES (?, ?, ?, ?, ?)',
            [nama_barang, kategori, stok, harga_satuan, satuan]
        );
        res.json({ message: 'Item added', id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add item' });
    }
});

// Update Item
router.put('/api/barang/:id', authMiddleware, async (req, res) => {
    const { stok, harga_satuan, satuan } = req.body;
    try {
        await db.query(
            'UPDATE barang SET stok = ?, harga_satuan = ?, satuan = ? WHERE id_barang = ?',
            [stok, harga_satuan, satuan, req.params.id]
        );
        res.json({ message: 'Item updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update item' });
    }
});

// Delete Item
router.delete('/api/barang/:id', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM barang WHERE id_barang = ?', [req.params.id]);
        res.json({ message: 'Item deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete item' });
    }
});

// Get Medicines (Obat only)
router.get('/api/medicines', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM barang WHERE kategori = 'Obat' AND stok > 0 ORDER BY nama_barang");
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch medicines' });
    }
});

// ==========================================
// MEDICAL WORKSPACE API (Doctor)
// ==========================================

// Create Medical Record
router.post('/api/medical-records', authMiddleware, async (req, res) => {
    const { id_daftar, diagnosa, tindakan, catatan_dokter, prescriptions } = req.body;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Create medical record
        const [recordResult] = await connection.query(
            'INSERT INTO rekam_medis (id_daftar, diagnosa, tindakan, catatan_dokter) VALUES (?, ?, ?, ?)',
            [id_daftar, diagnosa, tindakan, catatan_dokter]
        );

        const recordId = recordResult.insertId;

        // Add prescriptions if any
        if (prescriptions && prescriptions.length > 0) {
            for (const rx of prescriptions) {
                await connection.query(
                    'INSERT INTO resep_obat (id_rekam, id_barang, jumlah, aturan_pakai) VALUES (?, ?, ?, ?)',
                    [recordId, rx.id_barang, rx.jumlah, rx.aturan_pakai]
                );

                // Update stock
                await connection.query(
                    'UPDATE barang SET stok = stok - ? WHERE id_barang = ?',
                    [rx.jumlah, rx.id_barang]
                );
            }
        }

        // Update appointment status to 'Selesai'
        await connection.query(
            "UPDATE pendaftaran SET status = 'Selesai' WHERE id_daftar = ?",
            [id_daftar]
        );

        await connection.commit();
        res.json({ message: 'Medical record created successfully', id: recordId });
    } catch (err) {
        await connection.rollback();
        console.error('Create medical record error:', err);
        res.status(500).json({ error: 'Failed to create medical record' });
    } finally {
        connection.release();
    }
});

// Get Patient History (for doctors)
router.get('/api/patient-history', authMiddleware, async (req, res) => {
    try {
        const { search } = req.query;

        let query = `
            SELECT rm.*, h.nama_hewan, h.jenis_hewan, pm.nama_pemilik,
            peg.nama_lengkap as dokter, p.tgl_kunjungan
            FROM rekam_medis rm
            JOIN pendaftaran p ON rm.id_daftar = p.id_daftar
            JOIN hewan h ON p.id_hewan = h.id_hewan
            JOIN pemilik pm ON h.id_pemilik = pm.id_pemilik
            JOIN pegawai peg ON p.id_pegawai = peg.id_pegawai
            `;

        if (search) {
            query += ` WHERE h.nama_hewan LIKE '%${search}%' OR pm.nama_pemilik LIKE '%${search}%' OR rm.diagnosa LIKE '%${search}%'`;
        }

        query += ` ORDER BY rm.tgl_periksa DESC LIMIT 50`;

        const [rows] = await db.query(query);

        // Get prescriptions for each record
        for (let record of rows) {
            const [prescriptions] = await db.query(`
                SELECT ro.*, b.nama_barang, b.satuan
                FROM resep_obat ro
                JOIN barang b ON ro.id_barang = b.id_barang
                WHERE ro.id_rekam = ?
            `, [record.id_rekam]);
            record.prescriptions = prescriptions;
        }

        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch patient history' });
    }
});

// Get Doctor Profile (for settings)
router.get('/api/doctor/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.session.userId;
        const [rows] = await db.query(
            'SELECT * FROM pegawai WHERE id_user = ?',
            [userId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Doctor profile not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch doctor profile' });
    }
});

// Update Doctor Profile
router.put('/api/doctor/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { no_hp } = req.body;

        await db.query(
            'UPDATE pegawai SET no_hp = ? WHERE id_user = ?',
            [no_hp, userId]
        );

        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Update Staff (Admin Only)
router.put('/api/staff/:id', authMiddleware, async (req, res) => {
    const { nama_lengkap, jabatan, spesialisasi, no_hp, role } = req.body;
    const staffId = req.params.id;

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Update Pegawai Details
        await connection.query(
            'UPDATE pegawai SET nama_lengkap = ?, jabatan = ?, spesialisasi = ?, no_hp = ? WHERE id_pegawai = ?',
            [nama_lengkap, jabatan, spesialisasi, no_hp, staffId]
        );

        // 2. Get User ID linked to this staff
        const [staff] = await connection.query('SELECT id_user FROM pegawai WHERE id_pegawai = ?', [staffId]);

        if (staff.length > 0 && staff[0].id_user) {
            // 3. Update User Role
            await connection.query(
                'UPDATE users SET role = ? WHERE id_user = ?',
                [role, staff[0].id_user]
            );
        }

        await connection.commit();
        res.json({ message: 'Staff updated successfully' });
    } catch (err) {
        await connection.rollback();
        console.error(err);
        res.status(500).json({ error: 'Failed to update staff' });
    } finally {
        connection.release();
    }
});



module.exports = router;
