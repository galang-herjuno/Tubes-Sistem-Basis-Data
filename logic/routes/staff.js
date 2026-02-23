const express = require('express');
const router = express.Router();
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authMiddleware, authorizeRole } = require('../middlewares/auth');

// Get All Staff
router.get('/api/staff', authMiddleware, authorizeRole('Admin'), async (req, res) => {
    try {
        const query = `
            SELECT peg.*, u.username, u.role as account_role, u.id_user 
            FROM pegawai peg 
            LEFT JOIN users u ON peg.id_user = u.id_user
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch staff' });
    }
});

// Create Staff (Transaction: Create User -> Create Employee)
router.post('/api/staff', authMiddleware, authorizeRole('Admin'), async (req, res) => {
    // Only Admin can add staff (Middleware handles this now)

    const { username, password, role, nama_lengkap, jabatan, spesialisasi, no_hp } = req.body;

    // Validate role for staff
    if (!['Dokter', 'Resepsionis', 'Admin', 'Groomer'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role for staff' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // 1. Create User
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        const [userResult] = await connection.query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hash, role]
        );
        const newUserId = userResult.insertId;

        // 2. Create Employee Linked to User
        await connection.query(
            'INSERT INTO pegawai (id_user, nama_lengkap, jabatan, no_hp, spesialisasi) VALUES (?, ?, ?, ?, ?)',
            [newUserId, nama_lengkap, jabatan, no_hp, spesialisasi]
        );

        await connection.commit();
        res.json({ message: 'Staff created successfully' });
    } catch (err) {
        await connection.rollback();
        console.error('Create staff transaction failed:', err);
        res.status(500).json({ error: 'Failed to create staff' });
    } finally {
        connection.release();
    }
});

// Get Single Staff
router.get('/api/staff/:id', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT peg.*, u.username, u.role, u.id_user 
            FROM pegawai peg 
            LEFT JOIN users u ON peg.id_user = u.id_user 
            WHERE peg.id_pegawai = ?
        `, [req.params.id]);

        if (rows.length === 0) return res.status(404).json({ message: 'Staff not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch staff details' });
    }
});

// Update Staff
router.put('/api/staff/:id', authMiddleware, async (req, res) => {
    const { nama_lengkap, jabatan, spesialisasi, no_hp, role } = req.body;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // 1. Update Pegawai Info
        await connection.query(
            'UPDATE pegawai SET nama_lengkap = ?, jabatan = ?, spesialisasi = ?, no_hp = ? WHERE id_pegawai = ?',
            [nama_lengkap, jabatan, spesialisasi, no_hp, req.params.id]
        );

        // 2. Get User ID linked to this staff
        const [staff] = await connection.query('SELECT id_user FROM pegawai WHERE id_pegawai = ?', [req.params.id]);

        if (staff.length > 0 && staff[0].id_user) {
            // 3. Update User Role
            await connection.query('UPDATE users SET role = ? WHERE id_user = ?', [role, staff[0].id_user]);
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

// Delete Staff (Transaction: Delete User & Employee)
router.delete('/api/staff/:id', authMiddleware, async (req, res) => {
    if (req.session.role !== 'Admin') return res.status(403).json({ message: 'Access denied' });

    const idPegawai = req.params.id;
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Get linked id_user first
        const [rows] = await connection.query('SELECT id_user FROM pegawai WHERE id_pegawai = ?', [idPegawai]);
        if (rows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Staff not found' });
        }
        const idUser = rows[0].id_user;

        // Delete from pegawai first
        await connection.query('DELETE FROM pegawai WHERE id_pegawai = ?', [idPegawai]);

        // Delete from users if linked
        if (idUser) {
            await connection.query('DELETE FROM users WHERE id_user = ?', [idUser]);
        }

        await connection.commit();
        res.json({ message: 'Staff and associated account deleted' });
    } catch (err) {
        await connection.rollback();
        console.error('Delete staff error:', err);
        res.status(500).json({ error: 'Failed to delete staff' });
    } finally {
        connection.release();
    }
});

// ========================================
// STAFF/DOCTOR PROFILE MANAGEMENT
// ========================================

// Get Staff/Doctor Profile
router.get('/api/pegawai/profile', authMiddleware, async (req, res) => {
    const userId = req.session.userId;

    try {
        const [profile] = await db.query(
            'SELECT nama_lengkap, jabatan, spesialisasi, no_hp, email, alamat FROM pegawai WHERE id_user = ?',
            [userId]
        );

        if (profile.length === 0) {
            return res.status(404).json({ message: 'Profile not found' });
        }

        res.json(profile[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch profile' });
    }
});

// Update Staff/Doctor Profile
router.put('/api/pegawai/profile', authMiddleware, async (req, res) => {
    const userId = req.session.userId;
    const { nama_lengkap, spesialisasi, no_hp, email, alamat } = req.body;

    try {
        await db.query(
            'UPDATE pegawai SET nama_lengkap = ?, spesialisasi = ?, no_hp = ?, email = ?, alamat = ? WHERE id_user = ?',
            [nama_lengkap, spesialisasi, no_hp, email, alamat, userId]
        );
        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update profile' });
    }
});

// ========================================
// END PROFILE MANAGEMENT
// ========================================




module.exports = router;
