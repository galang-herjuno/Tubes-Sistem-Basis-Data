const express = require('express');
const router = express.Router();
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authMiddleware, authorizeRole } = require('../middlewares/auth');

// Get Pets by Owner ID
router.get('/api/owners/:id/pets', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM hewan WHERE id_pemilik = ?', [req.params.id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch pets' });
    }
});

// Get Doctors List
router.get('/api/doctors', authMiddleware, async (req, res) => {
    try {
        // Fetch employees with 'Dokter Hewan' or 'Groomer' jabatan
        const [rows] = await db.query("SELECT * FROM pegawai WHERE jabatan IN ('Dokter Hewan', 'Groomer')");
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch doctors' });
    }
});

// Create Appointment (Pendaftaran)
router.post('/api/appointments', authMiddleware, async (req, res) => {
    const { id_hewan, id_pegawai, tgl_kunjungan, keluhan } = req.body;

    if (!id_hewan || !id_pegawai || !tgl_kunjungan) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    try {
        // Status default 'Menunggu'
        await db.query(`
            INSERT INTO pendaftaran (id_hewan, id_pegawai, tgl_kunjungan, keluhan_awal, status) 
            VALUES (?, ?, ?, ?, 'Menunggu')
        `, [id_hewan, id_pegawai, tgl_kunjungan, keluhan]);

        res.json({ message: 'Appointment created successfully' });
    } catch (err) {
        console.error('Create appointment error:', err);
        res.status(500).json({ error: 'Failed to create appointment' });
    }
});

// Get All Appointments
router.get('/api/appointments', authMiddleware, async (req, res) => {
    try {
        const query = `
            SELECT p.*, h.nama_hewan, h.jenis_hewan, peg.nama_lengkap as dokter, 
                   pm.nama_pemilik, pm.no_hp
            FROM pendaftaran p
            JOIN hewan h ON p.id_hewan = h.id_hewan
            JOIN pegawai peg ON p.id_pegawai = peg.id_pegawai
            JOIN pemilik pm ON h.id_pemilik = pm.id_pemilik
            ORDER BY p.tgl_kunjungan DESC
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error('Get appointments error:', err);
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
});



module.exports = router;
