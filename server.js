const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Attempt to require db, if it fails due to connection refuse on immediate test, we handle it in route
let db;
try {
    db = require('./config/db');
} catch (error) {
    console.error("Database module error:", error);
}

// Fail fast if DB module isn't available - most routes require DB.
if (!db) {
    console.error('Database module not available. Exiting to avoid runtime errors in routes.');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'secret_key_sbd_tubes',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));

// Middleware to check authentication
const authMiddleware = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
};

// Routes

// Serve Login Page
app.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Serve Dashboard (Protected)
app.get('/dashboard', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    // Check user role and redirect to appropriate dashboard
    try {
        const [rows] = await db.query('SELECT role FROM users WHERE id_user = ?', [req.session.userId]);
        if (rows.length > 0 && rows[0].role === 'Pelanggan') {
            return res.redirect('/customer-dashboard');
        }
    } catch (err) {
        console.error('Error checking user role:', err);
    }

    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Serve Customer Dashboard (Protected)
app.get('/customer-dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'customer-dashboard.html'));
});

// API Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Please provide username and password' });
    }

    try {
        // Query user
        const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);

        if (rows.length === 0) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        const user = rows[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }

        // Create session
        req.session.userId = user.id_user;
        req.session.username = user.username;
        req.session.role = user.role;

        res.json({ message: 'Login successful', role: user.role });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// Logout
app.get('/auth/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/dashboard');
        }
        res.clearCookie('connect.sid');
        res.redirect('/login');
    });
});

// --- USER MANAGEMENT API ---

// Create Account (Register)
app.post('/api/register', async (req, res) => {
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
app.post('/api/users/change-password', authMiddleware, async (req, res) => {
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
app.delete('/api/users/delete', authMiddleware, async (req, res) => {
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
app.put('/api/users/:id/role', authMiddleware, async (req, res) => {
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

// --- APPOINTMENT SYSTEM API ---

// Get Pets by Owner ID
app.get('/api/owners/:id/pets', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM hewan WHERE id_pemilik = ?', [req.params.id]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch pets' });
    }
});

// Get Doctors List
app.get('/api/doctors', authMiddleware, async (req, res) => {
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
app.post('/api/appointments', authMiddleware, async (req, res) => {
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
app.get('/api/appointments', authMiddleware, async (req, res) => {
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

// --- DASHBOARD API ENDPOINTS ---



// Get Current User Info
app.get('/api/me', authMiddleware, (req, res) => {
    res.json({
        username: req.session.username,
        role: req.session.role
    });
});

// 1. Statistics
app.get('/api/dashboard/stats', authMiddleware, async (req, res) => {
    try {
        const [totalPatients] = await db.query('SELECT COUNT(*) as count FROM hewan');
        const [lowStock] = await db.query('SELECT COUNT(*) as count FROM barang WHERE stok < 5');
        const [revenue] = await db.query('SELECT COALESCE(SUM(total_biaya), 0) as total FROM transaksi WHERE DATE(tgl_transaksi) = CURRENT_DATE');
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

// 2. Live Queue (with doctor filtering support)
app.get('/api/dashboard/queue', authMiddleware, async (req, res) => {
    try {
        const userId = req.session.userId;
        const role = req.session.role;

        let query = `
            SELECT p.id_daftar, h.nama_hewan, h.id_hewan, peg.nama_lengkap as dokter, 
                peg.id_pegawai, pm.nama_pemilik, pm.no_hp,
                DATE_FORMAT(p.tgl_kunjungan, '%H:%i') as jam, p.status, p.keluhan_awal 
            FROM pendaftaran p 
            JOIN hewan h ON p.id_hewan = h.id_hewan 
            JOIN pemilik pm ON h.id_pemilik = pm.id_pemilik
            JOIN pegawai peg ON p.id_pegawai = peg.id_pegawai 
            WHERE DATE(p.tgl_kunjungan) = CURRENT_DATE
        `;

        // Filter for doctors - only show their own queue
        if (role === 'Dokter') {
            query += ` AND peg.id_user = ${userId}`;
        }

        query += ` ORDER BY p.tgl_kunjungan ASC`;

        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch queue' });
    }
});

// Update Queue Status
app.post('/api/dashboard/queue/update', authMiddleware, async (req, res) => {
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
app.get('/api/dashboard/records', authMiddleware, async (req, res) => {
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
app.get('/api/dashboard/analytics', authMiddleware, async (req, res) => {
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

// --- NEW CRUD API ENDPOINTS ---

// 4. Patients & Owners
// Get All Owners (with Pet count)
app.get('/api/owners', authMiddleware, async (req, res) => {
    try {
        const query = `
            SELECT p.*, COUNT(h.id_hewan) as pet_count 
            FROM pemilik p 
            LEFT JOIN hewan h ON p.id_pemilik = h.id_pemilik 
            GROUP BY p.id_pemilik 
            ORDER BY p.id_pemilik DESC
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch owners' });
    }
});

// Create Owner (with auto-generated user account)
app.post('/api/owners', authMiddleware, async (req, res) => {
    const { nama_pemilik, no_hp, alamat, email } = req.body;

    if (!nama_pemilik || !email) {
        return res.status(400).json({ message: 'Name and email are required' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Generate username from name (lowercase, replace spaces with dots)
        let username = nama_pemilik.toLowerCase().replace(/\s+/g, '.');

        // Check if username exists, if so add number suffix
        const [existing] = await connection.query('SELECT * FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            // Add timestamp suffix to make it unique
            username = `${username}.${Date.now().toString().slice(-4)}`;
        }

        // Check if email already exists
        const [existingEmail] = await connection.query('SELECT * FROM pemilik WHERE email = ?', [email]);
        if (existingEmail.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Generate default password
        const defaultPassword = 'owner123';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(defaultPassword, salt);

        // Create user account
        const [userResult] = await connection.query(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hashedPassword, 'Pelanggan']
        );
        const userId = userResult.insertId;

        // Create pemilik record linked to user
        const [ownerResult] = await connection.query(
            'INSERT INTO pemilik (id_user, nama_pemilik, no_hp, alamat, email) VALUES (?, ?, ?, ?, ?)',
            [userId, nama_pemilik, no_hp, alamat, email]
        );

        await connection.commit();
        res.json({
            message: 'Owner added successfully',
            id: ownerResult.insertId,
            credentials: {
                username: username,
                password: defaultPassword,
                info: 'Share these credentials with the owner so they can login and track their pets'
            }
        });
    } catch (err) {
        await connection.rollback();
        console.error('Create owner error:', err);
        res.status(500).json({ error: 'Failed to add owner' });
    } finally {
        connection.release();
    }
});

// Update Owner
app.put('/api/owners/:id', authMiddleware, async (req, res) => {
    const { nama_pemilik, no_hp, alamat, email } = req.body;
    try {
        await db.query('UPDATE pemilik SET nama_pemilik = ?, no_hp = ?, alamat = ?, email = ? WHERE id_pemilik = ?',
            [nama_pemilik, no_hp, alamat, email, req.params.id]);
        res.json({ message: 'Owner updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update owner' });
    }
});

// Delete Owner
app.delete('/api/owners/:id', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM pemilik WHERE id_pemilik = ?', [req.params.id]);
        res.json({ message: 'Owner deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete owner' });
    }
});

// Get All Pets
app.get('/api/pets', authMiddleware, async (req, res) => {
    try {
        const query = `
            SELECT h.*, p.nama_pemilik 
            FROM hewan h 
            JOIN pemilik p ON h.id_pemilik = p.id_pemilik 
            ORDER BY h.id_hewan DESC
        `;
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch pets' });
    }
});

// Create Pet
app.post('/api/pets', authMiddleware, async (req, res) => {
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
app.put('/api/pets/:id', authMiddleware, async (req, res) => {
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
app.delete('/api/pets/:id', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM hewan WHERE id_hewan = ?', [req.params.id]);
        res.json({ message: 'Pet deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete pet' });
    }
});

// 5. Staff Management
// Get All Staff
app.get('/api/staff', authMiddleware, async (req, res) => {
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
app.post('/api/staff', authMiddleware, async (req, res) => {
    // Only Admin can add staff
    if (req.session.role !== 'Admin') {
        return res.status(403).json({ message: 'Access denied' });
    }

    const { username, password, role, nama_lengkap, jabatan, spesialisasi, no_hp } = req.body;

    // Validate role for staff
    if (!['Dokter', 'Resepsionis', 'Admin'].includes(role)) {
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

// Delete Staff (Transaction: Delete User & Employee)
app.delete('/api/staff/:id', authMiddleware, async (req, res) => {
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
app.get('/api/pegawai/profile', authMiddleware, async (req, res) => {
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
app.put('/api/pegawai/profile', authMiddleware, async (req, res) => {
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


// 6. Inventory
// Get All Items
app.get('/api/inventory', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM barang ORDER BY stok ASC');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// Add Item
app.post('/api/inventory', authMiddleware, async (req, res) => {
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
app.put('/api/barang/:id', authMiddleware, async (req, res) => {
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
app.delete('/api/barang/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const userRole = req.session.role;

    // Only Admin and Resepsionis can delete
    if (userRole !== 'Admin' && userRole !== 'Resepsionis') {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        // Check if item is used in prescriptions
        const [prescriptions] = await db.query(
            'SELECT COUNT(*) as count FROM resep_obat WHERE id_barang = ?',
            [id]
        );

        if (prescriptions[0].count > 0) {
            return res.status(400).json({
                message: 'Cannot delete item: it is referenced in medical prescriptions'
            });
        }

        // Check if item is used in transactions
        const [transactions] = await db.query(
            'SELECT COUNT(*) as count FROM detail_transaksi WHERE id_barang = ?',
            [id]
        );

        if (transactions[0].count > 0) {
            return res.status(400).json({
                message: 'Cannot delete item: it is referenced in transactions'
            });
        }

        await db.query('DELETE FROM barang WHERE id_barang = ?', [id]);
        res.json({ message: 'Item deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete item' });
    }
});


// 7. Transactions (Enhanced with CRUD)
// Get Recent Transactions with Details
app.get('/api/transactions', authMiddleware, async (req, res) => {
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
app.get('/api/transactions/:id/details', authMiddleware, async (req, res) => {
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
app.post('/api/transactions', authMiddleware, async (req, res) => {
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
app.delete('/api/transactions/:id', authMiddleware, async (req, res) => {
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
app.get('/api/billing/preview/:id_daftar', authMiddleware, async (req, res) => {
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

// ========================================
// MEDICAL RECORDS
// ========================================

// Add Medical Record with Prescriptions & Stock Check
app.post('/api/medical-records', authMiddleware, async (req, res) => {
    const { id_daftar, diagnosa, tindakan, catatan_dokter, prescriptions } = req.body;
    const userRole = req.session.role;

    if (userRole !== 'Dokter' && userRole !== 'Admin') {
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
app.post('/api/billing/generate', authMiddleware, async (req, res) => {
    const { id_daftar } = req.body;
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
            totalBiaya += selectedService.harga_dasar;
            items.push({
                jenis_item: 'Layanan',
                id_layanan: selectedService.id_layanan,
                id_barang: null,
                harga_saat_ini: selectedService.harga_dasar,
                qty: 1,
                subtotal: selectedService.harga_dasar
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
            const subtotal = rx.harga_satuan * rx.jumlah;
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
        const [txResult] = await connection.query(`
            INSERT INTO transaksi(id_daftar, id_pemilik, tgl_transaksi, total_biaya, diskon, metode_bayar)
        VALUES(?, ?, NOW(), ?, 0, 'Cash')
            `, [id_daftar, id_pemilik, totalBiaya]);

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
            total_biaya: totalBiaya
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
app.get('/api/services', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM layanan ORDER BY nama_layanan');
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch services' });
    }
});

// Get Medicines (Obat only)
app.get('/api/medicines', authMiddleware, async (req, res) => {
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
app.post('/api/medical-records', authMiddleware, async (req, res) => {
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
app.get('/api/patient-history', authMiddleware, async (req, res) => {
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
app.get('/api/doctor/profile', authMiddleware, async (req, res) => {
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
app.put('/api/doctor/profile', authMiddleware, async (req, res) => {
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
app.put('/api/staff/:id', authMiddleware, async (req, res) => {
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

// ==========================================
// CUSTOMER PORTAL API ENDPOINTS
// ==========================================

// Get or Create Customer Profile
app.get('/api/customer/profile', authMiddleware, async (req, res) => {
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
app.put('/api/customer/profile', authMiddleware, async (req, res) => {
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
app.get('/api/customer/dashboard', authMiddleware, async (req, res) => {
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
app.get('/api/customer/pets', authMiddleware, async (req, res) => {
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
app.post('/api/customer/pets', authMiddleware, async (req, res) => {
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
app.get('/api/customer/pets/:id/medical-records', authMiddleware, async (req, res) => {
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
app.get('/api/customer/appointments', authMiddleware, async (req, res) => {
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
app.get('/api/customer/appointments/next', authMiddleware, async (req, res) => {
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
app.get('/api/customer/transactions', authMiddleware, async (req, res) => {
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
app.get('/api/customer/transactions/:id', authMiddleware, async (req, res) => {
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

// Default Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
