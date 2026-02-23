const express = require('express');
const router = express.Router();
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authMiddleware, authorizeRole } = require('../middlewares/auth');

// Get Current User Info
router.get('/api/me', authMiddleware, (req, res) => {
    res.json({
        username: req.session.username,
        role: req.session.role
    });
});

// 1. Statistics
router.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
    try {
        const [totalPatients] = await db.query('SELECT COUNT(*) as count FROM hewan');
        const [lowStock] = await db.query('SELECT COUNT(*) as count FROM barang WHERE stok < 5');
        // Optimized SARGable query for revenue (Index-friendly)
        const [revenue] = await db.query('SELECT COALESCE(SUM(total_biaya), 0) as total FROM transaksi WHERE tgl_transaksi >= CURRENT_DATE AND tgl_transaksi < CURRENT_DATE + INTERVAL 1 DAY');
        const [activeStaff] = await db.query('SELECT COUNT(*) as count FROM pegawai WHERE id_user IS NOT NULL');

        res.json({
            totalPatients: totalPatients[0].count,
            lowStock: lowStock[0].count,
            revenueToday: revenue[0].total,
            activeStaff: activeStaff[0].count
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// 2. Live Queue (with doctor filtering support and pagination)
router.get('/api/dashboard/queue', authMiddleware, async (req, res) => {
    try {
        const userId = req.session.userId;
        const role = req.session.role;

        // Query Params
        const dateFilter = req.query.date || 'today';
        const statusFilter = req.query.status || 'all'; // 'active', 'completed', 'all'
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        let query = `
            SELECT p.id_daftar, h.nama_hewan, h.id_hewan, h.jenis_hewan, peg.nama_lengkap as dokter, 
                peg.id_pegawai, pm.nama_pemilik, pm.no_hp,
                DATE_FORMAT(p.tgl_kunjungan, '%H:%i') as jam, 
                DATE_FORMAT(p.tgl_kunjungan, '%Y-%m-%d') as tanggal,
                p.status, p.keluhan_awal,
                t.id_transaksi
            FROM pendaftaran p 
            JOIN hewan h ON p.id_hewan = h.id_hewan 
            JOIN pemilik pm ON h.id_pemilik = pm.id_pemilik
            JOIN pegawai peg ON p.id_pegawai = peg.id_pegawai 
            LEFT JOIN transaksi t ON p.id_daftar = t.id_daftar
            WHERE 1=1
        `;

        const params = [];

        // Date Filter
        // Date Filter (Optimized for Index Usage)
        if (dateFilter === 'today') {
            query += ` AND p.tgl_kunjungan >= CURRENT_DATE AND p.tgl_kunjungan < CURRENT_DATE + INTERVAL 1 DAY`;
        } else if (dateFilter === 'tomorrow') {
            query += ` AND p.tgl_kunjungan >= CURRENT_DATE + INTERVAL 1 DAY AND p.tgl_kunjungan < CURRENT_DATE + INTERVAL 2 DAY`;
        } else if (dateFilter === 'week') {
            query += ` AND YEARWEEK(p.tgl_kunjungan, 1) = YEARWEEK(CURRENT_DATE, 1)`;
        } else if (dateFilter === 'month') {
            query += ` AND MONTH(p.tgl_kunjungan) = MONTH(CURRENT_DATE) AND YEAR(p.tgl_kunjungan) = YEAR(CURRENT_DATE)`;
        } else if (dateFilter === 'all') {
            // No date filter
        }

        // Status Filter
        if (statusFilter === 'active') {
            query += ` AND p.status IN ('Menunggu', 'Diperiksa')`;
        } else if (statusFilter === 'completed') {
            query += ` AND p.status IN ('Selesai', 'Batal')`;
        }

        // Doctor & Groomer Filter
        if (role === 'Dokter' || role === 'Groomer') {
            query += ` AND peg.id_user = ?`;
            params.push(userId);
        }

        // Sort priority: 
        // 1. Unpaid first (t.id_transaksi IS NULL) -> DESC because true(1) > false(0)
        // 2. Then by appointment time
        query += ` ORDER BY (t.id_transaksi IS NULL) DESC, p.tgl_kunjungan ASC LIMIT ? OFFSET ?`;
        params.push(limit, offset);

        const [rows] = await db.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch queue' });
    }
});

// Update Queue Status
router.post('/api/dashboard/queue/update', authMiddleware, async (req, res) => {
    const { id_daftar, status } = req.body;
    try {
        await db.query('UPDATE pendaftaran SET status = ? WHERE id_daftar = ?', [status, id_daftar]);
        res.json({ message: 'Status updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// Recent Medical Records
router.get('/api/dashboard/records', authMiddleware, async (req, res) => {
    try {
        const query = `
            SELECT rm.tgl_periksa, h.nama_hewan, rm.diagnosa 
            FROM rekam_medis rm 
            JOIN pendaftaran p ON rm.id_daftar = p.id_daftar 
            JOIN hewan h ON p.id_hewan = h.id_hewan 
            ORDER BY rm.tgl_periksa DESC 
            LIMIT 5
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch records' });
    }
});

// 3. Analytics
router.get('/api/dashboard/analytics', authMiddleware, async (req, res) => {
    try {
        // Sales Chart (Last 7 Days)
        const [sales] = await db.query(`
            SELECT DATE(tgl_transaksi) as date, SUM(total_biaya) as total 
            FROM transaksi 
            WHERE tgl_transaksi >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY) 
            GROUP BY DATE(tgl_transaksi) 
            ORDER BY date ASC
        `);

        // Payment Methods
        const [paymentMethods] = await db.query(`
            SELECT metode_bayar, COUNT(*) as count 
            FROM transaksi 
            GROUP BY metode_bayar
        `);

        // Best Selling Services
        const [bestServices] = await db.query(`
            SELECT l.nama_layanan, COUNT(dt.id_layanan) as usage_count 
            FROM detail_transaksi dt 
            JOIN layanan l ON dt.id_layanan = l.id_layanan 
            WHERE dt.jenis_item = 'Layanan' 
            GROUP BY dt.id_layanan, l.nama_layanan 
            ORDER BY usage_count DESC 
            LIMIT 5
        `);

        res.json({ sales, paymentMethods, bestServices });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
});



module.exports = router;
