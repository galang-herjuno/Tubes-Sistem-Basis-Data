const express = require('express');
const router = express.Router();
const path = require('path');
const { authMiddleware, authorizeRole } = require('../middlewares/auth');
const db = require('../config/db');

// Serve Modular Pages
router.get('/appointments', authMiddleware, authorizeRole('Admin', 'Resepsionis', 'Dokter'), (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/appointments.html'));
});

router.get('/patients', authMiddleware, authorizeRole('Admin', 'Resepsionis'), (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/patients.html'));
});

router.get('/medical-records', authMiddleware, authorizeRole('Admin', 'Dokter', 'Groomer'), (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/medical-records.html'));
});

router.get('/staff', authMiddleware, authorizeRole('Admin'), (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/staff.html'));
});

router.get('/inventory', authMiddleware, authorizeRole('Admin', 'Resepsionis'), (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/inventory.html'));
});

router.get('/transactions', authMiddleware, authorizeRole('Admin', 'Resepsionis'), (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/transactions.html'));
});

router.get('/settings', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/settings.html'));
});

// Serve Login Page
router.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, '../../public/login.html'));
});

// Serve Dashboard (Protected)
router.get('/dashboard', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    try {
        const [rows] = await db.query('SELECT role FROM users WHERE id_user = ?', [req.session.userId]);
        if (rows.length > 0 && rows[0].role === 'Pelanggan') {
            return res.redirect('/customer-dashboard');
        }
    } catch (err) {
        console.error('Error checking user role:', err);
    }

    res.sendFile(path.join(__dirname, '../../public/dashboard.html'));
});

// Serve Customer Dashboard (Protected)
router.get('/customer-dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, '../../public/customer-dashboard.html'));
});

// Default Route
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../public/index.html'));
});

module.exports = router;
