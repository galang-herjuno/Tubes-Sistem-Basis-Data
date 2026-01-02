document.addEventListener('DOMContentLoaded', async () => {
    // 1. Fetch User Info & Stats
    try {
        const userRes = await fetch('/api/me');
        if (userRes.ok) {
            const user = await userRes.json();
            document.getElementById('user-name').textContent = user.username;
            document.getElementById('user-role').textContent = user.role;
            updateUIBasedOnRole(user.role);
        }

        // Initial load: Dashboard
        loadDashboardStats();

        // 2. Setup Navigation
        setupNavigation();

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
        adminElements.forEach(el => el.style.display = 'block'); // List item
        doctorElements.forEach(el => el.style.display = 'block');
        receptionElements.forEach(el => el.style.display = 'block');
    } else if (role === 'Dokter') {
        doctorElements.forEach(el => el.style.display = 'block');
    } else if (role === 'Resepsionis') {
        receptionElements.forEach(el => el.style.display = 'block');
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

        // Deactivate links
        links.forEach(l => l.classList.remove('active'));

        // Show target
        const target = document.getElementById(sectionId);
        if (target) target.style.display = 'block';
    };

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const text = link.innerText.trim();

            // Map text/icon to section ID
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
            }
        });
    });
}

// --- DATA LOADERS ---

async function loadDashboardStats() {
    // Existing logic...
    const statsRes = await fetch('/api/dashboard/stats');
    if (statsRes.ok) {
        const stats = await statsRes.json();
        document.getElementById('total-patients').innerText = stats.totalPatients;

        const lowStockEl = document.getElementById('low-stock');
        lowStockEl.innerText = stats.lowStock;
        if (stats.lowStock > 0) lowStockEl.style.color = '#ef4444';

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
        // Optional: show toast
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
                plugins: { legend: { display: false } }, // Minimalist
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

async function loadStaff() {
    const res = await fetch('/api/staff');
    if (res.ok) {
        const staff = await res.json();
        const tbody = document.querySelector('#staff-view table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        staff.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.nama_lengkap}</td>
                <td>${s.jabatan}</td>
                <td>${s.username || 'No Account'}</td>
                <td>${s.spesialisasi || '-'}</td>
                <td>${s.no_hp || '-'}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

async function loadInventory() {
    const res = await fetch('/api/inventory');
    if (res.ok) {
        const items = await res.json();
        const tbody = document.querySelector('#inventory-view table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
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
