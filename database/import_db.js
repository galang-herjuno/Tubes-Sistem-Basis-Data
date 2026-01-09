const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function importDatabase() {
    const config = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || undefined,
        multipleStatements: true // Allow multiple statements
    };

    let connection;

    try {
        console.log('Connecting to MySQL server...');
        connection = await mysql.createConnection(config);
        console.log('Connected.');

        const sqlPath = path.join(__dirname, 'database.sql');
        console.log(`Reading SQL file from: ${sqlPath}`);

        const sqlContent = fs.readFileSync(sqlPath, 'utf8');

        if (!sqlContent || sqlContent.trim().length === 0) {
            console.error('File database.sql is empty via fs.readFileSync! Aborting import.');
            return;
        }


        // Execute the entire script
        await connection.query(sqlContent);

        console.log('Database imported successfully from database.sql');

        // Switch to the configured database name or the one detected in the SQL file
        const targetDb = process.env.DB_NAME;
        if (targetDb) {
            await connection.changeUser({ database: targetDb });
        } else {
            console.warn('No target database name (env DB_NAME or USE statement) detected - skipping user seeding.');
        }

        let users = [];
        if (targetDb) {
            [users] = await connection.query('SELECT * FROM users WHERE username = ?', ['admin']);
        }
        if (users.length === 0) {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await connection.query(
                "INSERT INTO users (username, password, role) VALUES (?, ?, 'Admin')",
                ['admin', hashedPassword]
            );
            console.log('Test admin user created: username=admin, password=admin123');
        } else {
            console.log('Admin user already exists.');
        }

    } catch (err) {
        console.error('Error importing database:', err);
    } finally {
        if (connection) await connection.end();
    }
}

importDatabase();
