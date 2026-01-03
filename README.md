# Paw Whisker Pet Care System

Sistem manajemen klinik hewan dengan role-based access control.

## 🚀 Quick Start

### 1. Setup Database
```bash
# Jalankan manual di MySQL
mysql -u root -p < database.sql
```

### 2. Seed Data (Optional - untuk testing)
```bash
node seed.js
```

### 3. Run Server
```bash
npm start
```

## 🔑 Test Accounts

Setelah seeding:
- **Admin**: admin / password123
- **Doctor**: dr.sarah / password123  
- **Receptionist**: receptionist / password123

## 📁 File Structure

```
├── database.sql       # Database schema (run manual)
├── seed.js           # Sample data untuk testing
├── server.js         # Main server
└── public/           # Frontend files
```

## 🛠️ Development

```bash
npm install
npm start
```

Server akan berjalan di `http://localhost:3000`