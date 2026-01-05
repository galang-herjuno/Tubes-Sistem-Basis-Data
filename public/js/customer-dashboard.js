document.addEventListener('DOMContentLoaded', async () => {
    // Set Date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', options);

    // Load user info
    try {
        const userRes = await fetch('/api/me');
        if (userRes.ok) {
            const user = await userRes.json();
            document.getElementById('user-name').textContent = user.username;

            // Redirect if not customer
            if (user.role !== 'Pelanggan') {
                window.location.href = '/dashboard';
                return;
            }
        } else {
            window.location.href = '/login';
            return;
        }

        // Initialize profile (auto-create if not exists)
        await fetch('/api/customer/profile');

        // Load initial data
        loadDashboard();
        setupNavigation();
        setupProfileForm();

    } catch (error) {
        console.error('Error initializing:', error);
        window.location.href = '/login';
    }
});

function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function setupNavigation() {
    const links = document.querySelectorAll('.menu a');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.getAttribute('data-section');
            switchSection(section);

            // Update active state
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

window.switchSection = (sectionName) => {
    // Hide all sections
    document.querySelectorAll('.section-content').forEach(s => s.style.display = 'none');

    // Show selected section
    const section = document.getElementById(`${sectionName}-section`);
    if (section) {
        section.style.display = 'block';

        // Update page title
        const titles = {
            'dashboard': 'My Dashboard',
            'my-pets': 'My Pets',
            'appointments': 'My Appointments',
            'billing': 'Billing & Invoices',
            'profile': 'Profile Settings'
        };
        document.getElementById('page-title').textContent = titles[sectionName] || 'Dashboard';

        // Load section-specific data
        if (sectionName === 'my-pets') loadMyPets();
        if (sectionName === 'appointments') loadAppointments();
        if (sectionName === 'billing') loadBilling();
        if (sectionName === 'profile') loadProfile();
    }
};

// --- DASHBOARD ---

async function loadDashboard() {
    try {
        // Load stats
        const statsRes = await fetch('/api/customer/dashboard');
        if (statsRes.ok) {
            const stats = await statsRes.json();
            document.getElementById('total-pets').textContent = stats.totalPets;
            document.getElementById('upcoming-appointments').textContent = stats.upcomingAppointments;
            document.getElementById('recent-transactions').textContent = stats.recentTransactions;
        }

        // Load pets overview
        loadPetsOverview();

        // Load next appointment
        loadNextAppointment();

        // Load recent transactions
        loadRecentTransactions();

    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadPetsOverview() {
    try {
        const res = await fetch('/api/customer/pets');
        if (res.ok) {
            const pets = await res.json();
            const container = document.getElementById('pets-overview');

            if (pets.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center; padding:2rem; color:#94a3b8;">
                        <i class="fa-solid fa-paw" style="font-size:3rem; opacity:0.3; margin-bottom:1rem;"></i>
                        <p>No pets registered yet.</p>
                        <button class="cta-button" onclick="switchSection('my-pets')" style="margin-top:1rem;">
                            Add Your First Pet
                        </button>
                    </div>
                `;
                return;
            }

            container.innerHTML = '';
            pets.slice(0, 3).forEach(pet => {
                const card = document.createElement('div');
                card.className = 'pet-card-mini';
                card.style.cssText = 'background:rgba(255,255,255,0.05); padding:1rem; border-radius:10px; border:1px solid var(--glass-border);';
                card.innerHTML = `
                    <div style="display:flex; align-items:center; gap:1rem;">
                        <div style="width:50px; height:50px; background:var(--primary-color); border-radius:50%; display:flex; align-items:center; justify-content:center;">
                            <i class="fa-solid fa-${pet.jenis_hewan === 'Kucing' ? 'cat' : pet.jenis_hewan === 'Anjing' ? 'dog' : 'paw'}" style="font-size:1.5rem;"></i>
                        </div>
                        <div style="flex:1;">
                            <h4 style="margin:0; color:var(--text-color);">${pet.nama_hewan}</h4>
                            <p style="margin:0; color:#94a3b8; font-size:0.9rem;">${pet.jenis_hewan} ${pet.ras ? '• ' + pet.ras : ''}</p>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Error loading pets overview:', error);
    }
}

async function loadNextAppointment() {
    try {
        const res = await fetch('/api/customer/appointments/next');
        if (res.ok) {
            const appointment = await res.json();
            const container = document.getElementById('next-appointment');

            if (!appointment) {
                container.innerHTML = `
                    <div style="text-align:center; padding:1rem; color:#94a3b8;">
                        <i class="fa-solid fa-calendar-xmark" style="font-size:2rem; opacity:0.3; margin-bottom:0.5rem;"></i>
                        <p>No upcoming appointments</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = `
                <div style="background:rgba(139, 92, 246, 0.1); padding:1rem; border-radius:10px; border:1px solid var(--primary-color);">
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:0.5rem;">
                        <div>
                            <h4 style="margin:0; color:var(--primary-color);">${appointment.nama_hewan}</h4>
                            <p style="margin:0.25rem 0; color:#94a3b8; font-size:0.9rem;">${appointment.jenis_hewan}</p>
                        </div>
                        <span class="status-badge status-menunggu">${appointment.status}</span>
                    </div>
                    <div style="margin-top:1rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.1);">
                        <p style="margin:0.25rem 0; color:#94a3b8;">
                            <i class="fa-solid fa-calendar"></i> ${formatDate(appointment.tgl_kunjungan)}
                        </p>
                        <p style="margin:0.25rem 0; color:#94a3b8;">
                            <i class="fa-solid fa-user-doctor"></i> ${appointment.dokter}
                        </p>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading next appointment:', error);
    }
}

async function loadRecentTransactions() {
    try {
        const res = await fetch('/api/customer/transactions');
        if (res.ok) {
            const transactions = await res.json();
            const container = document.getElementById('recent-transactions-list');

            if (transactions.length === 0) {
                container.innerHTML = `
                    <div style="text-align:center; padding:1rem; color:#94a3b8;">
                        <p>No transactions yet</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = '';
            transactions.slice(0, 5).forEach(tx => {
                const item = document.createElement('div');
                item.className = 'record-item';
                item.innerHTML = `
                    <div class="record-info">
                        <h4>Invoice #${tx.id_transaksi}</h4>
                        <p style="font-size:0.85rem; color:#94a3b8;">${new Date(tx.tgl_transaksi).toLocaleDateString()}</p>
                    </div>
                    <div class="record-date" style="text-align:right;">
                        <strong style="color:var(--accent-color);">${formatCurrency(tx.total_biaya)}</strong>
                        <p style="font-size:0.85rem; color:#94a3b8; margin:0;">${tx.metode_bayar}</p>
                    </div>
                `;
                container.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error loading recent transactions:', error);
    }
}

// --- MY PETS ---

async function loadMyPets() {
    try {
        const res = await fetch('/api/customer/pets');
        if (res.ok) {
            const pets = await res.json();
            const container = document.getElementById('pets-grid');

            if (pets.length === 0) {
                container.innerHTML = `
                    <div style="grid-column: 1/-1; text-align:center; padding:3rem; color:#94a3b8;">
                        <i class="fa-solid fa-paw" style="font-size:4rem; opacity:0.3; margin-bottom:1rem;"></i>
                        <h3>No Pets Yet</h3>
                        <p>Add your first pet to get started!</p>
                        <button class="cta-button" onclick="openModal('addPetModal')" style="margin-top:1rem;">
                            <i class="fa-solid fa-plus"></i> Add Pet
                        </button>
                    </div>
                `;
                return;
            }

            container.innerHTML = '';
            pets.forEach(pet => {
                const card = document.createElement('div');
                card.className = 'pet-card';
                card.style.cssText = 'background:rgba(255,255,255,0.05); padding:1.5rem; border-radius:15px; border:1px solid var(--glass-border);';

                const age = pet.tgl_lahir ? calculateAge(pet.tgl_lahir) : 'Unknown';

                card.innerHTML = `
                    <div style="text-align:center; margin-bottom:1rem;">
                        <div style="width:80px; height:80px; background:var(--primary-color); border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto;">
                            <i class="fa-solid fa-${pet.jenis_hewan === 'Kucing' ? 'cat' : pet.jenis_hewan === 'Anjing' ? 'dog' : 'paw'}" style="font-size:2.5rem;"></i>
                        </div>
                    </div>
                    <h3 style="text-align:center; margin:0.5rem 0; color:var(--text-color);">${pet.nama_hewan}</h3>
                    <p style="text-align:center; color:#94a3b8; margin:0.25rem 0;">${pet.jenis_hewan} ${pet.ras ? '• ' + pet.ras : ''}</p>
                    <div style="margin-top:1rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.1);">
                        <p style="margin:0.25rem 0; color:#94a3b8; font-size:0.9rem;">
                            <i class="fa-solid fa-venus-mars"></i> ${pet.gender}
                        </p>
                        <p style="margin:0.25rem 0; color:#94a3b8; font-size:0.9rem;">
                            <i class="fa-solid fa-cake-candles"></i> ${age}
                        </p>
                        ${pet.berat ? `<p style="margin:0.25rem 0; color:#94a3b8; font-size:0.9rem;">
                            <i class="fa-solid fa-weight-scale"></i> ${pet.berat} kg
                        </p>` : ''}
                    </div>
                    <button class="cta-button" onclick="viewMedicalRecords(${pet.id_hewan}, '${pet.nama_hewan}')" style="width:100%; margin-top:1rem;">
                        <i class="fa-solid fa-file-medical"></i> Medical Records
                    </button>
                `;
                container.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Error loading pets:', error);
    }
}

function calculateAge(birthDate) {
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

window.submitAddPet = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const btn = form.querySelector('button[type="submit"]');

    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Adding...';

        const res = await fetch('/api/customer/pets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        if (res.ok) {
            alert('Pet added successfully!');
            closeModal('addPetModal');
            form.reset();
            loadMyPets();
            loadDashboard(); // Refresh dashboard stats
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

window.viewMedicalRecords = async (petId, petName) => {
    try {
        document.getElementById('medical-records-title').textContent = `Medical Records - ${petName}`;
        openModal('medicalRecordsModal');

        const content = document.getElementById('medical-records-content');
        content.innerHTML = '<p style="text-align:center; color:#94a3b8">Loading...</p>';

        const res = await fetch(`/api/customer/pets/${petId}/medical-records`);
        if (res.ok) {
            const records = await res.json();

            if (records.length === 0) {
                content.innerHTML = `
                    <div style="text-align:center; padding:2rem; color:#94a3b8;">
                        <i class="fa-solid fa-file-medical" style="font-size:3rem; opacity:0.3; margin-bottom:1rem;"></i>
                        <p>No medical records yet</p>
                    </div>
                `;
                return;
            }

            content.innerHTML = '';
            records.forEach(record => {
                const recordDiv = document.createElement('div');
                recordDiv.style.cssText = 'background:rgba(255,255,255,0.05); padding:1.5rem; border-radius:10px; border:1px solid var(--glass-border); margin-bottom:1rem;';

                let prescriptionsHtml = '';
                if (record.prescriptions && record.prescriptions.length > 0) {
                    prescriptionsHtml = `
                        <div style="margin-top:1rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.1);">
                            <h4 style="color:var(--accent-color); margin-bottom:0.5rem;">Prescriptions:</h4>
                            ${record.prescriptions.map(p => `
                                <p style="margin:0.25rem 0; color:#94a3b8; font-size:0.9rem;">
                                    • ${p.nama_barang} - ${p.jumlah} ${p.satuan} ${p.aturan_pakai ? '(' + p.aturan_pakai + ')' : ''}
                                </p>
                            `).join('')}
                        </div>
                    `;
                }

                recordDiv.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:1rem;">
                        <div>
                            <h4 style="margin:0; color:white;">${formatDate(record.tgl_periksa)}</h4>
                            <p style="margin:0.25rem 0; color:#94a3b8; font-size:0.9rem;">Dr. ${record.dokter}</p>
                        </div>
                    </div>
                    <div style="margin-bottom:0.5rem;">
                        <strong style="color:var(--primary-color);">Diagnosis:</strong>
                        <p style="margin:0.25rem 0; color:#e2e8f0;">${record.diagnosa || '-'}</p>
                    </div>
                    <div style="margin-bottom:0.5rem;">
                        <strong style="color:var(--primary-color);">Treatment:</strong>
                        <p style="margin:0.25rem 0; color:#e2e8f0;">${record.tindakan || '-'}</p>
                    </div>
                    ${record.catatan_dokter ? `
                        <div>
                            <strong style="color:var(--primary-color);">Notes:</strong>
                            <p style="margin:0.25rem 0; color:#e2e8f0;">${record.catatan_dokter}</p>
                        </div>
                    ` : ''}
                    ${prescriptionsHtml}
                `;
                content.appendChild(recordDiv);
            });
        }
    } catch (error) {
        console.error('Error loading medical records:', error);
    }
};

// --- APPOINTMENTS ---

async function loadAppointments() {
    try {
        const res = await fetch('/api/customer/appointments');
        if (res.ok) {
            const appointments = await res.json();
            const tbody = document.getElementById('appointments-table');

            if (appointments.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:2rem;">No appointments yet</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            appointments.forEach(apt => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatDate(apt.tgl_kunjungan)}</td>
                    <td>${apt.nama_hewan} (${apt.jenis_hewan})</td>
                    <td>${apt.dokter}</td>
                    <td>${apt.keluhan_awal || '-'}</td>
                    <td><span class="status-badge status-${apt.status.toLowerCase()}">${apt.status}</span></td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

// --- BILLING ---

async function loadBilling() {
    try {
        const res = await fetch('/api/customer/transactions');
        if (res.ok) {
            const transactions = await res.json();
            const tbody = document.getElementById('billing-table');

            if (transactions.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#94a3b8; padding:2rem;">No transactions yet</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            transactions.forEach(tx => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>#${tx.id_transaksi}</td>
                    <td>${new Date(tx.tgl_transaksi).toLocaleDateString()}</td>
                    <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${tx.items || '-'}</td>
                    <td>${tx.metode_bayar}</td>
                    <td style="font-weight:bold; color:var(--accent-color);">${formatCurrency(tx.total_biaya)}</td>
                    <td>
                        <button class="btn-xs" onclick="viewInvoice(${tx.id_transaksi})" style="color:var(--primary-color); cursor:pointer;">
                            <i class="fa-solid fa-eye"></i> View
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }
    } catch (error) {
        console.error('Error loading billing:', error);
    }
}

window.viewInvoice = async (transactionId) => {
    try {
        openModal('invoiceModal');
        const content = document.getElementById('invoice-content');
        content.innerHTML = '<p style="text-align:center; color:#94a3b8">Loading...</p>';

        const res = await fetch(`/api/customer/transactions/${transactionId}`);
        if (res.ok) {
            const data = await res.json();
            const { transaction, details } = data;

            content.innerHTML = `
                <div style="background:rgba(255,255,255,0.05); padding:1.5rem; border-radius:10px; border:1px solid var(--glass-border);">
                    <div style="display:flex; justify-content:space-between; margin-bottom:1rem; padding-bottom:1rem; border-bottom:1px solid rgba(255,255,255,0.1);">
                        <div>
                            <h3 style="margin:0; color:white;">Invoice #${transaction.id_transaksi}</h3>
                            <p style="margin:0.25rem 0; color:#94a3b8;">${new Date(transaction.tgl_transaksi).toLocaleDateString()}</p>
                        </div>
                        <div style="text-align:right;">
                            <p style="margin:0; color:#94a3b8;">Payment Method</p>
                            <p style="margin:0.25rem 0; color:white; font-weight:bold;">${transaction.metode_bayar}</p>
                        </div>
                    </div>
                    
                    <table style="width:100%; margin:1rem 0;">
                        <thead>
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.1);">
                                <th style="text-align:left; padding:0.5rem; color:#94a3b8;">Item</th>
                                <th style="text-align:center; padding:0.5rem; color:#94a3b8;">Qty</th>
                                <th style="text-align:right; padding:0.5rem; color:#94a3b8;">Price</th>
                                <th style="text-align:right; padding:0.5rem; color:#94a3b8;">Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${details.map(item => `
                                <tr>
                                    <td style="padding:0.5rem; color:white;">${item.nama_layanan || item.nama_barang}</td>
                                    <td style="text-align:center; padding:0.5rem; color:#94a3b8;">${item.qty}</td>
                                    <td style="text-align:right; padding:0.5rem; color:#94a3b8;">${formatCurrency(item.harga_saat_ini)}</td>
                                    <td style="text-align:right; padding:0.5rem; color:white;">${formatCurrency(item.subtotal)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <div style="margin-top:1rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.1); text-align:right;">
                        ${transaction.diskon > 0 ? `
                            <p style="margin:0.25rem 0; color:#94a3b8;">Discount: ${formatCurrency(transaction.diskon)}</p>
                        ` : ''}
                        <h3 style="margin:0.5rem 0; color:var(--accent-color);">Total: ${formatCurrency(transaction.total_biaya)}</h3>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading invoice:', error);
    }
};

// --- PROFILE ---

async function loadProfile() {
    try {
        const res = await fetch('/api/customer/profile');
        if (res.ok) {
            const profile = await res.json();
            document.getElementById('profile-name').value = profile.nama_pemilik || '';
            document.getElementById('profile-email').value = profile.email || '';
            document.getElementById('profile-phone').value = profile.no_hp || '';
            document.getElementById('profile-address').value = profile.alamat || '';
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function setupProfileForm() {
    const form = document.getElementById('profileForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        const btn = form.querySelector('button[type="submit"]');

        try {
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';

            const res = await fetch('/api/customer/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            if (res.ok) {
                alert('Profile updated successfully!');
            } else {
                alert(result.error || 'Failed to update profile');
            }
        } catch (err) {
            console.error(err);
            alert('Error connecting to server');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Update Profile';
        }
    });
}

// --- MODAL HELPERS ---

window.openModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden');
};

window.closeModal = (id) => {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
};
