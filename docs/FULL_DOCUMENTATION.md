# Paw Whisker Clinic - Full Documentation

# Customer Portal - Paw Whisker Clinic

## 🎯 Overview

Customer Portal adalah fitur self-service untuk pelanggan klinik Paw Whisker. Pelanggan dapat mengelola data hewan peliharaan, melihat riwayat medis, membuat appointment, dan mengakses invoice secara mandiri.

## 🚀 Quick Start

### 1. Registrasi Akun
- Kunjungi halaman `/register`
- Isi username dan password
- Akun otomatis mendapat role **Pelanggan**
- Login dengan kredensial yang dibuat

### 2. Akses Dashboard
- Setelah login, otomatis diarahkan ke Customer Dashboard
- URL: `/customer-dashboard`

### 3. Setup Profile (Opsional)
- Klik menu "Profile Settings"
- Lengkapi informasi: Nama, Email, No HP, Alamat
- Profile otomatis dibuat saat pertama kali login

## 📱 Fitur Utama

### 1. Dashboard (My Pets Overview)

**Pet Cards**
- Menampilkan semua hewan peliharaan yang dimiliki
- Informasi: Nama, Jenis, Ras
- Icon visual berdasarkan jenis hewan

**Next Appointment**
- Pengingat jadwal kunjungan terdekat
- Menampilkan: Tanggal, Waktu, Nama Pet, Dokter
- Status appointment (Menunggu/Diperiksa/Selesai)

**Quick Stats**
- Total Pets: Jumlah hewan yang terdaftar
- Upcoming Appointments: Jadwal yang akan datang
- Recent Transactions: Transaksi 30 hari terakhir

### 2. My Pets (Pet Management)

**Add New Pet**
- Form untuk mendaftarkan hewan baru
- Field: Nama, Jenis, Ras, Gender, Tanggal Lahir, Berat
- Otomatis terhubung ke profil pemilik

**Pet Cards**
- Grid view dengan informasi lengkap setiap pet
- Kalkulasi umur otomatis (tahun/bulan)
- Icon berdasarkan jenis hewan

**Digital Health Card**
- Klik "Medical Records" pada setiap pet
- Riwayat rekam medis lengkap:
  - Tanggal pemeriksaan
  - Nama dokter
  - Diagnosis
  - Tindakan yang dilakukan
  - Catatan dokter
  - Resep obat (nama, jumlah, aturan pakai)

### 3. Appointments

**View All Appointments**
- Tabel lengkap semua appointment
- Filter: Past & Upcoming
- Informasi: Date/Time, Pet, Doctor, Complaint, Status

**Book New Appointment**
- Redirect ke form booking (akan diimplementasi)

### 4. Billing & Invoices

**Transaction History**
- Daftar semua transaksi yang pernah dilakukan
- Informasi: Invoice #, Date, Items, Payment Method, Total
- Sortir berdasarkan tanggal (terbaru di atas)

**Invoice Details**
- Klik "View" untuk melihat detail
- Modal menampilkan:
  - Invoice number dan tanggal
  - Metode pembayaran
  - Itemized list (layanan/produk)
  - Quantity, harga satuan, subtotal
  - Diskon (jika ada)
  - Total pembayaran

**Payment Integration** (Future)
- Tombol bayar via QRIS/Transfer
- Status pending payment

### 5. Profile Settings

**Update Personal Information**
- Full Name
- Email
- Phone Number (WhatsApp)
- Address

**Form Validation**
- Required fields
- Email format validation
- Success/error feedback

## 🔐 Security & Access Control

### Authentication
- Session-based authentication
- Auto-redirect ke login jika belum login
- Auto-redirect ke customer dashboard jika role = Pelanggan

### Authorization
- Customers hanya bisa akses data mereka sendiri
- Ownership verification pada setiap endpoint:
  - Pets: Verify `id_user` via `pemilik` table
  - Medical Records: Verify pet ownership
  - Transactions: Verify `id_pemilik` linked to `id_user`

### Data Privacy
- Tidak ada akses ke data customer lain
- Medical records hanya visible untuk pemilik pet
- Invoice hanya visible untuk pemilik transaksi

## 🗄️ Database Structure

```sql
users (id_user, username, password, role='Pelanggan')
  ↓
pemilik (id_pemilik, id_user, nama_pemilik, alamat, no_hp, email)
  ↓
hewan (id_hewan, id_pemilik, nama_hewan, jenis_hewan, ras, gender, tgl_lahir, berat)
  ↓
pendaftaran (id_daftar, id_hewan, id_pegawai, tgl_kunjungan, keluhan_awal, status)
  ↓
rekam_medis (id_rekam, id_daftar, diagnosa, tindakan, catatan_dokter)
  ↓
resep_obat (id_resep, id_rekam, id_barang, jumlah, aturan_pakai)

transaksi (id_transaksi, id_pemilik, tgl_transaksi, total_biaya, metode_bayar)
  ↓
detail_transaksi (id_detail, id_transaksi, jenis_item, id_layanan, id_barang, qty, subtotal)
```

## 🛠️ API Endpoints

### Profile
```
GET    /api/customer/profile          - Get/create profile
PUT    /api/customer/profile          - Update profile
```

### Dashboard
```
GET    /api/customer/dashboard        - Get stats
```

### Pets
```
GET    /api/customer/pets             - Get all pets
POST   /api/customer/pets             - Add new pet
GET    /api/customer/pets/:id/medical-records  - Get medical history
```

### Appointments
```
GET    /api/customer/appointments     - Get all appointments
GET    /api/customer/appointments/next - Get next appointment
```

### Billing
```
GET    /api/customer/transactions     - Get all transactions
GET    /api/customer/transactions/:id - Get invoice details
```

## 📝 Usage Examples

### 1. Menambah Pet Baru
```javascript
// Customer clicks "Add New Pet"
// Fills form:
{
  nama_hewan: "Milo",
  jenis_hewan: "Kucing",
  ras: "Persian",
  gender: "Jantan",
  tgl_lahir: "2023-05-15",
  berat: 4.5
}
// Submit → POST /api/customer/pets
// Pet automatically linked to customer's pemilik profile
```

### 2. Melihat Medical Records
```javascript
// Customer clicks "Medical Records" on pet card
// GET /api/customer/pets/123/medical-records
// Returns:
[
  {
    tgl_periksa: "2024-01-15",
    dokter: "Dr. Sarah",
    diagnosa: "Flu kucing",
    tindakan: "Pemberian antibiotik",
    catatan_dokter: "Kontrol 1 minggu lagi",
    prescriptions: [
      {
        nama_barang: "Amoxicillin",
        jumlah: 10,
        satuan: "tablet",
        aturan_pakai: "2x sehari"
      }
    ]
  }
]
```

### 3. Melihat Invoice
```javascript
// Customer clicks "View" on transaction
// GET /api/customer/transactions/456
// Returns:
{
  transaction: {
    id_transaksi: 456,
    tgl_transaksi: "2024-01-20",
    total_biaya: 350000,
    metode_bayar: "QRIS"
  },
  details: [
    {
      nama_layanan: "Konsultasi Dokter",
      qty: 1,
      harga_saat_ini: 150000,
      subtotal: 150000
    },
    {
      nama_barang: "Amoxicillin",
      qty: 10,
      harga_saat_ini: 20000,
      subtotal: 200000
    }
  ]
}
```

## 🎨 UI/UX Features

### Visual Indicators
- Pet icons based on species (cat/dog/paw)
- Status badges with colors
- Empty states with helpful messages
- Loading states during async operations

### Responsive Design
- Grid layouts for pet cards
- Table views for appointments/billing
- Modal dialogs for detailed views
- Mobile-friendly interface

### User Feedback
- Success alerts on form submission
- Error messages with clear instructions
- Loading spinners on buttons
- Disabled states during processing

## 🔄 Auto-Features

### Profile Auto-Creation
- Saat customer pertama kali login
- Otomatis create entry di tabel `pemilik`
- Link `id_user` ke `id_pemilik`
- Default values: username, placeholder email

### Age Calculation
- Otomatis hitung umur pet dari `tgl_lahir`
- Format: "2 years old" atau "5 months old"
- Update real-time

### Currency Formatting
- Semua harga format IDR
- Contoh: Rp 350.000,00

### Date Formatting
- Localized ke Indonesia
- Format: "20 Januari 2024, 14:30"

## 🚦 Migration Guide

### For Existing Database

1. **Run Migration Script**
```bash
node update_pemilik_schema.js
```

2. **Verify Schema**
```sql
DESCRIBE pemilik;
-- Should show id_user column with UNIQUE constraint
```

3. **Link Existing Owners (Optional)**
```sql
-- If you have existing owners that need user accounts
UPDATE pemilik p
JOIN users u ON p.email = u.username
SET p.id_user = u.id_user
WHERE u.role = 'Pelanggan';
```

### For New Database
- Just run `database.sql`
- Schema already includes `id_user` column

## 📊 Benefits

### For Customers
✅ **24/7 Access** - Lihat data kapan saja
✅ **Transparency** - Riwayat medis & billing lengkap
✅ **Convenience** - Tidak perlu telepon untuk info dasar
✅ **Self-Service** - Daftar pet sendiri
✅ **Peace of Mind** - Semua data tersimpan digital

### For Clinic
✅ **Reduced Workload** - Resepsionis tidak perlu jawab pertanyaan berulang
✅ **Better Engagement** - Customer lebih terlibat dalam perawatan pet
✅ **Modern Image** - Klinik terlihat profesional dan up-to-date
✅ **Data Accuracy** - Customer input data sendiri
✅ **Customer Satisfaction** - Pengalaman yang lebih baik

## 🔮 Future Enhancements

- [ ] Online appointment booking
- [ ] Payment integration (QRIS/Transfer)
- [ ] Push notifications untuk appointment reminder
- [ ] Pet vaccination schedule tracker
- [ ] Upload pet photos
- [ ] Chat dengan dokter
- [ ] Loyalty points system
- [ ] Pet insurance integration

## 📞 Support

Jika customer mengalami masalah:
1. Check profile completeness
2. Verify pet ownership
3. Check browser console for errors
4. Contact clinic admin

---

**Built with ❤️ for Paw Whisker Clinic**


---

# Analisis Optimisasi Query & EXPLAIN ANALYZE

Dokumen ini menjelaskan hasil optimisasi yang dilakukan pada database Paw Whisker (500k data) dan cara membaca `EXPLAIN ANALYZE`.

## 1. Perubahan Optimisasi

Kami melakukan dua optimisasi utama:

### a. Menghindari `SELECT *`
Pada `server.js`, query diubah untuk hanya mengambil kolom yang dibutuhkan.
*   **Sebelum**: `SELECT * FROM pemilik` (Mengambil semua kolom, boros bandwidth memori jika tabel besar).
*   **Sesudah**: `SELECT id_pemilik, nama_pemilik, ... FROM pemilik` (Lebih ringan).

### b. Menambahkan Indexing (Database Level)
Kami menambahkan index pada kolom krusial di `database/apply_optimization.sql`:
1.  `idx_pemilik_nama`: Mempercepat pencarian nama pemilik.
2.  `idx_hewan_pemilik`: Mempercepat JOIN antara Hewan & Pemilik.
3.  `idx_daftar_status_tgl`: Mempercepat filter Dashboard (Status + Tanggal).

---

## 2. Memahami `EXPLAIN ANALYZE`

`EXPLAIN ANALYZE` adalah tool untuk melihat **Rencana Eksekusi (Plan)** dan **Kinerja Nyata (Actual Execution)** dari sebuah query.

### Query Contoh:
```sql
SELECT * FROM pemilik WHERE nama_pemilik LIKE 'Ali%' LIMIT 5;
```

### Hasil Analisis (Setelah Indexing):

```
-> Limit: 5 row(s)  (cost=430.74 rows=5) (actual time=0.038..0.120 rows=5 loops=1)
    -> Index range scan on pemilik using idx_pemilik_nama  (cost=430.74 rows=401) (actual time=0.035..0.115 rows=5 loops=1)
```

### Cara Membaca Output:

1.  **`Index range scan on pemilik using idx_pemilik_nama`**
    *   **Artinya**: Database **TIDAK** mengecek 500.000 data satu per satu (Full Table Scan).
    *   Dia langsung loncat ke daftar nama yang berawalan 'Ali' menggunakan buku indeks (`idx_pemilik_nama`).
    *   **Dampak**: Jauh lebih cepat (milidetik vs detik).

2.  **`cost=430.74`**
    *   Estimasi "biaya" komputasi menurut database. Semakin kecil semakin baik. Tanpa index, cost ini bisa mencapai ribuan/jutaan.

3.  **`actual time=0.038..0.120`**
    *   Ini adalah waktu nyata dalam milidetik.
    *   Data pertama ditemukan dalam **0.038 ms**.
    *   5 data selesai dikumpulkan dalam **0.120 ms**.
    *   Sangat cepat!

### Kesimpulan
Tanpa index, database harus membaca seluruh tabel (`Full Table Scan`) untuk mencari nama 'Ali'. Dengan index, database hanya melakukan `Range Scan` pada sebagian kecil data.

---
**File Terkait:**
- `logic/server.js`: Implementasi query efisien.
- `database/apply_optimization.sql`: Definisi index.
- `analyze_query.js`: Script untuk menjalankan tes ini lagi.


---

# Changelog - Paw Whisker Clinic Management System

## 2026-01-02 - Major Feature Updates

### Database Schema Changes
1. **Updated `users` table**
   - Added `'Pelanggan'` role to ENUM
   - Role options: `'Admin', 'Dokter', 'Resepsionis', 'Pelanggan'`

### Backend API Endpoints Added

#### Owners Management
- `GET /api/owners` - Get all owners with pet count
- `POST /api/owners` - Create new owner
- `PUT /api/owners/:id` - Update owner information
- `DELETE /api/owners/:id` - Delete owner
- `GET /api/owners/:id/pets` - Get pets by owner ID

#### Pets Management
- `GET /api/pets` - Get all pets with owner information
- `POST /api/pets` - Create new pet
- `PUT /api/pets/:id` - Update pet information
- `DELETE /api/pets/:id` - Delete pet

#### Appointments
- `GET /api/appointments` - Get all appointments with full details
- `POST /api/appointments` - Create new appointment (existing)
- `GET /api/doctors` - Get list of doctors and groomers (existing)

### Frontend Features

#### Registration Page
- **Removed** role selection dropdown
- All public registrations automatically assigned `'Pelanggan'` role
- Only admins can create users with other roles through Staff Management

#### Dashboard - Patients & Owners Section
- Added "Add Owner" button with modal form
- Added "Add Pet" button with modal form
- Owner form fields:
  - Owner Name (required)
  - Phone Number (required)
  - Email
  - Address
- Pet form fields:
  - Owner (dropdown, required)
  - Pet Name (required)
  - Species (Kucing/Anjing/Lainnya)
  - Breed
  - Gender (Jantan/Betina)
  - Date of Birth
  - Weight (kg)
- Table displays all owners with pet count

#### Dashboard - Appointments Section
- Fully functional appointment booking form
- Dynamic owner selection
- Pet dropdown populated based on selected owner
- Doctor/Groomer selection
- Date & Time picker
- Initial complaint/notes field
- Form validation and submission

### Integration & Tracking
- Appointments linked to pets (which are linked to owners)
- Transactions can reference appointments through `id_daftar`
- Full tracking chain: Owner → Pet → Appointment → Medical Record → Transaction

### Security Improvements
- Role-based access control enforced
- Public users cannot self-assign privileged roles
- Only admins can create staff accounts with elevated permissions

## Database Structure Summary

```
pemilik (owners)
  ↓
hewan (pets)
  ↓
pendaftaran (appointments)
  ↓
rekam_medis (medical records) → resep_obat (prescriptions)
  ↓
transaksi (transactions) → detail_transaksi (transaction details)
```

## Next Steps / TODO
- [ ] Add medical records management interface
- [ ] Implement transaction creation with appointment linking
- [ ] Add reporting and analytics features
- [ ] Implement prescription management
- [ ] Add services (layanan) management CRUD

---

## 2026-01-02 (Part 2) - Customer Portal Implementation

### Database Schema Changes
1. **Updated `pemilik` table**
   - Added `id_user INT UNIQUE` column
   - Added foreign key constraint to `users(id_user)`
   - Enables linking customer accounts to owner profiles

### Backend API Endpoints - Customer Portal

#### Profile Management
- `GET /api/customer/profile` - Get or auto-create customer profile
- `PUT /api/customer/profile` - Update customer profile information

#### Dashboard
- `GET /api/customer/dashboard` - Get dashboard statistics (total pets, upcoming appointments, recent transactions)

#### Pets Management
- `GET /api/customer/pets` - Get all pets owned by customer
- `POST /api/customer/pets` - Add new pet (auto-linked to customer's profile)
- `GET /api/customer/pets/:id/medical-records` - Get complete medical history for a pet including prescriptions

#### Appointments
- `GET /api/customer/appointments` - Get all customer's appointments
- `GET /api/customer/appointments/next` - Get next upcoming appointment

#### Billing & Invoices
- `GET /api/customer/transactions` - Get all customer's transactions with items summary
- `GET /api/customer/transactions/:id` - Get detailed invoice with line items

### Frontend - Customer Portal

#### New Files Created
- `customer-dashboard.html` - Complete customer portal interface
- `customer-dashboard.js` - Full customer portal functionality

#### Features Implemented

**1. Dashboard (Overview)**
- Pet cards showing owned pets with icons
- Next appointment reminder with date, time, and doctor
- Recent transactions summary
- Quick stats: Total Pets, Upcoming Appointments, Recent Transactions

**2. My Pets Section**
- Grid view of all pets with detailed cards
- Pet information: Name, Species, Breed, Gender, Age, Weight
- "Add New Pet" functionality with modal form
- "View Medical Records" button for each pet
- Digital Health Card showing:
  - Complete medical history
  - Diagnosis and treatments
  - Prescriptions with dosage instructions
  - Doctor information
  - Visit dates

**3. Appointments Section**
- Table view of all appointments (past and upcoming)
- Shows: Date/Time, Pet, Doctor, Complaint, Status
- Status badges for visual clarity

**4. Billing & Invoices**
- Complete transaction history
- Invoice details with:
  - Transaction ID and date
  - Itemized list (services and products)
  - Payment method
  - Total amount
- "View Invoice" modal for detailed breakdown
- Quantity, unit price, and subtotals for each item

**5. Profile Settings**
- Update personal information:
  - Full Name
  - Email
  - Phone Number
  - Address
- Form validation and success feedback

### Routing & Access Control
- Updated `/dashboard` route to check user role
- Customers automatically redirected to `/customer-dashboard`
- Staff (Admin, Dokter, Resepsionis) use standard dashboard
- Role-based access control enforced on all endpoints

### Security Features
- All customer endpoints verify ownership before returning data
- Customers can only view their own pets, appointments, and transactions
- Profile auto-creation on first login for seamless onboarding
- Session-based authentication required for all customer portal features

### User Experience Enhancements
- Automatic profile creation for new customers
- Pet age calculation (years/months)
- Currency formatting (IDR)
- Date/time formatting (localized)
- Empty states with helpful messages
- Loading states for async operations
- Modal dialogs for detailed views
- Responsive card-based layouts
- Icon-based visual indicators

### Integration Points
```
Customer Account (users.role = 'Pelanggan')
    ↓ (id_user)
Owner Profile (pemilik)
    ↓ (id_pemilik)
Pets (hewan)
    ↓ (id_hewan)
Appointments (pendaftaran) → Medical Records (rekam_medis) → Prescriptions (resep_obat)
    ↓ (id_daftar)
Transactions (transaksi) → Transaction Details (detail_transaksi)
```

### Migration Script
- `update_pemilik_schema.js` - Adds `id_user` column to existing `pemilik` table
- Safe to run on existing databases (checks if column exists first)

### Benefits for Customers
✅ Complete pet health tracking
✅ Easy appointment viewing
✅ Transparent billing with detailed invoices
✅ Self-service pet registration
✅ Access to complete medical history
✅ Profile management
✅ No need to call clinic for basic information

### Benefits for Clinic
✅ Reduced receptionist workload
✅ Better customer engagement
✅ Digital record keeping
✅ Improved customer satisfaction
✅ Modern, professional image
✅ Reduced phone inquiries

---

## 2026-01-04 - Billing & Dashboard UX Improvements

### Database Schema Updates
1. **Updated `transaksi` table**
   - **Modified**: `metode_bayar` column now saves proper enum values ('Cash', 'Debit', 'QRIS', 'Transfer') correctly.
   - **Removed**: `tipe_diskon` and `input_diskon` columns were cleaned up to simplify the schema, as per the decision to only store the final `diskon` (nominal) amount in the backend history.
   - **Synced**: Database structure is now fully verified against the provided schema screenshot.

2. **Updated `barang` table**
   - **Added**: `is_active` (BOOLEAN) column to support **Soft Delete**.
   - **Purpose**: Prevents foreign key constraint errors when deleting inventory items that are referenced in past transactions or prescriptions. Items are now archived instead of permanently deleted.

### Backend API Updates

#### Billing System (`/api/billing/generate`)
- **Enhanced**: Now accepts `metode_bayar`, `tipe_diskon`, and `input_diskon` from the frontend.
- **Improved**: Logic refactored to calculate final `total_biaya` and `diskon` (amount) accurately on the server side.
- **Fix**: Resolved bug where `metode_bayar` was incorrectly saving 'nominal' or 'persen'. It now correctly maps to the selected payment method.

#### Inventory Management (`/api/inventory`)
- **Updated**: `GET` endpoint now filters for `is_active = 1`.
- **Updated**: `DELETE` endpoint now performs a "Soft Delete" (`UPDATE barang SET is_active = 0`) instead of a hard delete.

### Frontend Enhancements (`dashboard.js` & `dashboard.html`)

#### 1. Advanced Billing Modal
- **New Feature**: "Payment Method" selection dropdown (Cash, Debit, QRIS, Transfer).
- **New Feature**: "Discount Type" toggle (Nominal vs Percentage).
- **Real-time Calculation**: Total bill updates instantly when discount input changes.
- **Layout Fixes**:
  - Increased Modal width to `900px` for better readability.
  - Fixed layout bugs where elements (buttons, total) were overflowing or misaligned.
  - Improved spacing and visual hierarchy.

#### 2. Dashboard UX
- **Auto-Refresh**: Dashboard "Live Queue" and "Recent Transactions" now update **automatically** after a bill is confirmed.
- **Immediate Feedback**: The "Bill" button in the queue immediately changes to "Paid" without requiring a page reload.

#### 3. Bug Fixes
- **Inventory Deletion**: Fixed "Cannot delete item" error by implementing soft delete.
- **Data Integrity**: Cleaned up historical transaction data that had incorrect payment method labels with a one-time migration script.

### Summary
This update significantly improves the cashier workflow by adding flexible payment options, discount capabilities, and ensuring a smoother, error-free experience when managing inventory and generating bills.

---

## 2026-02-23 - Monolithic to Modular Server Refactoring

### Core Architecture Overhaul
1. **Server Split**
   - Refactored `server.js` from a monolithic file (~2,250+ lines) into a lean configuration and bootstrapping entry point (~55 lines).
   - Moved all business logic, endpoint definitions, and page rendering into dedicated, modular router files under `logic/routes/`.

2. **New Routing Modules Created**
   - `auth.js`: Handles session authentication, login, and logout.
   - `users.js`: Manages user accounts (registration, password changes, admin role updates, account deletion).
   - `appointments.js`: Manages the appointment system queue and bookings.
   - `dashboard.js`: Services statistics, queue tracking, and analytics data for the admin/slash clinic dashboard.
   - `owners.js`: CRUD endpoints for Clinic Customer / Owner data management.
   - `pets.js`: CRUD endpoints for Pet records.
   - `staff.js`: Admin-only complete staff CRUD and doctor self-profile management.
   - `inventory.js`: Inventory management including stock and medicines tracking.
   - `transactions.js`: Billing generation, discount calculations, and historical transactions access.
   - `medical_records.js`: Doctor's workspace for adding medical records and dispensing prescriptions.
   - `customer.js`: Dedicated API hub for the Customer portal (My Pets, My Appointments, Digital Invoices).
   - `pages.js`: Manages serving traditional static HTML views and access control routing.

### Security and Stability
- **Secure by Default**: Cryptographic operations (`bcrypt` hashing and validation) and middleware restrictions (`authMiddleware`, `authorizeRole`) were perfectly preserved and strictly attached to their appropriate specialized routes.
- **Improved Maintainability**: Greatly improves developer experience, code readability, and minimizes merge conflicts for future feature developments by logically separating distinct domains.


---

