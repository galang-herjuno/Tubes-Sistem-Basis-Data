document.addEventListener('DOMContentLoaded', async () => {
    let currentUsername = '';

    // 1. Fetch User Info & Stats
    try {
        const userRes = await fetch('/api/me');
        if (userRes.ok) {
            const user = await userRes.json();
            document.getElementById('user-name').textContent = user.username;
            document.getElementById('user-role').textContent = user.role;

            // Store username and update delete confirmation display
            currentUsername = user.username;
            const confirmDisplay = document.getElementById('confirm-username-display');
            if (confirmDisplay) confirmDisplay.textContent = currentUsername;

            updateUIBasedOnRole(user.role);
        }

        // Initial load: Dashboard
        loadDashboardStats();

        // 2. Setup Navigation
        setupNavigation();
        setupSettings();

    } catch (error) {
        console.error('Error initializing dashboard:', error);
    }

    // Set Date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', options);
});

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
}

function updateUIBasedOnRole(role) {
    // Also manage sidebar visibility
    const adminElements = document.querySelectorAll('.role-admin');
    const doctorElements = document.querySelectorAll('.role-dokter');
    const receptionElements = document.querySelectorAll('.role-resepsionis');

    // Default: Hide all role-specific
    adminElements.forEach(el => el.style.display = 'none');
    doctorElements.forEach(el => el.style.display = 'none');
    receptionElements.forEach(el => el.style.display = 'none');

    if (role === 'Admin') {
        adminElements.forEach(el => el.style.display = 'block');
        doctorElements.forEach(el => el.style.display = 'block');
        receptionElements.forEach(el => el.style.display = 'block');
    } else if (role === 'Dokter') {
        doctorElements.forEach(el => el.style.display = 'block');
    } else if (role === 'Resepsionis') {
        receptionElements.forEach(el => el.style.display = 'block');
    } else if (role === 'Pelanggan') {
        // Limited view for Pelanggan
    }
}

function setupNavigation() {
    const links = document.querySelectorAll('.menu a');
    const sections = document.querySelectorAll('main > div.section-content');

    // Helper to switch sections
    window.switchSection = (sectionId) => {
        document.getElementById('dashboard-view').style.display = 'none';
        document.querySelectorAll('.app-section').forEach(el => el.style.display = 'none');
        links.forEach(l => l.classList.remove('active'));
        const target = document.getElementById(sectionId);
        if (target) target.style.display = 'block';
    };

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const text = link.innerText.trim();

            if (text.includes('Dashboard')) {
                window.switchSection('dashboard-view');
                link.classList.add('active');
                loadDashboardStats();
            } else if (text.includes('Patients')) {
                window.switchSection('patients-view');
                link.classList.add('active');
                loadPatients();
            } else if (text.includes('Staff')) {
                window.switchSection('staff-view');
                link.classList.add('active');
                loadStaff();
            } else if (text.includes('Inventory')) {
                window.switchSection('inventory-view');
                link.classList.add('active');
                loadInventory();
            } else if (text.includes('Transactions')) {
                window.switchSection('transactions-view');
                link.classList.add('active');
                loadTransactions();
            } else if (text.includes('Appointments')) {
                window.switchSection('appointments-view');
                link.classList.add('active');
                loadAppointmentFormData();
            } else if (text.includes('Settings')) {
                window.switchSection('settings-view');
                link.classList.add('active');
            }
        });
    });
}

function setupSettings() {
    // Change Password Modal Logic
    const openModalBtn = document.getElementById('openChangePassModalBtn');
    const closeModalBtn = document.getElementById('closePasswordModal');
    const modal = document.getElementById('passwordModal');
    const changePassForm = document.getElementById('changePasswordForm');

    if (openModalBtn && modal) {
        openModalBtn.addEventListener('click', () => {
            modal.classList.remove('hidden');
        });
    }

    if (closeModalBtn && modal) {
        closeModalBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    if (changePassForm) {
        changePassForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const oldPassword = document.getElementById('oldPassword').value;
            const newPassword = document.getElementById('newPassword').value;

            if (!oldPassword || !newPassword) return;

            try {
                const res = await fetch('/api/users/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ oldPassword, newPassword })
                });
                const data = await res.json();
                alert(data.message);
                if (res.ok) {
                    e.target.reset();
                    if (modal) modal.classList.add('hidden');
                }
            } catch (err) {
                console.error(err);
                alert('Failed to change password');
            }
        });
    }

    // Delete Account
    const deleteBtn = document.getElementById('deleteAccountBtn');
    const deleteInput = document.getElementById('deleteConfirmationInput');

    if (deleteInput && deleteBtn) {
        deleteInput.addEventListener('input', (e) => {
            const currentUsername = document.getElementById('user-name').textContent;
            const expectedPhrase = `delete my account ${currentUsername}`;

            if (e.target.value === expectedPhrase) {
                deleteBtn.disabled = false;
                deleteBtn.style.opacity = '1';
                deleteBtn.style.cursor = 'pointer';
            } else {
                deleteBtn.disabled = true;
                deleteBtn.style.opacity = '0.5';
                deleteBtn.style.cursor = 'not-allowed';
            }
        });

        deleteBtn.addEventListener('click', async () => {
            if (confirm('Final check: This will permanently delete your account and all associated data. Proceed?')) {
                try {
                    const res = await fetch('/api/users/delete', { method: 'DELETE' });
                    const data = await res.json();
                    alert(data.message);
                    if (res.ok) {
                        window.location.href = '/login';
                    }
                } catch (err) {
                    console.error(err);
                    alert('Failed to delete account');
                }
            }
        });
    }
}

// --- DATA LOADERS ---

async function loadDashboardStats() {
    const statsRes = await fetch('/api/dashboard/stats');
    if (statsRes.ok) {
        const stats = await statsRes.json();
        document.getElementById('total-patients').innerText = stats.totalPatients;

        const lowStockEl = document.getElementById('low-stock');
        lowStockEl.innerText = stats.lowStock;

        // Visual Notification for Low Stock
        const lowStockCard = lowStockEl.closest('.stat-card');
        if (stats.lowStock > 0) {
            lowStockEl.style.color = '#ef4444';
            lowStockCard.style.border = '1px solid #ef4444';
            lowStockCard.style.background = 'rgba(239, 68, 68, 0.1)';
        } else {
            lowStockCard.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            lowStockCard.style.background = 'rgba(30, 41, 59, 0.7)';
        }

        document.getElementById('revenue-today').innerText = formatCurrency(stats.revenueToday);
        document.getElementById('active-staff').innerText = stats.activeStaff;
    }
    fetchQueue();
    fetchRecords();
    if (document.getElementById('salesChart')) fetchAnalytics();
}

async function fetchQueue() {
    const res = await fetch('/api/dashboard/queue');
    if (res.ok) {
        const queue = await res.json();
        const tbody = document.getElementById('queue-body');
        tbody.innerHTML = '';

        if (queue.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#94a3b8">No appointments today</td></tr>';
            return;
        }

        queue.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 500">${item.nama_hewan}</td>
                <td>${item.dokter}</td>
                <td>${item.jam}</td>
                <td>
                    <select class="status-select" onchange="updateStatus(${item.id_daftar}, this.value)">
                        <option value="Menunggu" ${item.status === 'Menunggu' ? 'selected' : ''}>Menunggu</option>
                        <option value="Diperiksa" ${item.status === 'Diperiksa' ? 'selected' : ''}>Diperiksa</option>
                        <option value="Selesai" ${item.status === 'Selesai' ? 'selected' : ''}>Selesai</option>
                        <option value="Batal" ${item.status === 'Batal' ? 'selected' : ''}>Batal</option>
                    </select>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

async function updateStatus(id, newStatus) {
    try {
        await fetch('/api/dashboard/queue/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_daftar: id, status: newStatus })
        });
    } catch (err) {
        console.error(err);
        alert('Failed to update status');
    }
}

async function fetchRecords() {
    const res = await fetch('/api/dashboard/records');
    if (res.ok) {
        const records = await res.json();
        const container = document.getElementById('recent-records');
        container.innerHTML = '';

        records.forEach(rec => {
            const div = document.createElement('div');
            div.className = 'record-item';
            div.innerHTML = `
                <div class="record-info">
                    <h4>${rec.nama_hewan}</h4>
                    <p>${rec.diagnosa || 'No description'}</p>
                </div>
                <div class="record-date">
                    ${new Date(rec.tgl_periksa).toLocaleDateString()}
                </div>
            `;
            container.appendChild(div);
        });
    }
}

async function fetchAnalytics() {
    const res = await fetch('/api/dashboard/analytics');
    if (res.ok) {
        const data = await res.json();

        // Sales Chart
        const ctxSales = document.getElementById('salesChart').getContext('2d');
        if (window.mySalesChart) window.mySalesChart.destroy();

        window.mySalesChart = new Chart(ctxSales, {
            type: 'line',
            data: {
                labels: data.sales.map(s => new Date(s.date).toLocaleDateString('id-ID', { weekday: 'short' })),
                datasets: [{
                    label: 'Revenue (IDR)',
                    data: data.sales.map(s => s.total),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });

        // Payment Methods Chart
        const ctxPayment = document.getElementById('paymentChart').getContext('2d');
        new Chart(ctxPayment, {
            type: 'doughnut',
            data: {
                labels: data.paymentMethods.map(p => p.metode_bayar),
                datasets: [{
                    data: data.paymentMethods.map(p => p.count),
                    backgroundColor: ['#8b5cf6', '#ec4899', '#06b6d4', '#f59e0b'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: '#94a3b8' } } }
            }
        });

        // Best Selling Services List
        const servicesContainer = document.getElementById('best-services');
        if (servicesContainer) {
            servicesContainer.innerHTML = '';
            data.bestServices.forEach((s, index) => {
                const div = document.createElement('div');
                div.className = 'record-item';
                div.innerHTML = `
                     <div class="record-info" style="display:flex; align-items:center; gap:10px;">
                         <span style="font-weight:bold; color:var(--accent-color)">#${index + 1}</span>
                         <h4>${s.nama_layanan}</h4>
                     </div>
                     <div class="record-date">${s.usage_count} uses</div>
                 `;
                servicesContainer.appendChild(div);
            });
        }
    }
}

// --- NEW SECTION LOADERS ---

async function loadPatients() {
    const res = await fetch('/api/owners');
    if (res.ok) {
        const owners = await res.json();
        const tbody = document.querySelector('#patients-view table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        owners.forEach(o => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${o.nama_pemilik}</td>
                <td>${o.no_hp || '-'}</td>
                <td>${o.pet_count} Pets</td>
                <td>${o.alamat || '-'}</td>
                <td>
                    <button class="btn-xs" style="color:var(--primary-color)">View</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// --- Modal Helpers ---
window.openModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden');
};

window.closeModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
};

window.toggleSpesialisasi = (val) => {
    const group = document.getElementById('spesialisasi-group');
    if (group) {
        group.style.display = (val === 'Dokter Hewan' || val === 'Groomer') ? 'block' : 'none';
    }
};

// --- Staff Management Logic ---

window.submitAddStaff = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const btn = form.querySelector('button[type="submit"]');

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating...';

        const res = await fetch('/api/staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        if (res.ok) {
            alert(result.message);
            closeModal('staffModal');
            form.reset();
            loadStaff();
        } else {
            alert(result.message || 'Failed to create staff');
        }
    } catch (err) {
        console.error(err);
        alert('Error connecting to server');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Staff Account';
    }
};

window.deleteStaff = async (id, name) => {
    if (confirm(`Are you sure you want to delete ${name}? This will remove their user account and profile permanently.`)) {
        try {
            const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
            const result = await res.json();
            alert(result.message);
            if (res.ok) loadStaff();
        } catch (err) {
            console.error(err);
            alert('Failed to delete staff');
        }
    }
};

window.submitAddItem = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const btn = form.querySelector('button[type="submit"]');

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';

        const res = await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        if (res.ok) {
            alert(result.message);
            closeModal('inventoryModal');
            form.reset();
            loadInventory(); // Refresh list
        } else {
            alert(result.message || 'Failed to add item');
        }
    } catch (err) {
        console.error(err);
        alert('Error connecting to server');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Add Item';
    }
};

// --- Modal Helpers ---
window.openModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden');
};

window.closeModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
};

window.toggleSpesialisasi = (val) => {
    const group = document.getElementById('spesialisasi-group');
    if (group) {
        group.style.display = (val === 'Dokter Hewan' || val === 'Groomer') ? 'block' : 'none';
    }
};

// --- Staff Management Logic ---

window.submitAddStaff = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const btn = form.querySelector('button[type="submit"]');

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creating...';

        const res = await fetch('/api/staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        if (res.ok) {
            alert(result.message);
            closeModal('staffModal');
            form.reset();
            loadStaff();
        } else {
            alert(result.message || 'Failed to create staff');
        }
    } catch (err) {
        console.error(err);
        alert('Error connecting to server');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Create Staff Account';
    }
};

window.deleteStaff = async (id, name) => {
    if (confirm(`Are you sure you want to delete ${name}? This will remove their user account and profile permanently.`)) {
        try {
            const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
            const result = await res.json();
            alert(result.message);
            if (res.ok) loadStaff();
        } catch (err) {
            console.error(err);
            alert('Failed to delete staff');
        }
    }
};

window.submitAddItem = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const btn = form.querySelector('button[type="submit"]');

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';

        const res = await fetch('/api/inventory', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        if (res.ok) {
            alert(result.message);
            closeModal('inventoryModal');
            form.reset();
            loadInventory();
        } else {
            alert(result.message || 'Failed to add item');
        }
    } catch (err) {
        console.error(err);
        alert('Error connecting to server');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Add Item';
    }
};

async function loadStaff() {
    const res = await fetch('/api/staff');
    if (res.ok) {
        const staff = await res.json();
        const tbody = document.querySelector('#staff-view table tbody');
        const emptyState = document.getElementById('staff-empty-state');
        const tableContainer = document.querySelector('#staff-view .table-container table');

        if (!tbody) return;
        tbody.innerHTML = '';

        if (staff.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            if (tableContainer) tableContainer.style.display = 'none';
            return;
        } else {
            if (emptyState) emptyState.style.display = 'none';
            if (tableContainer) tableContainer.style.display = 'table';
        }

        const isAdmin = document.getElementById('user-role').textContent === 'Admin';

        const thead = document.querySelector('#staff-view table thead tr');
        // Simple check to avoid duplicate headers
        if (isAdmin && !thead.textContent.includes('Action')) {
            const th = document.createElement('th');
            th.textContent = 'Action';
            thead.appendChild(th);
        }

        staff.forEach(s => {
            const tr = document.createElement('tr');
            let actionHtml = '';

            if (isAdmin && s.id_user) {
                // Actions: Edit Role & Delete
                actionHtml = `
                    <td style="display:flex; gap:0.5rem;">
                        <button onclick="editUserRole(${s.id_user}, '${s.username}', '${s.account_role}')" 
                                class="btn-xs" style="color:var(--accent-color); cursor:pointer;" title="Edit Role">
                            <i class="fa-solid fa-user-pen"></i>
                        </button>
                        <button onclick="deleteStaff(${s.id_pegawai}, '${s.nama_lengkap}')" 
                                class="btn-xs" style="color:var(--danger-color); cursor:pointer;" title="Delete Staff">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>`;
            } else if (isAdmin) {
                actionHtml = `<td><span style="color:#94a3b8">-</span></td>`;
            }

            tr.innerHTML = `
                <td>${s.nama_lengkap}</td>
                <td>${s.jabatan}</td>
                <td>${s.username || 'No Account'}</td>
                <td>${s.spesialisasi || '-'}</td>
                <td>${s.no_hp || '-'}</td>
                ${actionHtml}
            `;
            tbody.appendChild(tr);
        });
    }
}

// Global function for Edit Role
window.editUserRole = async (userId, username, currentRole) => {
    const newRole = prompt(`Update role for ${username} (Admin/Dokter/Resepsionis/Pelanggan):`, currentRole);
    if (newRole && newRole !== currentRole) {
        try {
            const res = await fetch(`/api/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole })
            });
            const data = await res.json();
            alert(data.message);
            if (res.ok) loadStaff();
        } catch (err) {
            console.error(err);
            alert('Failed to update role');
        }
    }
};

async function loadAppointmentFormData() {
    const ownerRes = await fetch('/api/owners');
    if (ownerRes.ok) {
        const owners = await ownerRes.json();
        const ownerSelect = document.getElementById('apt-owner');
        ownerSelect.innerHTML = '<option value="">Select Owner</option>';
        owners.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.id_pemilik;
            opt.textContent = `${o.nama_pemilik} (${o.no_hp})`;
            ownerSelect.appendChild(opt);
        });
    }

    const docRes = await fetch('/api/doctors');
    if (docRes.ok) {
        const docs = await docRes.json();
        const docSelect = document.getElementById('apt-doctor');
        docSelect.innerHTML = '<option value="">Select Doctor/Groomer</option>';
        docs.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id_pegawai;
            opt.textContent = d.nama_lengkap;
            docSelect.appendChild(opt);
        });
    }

    const ownerSelect = document.getElementById('apt-owner');
    ownerSelect.onchange = async () => {
        const ownerId = ownerSelect.value;
        const petSelect = document.getElementById('apt-pet');
        if (!ownerId) {
            petSelect.disabled = true;
            petSelect.innerHTML = '<option value="">Select Owner First</option>';
            return;
        }

        const petRes = await fetch(`/api/owners/${ownerId}/pets`);
        if (petRes.ok) {
            const pets = await petRes.json();
            petSelect.innerHTML = '<option value="">Select Pet</option>';
            pets.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.id_hewan;
                opt.textContent = `${p.nama_hewan} (${p.jenis_hewan})`;
                petSelect.appendChild(opt);
            });
            petSelect.disabled = false;
        }
    };

    const form = document.getElementById('appointmentForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const data = {
            id_hewan: document.getElementById('apt-pet').value,
            id_pegawai: document.getElementById('apt-doctor').value,
            tgl_kunjungan: document.getElementById('apt-date').value,
            keluhan: document.getElementById('apt-complaint').value
        };

        try {
            const res = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            alert(result.message);
            if (res.ok) {
                form.reset();
                window.location.href = '/dashboard';
            }
        } catch (err) {
            console.error(err);
            alert('Failed to create appointment');
        }
    };
}

async function loadInventory() {
    const res = await fetch('/api/inventory');
    if (res.ok) {
        const items = await res.json();
        const tbody = document.querySelector('#inventory-view table tbody');
        const emptyState = document.getElementById('inventory-empty-state');
        const tableContainer = document.querySelector('#inventory-view .table-container table');

        if (!tbody) return;
        tbody.innerHTML = '';

        if (items.length === 0) {
            if (emptyState) emptyState.style.display = 'block';
            if (tableContainer) tableContainer.style.display = 'none';
        } else {
            if (emptyState) emptyState.style.display = 'none';
            if (tableContainer) tableContainer.style.display = 'table';
        }

        items.forEach(i => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${i.nama_barang}</td>
                <td>${i.kategori}</td>
                <td>${i.stok}</td>
                <td>${formatCurrency(i.harga_satuan)} / ${i.satuan}</td>
                <td>
                    ${i.stok < 5 ? '<span class="status-badge status-menunggu">Low Stock</span>' : '<span class="status-badge status-selesai">OK</span>'}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

async function loadTransactions() {
    const res = await fetch('/api/transactions');
    if (res.ok) {
        const txs = await res.json();
        const tbody = document.querySelector('#transactions-view table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        txs.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${t.id_transaksi}</td>
                <td>${new Date(t.tgl_transaksi).toLocaleDateString()}</td>
                <td>${t.nama_pemilik || 'Guest'}</td>
                <td>${t.metode_bayar}</td>
                <td style="font-weight:bold">${formatCurrency(t.total_biaya)}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}
