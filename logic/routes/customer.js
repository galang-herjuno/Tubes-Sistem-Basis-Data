const express = require('express');
const router = express.Router();
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authMiddleware, authorizeRole } = require('../middlewares/auth');

// Get or Create Customer Profile
router.get('/api/customer/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.session.userId;

        // Check if pemilik profile exists for this user
        let [pemilik] = await db.query('SELECT * FROM pemilik WHERE id_user = ?', [userId]);

        if (pemilik.length === 0) {
            // Get user info to create profile
            const [user] = await db.query('SELECT username FROM users WHERE id_user = ?', [userId]);

            // Create pemilik profile automatically
            const [result] = await db.query(
                'INSERT INTO pemilik (id_user, nama_pemilik, email) VALUES (?, ?, ?)',
                [userId, user[0].username, `${user[0].username} @example.com`]
            );

            [pemilik] = await db.query('SELECT * FROM pemilik WHERE id_pemilik = ?', [result.insertId]);
        }

        res.json(pemilik[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Update Customer Profile
router.put('/api/customer/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.session.userId;
        const { nama_pemilik, alamat, no_hp, email } = req.body;

        // Get pemilik id
        const [pemilik] = await db.query('SELECT id_pemilik FROM pemilik WHERE id_user = ?', [userId]);

        if (pemilik.length === 0) {
            return res.status(404).json({ error: 'Profile not found' });
        }

        await db.query(
            'UPDATE pemilik SET nama_pemilik = ?, alamat = ?, no_hp = ?, email = ? WHERE id_pemilik = ?',
            [nama_pemilik, alamat, no_hp, email, pemilik[0].id_pemilik]
        );

        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Customer Dashboard Stats
router.get('/api/customer/dashboard', authMiddleware, async (req, res) => {
    try {
        const userId = req.session.userId;

        // Get pemilik id
        const [pemilik] = await db.query('SELECT id_pemilik FROM pemilik WHERE id_user = ?', [userId]);

        if (pemilik.length === 0) {
            return res.json({ totalPets: 0, upcomingAppointments: 0, pendingPayments: 0 });
        }

        const idPemilik = pemilik[0].id_pemilik;

        // Count pets
        const [pets] = await db.query('SELECT COUNT(*) as count FROM hewan WHERE id_pemilik = ?', [idPemilik]);

        // Count upcoming appointments
        const [appointments] = await db.query(`
            SELECT COUNT(*) as count FROM pendaftaran p
            JOIN hewan h ON p.id_hewan = h.id_hewan
            WHERE h.id_pemilik = ? AND p.tgl_kunjungan >= NOW() AND p.status != 'Batal'
            `, [idPemilik]);

        // Count pending payments (if you have a status field)
        const [payments] = await db.query(`
            SELECT COUNT(*) as count FROM transaksi
            WHERE id_pemilik = ? AND tgl_transaksi >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            `, [idPemilik]);

        res.json({
            totalPets: pets[0].count,
            upcomingAppointments: appointments[0].count,
            recentTransactions: payments[0].count
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// Get Customer's Pets
router.get('/api/customer/pets', authMiddleware, async (req, res) => {
    try {
        const userId = req.session.userId;
        const [pemilik] = await db.query('SELECT id_pemilik FROM pemilik WHERE id_user = ?', [userId]);

        if (pemilik.length === 0) {
            return res.json([]);
        }

        const [pets] = await db.query('SELECT * FROM hewan WHERE id_pemilik = ? ORDER BY id_hewan DESC', [pemilik[0].id_pemilik]);
        res.json(pets);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch pets' });
    }
});

// Add Pet (Customer)
router.post('/api/customer/pets', authMiddleware, async (req, res) => {
    try {
        const userId = req.session.userId;
        let [pemilik] = await db.query('SELECT id_pemilik FROM pemilik WHERE id_user = ?', [userId]);

        // Auto-create profile if not exists
        if (pemilik.length === 0) {
            const [user] = await db.query('SELECT username FROM users WHERE id_user = ?', [userId]);

            const [result] = await db.query(
                'INSERT INTO pemilik (id_user, nama_pemilik, email) VALUES (?, ?, ?)',
                [userId, user[0].username, `${user[0].username} @example.com`]
            );

            [pemilik] = await db.query('SELECT id_pemilik FROM pemilik WHERE id_pemilik = ?', [result.insertId]);
        }

        const { nama_hewan, jenis_hewan, ras, gender, tgl_lahir, berat } = req.body;
        const idPemilik = pemilik[0].id_pemilik;

        const [result] = await db.query(
            'INSERT INTO hewan (id_pemilik, nama_hewan, jenis_hewan, ras, gender, tgl_lahir, berat) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [idPemilik, nama_hewan, jenis_hewan, ras, gender, tgl_lahir, berat]
        );

        res.json({ message: 'Pet added successfully', id: result.insertId });
    } catch (err) {
        console.error('Add pet error:', err);
        res.status(500).json({ error: 'Failed to add pet', details: err.message });
    }
});

// Get Pet Medical Records
router.get('/api/customer/pets/:id/medical-records', authMiddleware, async (req, res) => {
    try {
        const userId = req.session.userId;
        const petId = req.params.id;

        // Verify ownership
        const [pet] = await db.query(`
            SELECT h.* FROM hewan h
            JOIN pemilik p ON h.id_pemilik = p.id_pemilik
            WHERE h.id_hewan = ? AND p.id_user = ?
            `, [petId, userId]);

        if (pet.length === 0) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Get medical records
        const [records] = await db.query(`
            SELECT rm.*, peg.nama_lengkap as dokter, pd.tgl_kunjungan
            FROM rekam_medis rm
            JOIN pendaftaran pd ON rm.id_daftar = pd.id_daftar
            JOIN pegawai peg ON pd.id_pegawai = peg.id_pegawai
            WHERE pd.id_hewan = ?
            ORDER BY rm.tgl_periksa DESC
                `, [petId]);

        // Get prescriptions for each record
        for (let record of records) {
            const [prescriptions] = await db.query(`
                SELECT ro.*, b.nama_barang, b.satuan
                FROM resep_obat ro
                JOIN barang b ON ro.id_barang = b.id_barang
                WHERE ro.id_rekam = ?
            `, [record.id_rekam]);
            record.prescriptions = prescriptions;
        }

        res.json(records);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch medical records' });
    }
});

// Get Customer's Appointments
router.get('/api/customer/appointments', authMiddleware, async (req, res) => {
    try {
        const userId = req.session.userId;
        const [pemilik] = await db.query('SELECT id_pemilik FROM pemilik WHERE id_user = ?', [userId]);

        if (pemilik.length === 0) {
            return res.json([]);
        }

        const [appointments] = await db.query(`
            SELECT p.*, h.nama_hewan, h.jenis_hewan, peg.nama_lengkap as dokter
            FROM pendaftaran p
            JOIN hewan h ON p.id_hewan = h.id_hewan
            JOIN pegawai peg ON p.id_pegawai = peg.id_pegawai
            WHERE h.id_pemilik = ?
            ORDER BY p.tgl_kunjungan DESC
                `, [pemilik[0].id_pemilik]);

        res.json(appointments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
});

// Get Next Appointment
router.get('/api/customer/appointments/next', authMiddleware, async (req, res) => {
    try {
        const userId = req.session.userId;
        const [pemilik] = await db.query('SELECT id_pemilik FROM pemilik WHERE id_user = ?', [userId]);

        if (pemilik.length === 0) {
            return res.json(null);
        }

        const [appointment] = await db.query(`
            SELECT p.*, h.nama_hewan, h.jenis_hewan, peg.nama_lengkap as dokter
            FROM pendaftaran p
            JOIN hewan h ON p.id_hewan = h.id_hewan
            JOIN pegawai peg ON p.id_pegawai = peg.id_pegawai
            WHERE h.id_pemilik = ? AND p.tgl_kunjungan >= NOW() AND p.status != 'Batal'
            ORDER BY p.tgl_kunjungan ASC
            LIMIT 1
            `, [pemilik[0].id_pemilik]);

        res.json(appointment[0] || null);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch next appointment' });
    }
});

// Get Customer's Transactions
router.get('/api/customer/transactions', authMiddleware, async (req, res) => {
    try {
        const userId = req.session.userId;
        const [pemilik] = await db.query('SELECT id_pemilik FROM pemilik WHERE id_user = ?', [userId]);

        if (pemilik.length === 0) {
            return res.json([]);
        }

        const [transactions] = await db.query(`
            SELECT t.*,
            (SELECT GROUP_CONCAT(CONCAT(dt.qty, 'x ', COALESCE(l.nama_layanan, b.nama_barang)) SEPARATOR ', ')
                    FROM detail_transaksi dt
                    LEFT JOIN layanan l ON dt.id_layanan = l.id_layanan
                    LEFT JOIN barang b ON dt.id_barang = b.id_barang
                    WHERE dt.id_transaksi = t.id_transaksi) as items
            FROM transaksi t
            WHERE t.id_pemilik = ?
    ORDER BY t.tgl_transaksi DESC
        `, [pemilik[0].id_pemilik]);

        res.json(transactions);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// Get Transaction Details
router.get('/api/customer/transactions/:id', authMiddleware, async (req, res) => {
    try {
        const userId = req.session.userId;
        const transactionId = req.params.id;

        // Verify ownership
        const [transaction] = await db.query(`
            SELECT t.* FROM transaksi t
            JOIN pemilik p ON t.id_pemilik = p.id_pemilik
            WHERE t.id_transaksi = ? AND p.id_user = ?
    `, [transactionId, userId]);

        if (transaction.length === 0) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        // Get transaction details
        const [details] = await db.query(`
            SELECT dt.*,
    l.nama_layanan,
    b.nama_barang, b.satuan
            FROM detail_transaksi dt
            LEFT JOIN layanan l ON dt.id_layanan = l.id_layanan
            LEFT JOIN barang b ON dt.id_barang = b.id_barang
            WHERE dt.id_transaksi = ?
    `, [transactionId]);

        res.json({
            transaction: transaction[0],
            details: details
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch transaction details' });
    }
});



module.exports = router;
