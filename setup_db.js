require('dotenv').config();
const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function setupDatabase() {
    try {
        console.log('Setting up database...');

        // Create Users Table
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;

        await db.query(createTableQuery);
        console.log('Users table checked/created.');

        // Check if test user exists
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', ['test@example.com']);

        if (users.length === 0) {
            const hashedPassword = await bcrypt.hash('password123', 10);
            await db.query('INSERT INTO users (email, password) VALUES (?, ?)', ['test@example.com', hashedPassword]);
            console.log('Test user created: email=test@example.com, password=password123');
        } else {
            console.log('Test user already exists.');
        }

        process.exit();
    } catch (err) {
        console.error('Error setting up database:', err);
        process.exit(1);
    }
}

setupDatabase();
