require('dotenv').config();
const db = require('./logic/config/db');

async function test() {
    try {
        const page = 1;
        const limit = 10;
        const offset = 0;
        const search = '';
        const category = '';

        let query = 'SELECT * FROM barang';
        let countQuery = 'SELECT COUNT(*) as total FROM barang';
        const params = [];
        const countParams = [];

        const conditions = [];
        if (search) {
            conditions.push('nama_barang LIKE ?');
            params.push(`%${search}%`);
            countParams.push(`%${search}%`);
        }
        if (category) {
            conditions.push('kategori = ?');
            params.push(category);
            countParams.push(category);
        }

        if (conditions.length > 0) {
            const whereClause = ' WHERE ' + conditions.join(' AND ');
            query += whereClause;
            countQuery += whereClause;
        }

        query += ' ORDER BY nama_barang ASC LIMIT ? OFFSET ?';
        params.push(limit, offset);

        console.log('Query:', query);
        console.log('Params:', params);

        const [countResult] = await db.query(countQuery, countParams);
        console.log('Count:', countResult[0].total);

        const [rows] = await db.query(query, params);
        console.log('Rows:', rows.length);
        process.exit(0);

    } catch (err) {
        console.error('Test Failed:', err);
        process.exit(1);
    }
}

test();
