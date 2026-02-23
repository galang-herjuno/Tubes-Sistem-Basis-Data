require('dotenv').config();
const express = require('express');
const path = require('path');
// const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
/*
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
*/

// Test Database Connection
/*
app.get('/api/test-db', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 + 1 AS solution');
        res.json({ message: 'Database connected successfully', solution: rows[0].solution });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database connection failed', details: err.message });
    }
});
*/
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
