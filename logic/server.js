const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let db;
try {
    db = require('./config/db');
} catch (error) {
    console.error("Database module error:", error);
}

if (!db) {
    console.error('Database module not available. Exiting to avoid runtime errors in routes.');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret_key_sbd_tubes',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));

const { authMiddleware, authorizeRole } = require('./middlewares/auth');

// Modular Routes
app.use('/', require('./routes/pages'));
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/users'));
app.use('/', require('./routes/appointments'));
app.use('/', require('./routes/dashboard'));
app.use('/', require('./routes/owners'));
app.use('/', require('./routes/pets'));
app.use('/', require('./routes/staff'));
app.use('/', require('./routes/inventory'));
app.use('/', require('./routes/transactions'));
app.use('/', require('./routes/medical_records'));
app.use('/', require('./routes/customer'));

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
