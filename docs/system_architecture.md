# Paw Whisker Clinic Management System - System Architecture & Documentation

## 1. Project Structure

The project follows a modular **Node.js + Express** architecture with a **MySQL** database.

### Directory Overview
- **`logic/`**: Contains the core backend logic.
    - `server.js`: The main entry point. Handles server configuration, middleware, and all API routes.
    - `config/db.js`: Database connection configuration (likely using `mysql2` pool).
- **`public/`**: Contains the frontend assets (served statically).
    - `*.html`: Modular HTML pages for each feature (e.g., `inventory.html`, `medical-records.html`).
    - `css/`: Stylesheets (`style.css` for main theme, `dashboard.css`, `login.css`).
    - `js/`: Client-side logic.
        - `layout.js`: Handles dynamic sidebar/header injection and role-based UI adjustments.
        - `pages/`: Specific logic for each page (e.g., `inventory.js` for fetching/displaying items).
- **`database/`**: Database related files.
    - `database.sql`: The complete schema definition.
    - `seed.js`: Script to populate initial dummy data.

---

## 2. Core Algorithms & Logic

### A. Authentication & Authorization (RBAC)
**File**: `logic/server.js`

1.  **Login Flow**:
    - Users submit credentials to `/api/login`.
    - Server verifies username and compares hashed password (`bcrypt`).
    - Upon success, a **Session** is created (`req.session.userId`, `req.session.role`).
2.  **Middleware Protection**:
    - `authMiddleware`: Checks if `req.session.userId` exists. If not, blocks access (401/Redirect).
    - `authorizeRole(...roles)`: Checks if `req.session.role` is in the allowed list. If not, returns a **403 Forbidden** page.
3.  **Client-Side Enforcement**:
    - `public/js/layout.js` fetches user info on load.
    - It hides sidebar menu items based on the user's role (e.g., doctors don't see "Staff Management").

### B. Inventory Management (Soft Delete)
**File**: `logic/server.js` & `public/js/pages/inventory.js`

- **Problem**: Deleting items might break historical transaction records.
- **Solution**: **Soft Delete**.
    - The `barang` table has an `is_active` column (Default `1`).
    - **DELETE API**: Instead of `DELETE FROM barang`, it executes `UPDATE barang SET is_active = 0`.
    - **GET API**: Queries only active items: `SELECT * FROM barang WHERE is_active = 1`.

### C. Transaction Processing (ACID Compliance)
**File**: `logic/server.js` (Transaction Routes)

Complex operations like creating a transaction or adding a medical record involve multiple steps. To ensure data integrity, we use MySQL Transactions:

**Algorithm via `connection.beginTransaction()`**:
1.  **Start Transaction**: Lock the connection.
2.  **Calculate Total**: Sum up items.
3.  **Insert Header**: Insert into `transaksi` table, get `insertId`.
4.  **Insert Details**: Loop through items and insert into `detail_transaksi`.
    - **Stock Validation**: For items of type 'Barang', check `stok` > `qty`.
    - **Deduct Stock**: Update `barang` table to reduce stock.
5.  **Commit**: If all steps succeed, `connection.commit()`.
6.  **Rollback**: If any error occurs (e.g., insufficient stock), `connection.rollback()` undoes *all* changes.

### D. Billing System
**File**: `logic/server.js` (`/api/billing/preview/:id`)

Generates a bill from a completed Appointment (`pendaftaran`):
1.  **Service Cost**: Extracts service name from `keluhan_awal`, looks up price in `layanan` table.
2.  **Medication Cost**: Joins `resep_obat` -> `barang` to calculate cost of prescribed meds.
3.  **Aggregation**: Returns a JSON object with owner info, pet info, itemized list, and total cost for frontend preview.

---

## 3. Database Schema
Defined in `database/database.sql`. Key relationships:
- `users` (1) <-> (1) `pemilik`/`pegawai`: Separates auth credentials from profile data.
- `pemilik` (1) <-> (N) `hewan`: Owners have multiple pets.
- `pendaftaran` (1) <-> (1) `rekam_medis`: One appointment leads to one medical record.
- `transaksi` (1) <-> (N) `detail_transaksi`: Standard header-detail pattern for sales.
