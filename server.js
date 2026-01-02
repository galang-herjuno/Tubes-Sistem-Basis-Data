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
app.get('/dashboard', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
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
    // Default role is 'Pelanggan' for public registration
    const { username, password } = req.body;
    const role = 'Pelanggan';

    if (!username || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        // Check if user exists
        const [existing] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        await db.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [username, hashedPassword, role]);

        res.json({ message: 'Account created successfully' });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Internal server error' });
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

// 2. Live Queue
app.get('/api/dashboard/queue', authMiddleware, async (req, res) => {
    try {
        const query = `
            SELECT p.id_daftar, h.nama_hewan, peg.nama_lengkap as dokter, 
                   DATE_FORMAT(p.tgl_kunjungan, '%H:%i') as jam, p.status 
            FROM pendaftaran p 
            JOIN hewan h ON p.id_hewan = h.id_hewan 
            JOIN pegawai peg ON p.id_pegawai = peg.id_pegawai 
            WHERE DATE(p.tgl_kunjungan) = CURRENT_DATE 
            ORDER BY p.tgl_kunjungan ASC
        `;
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
            SELECT DATE_FORMAT(tgl_transaksi, '%Y-%m-%d') as date, SUM(total_biaya) as total 
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
            GROUP BY dt.id_layanan 
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

// Create Owner
app.post('/api/owners', authMiddleware, async (req, res) => {
    const { nama_pemilik, no_hp, alamat, email } = req.body;
    try {
        const [result] = await db.query('INSERT INTO pemilik (nama_pemilik, no_hp, alamat, email) VALUES (?, ?, ?, ?)',
            [nama_pemilik, no_hp, alamat, email]);
        res.json({ message: 'Owner added', id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to add owner' });
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

// 7. Transactions
// Get Recent Transactions
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

// Default Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
