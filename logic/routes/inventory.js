const express = require('express');
const router = express.Router();
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authMiddleware, authorizeRole } = require('../middlewares/auth');

// Get All Items (Paginated)
router.get('/api/inventory', authMiddleware, authorizeRole('Admin', 'Resepsionis'), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM barang WHERE is_active = 1';
        let countQuery = 'SELECT COUNT(*) as total FROM barang WHERE is_active = 1';
        let params = [];
        let countParams = [];

        if (search) {
            query += ' AND nama_barang LIKE ?';
            countQuery += ' AND nama_barang LIKE ?';
            params.push(`%${search}%`);
            countParams.push(`%${search}%`);
        }

        query += ' ORDER BY stok ASC LIMIT ? OFFSET ?';
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
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// Add Item
router.post('/api/inventory', authMiddleware, async (req, res) => {
    const { nama_barang, kategori, stok, harga_satuan, satuan } = req.body;
    try {
        await db.query('INSERT INTO barang (nama_barang, kategori, stok, harga_satuan, satuan) VALUES (?, ?, ?, ?, ?)',
            [nama_barang, kategori, stok, harga_satuan, satuan]);
        res.json({ message: 'Item added' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add item' });
    }
});

// Update Item (Admin & Resepsionis only)
router.put('/api/barang/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { stok, harga_satuan, satuan } = req.body;
    const userRole = req.session.role;

    // Only Admin and Resepsionis can update
    if (userRole !== 'Admin' && userRole !== 'Resepsionis') {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        await db.query(
            'UPDATE barang SET stok = ?, harga_satuan = ?, satuan = ? WHERE id_barang = ?',
            [stok, harga_satuan, satuan, id]
        );
        res.json({ message: 'Inventory updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update inventory' });
    }
});

// Delete Item (Admin & Resepsionis only)
// Delete Item (Soft Delete - Admin & Resepsionis only)
router.delete('/api/barang/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const userRole = req.session.role;

    // Only Admin and Resepsionis can delete
    if (userRole !== 'Admin' && userRole !== 'Resepsionis') {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        // Soft delete: Mark as inactive instead of deleting row
        await db.query('UPDATE barang SET is_active = 0 WHERE id_barang = ?', [id]);
        res.json({ message: 'Item deleted (archived) successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete item' });
    }
});




module.exports = router;
