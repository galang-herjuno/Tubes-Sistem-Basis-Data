const express = require('express');
const router = express.Router();
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authMiddleware, authorizeRole } = require('../middlewares/auth');

// Create Account (Register)
router.post('/api/register', async (req, res) => {
    const { username, password, fullname, email, phone, address } = req.body;
    const role = 'Pelanggan';

    if (!username || !password || !fullname || !email || !phone) {
        return res.status(400).json({ message: 'All required fields must be filled' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Check if user exists
        const [existing] = await connection.query('SELECT * FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Username already exists' });
        }

        // Check if email exists
        const [existingEmail] = await connection.query('SELECT * FROM pemilik WHERE email = ?', [email]);
        if (existingEmail.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user account
        const [userResult] = await connection.query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hashedPassword, role]
        );

        const userId = userResult.insertId;

        // Create pemilik profile linked to user
        await connection.query(
            'INSERT INTO pemilik (id_user, nama_pemilik, email, no_hp, alamat) VALUES (?, ?, ?, ?, ?)',
            [userId, fullname, email, phone, address || null]
        );

        await connection.commit();
        res.json({ message: 'Account created successfully' });
    } catch (error) {
        await connection.rollback();
        console.error('Register error:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        connection.release();
    }
});

// Update Password
router.post('/api/users/change-password', authMiddleware, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const userId = req.session.userId;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Please provide old and new password' });
    }

    try {
        const [rows] = await db.query('SELECT * FROM users WHERE id_user = ?', [userId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        const user = rows[0];

        // Verify old password
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect old password' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await db.query('UPDATE users SET password = ? WHERE id_user = ?', [hashedPassword, userId]);

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Delete Account
router.delete('/api/users/delete', authMiddleware, async (req, res) => {
    const userId = req.session.userId;

    try {
        await db.query('DELETE FROM users WHERE id_user = ?', [userId]);

        // Destroy session
        req.session.destroy(err => {
            if (err) {
                console.error('Session destroy error:', err);
            }
            res.clearCookie('connect.sid');
            res.json({ message: 'Account deleted successfully' });
        });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Update User Role (Admin Only)
router.put('/api/users/:id/role', authMiddleware, async (req, res) => {
    const { role } = req.body;
    const targetUserId = req.params.id;

    // Verify requester is Admin (Middleware checks login, but we need role check)
    if (req.session.role !== 'Admin') {
        return res.status(403).json({ message: 'Access denied: Admin only' });
    }

    // Validate role
    const validRoles = ['Admin', 'Dokter', 'Resepsionis', 'Pelanggan'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
    }

    try {
        await db.query('UPDATE users SET role = ? WHERE id_user = ?', [role, targetUserId]);
        res.json({ message: 'User role updated successfully' });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});



module.exports = router;
