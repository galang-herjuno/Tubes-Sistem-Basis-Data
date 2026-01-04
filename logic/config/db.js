const mysql = require('mysql2');

const dbName = process.env.DB_NAME || 'test';
if (!process.env.DB_NAME) {
    console.warn('Warning: DB_NAME environment variable not set. Defaulting to "test". Set DB_NAME in .env to target the correct database.');
}

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
    waitForConnections: true,
    connectionLimit: 50,
    queueLimit: 0
});

module.exports = pool.promise();
