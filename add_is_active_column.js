const mysql = require('mysql2/promise');
require('dotenv').config();

async function addIsActiveColumn() {
    const config = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    };

    let connection;
    try {
        connection = await mysql.createConnection(config);
        console.log('Connected to database.');

        // Add is_active column to barang table
        try {
            await connection.query("ALTER TABLE barang ADD COLUMN is_active TINYINT(1) DEFAULT 1");
            console.log("Successfully added 'is_active' column to 'barang' table.");
        } catch (e) {
            // Check if error is because column already exists (duplicate column name)
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log("'is_active' column already exists in 'barang' table.");
            } else {
                console.log("Error adding column:", e.message);
            }
        }

        await connection.end();
    } catch (err) {
        console.error('Database connection failed:', err);
        if (connection) await connection.end();
    }
}

addIsActiveColumn();
