-- ==========================================
-- PAW WHISKER CLINIC MANAGEMENT SYSTEM
-- Database Schema Definition
-- ==========================================
-- Last Updated: 2026-01-02
-- 
-- CHANGELOG:
-- - 2026-01-02: Added 'Pelanggan' role to users table
-- - Initial schema includes complete clinic management structure
--
-- STRUCTURE OVERVIEW:
-- 1. Master Data: users, pemilik, hewan, pegawai, layanan, barang
-- 2. Operations: pendaftaran, rekam_medis, resep_obat
-- 3. Transactions: transaksi, detail_transaksi
-- ==========================================

CREATE DATABASE IF NOT EXISTS Paw_Whisker;
USE Paw_Whisker;

-- ==========================================
-- A. MASTER DATA (Data Induk)
-- ==========================================

-- 2. Tabel Users (Akun Login)
-- Updated: 2026-01-02 - Added 'Pelanggan' role for public registration
CREATE TABLE users (
    id_user INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('Admin', 'Dokter', 'Resepsionis', 'Pelanggan') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabel Pemilik (Owner Hewan)
-- Updated: 2026-01-02 - Added id_user to link with customer accounts
CREATE TABLE pemilik (
    id_pemilik INT AUTO_INCREMENT PRIMARY KEY,
    id_user INT UNIQUE, -- Link to users table (for Pelanggan role)
    nama_pemilik VARCHAR(100) NOT NULL,
    alamat VARCHAR(255),
    no_hp VARCHAR(20),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_user) REFERENCES users(id_user) ON DELETE SET NULL
);

-- 4. Tabel Hewan (Pet)
CREATE TABLE hewan (
    id_hewan INT AUTO_INCREMENT PRIMARY KEY,
    id_pemilik INT NOT NULL,
    nama_hewan VARCHAR(50) NOT NULL,
    jenis_hewan ENUM('Kucing', 'Anjing', 'Lainnya') NOT NULL,
    ras VARCHAR(50),
    gender ENUM('Jantan', 'Betina') NOT NULL,
    tgl_lahir DATE,
    berat DECIMAL(5,2), -- Contoh: 12.50 kg
    FOREIGN KEY (id_pemilik) REFERENCES pemilik(id_pemilik) ON DELETE CASCADE
);

-- 5. Tabel Pegawai (Dokter & Groomer)
CREATE TABLE pegawai (
    id_pegawai INT AUTO_INCREMENT PRIMARY KEY,
    id_user INT UNIQUE, -- Link ke tabel User (opsional, bisa NULL jika pegawai blm punya akun)
    nama_lengkap VARCHAR(100) NOT NULL,
    jabatan ENUM('Dokter Hewan', 'Groomer', 'Staff') NOT NULL,
    spesialisasi VARCHAR(100), -- Bisa NULL
    no_hp VARCHAR(20),
    email VARCHAR(100),
    alamat VARCHAR(255),
    FOREIGN KEY (id_user) REFERENCES users(id_user) ON DELETE SET NULL
);

-- 6. Tabel Layanan (Jasa)
CREATE TABLE layanan (
    id_layanan INT AUTO_INCREMENT PRIMARY KEY,
    nama_layanan VARCHAR(100) NOT NULL,
    harga_dasar DECIMAL(10,2) NOT NULL,
    deskripsi TEXT
);

-- 7. Tabel Barang (Inventory: Obat & Produk)
CREATE TABLE barang (
    id_barang INT AUTO_INCREMENT PRIMARY KEY,
    nama_barang VARCHAR(100) NOT NULL,
    kategori ENUM('Obat', 'Makanan', 'Aksesoris', 'Lainnya') NOT NULL,
    stok INT DEFAULT 0,
    harga_satuan DECIMAL(10,2) NOT NULL,
    satuan VARCHAR(20) -- Pcs, Botol, Kg
);

-- ==========================================
-- B. OPERASIONAL (Kegiatan Klinik)
-- ==========================================

-- 8. Tabel Pendaftaran (Jadwal/Appointment)
CREATE TABLE pendaftaran (
    id_daftar INT AUTO_INCREMENT PRIMARY KEY,
    id_hewan INT NOT NULL,
    id_pegawai INT NOT NULL, -- Dokter/Groomer yang menangani
    tgl_kunjungan DATETIME NOT NULL,
    keluhan_awal TEXT,
    status ENUM('Menunggu', 'Diperiksa', 'Selesai', 'Batal') DEFAULT 'Menunggu',
    FOREIGN KEY (id_hewan) REFERENCES hewan(id_hewan) ON DELETE CASCADE,
    FOREIGN KEY (id_pegawai) REFERENCES pegawai(id_pegawai) ON DELETE RESTRICT
);

-- 9. Tabel Rekam Medis (Medical Record)
CREATE TABLE rekam_medis (
    id_rekam INT AUTO_INCREMENT PRIMARY KEY,
    id_daftar INT NOT NULL,
    diagnosa TEXT,
    tindakan TEXT,
    catatan_dokter TEXT,
    tgl_periksa TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_daftar) REFERENCES pendaftaran(id_daftar) ON DELETE CASCADE
);

-- 10. Tabel Resep Obat (Penggunaan obat di rekam medis)
CREATE TABLE resep_obat (
    id_resep INT AUTO_INCREMENT PRIMARY KEY,
    id_rekam INT NOT NULL,
    id_barang INT NOT NULL, -- Harus barang kategori 'Obat'
    jumlah INT NOT NULL,
    aturan_pakai VARCHAR(100),
    FOREIGN KEY (id_rekam) REFERENCES rekam_medis(id_rekam) ON DELETE CASCADE,
    FOREIGN KEY (id_barang) REFERENCES barang(id_barang) ON DELETE RESTRICT
);

-- ==========================================
-- C. TRANSAKSI (Keuangan)
-- ==========================================

-- 11. Tabel Transaksi (Header Nota)
CREATE TABLE transaksi (
    id_transaksi INT AUTO_INCREMENT PRIMARY KEY,
    id_daftar INT, -- Bisa NULL jika beli barang doang tanpa service
    id_pemilik INT, -- Bisa NULL (Guest) atau ambil dari id_daftar
    tgl_transaksi DATETIME DEFAULT CURRENT_TIMESTAMP,
    total_biaya DECIMAL(12,2) DEFAULT 0,
    diskon DECIMAL(12,2) DEFAULT 0,
    tipe_diskon ENUM('nominal', 'persen') DEFAULT 'nominal',
    input_diskon DECIMAL(12,2) DEFAULT 0,
    metode_bayar ENUM('Cash', 'Debit', 'QRIS', 'Transfer') NOT NULL,
    FOREIGN KEY (id_daftar) REFERENCES pendaftaran(id_daftar) ON DELETE SET NULL,
    FOREIGN KEY (id_pemilik) REFERENCES pemilik(id_pemilik) ON DELETE SET NULL
);

-- 12. Tabel Detail Transaksi (Isi Nota)
-- Catatan: Kita pakai 2 kolom FK terpisah (id_layanan & id_barang) agar mudah di-JOIN
CREATE TABLE detail_transaksi (
    id_detail INT AUTO_INCREMENT PRIMARY KEY,
    id_transaksi INT NOT NULL,
    jenis_item ENUM('Layanan', 'Barang') NOT NULL,
    id_layanan INT, -- Diisi jika jenis_item = Layanan
    id_barang INT,  -- Diisi jika jenis_item = Barang
    harga_saat_ini DECIMAL(10,2) NOT NULL, -- Harga snapshot saat transaksi
    qty INT NOT NULL DEFAULT 1,
    subtotal DECIMAL(12,2) NOT NULL, -- (harga * qty)
    FOREIGN KEY (id_transaksi) REFERENCES transaksi(id_transaksi) ON DELETE CASCADE,
    FOREIGN KEY (id_layanan) REFERENCES layanan(id_layanan),
    FOREIGN KEY (id_barang) REFERENCES barang(id_barang)
);

-- ==========================================
-- END OF SCHEMA DEFINITION
-- ==========================================
-- 
-- To populate with sample data, run: node seed.js
-- 
-- ==========================================