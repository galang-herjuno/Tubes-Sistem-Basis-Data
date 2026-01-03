document.addEventListener('DOMContentLoaded', async () => {
    let currentUsername = '';
    window.currentUserRole = ''; // Store globally for access

    // 1. Fetch User Info & Stats
    try {
        const userRes = await fetch('/api/me');
        if (userRes.ok) {
            const user = await userRes.json();
            const userNameEl = document.getElementById('user-name');
            const userRoleEl = document.getElementById('user-role');
            if (userNameEl) userNameEl.textContent = user.username;
            if (userRoleEl) userRoleEl.textContent = user.role;

            // Store username and role globally
            currentUsername = user.username;
            window.currentUserRole = user.role;
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
        // Hide Revenue Today for doctors
        const revenueCard = document.querySelector('.stat-card:nth-child(2)');
        if (revenueCard) revenueCard.style.display = 'none';
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
        // Hide all sections first
        // Note: we need to wrap dashboard content in a section too
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
            } else if (text.includes('Medical Records')) {
                window.switchSection('medical-workspace-view');
                link.classList.add('active');
                loadMedicalWorkspace();
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
                loadDoctorProfile(); // Load profile data
            }
        });
    });
}

// Navigate to Inventory from Low Stock card
window.navigateToInventory = () => {
    const inventoryLink = document.querySelector('.menu a[href="#"]');
    const links = document.querySelectorAll('.menu a');
    links.forEach((link, index) => {
        if (link.textContent.includes('Inventory')) {
            link.click();
        }
    });
};

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

// ========================================
// PROFILE MANAGEMENT
// ========================================

// Load Doctor/Staff Profile
async function loadDoctorProfile() {
    const res = await fetch('/api/pegawai/profile');
    if (res.ok) {
        const profile = await res.json();
        document.getElementById('profile-name').value = profile.nama_lengkap || '';
        document.getElementById('profile-spec').value = profile.spesialisasi || '';
        document.getElementById('profile-phone').value = profile.no_hp || '';
        document.getElementById('profile-email').value = profile.email || '';
        document.getElementById('profile-address').value = profile.alamat || '';

        // Show profile section for Dokter and Resepsionis
        const profileSection = document.getElementById('doctor-profile-section');
        if (profileSection && (window.currentUserRole === 'Dokter' || window.currentUserRole === 'Resepsionis')) {
            profileSection.style.display = 'block';
        }
    }
}

// Update Doctor/Staff Profile
window.updateDoctorProfile = async (e) => {
    e.preventDefault();

    const data = {
        nama_lengkap: document.getElementById('profile-name').value.trim(),
        spesialisasi: document.getElementById('profile-spec').value.trim(),
        no_hp: document.getElementById('profile-phone').value.trim(),
        email: document.getElementById('profile-email').value.trim(),
        alamat: document.getElementById('profile-address').value.trim()
    };

    // Validate phone number
    const phoneRegex = /^[0-9]{10,15}$/;
    if (data.no_hp && !phoneRegex.test(data.no_hp)) {
        alert('❌ Phone number must be 10-15 digits (numeric only)');
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
            // Update displayed name if changed
            const nameDisplay = document.getElementById('user-name');
            if (nameDisplay && data.nama_lengkap) {
                nameDisplay.textContent = data.nama_lengkap.split(' ')[0]; // First name
            }
        } else {
            alert('❌ Error: ' + result.message);
        }
    } catch (err) {
        console.error(err);
        alert('❌ Failed to update profile');
    }
};

// ========================================
// END PROFILE MANAGEMENT
// ========================================


// --- DATA LOADERS ---

async function loadDashboardStats() {
    const statsRes = await fetch('/api/dashboard/stats');
    if (statsRes.ok) {
        const stats = await statsRes.json();
        const totalPatientsEl = document.getElementById('total-patients');
        if (totalPatientsEl) totalPatientsEl.innerText = stats.totalPatients;

        const lowStockEl = document.getElementById('low-stock');
        lowStockEl.innerText = stats.lowStock;
        if (stats.lowStock > 0) lowStockEl.style.color = '#ef4444';

        const activeStaffEl = document.getElementById('active-staff');
        if (activeStaffEl) activeStaffEl.innerText = stats.activeStaff;
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
        if (!tbody) return;
        tbody.innerHTML = '';

        if (queue.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8">No appointments today</td></tr>';
            return;
        }

        const isAdmin = window.currentUserRole === 'Admin';
        const isResepsionis = window.currentUserRole === 'Resepsionis';
        const canGenerateBill = isAdmin || isResepsionis;

        queue.forEach(item => {
            const tr = document.createElement('tr');

            // Generate Bill button for completed appointments
            let billButton = '';
            if (canGenerateBill && item.status === 'Selesai') {
                billButton = `
                    <button onclick="generateBill(${item.id_daftar}, '${item.nama_hewan}')" 
                            class="btn-xs" 
                            style="background:#f59e0b; color:#1e293b; font-weight:600; padding:0.5rem 0.75rem; border-radius:6px; border:none; cursor:pointer; margin-left:0.5rem; transition:all 0.3s ease;" 
                            onmouseover="this.style.background='#d97706'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(245, 158, 11, 0.4)'"
                            onmouseout="this.style.background='#f59e0b'; this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                            title="Generate Bill">
                        <i class="fa-solid fa-file-invoice-dollar"></i> Generate Bill
                    </button>
                `;
            }

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
                    ${billButton}
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
        // Destroy old if exists
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
        const paymentCanvas = document.getElementById('paymentChart');
        if (paymentCanvas) {
            const ctxPayment = paymentCanvas.getContext('2d');
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
        }

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

        if (owners.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:2rem;">No owners registered yet</td></tr>';
            return;
        }

        owners.forEach(o => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight:500;">${o.nama_pemilik}</td>
                <td>${o.email || '-'}</td>
                <td>${o.no_hp || '-'}</td>
                <td><span class="status-badge status-selesai">${o.pet_count} Pet${o.pet_count > 1 ? 's' : ''}</span></td>
                <td>
                    <button class="btn-xs" onclick="viewOwnerDetails(${o.id_pemilik})" 
                            style="color:var(--primary-color); cursor:pointer; padding:0.5rem 1rem; background:rgba(139, 92, 246, 0.1); border:1px solid var(--primary-color); border-radius:5px;">
                        <i class="fa-solid fa-eye"></i> View
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// View Owner Details
window.viewOwnerDetails = async (ownerId) => {
    try {
        openModal('ownerDetailsModal');
        const content = document.getElementById('owner-details-content');
        content.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:2rem;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</p>';

        // Fetch owner details
        const ownerRes = await fetch('/api/owners');
        if (!ownerRes.ok) return;

        const owners = await ownerRes.json();
        const owner = owners.find(o => o.id_pemilik === ownerId);

        if (!owner) {
            content.innerHTML = '<p style="text-align:center; color:#ef4444;">Owner not found</p>';
            return;
        }

        // Fetch owner's pets
        const petsRes = await fetch(`/api/owners/${ownerId}/pets`);
        const pets = petsRes.ok ? await petsRes.json() : [];

        // Update modal title
        document.getElementById('owner-details-title').textContent = `${owner.nama_pemilik}'s Profile`;

        // Build content
        content.innerHTML = `
            <!-- Owner Information Card -->
            <div style="background:rgba(139, 92, 246, 0.05); 
                        padding:2rem; border-radius:15px; border:1px solid rgba(139, 92, 246, 0.2); margin-bottom:2rem;">
                <div style="display:grid; grid-template-columns: auto 1fr; gap:2rem; align-items:center;">
                    <div style="width:100px; height:100px; background:var(--primary-color); 
                                border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 10px 30px rgba(139, 92, 246, 0.3);">
                        <i class="fa-solid fa-user" style="font-size:3rem; color:var(--text-color);"></i>
                    </div>
                    <div>
                        <h2 style="margin:0 0 0.5rem 0; color:var(--text-color); font-size:1.8rem;">${owner.nama_pemilik}</h2>
                        <div style="display:grid; gap:0.5rem; margin-top:1rem;">
                            <p style="margin:0; color:var(--text-color); display:flex; align-items:center; gap:0.5rem;">
                                <i class="fa-solid fa-envelope" style="color:var(--primary-color); width:20px;"></i>
                                <span>${owner.email || 'Not provided'}</span>
                            </p>
                            <p style="margin:0; color:var(--text-color); display:flex; align-items:center; gap:0.5rem;">
                                <i class="fa-solid fa-phone" style="color:var(--primary-color); width:20px;"></i>
                                <span>${owner.no_hp || 'Not provided'}</span>
                            </p>
                            <p style="margin:0; color:var(--text-color); display:flex; align-items:center; gap:0.5rem;">
                                <i class="fa-solid fa-location-dot" style="color:var(--primary-color); width:20px;"></i>
                                <span>${owner.alamat || 'Not provided'}</span>
                            </p>
                            <p style="margin:0; color:var(--text-color); display:flex; align-items:center; gap:0.5rem;">
                                <i class="fa-solid fa-calendar" style="color:var(--primary-color); width:20px;"></i>
                                <span>Member since ${new Date(owner.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Pets Section -->
            <div>
                <h3 style="margin:0 0 1rem 0; color:var(--text-color); display:flex; align-items:center; gap:0.5rem;">
                    <i class="fa-solid fa-paw" style="color:var(--primary-color);"></i>
                    Registered Pets (${pets.length})
                </h3>
                
                ${pets.length === 0 ? `
                    <div style="text-align:center; padding:3rem; background:rgba(0,0,0,0.02); border-radius:10px; border:1px dashed var(--glass-border);">
                        <i class="fa-solid fa-paw" style="font-size:3rem; color:#94a3b8; opacity:0.3; margin-bottom:1rem;"></i>
                        <p style="color:#94a3b8; margin:0;">No pets registered yet</p>
                    </div>
                ` : `
                    <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap:1rem;">
                        ${pets.map(pet => `
                            <div style="background:white; padding:1.5rem; border-radius:12px; 
                                        border:1px solid #e2e8f0; transition:all 0.3s ease; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                                        hover:border-color:var(--primary-color); hover:transform:translateY(-2px);">
                                <div style="text-align:center; margin-bottom:1rem;">
                                    <div style="width:60px; height:60px; background:var(--primary-color); 
                                                border-radius:50%; display:flex; align-items:center; justify-content:center; 
                                                margin:0 auto; box-shadow:0 5px 15px rgba(245, 158, 11, 0.2);">
                                        <i class="fa-solid fa-${pet.jenis_hewan === 'Kucing' ? 'cat' : pet.jenis_hewan === 'Anjing' ? 'dog' : 'paw'}" 
                                           style="font-size:1.8rem; color:var(--text-color);"></i>
                                    </div>
                                </div>
                                <h4 style="text-align:center; margin:0 0 0.5rem 0; color:var(--text-color); font-size:1.1rem;">${pet.nama_hewan}</h4>
                                <p style="text-align:center; color:#64748b; margin:0 0 1rem 0; font-size:0.9rem;">
                                    ${pet.jenis_hewan}${pet.ras ? ' • ' + pet.ras : ''}
                                </p>
                                <div style="padding-top:1rem; border-top:1px solid #f1f5f9;">
                                    <p style="margin:0.25rem 0; color:#334155; font-size:0.85rem; display:flex; align-items:center; gap:0.5rem;">
                                        <i class="fa-solid fa-venus-mars" style="color:var(--primary-color); width:16px;"></i>
                                        ${pet.gender}
                                    </p>
                                    ${pet.tgl_lahir ? `
                                        <p style="margin:0.25rem 0; color:#334155; font-size:0.85rem; display:flex; align-items:center; gap:0.5rem;">
                                            <i class="fa-solid fa-cake-candles" style="color:var(--primary-color); width:16px;"></i>
                                            ${calculatePetAge(pet.tgl_lahir)}
                                        </p>
                                    ` : ''}
                                    ${pet.berat ? `
                                        <p style="margin:0.25rem 0; color:#334155; font-size:0.85rem; display:flex; align-items:center; gap:0.5rem;">
                                            <i class="fa-solid fa-weight-scale" style="color:var(--primary-color); width:16px;"></i>
                                            ${pet.berat} kg
                                        </p>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        `;

    } catch (error) {
        console.error('Error loading owner details:', error);
        const content = document.getElementById('owner-details-content');
        content.innerHTML = '<p style="text-align:center; color:#ef4444; padding:2rem;">Failed to load owner details</p>';
    }
};

// Helper function to calculate pet age
function calculatePetAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();

    if (months < 0) {
        years--;
        months += 12;
    }

    if (years > 0) {
        return `${years} year${years > 1 ? 's' : ''} old`;
    } else if (months > 0) {
        return `${months} month${months > 1 ? 's' : ''} old`;
    } else {
        return 'Less than a month old';
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

            if (isAdmin) {
                // Actions: Edit Details & Delete
                // Encoded JSON to safely pass object data
                const staffData = encodeURIComponent(JSON.stringify(s));

                actionHtml = `
                    <td style="display:flex; gap:0.5rem; justify-content:center;">
                        <button onclick="openEditStaff('${staffData}')" 
                                class="btn-xs" style="color:var(--accent-color); cursor:pointer;" title="Edit Staff">
                            <i class="fa-solid fa-user-pen"></i>
                        </button>
                        <button onclick="deleteStaff(${s.id_pegawai}, '${s.nama_lengkap.replace(/'/g, "\\'")}')" 
                                class="btn-xs" style="color:var(--danger-color); cursor:pointer;" title="Delete Staff">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </td>`;
            } else {
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
// Open Edit Staff Modal
window.openEditStaff = (encodedData) => {
    const s = JSON.parse(decodeURIComponent(encodedData));

    document.getElementById('edit-staff-id').value = s.id_pegawai;
    document.getElementById('edit-staff-name').value = s.nama_lengkap;
    document.getElementById('edit-staff-position').value = s.jabatan;
    document.getElementById('edit-staff-role').value = s.account_role || 'Dokter'; // Default fallback
    document.getElementById('edit-staff-username').value = s.username || 'No Account';
    document.getElementById('edit-staff-spec').value = s.spesialisasi || '';
    document.getElementById('edit-staff-phone').value = s.no_hp || '';

    // Handle initial specialization visibility
    toggleEditSpesialisasi(s.jabatan);

    openModal('editStaffModal');
};

// Toggle Specialization Field in Edit Modal
window.toggleEditSpesialisasi = (role) => {
    const specGroup = document.getElementById('edit-spesialisasi-group');
    if (role === 'Dokter Hewan' || role === 'Groomer') {
        specGroup.style.display = 'block';
    } else {
        specGroup.style.display = 'none';
        document.getElementById('edit-staff-spec').value = '';
    }
};

// Submit Edit Staff
window.submitEditStaff = async (e) => {
    e.preventDefault();
    const staffId = document.getElementById('edit-staff-id').value;

    const data = {
        nama_lengkap: document.getElementById('edit-staff-name').value,
        jabatan: document.getElementById('edit-staff-position').value,
        role: document.getElementById('edit-staff-role').value,
        spesialisasi: document.getElementById('edit-staff-spec').value,
        no_hp: document.getElementById('edit-staff-phone').value
    };

    try {
        const res = await fetch(`/api/staff/${staffId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        if (res.ok) {
            alert('✅ Staff updated successfully!');
            closeModal('editStaffModal');
            loadStaff();
        } else {
            alert('❌ Error: ' + result.message);
        }
    } catch (err) {
        console.error(err);
        alert('❌ Failed to update staff');
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
            const isLowStock = i.stok < 5;

            // Apply glowing border for low stock
            if (isLowStock) {
                tr.style.borderLeft = '3px solid #ef4444';
                tr.style.boxShadow = '0 0 10px rgba(239, 68, 68, 0.3)';
                tr.style.animation = 'pulse 2s infinite';
            }

            // Check if user can edit (Admin or Resepsionis)
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
                            <button onclick="openEditInventory(${i.id_barang}, '${i.nama_barang.replace(/'/g, "\\'")}', ${i.stok}, ${i.harga_satuan}, '${i.satuan}')" 
                                    class="btn-xs" style="color:var(--accent-color); cursor:pointer;" title="Edit Stock">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button onclick="deleteInventoryItem(${i.id_barang}, '${i.nama_barang.replace(/'/g, "\\'")}  ')" 
                                    class="btn-xs" style="color:var(--danger-color); cursor:pointer;" title="Delete Item">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    ` : '<span style="color:#94a3b8">-</span>'}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// --- Owner & Pet Management ---

window.submitAddOwner = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const btn = form.querySelector('button[type="submit"]');

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';

        const res = await fetch('/api/owners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        if (res.ok) {
            alert('Owner added successfully!');
            closeModal('ownerModal');
            form.reset();
            loadPatients(); // Refresh the patients list
            loadOwnerDropdowns(); // Refresh dropdowns
        } else {
            alert(result.error || 'Failed to add owner');
        }
    } catch (err) {
        console.error(err);
        alert('Error connecting to server');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Add Owner';
    }
};

window.submitAddPet = async (e) => {
    e.preventDefault();
    const form = e.target;

    // Custom Validation
    const beratInput = form.querySelector('input[name="berat"]');
    const tglLahirInput = form.querySelector('input[name="tgl_lahir"]');

    if (beratInput && parseFloat(beratInput.value) <= 0) {
        alert('Berat hewan harus lebih besar dari 0 kg');
        return;
    }

    if (tglLahirInput) {
        const selectedDate = new Date(tglLahirInput.value);
        const today = new Date();
        // Reset time part for accurate comparison
        today.setHours(0, 0, 0, 0);

        if (selectedDate > today) {
            alert('Tanggal lahir tidak boleh melebihi tanggal hari ini');
            return;
        }
    }

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const btn = form.querySelector('button[type="submit"]');

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';

        const res = await fetch('/api/pets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        if (res.ok) {
            alert('Pet added successfully!');
            closeModal('petModal');
            form.reset();
            loadPatients(); // Refresh the patients list
        } else {
            alert(result.error || 'Failed to add pet');
        }
    } catch (err) {
        console.error(err);
        alert('Error connecting to server');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Add Pet';
    }
};

// Add Prescription Handler
window.addPrescription = () => {
    const select = document.getElementById('medicine-select');
    const qtyInput = document.getElementById('medicine-qty');
    const usageInput = document.getElementById('medicine-usage');

    if (!select || !qtyInput) return;

    const idBarang = select.value;
    const qty = parseInt(qtyInput.value);
    const usage = usageInput.value || '';

    if (!idBarang || !qty || qty <= 0) {
        alert('Please select a medicine and enter a valid quantity');
        return;
    }

    // CHECK STOCK
    const selectedOption = select.options[select.selectedIndex];
    // Extract stock from text: "Amoxicillin (Stock: 15)"
    const stockMatch = selectedOption.textContent.match(/Stock: (\d+)/);
    const currentStock = stockMatch ? parseInt(stockMatch[1]) : 0;

    if (qty > currentStock) {
        alert(`Stok tidak mencukupi! Stok saat ini: ${currentStock}`);
        return;
    }

    // Add to list
    if (!window.prescriptions) window.prescriptions = [];

    // Check if already exists, update qty (Optional logic, or just add new entry)
    // For simplicity, we just add new entry or replace if needed. 
    // Let's allow duplicates for now or just push.

    const medName = selectedOption.textContent.split(' (Stock:')[0];

    window.prescriptions.push({
        id_barang: idBarang,
        nama_barang: medName,
        jumlah: qty,
        aturan_pakai: usage,
        satuan: 'Pcs' // Placeholder unit
    });

    updatePrescriptionList();

    // Reset inputs
    select.value = '';
    qtyInput.value = '';
    usageInput.value = '';
};

// Load owners into pet modal dropdown when modal opens
async function loadOwnerDropdowns() {
    const res = await fetch('/api/owners');
    if (res.ok) {
        const owners = await res.json();
        const petOwnerSelect = document.getElementById('pet-owner-select');
        if (petOwnerSelect) {
            petOwnerSelect.innerHTML = '<option value="">Select Owner</option>';
            owners.forEach(o => {
                const opt = document.createElement('option');
                opt.value = o.id_pemilik;
                opt.textContent = `${o.nama_pemilik} (${o.no_hp || 'No phone'})`;
                petOwnerSelect.appendChild(opt);
            });
        }
    }
}

// Override openModal to load owners when opening pet modal
const originalOpenModal = window.openModal;
window.openModal = (id) => {
    if (id === 'petModal') {
        loadOwnerDropdowns();
    }
    originalOpenModal(id);
};

// ========================================
// INVENTORY CRUD FUNCTIONS
// ========================================

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
        satuan: document.getElementById('edit-inv-unit').value.trim()
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

// ========================================
// BILLING SYSTEM
// ========================================

// Generate Bill - Show Preview First
window.generateBill = async (appointmentId, petName) => {
    try {
        // Fetch bill preview data
        const res = await fetch(`/api/billing/preview/${appointmentId}`);

        if (!res.ok) {
            const error = await res.json();
            alert('❌ Error: ' + error.message);
            return;
        }

        const data = await res.json();

        // Show preview modal
        showBillPreviewModal(data, appointmentId);

    } catch (err) {
        console.error(err);
        alert('❌ Failed to load bill preview');
    }
};

// Show Bill Preview Modal
function showBillPreviewModal(data, appointmentId) {
    const date = new Date(data.appointment.tanggal);
    const formattedDate = date.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });

    // Build medicines list
    let medicinesHTML = '';
    const medicines = data.items.filter(item => item.jenis_item === 'Barang');

    if (medicines.length > 0) {
        medicinesHTML = `
            <div style="background:rgba(255,255,255,0.03); border-radius:8px; padding:1rem; margin-bottom:1rem;">
                <h4 style="color:#f59e0b; margin:0 0 0.75rem 0; font-size:0.95rem;">
                    <i class="fa-solid fa-pills"></i> Obat yang Digunakan
                </h4>
                <div style="display:flex; flex-direction:column; gap:0.5rem;">
        `;

        medicines.forEach(med => {
            medicinesHTML += `
                <div style="display:flex; justify-content:space-between; padding:0.5rem; background:rgba(255,255,255,0.02); border-radius:4px;">
                    <div style="flex:1;">
                        <div style="color:white; font-weight:500;">${med.nama}</div>
                        <div style="color:#94a3b8; font-size:0.85rem;">${med.aturan_pakai || 'Sesuai petunjuk dokter'}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="color:white; font-weight:600;">${med.qty} ${med.satuan}</div>
                        <div style="color:#f59e0b; font-size:0.85rem;">${formatCurrency(med.subtotal)}</div>
                    </div>
                </div>
            `;
        });

        medicinesHTML += `
                </div>
            </div>
        `;
    }

    // Build items table
    let itemsHTML = '';
    data.items.forEach(item => {
        itemsHTML += `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:0.75rem 0.5rem; color:white;">${item.nama}</td>
                <td style="text-align:center; padding:0.75rem 0.5rem; color:white;">${item.qty}</td>
                <td style="text-align:right; padding:0.75rem 0.5rem; color:white;">${formatCurrency(item.harga)}</td>
                <td style="text-align:right; padding:0.75rem 0.5rem; color:#f59e0b; font-weight:600;">${formatCurrency(item.subtotal)}</td>
            </tr>
        `;
    });

    const modalHTML = `
        <div style="background:rgba(30, 41, 59, 0.98); backdrop-filter:blur(10px); border:1px solid rgba(245, 158, 11, 0.3); border-radius:12px; padding:2rem; max-width:650px; margin:0 auto; box-shadow:0 20px 60px rgba(0,0,0,0.7);">
            
            <!-- Header -->
            <div style="text-align:center; margin-bottom:1.5rem; border-bottom:2px solid #f59e0b; padding-bottom:1rem;">
                <div style="width:60px; height:60px; background:#f59e0b; border-radius:50%; margin:0 auto 1rem; display:flex; align-items:center; justify-content:center;">
                    <i class="fa-solid fa-file-invoice-dollar" style="font-size:1.8rem; color:#1e293b;"></i>
                </div>
                <h2 style="color:#f59e0b; margin:0 0 0.5rem 0; font-size:1.5rem;">Preview Tagihan</h2>
                <p style="color:#94a3b8; margin:0; font-size:0.9rem;">Periksa detail sebelum membuat tagihan</p>
            </div>

            <!-- Appointment Info -->
            <div style="background:rgba(255,255,255,0.03); border-radius:8px; padding:1.25rem; margin-bottom:1rem;">
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:0.75rem;">
                    <div>
                        <p style="color:#94a3b8; margin:0; font-size:0.85rem;">ID Appointment</p>
                        <p style="color:white; margin:0.25rem 0 0 0; font-weight:600;">#${data.appointment.id_daftar}</p>
                    </div>
                    <div>
                        <p style="color:#94a3b8; margin:0; font-size:0.85rem;">Tanggal & Waktu</p>
                        <p style="color:white; margin:0.25rem 0 0 0; font-weight:600;">${formattedDate}</p>
                        <p style="color:#94a3b8; margin:0; font-size:0.85rem;">${formattedTime}</p>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                    <div>
                        <p style="color:#94a3b8; margin:0; font-size:0.85rem;">Pemilik</p>
                        <p style="color:white; margin:0.25rem 0 0 0; font-weight:600;">${data.owner.nama}</p>
                        <p style="color:#94a3b8; margin:0; font-size:0.85rem;">${data.owner.no_hp || '-'}</p>
                    </div>
                    <div>
                        <p style="color:#94a3b8; margin:0; font-size:0.85rem;">Hewan</p>
                        <p style="color:white; margin:0.25rem 0 0 0; font-weight:600;">${data.pet.nama}</p>
                        <p style="color:#94a3b8; margin:0; font-size:0.85rem;">${data.pet.jenis} - ${data.pet.ras || 'Mixed'}</p>
                    </div>
                </div>
            </div>

            <!-- Medicines Detail -->
            ${medicinesHTML}

            <!-- Items Table -->
            <div style="background:rgba(255,255,255,0.03); border-radius:8px; padding:1rem; margin-bottom:1rem;">
                <h4 style="color:#f59e0b; margin:0 0 1rem 0; font-size:0.95rem;">Rincian Biaya</h4>
                <table style="width:100%;">
                    <thead>
                        <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
                            <th style="text-align:left; padding:0.5rem; color:#94a3b8; font-weight:500; font-size:0.85rem;">Item</th>
                            <th style="text-align:center; padding:0.5rem; color:#94a3b8; font-weight:500; font-size:0.85rem;">Qty</th>
                            <th style="text-align:right; padding:0.5rem; color:#94a3b8; font-weight:500; font-size:0.85rem;">Harga</th>
                            <th style="text-align:right; padding:0.5rem; color:#94a3b8; font-weight:500; font-size:0.85rem;">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemsHTML}
                    </tbody>
                </table>
            </div>

            <!-- Total -->
            <div style="background:#f59e0b; color:#1e293b; padding:1.25rem; border-radius:8px; margin-bottom:1rem;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:700; font-size:1.1rem;">TOTAL TAGIHAN</span>
                    <span style="font-weight:700; font-size:1.5rem;">${formatCurrency(data.total_biaya)}</span>
                </div>
            </div>

            <!-- Thank You Message -->
            <div style="text-align:center; padding:1rem; background:rgba(245,158,11,0.1); border-radius:8px; margin-bottom:1.5rem;">
                <p style="color:#f59e0b; margin:0; font-size:0.95rem; font-weight:500;">
                    <i class="fa-solid fa-heart"></i> Terima kasih telah mempercayakan PawWhisker :)
                </p>
            </div>

            <!-- Action Buttons -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                <button onclick="closeBillPreviewModal()" style="background:rgba(255,255,255,0.1); color:white; border:1px solid rgba(255,255,255,0.2); padding:0.75rem; border-radius:6px; cursor:pointer; font-weight:600; transition:all 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
                    <i class="fa-solid fa-times"></i> Batal
                </button>
                <button onclick="confirmGenerateBill(${appointmentId})" style="background:#f59e0b; color:#1e293b; border:none; padding:0.75rem; border-radius:6px; cursor:pointer; font-weight:600; transition:all 0.3s;" onmouseover="this.style.background='#d97706'" onmouseout="this.style.background='#f59e0b'">
                    <i class="fa-solid fa-check"></i> Konfirmasi & Buat Tagihan
                </button>
            </div>
        </div>
    `;

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'bill-preview-modal';
    // Fixed: Changed display to block and padding to allow scrolling
    modalOverlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.85); z-index:9999; overflow-y:auto; padding:2rem 1rem; animation:fadeIn 0.3s ease;';
    modalOverlay.innerHTML = modalHTML;

    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) {
            closeBillPreviewModal();
        }
    };

    document.body.appendChild(modalOverlay);
}

// Close Bill Preview Modal
window.closeBillPreviewModal = () => {
    const modal = document.getElementById('bill-preview-modal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => modal.remove(), 300);
    }
};

// Confirm and Generate Bill
window.confirmGenerateBill = async (appointmentId) => {
    try {
        const res = await fetch('/api/billing/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_daftar: appointmentId })
        });

        const result = await res.json();
        if (res.ok) {
            closeBillPreviewModal();
            showBillSuccessModal(result.total_biaya, result.id_transaksi, 'Pet');
            loadTransactions();
        } else {
            alert('❌ Error: ' + result.message);
        }
    } catch (err) {
        console.error(err);
        alert('❌ Failed to generate bill');
    }
};


// Show Bill Success Modal
function showBillSuccessModal(totalBiaya, transactionId, petName) {
    const modalHTML = `
        <div style="background:rgba(30, 41, 59, 0.95); backdrop-filter:blur(10px); border:1px solid rgba(245, 158, 11, 0.3); border-radius:12px; padding:2rem; max-width:500px; margin:2rem auto; box-shadow:0 20px 60px rgba(0,0,0,0.5); text-align:center;">
            <div style="width:80px; height:80px; background:#f59e0b; border-radius:50%; margin:0 auto 1.5rem; display:flex; align-items:center; justify-content:center; animation:scaleIn 0.3s ease;">
                <i class="fa-solid fa-check" style="font-size:2.5rem; color:#1e293b;"></i>
            </div>
            
            <h2 style="color:#f59e0b; margin:0 0 0.5rem 0; font-size:1.5rem;">
                Transaction Generated!
            </h2>
            
            <p style="color:#94a3b8; margin:0 0 1.5rem 0;">
                Bill for <strong style="color:white;">${petName}</strong> has been created successfully
            </p>
            
            <div style="background:rgba(255,255,255,0.05); border-radius:8px; padding:1.5rem; margin-bottom:1.5rem;">
                <div style="display:flex; justify-content:space-between; margin-bottom:1rem; padding-bottom:1rem; border-bottom:1px solid rgba(255,255,255,0.1);">
                    <span style="color:#94a3b8;">Transaction ID:</span>
                    <span style="color:white; font-weight:600;">#${transactionId}</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="color:#94a3b8; font-size:1.1rem;">Total Amount:</span>
                    <span style="color:#f59e0b; font-weight:700; font-size:1.5rem;">Rp ${totalBiaya.toLocaleString('id-ID')}</span>
                </div>
            </div>
            
            <button onclick="closeBillSuccessModal()" style="width:100%; background:#f59e0b; color:#1e293b; border:none; padding:0.75rem; border-radius:6px; cursor:pointer; font-weight:600; font-size:1rem; transition:all 0.3s;" onmouseover="this.style.background='#d97706'" onmouseout="this.style.background='#f59e0b'">
                <i class="fa-solid fa-check"></i> Done
            </button>
        </div>
    `;

    const modalOverlay = document.createElement('div');
    modalOverlay.id = 'bill-success-modal';
    modalOverlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center; padding:1rem; animation:fadeIn 0.3s ease;';
    modalOverlay.innerHTML = modalHTML;

    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) {
            closeBillSuccessModal();
        }
    };

    document.body.appendChild(modalOverlay);
}

// Close Bill Success Modal
window.closeBillSuccessModal = () => {
    const modal = document.getElementById('bill-success-modal');
    if (modal) {
        modal.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => modal.remove(), 300);
    }
};


// ========================================
// END BILLING SYSTEM
// ========================================

// ========================================
// END INVENTORY CRUD
// ========================================

async function loadTransactions() {
    const res = await fetch('/api/transactions');
    if (res.ok) {
        const txs = await res.json();
        const tbody = document.querySelector('#transactions-view table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (txs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:2rem;">No transactions yet</td></tr>';
            return;
        }

        txs.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${t.id_transaksi}</td>
                <td>${new Date(t.tgl_transaksi).toLocaleDateString()}</td>
                <td>${t.nama_pemilik || 'Guest'}</td>
                <td>${t.metode_bayar}</td>
                <td style="font-weight:bold">${formatCurrency(t.total_biaya)}</td>
                <td>
                    <div style="display:flex; gap:0.5rem; justify-content:center;">
                        <button onclick="viewTransactionDetails(${t.id_transaksi})" 
                                style="background:#f59e0b; color:#1e293b; font-weight:600; padding:0.5rem 1rem; border-radius:6px; border:none; cursor:pointer; transition:all 0.3s ease; display:inline-flex; align-items:center; gap:0.5rem;"
                                onmouseover="this.style.background='#d97706'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(245, 158, 11, 0.4)'"
                                onmouseout="this.style.background='#f59e0b'; this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                                title="View Details">
                            <i class="fa-solid fa-eye"></i> View
                        </button>
                        ${window.currentUserRole === 'Admin' ? `
                            <button onclick="deleteTransaction(${t.id_transaksi})" 
                                    style="background:#ef4444; color:white; font-weight:600; padding:0.5rem 1rem; border-radius:6px; border:none; cursor:pointer; transition:all 0.3s ease; display:inline-flex; align-items:center; gap:0.5rem;"
                                    onmouseover="this.style.background='#dc2626'; this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(239, 68, 68, 0.4)'"
                                    onmouseout="this.style.background='#ef4444'; this.style.transform='translateY(0)'; this.style.boxShadow='none'"
                                    title="Delete Transaction">
                                <i class="fa-solid fa-trash"></i> Delete
                            </button>
                        ` : ''}
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// View Transaction Details
window.viewTransactionDetails = async (txId) => {
    try {
        const res = await fetch(`/api/transactions/${txId}/details`);
        if (res.ok) {
            const { transaction, details } = await res.json();

            // Calculate subtotal
            let calculatedSubtotal = 0;
            details.forEach(d => {
                calculatedSubtotal += parseFloat(d.subtotal);
            });

            let detailsHtml = `
                <div style="background:rgba(30, 41, 59, 0.95); backdrop-filter:blur(10px); border:1px solid rgba(245, 158, 11, 0.3); border-radius:12px; padding:2rem; max-width:600px; margin:2rem auto; box-shadow:0 20px 60px rgba(0,0,0,0.5);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; border-bottom:2px solid #f59e0b; padding-bottom:1rem;">
                        <h2 style="color:#f59e0b; margin:0; font-size:1.5rem;">
                            <i class="fa-solid fa-receipt"></i> Transaction #${txId}
                        </h2>
                        <button onclick="closeTransactionModal()" style="background:none; border:none; color:#94a3b8; font-size:1.5rem; cursor:pointer; transition:color 0.3s;" onmouseover="this.style.color='#f59e0b'" onmouseout="this.style.color='#94a3b8'">
                            <i class="fa-solid fa-times"></i>
                        </button>
                    </div>
                    
                    <div style="margin-bottom:1.5rem;">
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-bottom:1rem;">
                            <div>
                                <p style="color:#94a3b8; margin:0; font-size:0.85rem;">Customer</p>
                                <p style="color:white; margin:0.25rem 0 0 0; font-weight:600;">${transaction.nama_pemilik || 'Guest'}</p>
                            </div>
                            <div>
                                <p style="color:#94a3b8; margin:0; font-size:0.85rem;">Payment Method</p>
                                <p style="color:white; margin:0.25rem 0 0 0; font-weight:600;">${transaction.metode_bayar}</p>
                            </div>
                        </div>
                        <div>
                            <p style="color:#94a3b8; margin:0; font-size:0.85rem;">Date & Time</p>
                            <p style="color:white; margin:0.25rem 0 0 0; font-weight:600;">${new Date(transaction.tgl_transaksi).toLocaleString()}</p>
                        </div>
                    </div>
                    
                    <div style="background:rgba(255,255,255,0.03); border-radius:8px; padding:1rem; margin-bottom:1rem;">
                        <h3 style="color:#f59e0b; margin:0 0 1rem 0; font-size:1.1rem;">Items</h3>
                        <table style="width:100%; color:white;">
                            <thead>
                                <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
                                    <th style="text-align:left; padding:0.5rem; color:#94a3b8; font-weight:500;">Item</th>
                                    <th style="text-align:center; padding:0.5rem; color:#94a3b8; font-weight:500;">Qty</th>
                                    <th style="text-align:right; padding:0.5rem; color:#94a3b8; font-weight:500;">Price</th>
                                    <th style="text-align:right; padding:0.5rem; color:#94a3b8; font-weight:500;">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>`;

            details.forEach(d => {
                const itemName = d.nama_layanan || d.nama_barang;
                detailsHtml += `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                        <td style="padding:0.75rem 0.5rem;">${itemName}</td>
                        <td style="text-align:center; padding:0.75rem 0.5rem;">${d.qty}</td>
                        <td style="text-align:right; padding:0.75rem 0.5rem;">${formatCurrency(d.harga_saat_ini)}</td>
                        <td style="text-align:right; padding:0.75rem 0.5rem; font-weight:600;">${formatCurrency(d.subtotal)}</td>
                    </tr>
                `;
            });

            detailsHtml += `
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Calculation Summary -->
                    <div style="background:rgba(255,255,255,0.03); border-radius:8px; padding:1rem; margin-bottom:1rem;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; color:white;">
                            <span>Subtotal:</span>
                            <span style="font-weight:600;">${formatCurrency(calculatedSubtotal)}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; color:#94a3b8;">
                            <span>Discount:</span>
                            <span>- ${formatCurrency(transaction.diskon || 0)}</span>
                        </div>
                        <div style="border-top:1px solid rgba(255,255,255,0.1); padding-top:0.5rem; margin-top:0.5rem; display:flex; justify-content:space-between; color:white; font-size:1.1rem;">
                            <span style="font-weight:600;">Grand Total:</span>
                            <span style="font-weight:700; color:#f59e0b;">${formatCurrency(transaction.total_biaya)}</span>
                        </div>
                    </div>
                    
                    <div style="background:#f59e0b; color:#1e293b; padding:1rem; border-radius:8px; display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:700; font-size:1.1rem;">TOTAL PAID</span>
                        <span style="font-weight:700; font-size:1.3rem;">${formatCurrency(transaction.total_biaya)}</span>
                    </div>
                    
                    <button onclick="closeTransactionModal()" style="width:100%; margin-top:1rem; background:rgba(255,255,255,0.1); color:white; border:1px solid rgba(255,255,255,0.2); padding:0.75rem; border-radius:6px; cursor:pointer; font-weight:600; transition:all 0.3s;" onmouseover="this.style.background='rgba(255,255,255,0.15)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
                        Close
                    </button>
                </div>
            `;

            // Create modal overlay
            const modalOverlay = document.createElement('div');
            modalOverlay.id = 'transaction-detail-modal';
            modalOverlay.style.cssText = 'position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); z-index:9999; display:flex; align-items:center; justify-content:center; padding:1rem; overflow-y:auto;';
            modalOverlay.innerHTML = detailsHtml;

            // Close on overlay click
            modalOverlay.onclick = (e) => {
                if (e.target === modalOverlay) {
                    closeTransactionModal();
                }
            };

            document.body.appendChild(modalOverlay);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to load transaction details');
    }
};

// Close Transaction Modal
window.closeTransactionModal = () => {
    const modal = document.getElementById('transaction-detail-modal');
    if (modal) {
        modal.remove();
    }
};

// Delete Transaction
window.deleteTransaction = async (txId) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
        try {
            const res = await fetch(`/api/transactions/${txId}`, { method: 'DELETE' });
            const result = await res.json();
            alert(result.message);
            if (res.ok) loadTransactions();
        } catch (err) {
            console.error(err);
            alert('Failed to delete transaction');
        }
    }
};

// ==========================================
// MEDICAL WORKSPACE (Doctor View)
// ==========================================

async function loadMedicalWorkspace() {
    // Load doctor's queue
    const queueRes = await fetch('/api/dashboard/queue');
    if (queueRes.ok) {
        const queue = await queueRes.json();
        const queueContainer = document.getElementById('doctor-queue-list');
        if (queueContainer) {
            queueContainer.innerHTML = '';

            if (queue.length === 0) {
                queueContainer.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:2rem;">No appointments for today</p>';
            } else {
                queue.forEach(item => {
                    const card = document.createElement('div');
                    card.className = 'queue-card';
                    card.style.cssText = 'background:rgba(255,255,255,0.05); padding:1.5rem; border-radius:10px; border:1px solid var(--glass-border); margin-bottom:1rem; cursor:pointer; transition:all 0.3s;';
                    card.onmouseover = () => card.style.borderColor = 'var(--primary-color)';
                    card.onmouseout = () => card.style.borderColor = 'var(--glass-border)';

                    const statusColors = {
                        'Menunggu': '#f59e0b',
                        'Diperiksa': '#3b82f6',
                        'Selesai': '#10b981',
                        'Batal': '#ef4444'
                    };

                    card.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:1rem;">
                            <div>
                                <h4 style="margin:0 0 0.5rem 0; color:var(--primary-color);">${item.nama_hewan}</h4>
                                <p style="margin:0; color:#94a3b8; font-size:0.9rem;">Owner: ${item.nama_pemilik} • ${item.no_hp}</p>
                            </div>
                            <span class="status-badge" style="background:${statusColors[item.status]}20; color:${statusColors[item.status]}; border:1px solid ${statusColors[item.status]};">
                                ${item.status}
                            </span>
                        </div>
                        <p style="margin:0.5rem 0; color:var(--primary-color); font-size:0.9rem;"><i class="fa-solid fa-clock"></i> ${item.jam}</p>
                        ${item.keluhan_awal ? `<p style="margin:0.5rem 0; color:#94a3b8; font-size:0.85rem;"><strong>Complaint:</strong> ${item.keluhan_awal}</p>` : ''}
                        <button onclick="openMedicalRecordForm(${item.id_daftar}, '${item.nama_hewan}', '${item.nama_pemilik}')" 
                                class="cta-button" style="margin-top:1rem; width:100%; font-size:0.9rem;">
                            <i class="fa-solid fa-stethoscope"></i> Create Medical Record
                        </button>
                    `;
                    queueContainer.appendChild(card);
                });
            }
        }
    }

    // Load patient history
    loadPatientHistory();
}

// Open Medical Record Form
window.openMedicalRecordForm = async (id_daftar, petName, ownerName) => {
    const modal = document.getElementById('medicalRecordModal');
    if (!modal) return;

    document.getElementById('mr-pet-name').textContent = petName;
    document.getElementById('mr-owner-name').textContent = ownerName;
    document.getElementById('mr-id-daftar').value = id_daftar;

    // Load medicines for prescription
    const medRes = await fetch('/api/medicines');
    if (medRes.ok) {
        const medicines = await medRes.json();
        window.availableMedicines = medicines;
    }

    // Clear prescription list
    document.getElementById('prescription-list').innerHTML = '';
    window.prescriptions = [];

    modal.classList.remove('hidden');
};

// Add Prescription
window.addPrescription = () => {
    const select = document.getElementById('medicine-select');
    const qty = document.getElementById('medicine-qty');
    const usage = document.getElementById('medicine-usage');

    if (!select.value || !qty.value) {
        alert('Please select medicine and quantity');
        return;
    }

    const medicine = window.availableMedicines.find(m => m.id_barang == select.value);
    if (!medicine) return;

    window.prescriptions.push({
        id_barang: medicine.id_barang,
        nama_barang: medicine.nama_barang,
        jumlah: parseInt(qty.value),
        aturan_pakai: usage.value
    });

    updatePrescriptionList();

    // Reset form
    select.value = '';
    qty.value = '';
    usage.value = '';
};

// Update Prescription List Display
function updatePrescriptionList() {
    const list = document.getElementById('prescription-list');
    list.innerHTML = '';

    window.prescriptions.forEach((rx, index) => {
        const item = document.createElement('div');
        item.style.cssText = 'background:rgba(139, 92, 246, 0.1); padding:0.8rem; border-radius:5px; margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:center;';
        item.innerHTML = `
            <span>${rx.nama_barang} - ${rx.jumlah}x ${rx.aturan_pakai ? '(' + rx.aturan_pakai + ')' : ''}</span>
            <button onclick="removePrescription(${index})" style="color:#ef4444; background:none; border:none; cursor:pointer;">
                <i class="fa-solid fa-times"></i>
            </button>
        `;
        list.appendChild(item);
    });
}

// Remove Prescription
window.removePrescription = (index) => {
    window.prescriptions.splice(index, 1);
    updatePrescriptionList();
};

// Submit Medical Record
window.submitMedicalRecord = async (e) => {
    e.preventDefault();
    const form = e.target;

    const data = {
        id_daftar: document.getElementById('mr-id-daftar').value,
        diagnosa: document.getElementById('mr-diagnosa').value,
        tindakan: document.getElementById('mr-tindakan').value,
        catatan_dokter: document.getElementById('mr-catatan').value,
        prescriptions: window.prescriptions || []
    };

    try {
        const res = await fetch('/api/medical-records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        alert(result.message);

        if (res.ok) {
            closeModal('medicalRecordModal');
            form.reset();
            loadMedicalWorkspace(); // Refresh
        }
    } catch (err) {
        console.error(err);
        alert('Failed to create medical record');
    }
};

// Load Patient History
async function loadPatientHistory(search = '') {
    const res = await fetch(`/api/patient-history?search=${search}`);
    if (res.ok) {
        const history = await res.json();
        const container = document.getElementById('patient-history-list');
        if (!container) return;

        container.innerHTML = '';

        if (history.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:2rem;">No medical records found</p>';
            return;
        }

        history.forEach(record => {
            const card = document.createElement('div');
            card.style.cssText = 'background:rgba(255,255,255,0.03); padding:1.5rem; border-radius:10px; border:1px solid var(--glass-border); margin-bottom:1rem;';

            let prescriptionHtml = '';
            if (record.prescriptions && record.prescriptions.length > 0) {
                prescriptionHtml = '<div style="margin-top:1rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.1);"><strong>Prescriptions:</strong><ul style="margin:0.5rem 0;">';
                record.prescriptions.forEach(rx => {
                    prescriptionHtml += `<li>${rx.nama_barang} - ${rx.jumlah}${rx.satuan} (${rx.aturan_pakai || 'As needed'})</li>`;
                });
                prescriptionHtml += '</ul></div>';
            }

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                    <h4 style="margin:0; color:white;">${record.nama_hewan} (${record.jenis_hewan})</h4>
                    <span style="color:#94a3b8; font-size:0.9rem;">${new Date(record.tgl_periksa).toLocaleDateString()}</span>
                </div>
                <p style="margin:0.5rem 0; color:#94a3b8; font-size:0.9rem;">Owner: ${record.nama_pemilik} • Doctor: ${record.dokter}</p>
                <p style="margin:0.5rem 0; color:#e2e8f0;"><strong>Diagnosis:</strong> ${record.diagnosa || '-'}</p>
                <p style="margin:0.5rem 0; color:#e2e8f0;"><strong>Treatment:</strong> ${record.tindakan || '-'}</p>
                ${record.catatan_dokter ? `<p style="margin:0.5rem 0; color:#94a3b8; font-size:0.9rem;"><strong>Notes:</strong> ${record.catatan_dokter}</p>` : ''}
                ${prescriptionHtml}
            `;
            container.appendChild(card);
        });
    }
}

// Search Patient History
window.searchPatientHistory = () => {
    const search = document.getElementById('patient-search').value;
    loadPatientHistory(search);
};

// ==========================================
// SETTINGS (Doctor Profile)
// ==========================================

async function loadSettings() {
    if (window.currentUserRole === 'Dokter') {
        // Load doctor profile
        const res = await fetch('/api/doctor/profile');
        if (res.ok) {
            const profile = await res.json();
            const profileSection = document.getElementById('doctor-profile-section');
            if (profileSection) {
                profileSection.style.display = 'block';
                document.getElementById('doctor-no-hp').value = profile.no_hp || '';
            }
        }
    }
}

// Update Doctor Profile
window.updateDoctorProfile = async (e) => {
    e.preventDefault();

    const data = {
        no_hp: document.getElementById('doctor-no-hp').value
    };

    try {
        const res = await fetch('/api/doctor/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        alert(result.message);
    } catch (err) {
        console.error(err);
        alert('Failed to update profile');
    }
};

// Toggle Password Visibility
window.togglePasswordVisibility = (inputId, iconId) => {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);

    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye');
    }
};

