const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createAdmin() {
    const config = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    };

    let connection;
    try {
        console.log('Connecting to database...');
        connection = await mysql.createConnection(config);

        console.log('Checking for admin user...');
        const [users] = await connection.query('SELECT * FROM users WHERE username = ?', ['admin']);

        if (users.length === 0) {
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
        console.error('Error:', err);
    } finally {
        if (connection) await connection.end();
    }
}

createAdmin();
