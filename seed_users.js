const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seedUsers() {
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

        const users = [
            { username: 'dokter', password: 'dokter123', role: 'Dokter' },
            { username: 'resepsionis', password: 'resepsionis123', role: 'Resepsionis' }
        ];

        for (const user of users) {
            const [existing] = await connection.query('SELECT * FROM users WHERE username = ?', [user.username]);
            if (existing.length === 0) {
                const hashed = await bcrypt.hash(user.password, 10);
                await connection.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
                    [user.username, hashed, user.role]);
                console.log(`User created: ${user.username}`);
            } else {
                console.log(`User already exists: ${user.username}`);
            }
        }

        // Also ensure Admin exists (already handled but good to double check)

    } catch (err) {
        console.error('Error seeding users:', err);
    } finally {
        if (connection) await connection.end();
    }
}

seedUsers();
