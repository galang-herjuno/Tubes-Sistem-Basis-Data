const express = require('express');
const router = express.Router();
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authMiddleware, authorizeRole } = require('../middlewares/auth');

// Get Single Owner
router.get('/api/owners/:id', authMiddleware, async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM pemilik WHERE id_pemilik = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ message: 'Owner not found' });
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch owner' });
    }
});

// Get All Owners (with Pet count)
// Get All Owners (Optimized: Divide & Conquer Strategy)
router.get('/api/owners', authMiddleware, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        // 1. Fetch Owners First (Avoiding massive LEFT JOIN & SELECT *)
        let ownerQuery = 'SELECT id_pemilik, id_user, nama_pemilik, alamat, no_hp, email FROM pemilik';
        let countQuery = 'SELECT COUNT(*) as total FROM pemilik';
        let queryParams = [];
        let countParams = [];

        if (search) {
            // Optimized Search: Prefix match only for Index usage
            const searchClause = ' WHERE nama_pemilik LIKE ?';
            ownerQuery += searchClause;
            countQuery += searchClause;
            // Use prefix wildcard (search%) instead of %search%
            queryParams.push(`${search}%`);
            countParams.push(`${search}%`);
        }

        ownerQuery += ' ORDER BY id_pemilik DESC LIMIT ? OFFSET ?';
        queryParams.push(limit, offset);

        // Get Total Count (Cheap count on single table)
        const [countResult] = await db.query(countQuery, countParams);
        const totalRecords = countResult[0].total;
        const totalPages = Math.ceil(totalRecords / limit);

        // Fetch Paginated Owners
        const [owners] = await db.query(ownerQuery, queryParams);

        if (owners.length === 0) {
            return res.json({
                data: [],
                pagination: { totalRecords, totalPages, currentPage: page, limit }
            });
        }

        // 2. Fetch Pet Counts for these specific owners (IN clause)
        const ownerIds = owners.map(o => o.id_pemilik);
        const [petCounts] = await db.query(`
            SELECT id_pemilik, COUNT(*) as count 
            FROM hewan 
            WHERE id_pemilik IN (?) 
            GROUP BY id_pemilik
        `, [ownerIds]);

        // 3. Map Counts to Owners
        const mappedOwners = owners.map(o => {
            const countData = petCounts.find(c => c.id_pemilik === o.id_pemilik);
            return { ...o, pet_count: countData ? countData.count : 0 };
        });

        res.json({
            data: mappedOwners,
            pagination: {
                totalRecords,
                totalPages,
                currentPage: page,
                limit
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch owners' });
    }
});

// Create Owner (with auto-generated user account)
router.post('/api/owners', authMiddleware, async (req, res) => {
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
router.put('/api/owners/:id', authMiddleware, async (req, res) => {
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
router.delete('/api/owners/:id', authMiddleware, async (req, res) => {
    try {
        await db.query('DELETE FROM pemilik WHERE id_pemilik = ?', [req.params.id]);
        res.json({ message: 'Owner deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to delete owner' });
    }
});



module.exports = router;
