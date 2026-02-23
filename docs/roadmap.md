# 🚀 Roadmap & System Documentation
Aplikasi Klinik Hewan "Paw Whisker"

---

## 🏗️ Fase 1: Modularisasi & Arsitektur Backend (Selesai)
Fase ini berfokus pada **pemisahan *layer*** agar kode tidak menumpuk di satu tempat (`server.js` yang tadinya 2.200+ baris).

**Yang Sudah Dilakukan:**
1. ✅ Memecah struktur `server.js` menjadi beberapa file router berdasarkan fungsi:
   - `routes/auth.js` (Login/Logout)
   - `routes/users.js` (Registrasi & Akses User)
   - `routes/appointments.js` (Pendaftaran Antrean)
   - `routes/owners.js` & `routes/pets.js` (Data Pelanggan & Hewan)
   - `routes/inventory.js` (Obat/Barang)
   - `routes/transactions.js` (Billing & Kasir)
   - `routes/staff.js`, `routes/dashboard.js`, dll.
2. ✅ Memisahkan `authMiddleware` dan fungsi pengecek Role ke dalam `middlewares/auth.js`.
3. ✅ Menghapus *Legacy Code* berupa file statis `dashboard.js` yang ukurannya mencapai 2.700 baris, karena ternyata aplikasi sudah menggunakan versi pecahan di `public/js/pages/`.

---

## 🛡️ Fase 2: Quality Assurance & Proteksi Bug (Sedang Berlangsung)
Fase ini berfokus pada **penambahan keamanan dan konsistensi data** melalui validasi skema.

**Yang Sudah Dilakukan:**
1. ✅ Memasang pustaka / library integrasi data: **Zod**.
2. ✅ Membuat asisten validasi global `middlewares/validator.js` untuk mengecek dan menolak jenis request (form input) yang kotor/tidak baku dari sisi *user* sebelum masuk membebani *database*.
3. ✅ Menerapkan Zod Schema pada Rute `POST /api/login`. Mengurangi risiko terjadinya pembacaan format kosong.
4. ✅ Memperbaiki koneksi *pathing* `sendFile()` dari Express (*bug folder resolution/ENOENT*). 

**Yang Akan Dilakukan:**
1. ⏳ Menerapkan `schema Zod` pada titik pendaftaran (*Register*).
2. ⏳ Menyeragamkan cara server memberikan *error notification* (Global Error Handler API) kepada sisi *Frontend*/Tampilan layar jika terjadi *bug logic* kasir.

---

## 📈 Fase 3: Skalabilitas (*Scalability*) (Mendatang)
Fase ini dilakukan untuk mengubah bagaimana server menyimpan sementara (*caching*) agar performa saat trafik padat tetap konstan.

**Langkah Terjadwal:**
1. ⏳ Merubah memori bawaan (In-Memory `express-session`) ke **Redis** atau **MySQL-Session Store**. Hal ini agar jika pengguna dipaksa beralih tab/*browser* atau jika node server dimatikan (seperti `npm run dev` tadi), sesi *login* pengguna tidak otomatis ter-reset/"terlogout".
2. ⏳ Menguji dan menyiapkan sistem multi-core (Cluster Server PM2).

---

## 🎨 Fase 4: Konsistensi UI (*User Interface*) (Mendatang)
Fase untuk mempermudah perombakan visual dan gaya elemen.

**Langkah Terjadwal:**
1. ⏳ Mendefinisikan **Design System** (Palet warna, tombol, *margin*, tabel kasir) ke dalam satu file variabel CSS untuk menjamin standardisasi di seluruh penjuru aplikasi (Admin, Dokter, Pelanggan, Resepsionis). 
2. ⏳ Menyeragamkan UI *alert / warning*, yang sebelumnya hanya menggunakan komponen `alert(...)` bawaan peramban (*browser*), menjadi komponen Toast modern dan elegan di seluruh pojok kanan atas aplikasi.
