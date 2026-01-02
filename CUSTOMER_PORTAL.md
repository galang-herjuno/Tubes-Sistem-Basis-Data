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
