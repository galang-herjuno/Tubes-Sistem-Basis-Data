# 🚀 QUICK SETUP GUIDE - Untuk Teman

**Panduan Setup Cepat Paw Whisker System**

---

## ⚡ **Setup dalam 5 Langkah**

### **Step 1: Install Dependencies**

```bash
npm install
```

**Yang akan terinstall:**
- express (backend framework)
- mysql2 (database driver)
- bcryptjs (password hashing)
- express-session (session management)
- dotenv (environment variables)

---

### **Step 2: Setup Database**

**Option A: Via Command Line (Recommended)**
```bash
# Login ke MySQL
mysql -u root -p

# Jalankan schema
mysql -u root -p < database.sql
```

**Option B: Via MySQL Workbench / phpMyAdmin**
1. Buka MySQL Workbench
2. File → Run SQL Script
3. Pilih `database.sql`
4. Execute

**Hasil:** Database `Paw_Whisker` dengan 12 tabel akan terbuat.

---

### **Step 3: Buat File .env**

Buat file baru bernama `.env` di root folder (sejajar dengan `server.js`):

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=Paw_Whisker
SESSION_SECRET=paw_whisker_secret_2024
PORT=3000
```

**⚠️ PENTING:** Ganti `your_mysql_password_here` dengan password MySQL kamu!

---

### **Step 4: Seed Database (Data Testing)**

```bash
node seed.js
```

**Output yang BENAR:**
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
```

**Jika ERROR:**
- ❌ "Cannot connect to database" → Check `.env` file
- ❌ "Table doesn't exist" → Run `database.sql` dulu
- ❌ "Access denied" → Check MySQL password di `.env`

---

### **Step 5: Run Server**

```bash
npm start
```

**Output yang BENAR:**
```
Server running on http://localhost:3000
Connected to MySQL database: Paw_Whisker
```

**Buka browser:** http://localhost:3000

---

## 🔑 **Login Credentials**

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Dokter | `sarah` | `sarah123` |
| Resepsionis | `resepsionis` | `resepsionis123` |
| Pelanggan | `customer` | `customer123` |

---

## ❗ **Common Errors & Solutions**

### Error 1: "Cannot find module 'express'"
```bash
# Solution:
npm install
```

### Error 2: "ER_ACCESS_DENIED_ERROR"
```bash
# Solution:
# Check .env file, pastikan DB_PASSWORD benar
# Test login MySQL manual:
mysql -u root -p
```

### Error 3: "ER_BAD_DB_ERROR: Unknown database 'Paw_Whisker'"
```bash
# Solution:
# Run database.sql dulu:
mysql -u root -p < database.sql
```

### Error 4: "ER_NO_SUCH_TABLE: Table 'Paw_Whisker.users' doesn't exist"
```bash
# Solution:
# Database belum di-create, run:
mysql -u root -p < database.sql
```

### Error 5: Seeding error "Duplicate entry"
```bash
# Solution:
# Ini normal jika run seed.js berkali-kali
# Script menggunakan INSERT IGNORE, jadi aman
```

---

## 📋 **Checklist Setup**

Pastikan semua ini sudah dilakukan:

- [ ] `npm install` berhasil
- [ ] MySQL server running
- [ ] File `.env` sudah dibuat dengan password yang benar
- [ ] `database.sql` sudah dijalankan
- [ ] `node seed.js` berhasil (no errors)
- [ ] `npm start` berhasil
- [ ] Bisa buka http://localhost:3000
- [ ] Bisa login dengan akun test

---

## 🎯 **Testing Features**

### Test 1: Login
```
1. Buka http://localhost:3000
2. Login sebagai admin / admin123
3. Harus masuk ke dashboard
```

### Test 2: Inventory CRUD
```
1. Login sebagai admin
2. Klik "Inventory" di sidebar
3. Klik Edit (✏️) pada item
4. Ubah stock → Save
5. Harus berhasil update
```

### Test 3: Generate Bill
```
1. Login sebagai admin
2. Dashboard → Lihat appointment
3. Ubah status jadi "Selesai"
4. Klik button kuning "💰 Generate Bill"
5. Transaction harus terbuat
```

---

## 📁 **File Structure (Yang Penting)**

```
Tubes-Sistem-Basis-Data/
├── .env                 ← BUAT FILE INI!
├── database.sql         ← Run ini dulu
├── seed.js             ← Run setelah database.sql
├── server.js           ← Backend server
├── package.json        ← Dependencies
└── public/
    ├── dashboard.html
    ├── login.html
    └── js/
        └── dashboard.js
```

---

## 💡 **Tips**

1. **Selalu run `database.sql` SEBELUM `seed.js`**
2. **Password di `.env` harus sama dengan MySQL password kamu**
3. **Jika error, check console (browser & terminal)**
4. **Jika stuck, restart MySQL service:**
   ```bash
   # Windows:
   net stop MySQL80
   net start MySQL80
   ```

---

## 🆘 **Masih Error?**

### Debug Checklist:
1. ✅ MySQL service running?
   ```bash
   # Check:
   mysql -u root -p -e "SELECT 1"
   ```

2. ✅ Database exists?
   ```bash
   mysql -u root -p -e "SHOW DATABASES LIKE 'Paw_Whisker'"
   ```

3. ✅ Tables created?
   ```bash
   mysql -u root -p Paw_Whisker -e "SHOW TABLES"
   # Harus ada 12 tables
   ```

4. ✅ .env file correct?
   ```bash
   # Check file exists:
   dir .env  # Windows
   ls -la .env  # Linux/Mac
   ```

---

## 📞 **Contact**

Jika masih error setelah ikuti semua step:
1. Screenshot error message
2. Check `server.js` console output
3. Check browser console (F12)
4. Share error details

---

**Good Luck! 🚀**

**Remember:**
- database.sql → .env → seed.js → npm start
- Password pattern: `{username}123`
- Default port: 3000
