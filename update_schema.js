const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateSchema() {
    const config = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    };

    try {
        const connection = await mysql.createConnection(config);
        console.log('Connected to database.');

        // Alter users table to add 'Pelanggan' to enum
        try {
            await connection.query("ALTER TABLE users MODIFY COLUMN role ENUM('Admin', 'Dokter', 'Resepsionis', 'Pelanggan') NOT NULL");
            console.log("Successfully updated 'role' ENUM in 'users' table.");
        } catch (e) {
            console.log("Error updating users enum (might time out or already exist):", e.message);
        }

        await connection.end();
    } catch (err) {
        console.error('Database connection failed:', err);
    }
}

updateSchema();
