const mysql = require('mysql2/promise');
require('dotenv').config();

async function runAnalysis() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    console.log('\n🔍 EXPLAIN ANALYZE DEMONSTRATION');
    console.log('Query: SELECT * FROM pemilik WHERE nama_pemilik LIKE "Ali%" LIMIT 5');
    console.log('---------------------------------------------------');

    try {
        // Note: EXPLAIN ANALYZE is available in MySQL 8.0.18+
        // If older version, it might fail or just return EXPLAIN
        const [results] = await connection.query('EXPLAIN ANALYZE SELECT * FROM pemilik WHERE nama_pemilik LIKE "Ali%" LIMIT 5');

        console.log('Output Analysis:');
        // The result of EXPLAIN ANALYZE usually comes in the first column of the first row
        console.log(Object.values(results[0])[0]);

    } catch (err) {
        console.log('⚠️  Error running EXPLAIN ANALYZE (Update MySQL to 8.0+ if needed):');
        console.log(err.message);

        // Fallback to simple EXPLAIN
        console.log('\nRunning standard EXPLAIN instead:');
        const [explain] = await connection.query('EXPLAIN SELECT * FROM pemilik WHERE nama_pemilik LIKE "Ali%" LIMIT 5');
        console.table(explain);
    } finally {
        await connection.end();
    }
}

runAnalysis();
