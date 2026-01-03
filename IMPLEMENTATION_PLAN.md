# 🎯 Paw Whisker System - Comprehensive Implementation Plan

**Date:** 2026-01-03  
**Task:** Full Functional Fix - 5 Major Features  
**Status:** IN PROGRESS

---

## 📋 Features Overview

| # | Feature | Priority | Status | Files Affected |
|---|---------|----------|--------|----------------|
| 1 | Inventory CRUD Refinement | HIGH | 🟡 IN PROGRESS | dashboard.html, dashboard.js, server.js |
| 2 | Staff Management & Profile | HIGH | ⏳ PENDING | dashboard.html, dashboard.js, server.js |
| 3 | Billing & Transaction System | CRITICAL | ⏳ PENDING | dashboard.html, dashboard.js, server.js |
| 4 | Doctor's Medical Workspace | HIGH | ⏳ PENDING | dashboard.html, dashboard.js, server.js |
| 5 | Customer Dashboard & Appointments | MEDIUM | ⏳ PENDING | dashboard.html, dashboard.js, server.js, customer.html |

---

## 🔧 FEATURE 1: Inventory CRUD Refinement

### Requirements
- ✅ Add Action column to inventory table
- ⏳ Create Edit Inventory modal
- ⏳ Implement `updateInventoryStock(id, data)` function
- ⏳ Implement `deleteInventoryItem(id)` function with confirmation
- ⏳ Add backend endpoints: `PUT /api/barang/:id` and `DELETE /api/barang/:id`
- ⏳ Ensure Resepsionis role has access

### Implementation Steps

#### 1.1 Frontend - HTML (dashboard.html)
```html
<!-- Add Edit Inventory Modal (after existing modals) -->
<div id="editInventoryModal" class="modal-overlay">
    <div class="modal-content">
        <div class="modal-header">
            <h2>Edit Inventory Item</h2>
            <button class="close-modal" onclick="closeModal('editInventoryModal')">×</button>
        </div>
        <form id="editInventoryForm" onsubmit="submitEditInventory(event)">
            <input type="hidden" id="edit-inv-id">
            
            <div class="form-group">
                <label>Item Name</label>
                <input type="text" id="edit-inv-name" readonly style="background:#1e293b;">
            </div>

            <div class="form-row">
                <div class="form-group">
                    <label>Stock *</label>
                    <input type="number" id="edit-inv-stock" min="0" required>
                </div>
                <div class="form-group">
                    <label>Unit *</label>
                    <input type="text" id="edit-inv-unit" required placeholder="e.g. Pcs, Kg, Botol">
                </div>
            </div>

            <div class="form-group">
                <label>Price per Unit (Rp) *</label>
                <input type="number" id="edit-inv-price" min="0" step="100" required>
            </div>

            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="closeModal('editInventoryModal')">Cancel</button>
                <button type="submit" class="cta-button">
                    <i class="fa-solid fa-save"></i> Update Item
                </button>
            </div>
        </form>
    </div>
</div>
```

#### 1.2 Frontend - JavaScript (dashboard.js)

**Add to `loadInventory()` function:**
```javascript
// Inside the forEach loop, modify the tr.innerHTML to include Action buttons:
const isAdmin = window.currentUserRole === 'Admin';
const isResepsionis = window.currentUserRole === 'Resepsionis';
const canEdit = isAdmin || isResepsionis;

tr.innerHTML = `
    <td>${i.nama_barang}</td>
    <td>${i.kategori}</td>
    <td style="font-weight: ${isLowStock ? 'bold' : 'normal'}; color: ${isLowStock ? '#ef4444' : 'inherit'}">${i.stok}</td>
    <td>${formatCurrency(i.harga_satuan)} / ${i.satuan}</td>
    <td>
        ${isLowStock ?
        '<span class="status-badge status-batal" style="box-shadow: 0 0 8px rgba(239, 68, 68, 0.5);">Low Stock</span>' :
        '<span class="status-badge status-selesai">OK</span>'}
    </td>
    <td>
        ${canEdit ? `
            <div style="display:flex; gap:0.5rem; justify-content:center;">
                <button onclick="openEditInventory(${i.id_barang}, '${i.nama_barang}', ${i.stok}, ${i.harga_satuan}, '${i.satuan}')" 
                        class="btn-xs" style="color:var(--accent-color); cursor:pointer;" title="Edit">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button onclick="deleteInventoryItem(${i.id_barang}, '${i.nama_barang}')" 
                        class="btn-xs" style="color:var(--danger-color); cursor:pointer;" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        ` : '<span style="color:#94a3b8">-</span>'}
    </td>
`;
```

**Add new functions:**
```javascript
// Open Edit Inventory Modal
window.openEditInventory = (id, name, stock, price, unit) => {
    document.getElementById('edit-inv-id').value = id;
    document.getElementById('edit-inv-name').value = name;
    document.getElementById('edit-inv-stock').value = stock;
    document.getElementById('edit-inv-price').value = price;
    document.getElementById('edit-inv-unit').value = unit;
    openModal('editInventoryModal');
};

// Submit Edit Inventory
window.submitEditInventory = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-inv-id').value;
    const data = {
        stok: parseInt(document.getElementById('edit-inv-stock').value),
        harga_satuan: parseFloat(document.getElementById('edit-inv-price').value),
        satuan: document.getElementById('edit-inv-unit').value
    };

    try {
        const res = await fetch(`/api/barang/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        if (res.ok) {
            alert('✅ Inventory updated successfully!');
            closeModal('editInventoryModal');
            loadInventory();
        } else {
            alert('❌ Error: ' + result.message);
        }
    } catch (err) {
        console.error(err);
        alert('❌ Failed to update inventory');
    }
};

// Delete Inventory Item
window.deleteInventoryItem = async (id, name) => {
    if (!confirm(`⚠️ Are you sure you want to delete "${name}"?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        const res = await fetch(`/api/barang/${id}`, {
            method: 'DELETE'
        });

        const result = await res.json();
        if (res.ok) {
            alert('✅ Item deleted successfully!');
            loadInventory();
        } else {
            alert('❌ Error: ' + result.message);
        }
    } catch (err) {
        console.error(err);
        alert('❌ Failed to delete item');
    }
};
```

#### 1.3 Backend - API Endpoints (server.js)

```javascript
// PUT /api/barang/:id - Update inventory item
app.put('/api/barang/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { stok, harga_satuan, satuan } = req.body;
    const userRole = req.session.user.role;

    // Only Admin and Resepsionis can update
    if (userRole !== 'Admin' && userRole !== 'Resepsionis') {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        await db.query(
            'UPDATE barang SET stok = ?, harga_satuan = ?, satuan = ? WHERE id_barang = ?',
            [stok, harga_satuan, satuan, id]
        );
        res.json({ message: 'Inventory updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update inventory' });
    }
});

// DELETE /api/barang/:id - Delete inventory item
app.delete('/api/barang/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const userRole = req.session.user.role;

    // Only Admin and Resepsionis can delete
    if (userRole !== 'Admin' && userRole !== 'Resepsionis') {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        // Check if item is used in prescriptions
        const [prescriptions] = await db.query(
            'SELECT COUNT(*) as count FROM resep_obat WHERE id_barang = ?',
            [id]
        );

        if (prescriptions[0].count > 0) {
            return res.status(400).json({ 
                message: 'Cannot delete item: it is referenced in medical prescriptions' 
            });
        }

        // Check if item is used in transactions
        const [transactions] = await db.query(
            'SELECT COUNT(*) as count FROM detail_transaksi WHERE id_barang = ?',
            [id]
        );

        if (transactions[0].count > 0) {
            return res.status(400).json({ 
                message: 'Cannot delete item: it is referenced in transactions' 
            });
        }

        await db.query('DELETE FROM barang WHERE id_barang = ?', [id]);
        res.json({ message: 'Item deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to delete item' });
    }
});
```

---

## 🔧 FEATURE 2: Staff Management & Profile Logic

### Requirements
- ⏳ Add numeric-only validation for `no_hp` in Add Staff form
- ⏳ Redesign Action column with button group (Edit/Delete)
- ⏳ Expand Settings to update: `nama_lengkap`, `alamat`, `email`, `spesialisasi`
- ⏳ Add backend endpoint: `PUT /api/pegawai/profile`

### Implementation Steps

#### 2.1 Phone Number Validation

**In `submitAddStaff` function:**
```javascript
window.submitAddStaff = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Validate phone number (numeric only)
    const phoneRegex = /^[0-9]{10,15}$/;
    if (data.no_hp && !phoneRegex.test(data.no_hp)) {
        alert('❌ Phone number must be numeric (10-15 digits)');
        return;
    }

    // ... rest of the function
};
```

**Add to HTML input:**
```html
<input type="tel" id="staff-phone" name="no_hp" 
       pattern="[0-9]{10,15}" 
       title="Phone number must be 10-15 digits"
       placeholder="08123456789">
```

#### 2.2 Staff Action Column Redesign

**Update `loadStaff()` function:**
```javascript
// Replace the actionHtml section with:
if (isAdmin && s.id_user) {
    actionHtml = `
        <td>
            <div style="display:flex; gap:0.5rem; justify-content:center;">
                <button onclick="editUserRole(${s.id_user}, '${s.username}', '${s.account_role}')" 
                        class="btn-xs" style="color:var(--accent-color);" title="Edit Role">
                    <i class="fa-solid fa-user-pen"></i>
                </button>
                <button onclick="deleteStaff(${s.id_pegawai}, '${s.nama_lengkap}')" 
                        class="btn-xs" style="color:var(--danger-color);" title="Delete">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </td>`;
}
```

#### 2.3 Extended Profile Settings

**HTML for Settings (dashboard.html):**
```html
<div id="doctor-profile-section" class="role-dokter" style="display:none;">
    <div class="card">
        <div class="card-header">
            <h3>My Profile</h3>
        </div>
        <form id="doctorProfileForm" onsubmit="updateDoctorProfile(event)">
            <div class="form-group">
                <label>Full Name</label>
                <input type="text" id="profile-name" required>
            </div>
            
            <div class="form-group">
                <label>Specialization</label>
                <input type="text" id="profile-spec" placeholder="e.g. Surgery, Dermatology">
            </div>
            
            <div class="form-group">
                <label>Phone Number</label>
                <input type="tel" id="profile-phone" pattern="[0-9]{10,15}" required>
            </div>
            
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="profile-email">
            </div>
            
            <div class="form-group">
                <label>Address</label>
                <textarea id="profile-address" rows="3"></textarea>
            </div>
            
            <button type="submit" class="cta-button">
                <i class="fa-solid fa-save"></i> Update Profile
            </button>
        </form>
    </div>
</div>
```

**JavaScript:**
```javascript
// Load doctor profile
async function loadDoctorProfile() {
    const res = await fetch('/api/doctor/profile');
    if (res.ok) {
        const profile = await res.json();
        document.getElementById('profile-name').value = profile.nama_lengkap || '';
        document.getElementById('profile-spec').value = profile.spesialisasi || '';
        document.getElementById('profile-phone').value = profile.no_hp || '';
        document.getElementById('profile-email').value = profile.email || '';
        document.getElementById('profile-address').value = profile.alamat || '';
    }
}

// Update doctor profile
window.updateDoctorProfile = async (e) => {
    e.preventDefault();
    
    const data = {
        nama_lengkap: document.getElementById('profile-name').value,
        spesialisasi: document.getElementById('profile-spec').value,
        no_hp: document.getElementById('profile-phone').value,
        email: document.getElementById('profile-email').value,
        alamat: document.getElementById('profile-address').value
    };

    // Validate phone
    const phoneRegex = /^[0-9]{10,15}$/;
    if (data.no_hp && !phoneRegex.test(data.no_hp)) {
        alert('❌ Phone number must be numeric (10-15 digits)');
        return;
    }

    try {
        const res = await fetch('/api/pegawai/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        if (res.ok) {
            alert('✅ Profile updated successfully!');
        } else {
            alert('❌ Error: ' + result.message);
        }
    } catch (err) {
        console.error(err);
        alert('❌ Failed to update profile');
    }
};
```

**Backend:**
```javascript
// PUT /api/pegawai/profile - Update staff profile
app.put('/api/pegawai/profile', authMiddleware, async (req, res) => {
    const userId = req.session.user.id_user;
    const { nama_lengkap, spesialisasi, no_hp, email, alamat } = req.body;

    try {
        await db.query(
            'UPDATE pegawai SET nama_lengkap = ?, spesialisasi = ?, no_hp = ?, email = ?, alamat = ? WHERE id_user = ?',
            [nama_lengkap, spesialisasi, no_hp, email, alamat, userId]
        );
        res.json({ message: 'Profile updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to update profile' });
    }
});
```

---

## 🔧 FEATURE 3: Billing & Transaction System

### Requirements
- ⏳ Link `rekam_medis` to `transaksi`
- ⏳ Admin/Resepsionis can generate transaction from 'Selesai' appointment
- ⏳ Auto-pull prices from `layanan` and `resep_obat`
- ⏳ Snapshot prices in `detail_transaksi.harga_saat_ini`

### Implementation Steps

#### 3.1 Frontend - Generate Bill Button

**In Appointments table (for Admin/Resepsionis):**
```javascript
// Add to fetchQueue() or appointment list:
if (item.status === 'Selesai' && (isAdmin || isResepsionis)) {
    // Add "Generate Bill" button
    actionHtml += `
        <button onclick="generateBill(${item.id_daftar})" 
                class="btn-xs" style="color:var(--success-color);" title="Generate Bill">
            <i class="fa-solid fa-file-invoice-dollar"></i>
        </button>
    `;
}
```

#### 3.2 Generate Bill Function

```javascript
window.generateBill = async (appointmentId) => {
    if (!confirm('Generate transaction for this appointment?')) return;

    try {
        const res = await fetch('/api/billing/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_daftar: appointmentId })
        });

        const result = await res.json();
        if (res.ok) {
            alert(`✅ Transaction generated!\nTotal: Rp ${result.total_biaya.toLocaleString()}`);
            loadTransactions();
        } else {
            alert('❌ Error: ' + result.message);
        }
    } catch (err) {
        console.error(err);
        alert('❌ Failed to generate bill');
    }
};
```

#### 3.3 Backend - Billing Logic

```javascript
// POST /api/billing/generate - Generate transaction from appointment
app.post('/api/billing/generate', authMiddleware, async (req, res) => {
    const { id_daftar } = req.body;
    const userRole = req.session.user.role;

    if (userRole !== 'Admin' && userRole !== 'Resepsionis') {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        // Check if transaction already exists
        const [existing] = await db.query(
            'SELECT id_transaksi FROM transaksi WHERE id_daftar = ?',
            [id_daftar]
        );

        if (existing.length > 0) {
            return res.status(400).json({ message: 'Transaction already exists for this appointment' });
        }

        // Get appointment details
        const [appointment] = await db.query(`
            SELECT p.id_daftar, p.id_hewan, h.id_pemilik, p.id_pegawai
            FROM pendaftaran p
            JOIN hewan h ON p.id_hewan = h.id_hewan
            WHERE p.id_daftar = ? AND p.status = 'Selesai'
        `, [id_daftar]);

        if (appointment.length === 0) {
            return res.status(400).json({ message: 'Appointment not found or not completed' });
        }

        const { id_pemilik, id_pegawai } = appointment[0];

        // Get service price (assuming consultation)
        const [service] = await db.query(
            'SELECT id_layanan, harga_dasar FROM layanan WHERE nama_layanan = "Konsultasi Umum" LIMIT 1'
        );

        let totalBiaya = 0;
        const items = [];

        // Add service to items
        if (service.length > 0) {
            totalBiaya += service[0].harga_dasar;
            items.push({
                jenis_item: 'Layanan',
                id_layanan: service[0].id_layanan,
                id_barang: null,
                harga_saat_ini: service[0].harga_dasar,
                qty: 1,
                subtotal: service[0].harga_dasar
            });
        }

        // Get prescriptions from medical record
        const [prescriptions] = await db.query(`
            SELECT ro.id_barang, ro.jumlah, b.harga_satuan
            FROM rekam_medis rm
            JOIN resep_obat ro ON rm.id_rekam = ro.id_rekam
            JOIN barang b ON ro.id_barang = b.id_barang
            WHERE rm.id_daftar = ?
        `, [id_daftar]);

        // Add prescriptions to items
        prescriptions.forEach(rx => {
            const subtotal = rx.harga_satuan * rx.jumlah;
            totalBiaya += subtotal;
            items.push({
                jenis_item: 'Barang',
                id_layanan: null,
                id_barang: rx.id_barang,
                harga_saat_ini: rx.harga_satuan,
                qty: rx.jumlah,
                subtotal: subtotal
            });
        });

        // Create transaction
        const [txResult] = await db.query(`
            INSERT INTO transaksi (id_daftar, id_pemilik, tgl_transaksi, total_biaya, diskon, metode_bayar)
            VALUES (?, ?, NOW(), ?, 0, 'Cash')
        `, [id_daftar, id_pemilik, totalBiaya]);

        const transactionId = txResult.insertId;

        // Insert transaction details
        for (const item of items) {
            await db.query(`
                INSERT INTO detail_transaksi (id_transaksi, jenis_item, id_layanan, id_barang, harga_saat_ini, qty, subtotal)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [transactionId, item.jenis_item, item.id_layanan, item.id_barang, item.harga_saat_ini, item.qty, item.subtotal]);
        }

        res.json({ 
            message: 'Transaction generated successfully',
            id_transaksi: transactionId,
            total_biaya: totalBiaya
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to generate transaction' });
    }
});
```

---

## 🔧 FEATURE 4: Doctor's Medical Workspace

### Requirements
- ⏳ Doctors can view/modify prescription list before finalizing
- ⏳ Queue shows Owner, Pet Name, Appointment Time

### Implementation (Already mostly implemented, needs enhancement)

**Enhancement to Medical Record Modal:**
```javascript
// Add ability to edit prescriptions after adding
window.editPrescription = (index) => {
    const prescription = window.currentPrescriptions[index];
    // Populate edit form
    document.getElementById('medicine-select').value = prescription.id_barang;
    document.getElementById('medicine-qty').value = prescription.jumlah;
    document.getElementById('medicine-usage').value = prescription.aturan_pakai;
    // Remove old entry
    window.currentPrescriptions.splice(index, 1);
    updatePrescriptionList();
};

// Update prescription list display to include edit button
function updatePrescriptionList() {
    const container = document.getElementById('prescription-list');
    container.innerHTML = '';
    
    window.currentPrescriptions.forEach((rx, index) => {
        const div = document.createElement('div');
        div.className = 'prescription-item';
        div.innerHTML = `
            <span>${rx.nama_obat} - ${rx.jumlah} ${rx.satuan}</span>
            <div style="display:flex; gap:0.5rem;">
                <button type="button" onclick="editPrescription(${index})" class="btn-xs">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button type="button" onclick="removePrescription(${index})" class="btn-xs" style="color:var(--danger-color);">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `;
        container.appendChild(div);
    });
}
```

---

## 🔧 FEATURE 5: Customer Dashboard & Appointment Logic

### Requirements
- ⏳ Display "Next Appointment" card
- ⏳ Customer requests appointment (date only)
- ⏳ Resepsionis assigns time later
- ⏳ Status updates to 'Menunggu' after time confirmation

### Implementation Steps

#### 5.1 Customer Dashboard - Next Appointment Card

**HTML (customer.html or dashboard.html for Pelanggan):**
```html
<div class="card">
    <div class="card-header">
        <h3>Next Appointment</h3>
    </div>
    <div id="next-appointment-card">
        <!-- Loaded via JS -->
    </div>
</div>
```

**JavaScript:**
```javascript
async function loadNextAppointment() {
    const res = await fetch('/api/customer/next-appointment');
    if (res.ok) {
        const apt = await res.json();
        const container = document.getElementById('next-appointment-card');
        
        if (apt) {
            container.innerHTML = `
                <div style="padding:1.5rem;">
                    <div style="display:flex; align-items:center; gap:1rem; margin-bottom:1rem;">
                        <i class="fa-solid fa-calendar-check" style="font-size:2rem; color:var(--accent-color);"></i>
                        <div>
                            <h4 style="margin:0;">${apt.nama_hewan}</h4>
                            <p style="margin:0; color:#94a3b8;">with Dr. ${apt.dokter}</p>
                        </div>
                    </div>
                    <div style="display:flex; gap:1rem;">
                        <div>
                            <i class="fa-solid fa-calendar"></i>
                            ${new Date(apt.tgl_kunjungan).toLocaleDateString()}
                        </div>
                        <div>
                            <i class="fa-solid fa-clock"></i>
                            ${apt.jam || 'To be confirmed'}
                        </div>
                    </div>
                    <div style="margin-top:1rem;">
                        <span class="status-badge status-${apt.status.toLowerCase()}">${apt.status}</span>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div style="padding:2rem; text-align:center; color:#94a3b8;">
                    <i class="fa-solid fa-calendar-xmark" style="font-size:2rem; margin-bottom:1rem; opacity:0.5;"></i>
                    <p>No upcoming appointments</p>
                    <button class="cta-button" onclick="openModal('requestAppointmentModal')">
                        Request Appointment
                    </button>
                </div>
            `;
        }
    }
}
```

#### 5.2 Request Appointment (Customer)

**Backend:**
```javascript
// POST /api/customer/appointments - Customer requests appointment
app.post('/api/customer/appointments', authMiddleware, async (req, res) => {
    const userId = req.session.user.id_user;
    const { id_hewan, tgl_kunjungan, keluhan } = req.body;

    if (req.session.user.role !== 'Pelanggan') {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        // Verify pet belongs to this customer
        const [pet] = await db.query(`
            SELECT h.id_hewan FROM hewan h
            JOIN pemilik p ON h.id_pemilik = p.id_pemilik
            WHERE h.id_hewan = ? AND p.id_user = ?
        `, [id_hewan, userId]);

        if (pet.length === 0) {
            return res.status(403).json({ message: 'Pet not found or access denied' });
        }

        // Create appointment with null time and 'Pending' status
        await db.query(`
            INSERT INTO pendaftaran (id_hewan, id_pegawai, tgl_kunjungan, keluhan_awal, status)
            VALUES (?, NULL, ?, ?, 'Pending')
        `, [id_hewan, tgl_kunjungan, keluhan]);

        res.json({ message: 'Appointment request submitted. Please wait for confirmation.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to request appointment' });
    }
});

// PUT /api/appointments/:id/confirm-time - Resepsionis confirms time
app.put('/api/appointments/:id/confirm-time', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { id_pegawai, jam } = req.body;
    const userRole = req.session.user.role;

    if (userRole !== 'Admin' && userRole !== 'Resepsionis') {
        return res.status(403).json({ message: 'Access denied' });
    }

    try {
        // Combine date with time
        const [appointment] = await db.query(
            'SELECT tgl_kunjungan FROM pendaftaran WHERE id_daftar = ?',
            [id]
        );

        if (appointment.length === 0) {
            return res.status(404).json({ message: 'Appointment not found' });
        }

        const date = new Date(appointment[0].tgl_kunjungan).toISOString().split('T')[0];
        const fullDateTime = `${date} ${jam}:00`;

        await db.query(`
            UPDATE pendaftaran 
            SET id_pegawai = ?, tgl_kunjungan = ?, status = 'Menunggu'
            WHERE id_daftar = ?
        `, [id_pegawai, fullDateTime, id]);

        res.json({ message: 'Appointment confirmed' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to confirm appointment' });
    }
});
```

---

## 📝 Implementation Checklist

### Phase 1: Inventory CRUD ✅
- [x] Add Action column to table
- [ ] Create Edit modal
- [ ] Implement edit function
- [ ] Implement delete function
- [ ] Add backend endpoints
- [ ] Test with Resepsionis role

### Phase 2: Staff Management
- [ ] Add phone validation
- [ ] Redesign action buttons
- [ ] Extend profile form
- [ ] Add backend endpoint
- [ ] Test all validations

### Phase 3: Billing System
- [ ] Add Generate Bill button
- [ ] Implement billing logic
- [ ] Test price snapshots
- [ ] Verify transaction details

### Phase 4: Doctor Workspace
- [ ] Add prescription edit
- [ ] Enhance queue display
- [ ] Test medical record flow

### Phase 5: Customer Dashboard
- [ ] Create Next Appointment card
- [ ] Implement request flow
- [ ] Add time confirmation
- [ ] Test status updates

---

## 🚀 Next Steps

1. Review this implementation plan
2. Confirm which features to implement first
3. Begin implementation phase by phase
4. Test each feature thoroughly
5. Deploy to production

**Estimated Time:** 8-12 hours for full implementation
**Priority Order:** 1 → 3 → 2 → 4 → 5
