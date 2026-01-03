const mysql = require('mysql2/promise');
require('dotenv').config();

async function verify() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('🔍 Verifying User and Employee Logic Fixes\n');

        // Check 1: Verify all staff roles have pegawai records
        console.log('=== Check 1: Admin/Doctor/Receptionist in pegawai table ===');
        const [staffRecords] = await connection.query(`
            SELECT u.username, u.role, p.nama_lengkap, p.jabatan, p.email 
            FROM users u 
            LEFT JOIN pegawai p ON u.id_user = p.id_user 
            WHERE u.role IN ('Admin', 'Dokter', 'Resepsionis')
            ORDER BY u.id_user
        `);

        console.table(staffRecords);

        const missingPegawai = staffRecords.filter(r => !r.nama_lengkap);
        if (missingPegawai.length > 0) {
            console.log('❌ FAILED: Some staff users are missing pegawai records');
        } else {
            console.log('✅ PASSED: All staff users have pegawai records\n');
        }

        // Check 2: Verify owner has user account
        console.log('=== Check 2: Owners with user accounts ===');
        const [ownerRecords] = await connection.query(`
            SELECT u.username, u.role, pm.nama_pemilik, pm.email 
            FROM pemilik pm
            LEFT JOIN users u ON pm.id_user = u.id_user 
            ORDER BY pm.id_pemilik
        `);

        console.table(ownerRecords);

        const ownersWithAccounts = ownerRecords.filter(r => r.username);
        console.log(`✅ ${ownersWithAccounts.length} out of ${ownerRecords.length} owners have user accounts\n`);

        console.log('=== Summary ===');
        console.log(`Staff with pegawai records: ${staffRecords.length - missingPegawai.length}/${staffRecords.length}`);
        console.log(`Owners with user accounts: ${ownersWithAccounts.length}/${ownerRecords.length}`);

    } catch (err) {
        console.error('❌ Verification Error:', err.message);
    } finally {
        await connection.end();
    }
}

verify();
