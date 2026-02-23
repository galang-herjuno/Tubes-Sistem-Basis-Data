const express = require('express');
const router = express.Router();
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authMiddleware, authorizeRole } = require('../middlewares/auth');

// Get All Pets
router.get('/api/pets', authMiddleware, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;

        // Get Total Count
        const [countResult] = await db.query('SELECT COUNT(*) as total FROM hewan');
        const totalRecords = countResult[0].total;
        const totalPages = Math.ceil(totalRecords / limit);

        const query = `
            SELECT h.id_hewan, h.id_pemilik, h.nama_hewan, h.jenis_hewan, h.ras, h.gender, h.tgl_lahir, h.berat, 
                   p.nama_pemilik 
            FROM hewan h 
            JOIN pemilik p ON h.id_pemilik = p.id_pemilik 
            ORDER BY h.id_hewan DESC
            LIMIT ? OFFSET ?
        `;
        const [rows] = await db.query(query, [limit, offset]);

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
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch pets' });
    }
});

// Create Pet
router.post('/api/pets', authMiddleware, async (req, res) => {
    const { id_pemilik, nama_hewan, jenis_hewan, ras, gender, tgl_lahir, berat } = req.body;
    try {
        const [result] = await db.query(
            'INSERT INTO hewan (id_pemilik, nama_hewan, jenis_hewan, ras, gender, tgl_lahir, berat) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [id_pemilik, nama_hewan, jenis_hewan, ras, gender, tgl_lahir, berat]
        );
        res.json({ message: 'Pet added', id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add pet' });
    }
});

// Update Pet
router.put('/api/pets/:id', authMiddleware, async (req, res) => {
    const { nama_hewan, jenis_hewan, ras, gender, tgl_lahir, berat } = req.body;
    try {
        await db.query(
            'UPDATE hewan SET nama_hewan = ?, jenis_hewan = ?, ras = ?, gender = ?, tgl_lahir = ?, berat = ? WHERE id_hewan = ?',
            [nama_hewan, jenis_hewan, ras, gender, tgl_lahir, berat, req.params.id]
        );
        res.json({ message: 'Pet updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update pet' });
    }
});

// Delete Pet
router.delete('/api/pets/:id', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM hewan WHERE id_hewan = ?', [req.params.id]);
        res.json({ message: 'Pet deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete pet' });
    }
});



module.exports = router;
