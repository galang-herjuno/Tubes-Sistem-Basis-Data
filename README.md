# 🐾 Paw Whisker Pet Care System

**Sistem Manajemen Klinik Hewan Terpadu**

---

## 📋 **Deskripsi**

Paw Whisker adalah sistem manajemen klinik hewan yang lengkap dengan fitur:
- ✅ Manajemen Inventory (CRUD dengan role-based access)
- ✅ Sistem Billing Otomatis (generate dari rekam medis)
- ✅ Manajemen Staff & Profile
- ✅ Dashboard untuk Admin, Dokter, Resepsionis, dan Pelanggan
- ✅ Rekam Medis & Resep Digital
- ✅ Transaksi dengan Price Snapshot

---

## 🚀 **Quick Start**

### 1. **Prerequisites**
```bash
- Node.js v14+
- MySQL 8.0+
- npm atau yarn
```

### 2. **Installation**

```bash
# Clone repository
git clone <repository-url>
cd Tubes-Sistem-Basis-Data

# Install dependencies
npm install
```

### 3. **Database Setup**

```bash
# Login ke MySQL
mysql -u root -p

# Jalankan database.sql
mysql -u root -p < database.sql

# Atau manual:
# 1. Buka MySQL Workbench / phpMyAdmin
# 2. Import file database.sql
# 3. Database 'Paw_Whisker' akan otomatis terbuat
```

### 4. **Environment Configuration**

Buat file `.env` di root folder:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=Paw_Whisker

# Session Secret
SESSION_SECRET=your_secret_key_here

# Server Port
PORT=3000
```

### 5. **Seed Database (Data Testing)**

```bash
# Jalankan seeding script
node seed.js
```

**Output yang benar:**
```
🌱 Seeding database...

✅ Users seeded (Admin, Dokter, Resepsionis, Pelanggan)
✅ Staff seeded (with email & address)
✅ Owner seeded (linked to customer account)
✅ Pet seeded
✅ Services seeded
✅ Inventory seeded (2 low stock items for testing)
✅ Appointment seeded (today at 09:00)

✨ Seeding completed successfully!

📋 Test Accounts (username / password):
   👑 Admin:        admin / admin123
   👨‍⚕️ Doctor:       sarah / sarah123
   📋 Receptionist: resepsionis / resepsionis123
   👤 Customer:     customer / customer123

💡 Password pattern: {username}123
📊 Database ready with sample data!
```

### 6. **Run Application**

```bash
# Development mode
npm start

# Server akan berjalan di http://localhost:3000
```

---

## � **Test Accounts**

| Role | Username | Password |
|------|----------|----------|
| 👑 Admin | `admin` | `admin123` |
| 👨‍⚕️ Dokter | `sarah` | `sarah123` |
| 📋 Resepsionis | `resepsionis` | `resepsionis123` |
| 👤 Pelanggan | `customer` | `customer123` |

**Password Pattern:** `{username}123`

---

## 📊 **Database Schema**

### Tables:
1. **users** - Akun login (Admin, Dokter, Resepsionis, Pelanggan)
2. **pemilik** - Data pemilik hewan (linked to users)
3. **hewan** - Data hewan peliharaan
4. **pegawai** - Data staff (Dokter, Groomer, Staff)
5. **layanan** - Daftar layanan klinik
6. **barang** - Inventory (Obat, Makanan, Aksesoris)
7. **pendaftaran** - Appointment/jadwal kunjungan
8. **rekam_medis** - Rekam medis hewan
9. **resep_obat** - Resep obat dari dokter
10. **transaksi** - Header transaksi
11. **detail_transaksi** - Detail item transaksi

---

## 🎯 **Fitur Utama**

### 1. **Inventory Management**
- CRUD lengkap (Create, Read, Update, Delete)
- Role-based access (Admin & Resepsionis)
- Low stock alerts
- Referential integrity protection

### 2. **Billing System**
- Generate bill otomatis dari appointment
- Auto-pull harga dari layanan & resep
- Price snapshot (harga tersimpan tidak berubah)
- Duplicate prevention

### 3. **Staff Management**
- Extended profile (nama, email, alamat, spesialisasi)
- Phone number validation
- Self-service profile update

### 4. **Medical Records**
- Digital medical records
- Prescription management
- Doctor workspace

### 5. **Dashboard**
- Role-based dashboard
- Real-time statistics
- Live queue management

---

## � **Troubleshooting**

### Error: "Cannot connect to database"
```bash
# Check MySQL service
# Windows:
net start MySQL80

# Check .env credentials
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=<your_password>
```

### Error: "Table doesn't exist"
```bash
# Re-run database.sql
mysql -u root -p < database.sql
```

### Error: "Seeding failed"
```bash
# Make sure database.sql has been run first
# Check if database 'Paw_Whisker' exists:
mysql -u root -p -e "SHOW DATABASES;"

# If not exists, run:
mysql -u root -p < database.sql
```

### Error: "Access denied for user"
```bash
# Check .env file
# Make sure DB_USER and DB_PASSWORD are correct
```

---

## 📁 **Project Structure**

```
Tubes-Sistem-Basis-Data/
├── public/
│   ├── css/
│   │   └── dashboard.css
│   ├── js/
│   │   └── dashboard.js
│   ├── dashboard.html
│   ├── login.html
│   └── index.html
├── database.sql          # Database schema
├── seed.js              # Seeding script
├── server.js            # Backend API
├── .env                 # Environment config (create this)
├── package.json
└── README.md
```

---

## 🎨 **UI Features**

- ✅ Glassmorphism design
- ✅ Solid yellow branding (#f59e0b)
- ✅ Smooth animations
- ✅ Responsive layout
- ✅ Beautiful modals
- ✅ Role-based UI visibility

---

## � **Development Notes**

### Password Hashing:
- Menggunakan `bcryptjs` dengan salt rounds 10
- Password pattern: `{username}123`
- Semua password di-hash sebelum disimpan

### Role-Based Access Control:
- Frontend: CSS classes (`.role-admin`, `.role-dokter`, dll)
- Backend: Middleware `authMiddleware`
- Session-based authentication

### Database Migrations:
- Schema ada di `database.sql`
- Sample data ada di `seed.js`
- Gunakan `INSERT IGNORE` untuk prevent duplicates

---

## 🚀 **Deployment**

### Production Checklist:
- [ ] Update `.env` dengan production credentials
- [ ] Change `SESSION_SECRET` to random string
- [ ] Run `database.sql` on production DB
- [ ] Run `seed.js` (optional, for demo data)
- [ ] Set `NODE_ENV=production`
- [ ] Configure reverse proxy (nginx/apache)

---

## 📞 **Support**

Jika ada error atau pertanyaan:
1. Check `TROUBLESHOOTING` section di atas
2. Check console logs (browser & server)
3. Verify database connection
4. Check `.env` configuration

---

## 📚 **Documentation**

- `IMPLEMENTATION_PLAN.md` - Detailed implementation guide
- `TESTING_GUIDE.md` - Testing instructions
- `UI_ENHANCEMENT_REPORT.md` - UI improvements
- `COMPLETE_REPORT.md` - Feature completion status

---

## ✨ **Credits**

**Developed by:** Paw Whisker Team  
**Tech Stack:** Node.js, Express, MySQL, Vanilla JS  
**UI Design:** Glassmorphism with Yellow Branding

---

**Last Updated:** 2026-01-03  
**Version:** 1.0.0  
**Status:** Production Ready ✅