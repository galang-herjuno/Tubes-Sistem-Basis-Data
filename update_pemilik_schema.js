const mysql = require('mysql2/promise');
require('dotenv').config();

async function updatePemilikSchema() {
    const config = {
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    };

    try {
        const connection = await mysql.createConnection(config);
        console.log('Connected to database.');

        // Check if id_user column exists
        const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'pemilik' AND COLUMN_NAME = 'id_user'
        `, [process.env.DB_NAME]);

        if (columns.length === 0) {
            console.log('Adding id_user column to pemilik table...');

            // Add id_user column
            await connection.query(`
                ALTER TABLE pemilik 
                ADD COLUMN id_user INT UNIQUE AFTER id_pemilik
            `);

            // Add foreign key constraint
            await connection.query(`
                ALTER TABLE pemilik 
                ADD CONSTRAINT fk_pemilik_user 
                FOREIGN KEY (id_user) REFERENCES users(id_user) ON DELETE SET NULL
            `);

            console.log('Successfully added id_user column and foreign key to pemilik table.');
        } else {
            console.log('id_user column already exists in pemilik table.');
        }

        await connection.end();
    } catch (err) {
        console.error('Database update failed:', err);
    }
}

updatePemilikSchema();
