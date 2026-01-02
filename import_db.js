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

        // Try to detect a USE statement in the SQL file so we can switch DB if env not provided
        const useMatch = sqlContent.match(/USE\s+`?([A-Za-z0-9_]+)`?;/i);
        const detectedDb = useMatch ? useMatch[1] : null;

        console.log('Executing SQL script...');
        // Execute the entire script
        // Note: mysql2 support multiple statements if configured
        await connection.query(sqlContent);

        console.log('Database imported successfully from database.sql');

        // Add a test user if one doesn't exist (because the SQL file creates tables but maybe not data)
        // Switch to the configured database name or the one detected in the SQL file
        const targetDb = process.env.DB_NAME || detectedDb;
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
