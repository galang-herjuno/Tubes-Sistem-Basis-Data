const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function seed() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('🌱 Seeding database...\n');

        // Generate password hashes (username + '123')
        const adminHash = await bcrypt.hash('admin123', 10);
        const doctorHash = await bcrypt.hash('sarah123', 10);
        const receptionHash = await bcrypt.hash('resepsionis123', 10);
        const customerHash = await bcrypt.hash('customer123', 10);
        const groomerHash = await bcrypt.hash('groomer123', 10);

        // 1. Users (All roles for testing)
        await connection.query(`INSERT IGNORE INTO users (username, password, role) VALUES 
            ('admin', '${adminHash}', 'Admin'),
            ('sarah', '${doctorHash}', 'Dokter'),
            ('resepsionis', '${receptionHash}', 'Resepsionis'),
            ('customer', '${customerHash}', 'Pelanggan'),
            ('groomer', '${groomerHash}', 'Groomer')`);
        console.log('✅ Users seeded (Admin, Dokter, Resepsionis, Pelanggan, Groomer)');

        // 2. Staff (with email and alamat)
        // Assumption: IDs are sequential 1=Admin, 2=Doctor, 3=Recep, 4=Cust, 5=Groomer
        await connection.query(`INSERT IGNORE INTO pegawai (id_user, nama_lengkap, jabatan, spesialisasi, no_hp, email, alamat) VALUES 
            (1, 'Admin User', 'Staff', NULL, '081234567889', 'admin@pawwhisker.com', 'Jl. Admin No. 1'),
            (2, 'Dr. Sarah Johnson', 'Dokter Hewan', 'Surgery', '081234567890', 'sarah@pawwhisker.com', 'Jl. Veteriner No. 10'),
            (3, 'Maria Garcia', 'Staff', NULL, '081234567891', 'maria@pawwhisker.com', 'Jl. Klinik No. 5'),
            (5, 'Jane Groomer', 'Groomer', 'Styling', '081234567899', 'jane@pawwhisker.com', 'Jl. Hobi No. 7')`);
        console.log('✅ Staff seeded (Admin, Doctor, Receptionist, Groomer)');

        // 3. Owner (linked to customer account)
        await connection.query(`INSERT IGNORE INTO pemilik (id_user, nama_pemilik, alamat, no_hp, email) VALUES 
            (4, 'Alice Williams', 'Jl. Merdeka No. 123', '081234567892', 'alice@email.com')`);
        console.log('✅ Owner seeded (linked to customer account)');

        // 4. Pet
        await connection.query(`INSERT IGNORE INTO hewan (id_pemilik, nama_hewan, jenis_hewan, ras, gender, tgl_lahir, berat) VALUES 
            (1, 'Whiskers', 'Kucing', 'Persian', 'Betina', '2022-03-15', 4.5)`);
        console.log('✅ Pet seeded');

        // 5. Services
        await connection.query(`INSERT IGNORE INTO layanan (nama_layanan, harga_dasar, deskripsi) VALUES 
            ('Konsultasi Umum', 150000, 'Pemeriksaan kesehatan umum'),
            ('Vaksinasi', 200000, 'Vaksinasi lengkap'),
            ('Grooming', 100000, 'Mandi dan grooming')`);
        console.log('✅ Services seeded');

        // 6. Inventory (with low stock items for testing)
        await connection.query(`INSERT IGNORE INTO barang (nama_barang, kategori, stok, harga_satuan, satuan) VALUES 
            ('Amoxicillin 500mg', 'Obat', 50, 15000, 'Tablet'),
            ('Vitamin B Complex', 'Obat', 30, 25000, 'Tablet'),
            ('Obat Cacing', 'Obat', 3, 35000, 'Tablet'),
            ('Obat Kutu', 'Obat', 2, 120000, 'Pipet'),
            ('Royal Canin 2kg', 'Makanan', 10, 250000, 'Pack')`);
        console.log('✅ Inventory seeded (2 low stock items for testing)');

        // 7. Appointment (for today)
        const today = new Date().toISOString().split('T')[0];
        await connection.query(`INSERT IGNORE INTO pendaftaran (id_hewan, id_pegawai, tgl_kunjungan, keluhan_awal, status) VALUES 
            (1, 1, '${today} 09:00:00', 'Kucing tidak mau makan', 'Menunggu'),
            (1, 5, '${today} 11:00:00', '[Grooming] Treatment bulu', 'Menunggu')`);
        console.log('✅ Appointment seeded (Doctor & Grooming)');

        console.log('\n✨ Seeding completed successfully!');
        console.log('\n📋 Test Accounts (username / password):');
        console.log('   👑 Admin:        admin / admin123');
        console.log('   👨‍⚕️ Doctor:       sarah / sarah123');
        console.log('   📋 Receptionist: resepsionis / resepsionis123');
        console.log('   👤 Customer:     customer / customer123');
        console.log('   ✂️ Groomer:      groomer / groomer123');
        console.log('\n💡 Password pattern: {username}123');
        console.log('📊 Database ready with sample data!\n');

    } catch (err) {
        console.error('❌ Seeding Error:', err.message);
        console.error('\n💡 Troubleshooting:');
        console.error('   1. Make sure database.sql has been run first');
        console.error('   2. Check .env file for correct database credentials');
        console.error('   3. Ensure MySQL server is running');
        process.exit(1);
    } finally {
        await connection.end();
    }
}

seed();
