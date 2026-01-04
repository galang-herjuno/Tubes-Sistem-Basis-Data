document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
    window.reloadQueue();
    loadSalesChart();
});

let queueTab = 'active';
let queuePage = 1;

// ==========================================
// STATS & CHART
// ==========================================

async function loadDashboardStats() {
    try {
        const res = await fetch('/api/dashboard/stats');
        if (res.ok) {
            const stats = await res.json();

            const totalPatientsEl = document.getElementById('total-patients');
            const revenueTodayEl = document.getElementById('revenue-today');
            const activeStaffEl = document.getElementById('active-staff');
            const lowStockEl = document.getElementById('low-stock');

            if (totalPatientsEl) totalPatientsEl.textContent = stats.totalPatients;
            if (revenueTodayEl) revenueTodayEl.textContent = formatCurrency(stats.revenueToday);
            if (activeStaffEl) activeStaffEl.textContent = stats.activeStaff;
            if (lowStockEl) lowStockEl.textContent = stats.lowStock;
        }
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

async function loadSalesChart() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    try {
        const res = await fetch('/api/dashboard/analytics');
        if (res.ok) {
            const result = await res.json();
            const salesData = result.sales;

            const labels = salesData.map(item => {
                const d = new Date(item.date);
                return d.toLocaleDateString('id-ID', { weekday: 'short' });
            });
            const values = salesData.map(item => item.total);

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Revenue',
                        data: values,
                        borderColor: '#ec4899',
                        backgroundColor: 'rgba(236, 72, 153, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255, 255, 255, 0.1)' },
                            ticks: { color: '#94a3b8' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: { color: '#94a3b8' }
                        }
                    }
                }
            });
        }
    } catch (err) {
        console.error('Chart error:', err);
    }
}


// ==========================================
// LIVE QUEUE LOGIC
// ==========================================

window.setQueueTab = (tab) => {
    queueTab = tab;

    const activeBtn = document.getElementById('tab-active');
    const completedBtn = document.getElementById('tab-completed');

    if (activeBtn && completedBtn) {
        if (tab === 'active') {
            activeBtn.style.background = 'var(--primary-color)';
            activeBtn.style.color = 'var(--bg-color)';
            completedBtn.style.background = 'transparent';
            completedBtn.style.color = 'var(--text-muted)';
        } else {
            completedBtn.style.background = 'var(--primary-color)';
            completedBtn.style.color = 'var(--bg-color)';
            activeBtn.style.background = 'transparent';
            activeBtn.style.color = 'var(--text-muted)';
        }
    }

    window.reloadQueue();
};

window.reloadQueue = () => {
    queuePage = 1;
    loadQueueData(true);
};

window.loadMoreQueue = () => {
    queuePage++;
    loadQueueData(false);
};

async function loadQueueData(reset = true) {
    const dateFilterEl = document.getElementById('queue-date-filter');
    const dateFilter = dateFilterEl ? dateFilterEl.value : 'today';
    const tbody = document.getElementById('queue-body');
    const loadMoreBtn = document.getElementById('queue-load-more');

    if (reset && tbody) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#94a3b8">Loading...</td></tr>';
    }

    try {
        const limit = 10;
        const offset = (queuePage - 1) * limit;

        const res = await fetch(`/api/dashboard/queue?date=${dateFilter}&status=${queueTab}&limit=${limit}&offset=${offset}`);

        if (res.ok) {
            const result = await res.json();
            const data = Array.isArray(result) ? result : result.data;

            if (reset && tbody) tbody.innerHTML = '';

            if (data.length === 0) {
                if (reset && tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:#94a3b8">No appointments found</td></tr>';
                if (loadMoreBtn) loadMoreBtn.style.display = 'none';
                return;
            }

            if (tbody) {
                const userRole = window.currentUserRole; // Set by layout.js

                data.forEach(item => {
                    const tr = document.createElement('tr');

                    // Status Badge Logic
                    let statusContent = `<span class="status-badge status-${item.status.toLowerCase()}">${item.status}</span>`;

                    // IF Status Selesai AND Role Resepsionis/Admin -> Show Generate Bill Button
                    // Need to check if bill already exists? Server endpoint handles it, but UI can check:
                    // item.id_transaksi is returned by query (Line 422: t.id_transaksi)
                    // If t.id_transaksi IS NULL and Status == 'Selesai', then Show Button.

                    if (item.status === 'Selesai' && !item.id_transaksi) {
                        // Check role (Optional, but clean)
                        if (userRole === 'Resepsionis' || userRole === 'Admin') {
                            statusContent = `<button onclick="generateBill(${item.id_daftar})" class="btn-xs" style="background:#f59e0b; color:var(--bg-color); border:none; padding:0.3rem 0.8rem; border-radius:4px; font-weight:600; cursor:pointer; box-shadow:0 0 10px rgba(245, 158, 11, 0.3);">Generate Bill</button>`;
                        }
                    } else if (item.status === 'Selesai' && item.id_transaksi) {
                        statusContent = `<span class="status-badge status-paid" style="background:var(--secondary-color); color:var(--bg-color)">Paid</span>`;
                    }

                    tr.innerHTML = `
                        <td>
                            <div style="font-weight:600; color:white;">${item.nama_hewan}</div>
                            <div style="font-size:0.8rem; color:var(--text-muted);">${item.jenis_hewan}</div>
                        </td>
                        <td>${item.dokter || '-'}</td>
                        <td>${item.jam}</td>
                        <td>${statusContent}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }

            if (loadMoreBtn) {
                if (data.length === limit) {
                    loadMoreBtn.style.display = 'inline-block';
                } else {
                    loadMoreBtn.style.display = 'none';
                }
            }
        }
    } catch (err) {
        console.error('Queue error:', err);
        if (reset && tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red">Error loading queue</td></tr>';
    }
}

// ==========================================
// BILL GENERATION
// ==========================================

window.currentBillId = null;

window.generateBill = async (idDaftar) => {
    try {
        // Fetch Preview
        const res = await fetch(`/api/billing/preview/${idDaftar}`);
        if (!res.ok) {
            const err = await res.json();
            alert(err.message);
            return;
        }

        const data = await res.json();
        window.currentBillId = idDaftar;
        renderBillPreview(data);
        openModal('billPreviewModal');

    } catch (err) {
        console.error(err);
        alert('Failed to generate bill preview');
    }
};

function renderBillPreview(data) {
    const container = document.getElementById('bill-preview-content');
    if (!container) return;

    // Render Items Table
    let itemsHtml = `
        <div style="margin-bottom:1rem; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:1rem;">
            <p><strong>Owner:</strong> ${data.owner.nama}</p>
            <p><strong>Patient:</strong> ${data.pet.nama} (${data.pet.jenis})</p>
            <p><strong>Doctor:</strong> ${data.doctor.nama}</p>
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
            <thead>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.1); text-align:left;">
                    <th style="padding:0.5rem;">Item</th>
                    <th style="padding:0.5rem; text-align:right;">Price</th>
                    <th style="padding:0.5rem; text-align:center;">Qty</th>
                    <th style="padding:0.5rem; text-align:right;">Subtotal</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.items.forEach(item => {
        itemsHtml += `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:0.5rem;">${item.nama} <span style="font-size:0.8rem; color:var(--text-muted)">(${item.jenis_item})</span></td>
                <td style="padding:0.5rem; text-align:right;">${formatCurrency(item.harga || item.harga_saat_ini)}</td>
                <td style="padding:0.5rem; text-align:center;">${item.qty}</td>
                <td style="padding:0.5rem; text-align:right;">${formatCurrency(item.subtotal)}</td>
            </tr>
        `;
    });

    itemsHtml += `
            </tbody>
            <tfoot>
                <tr style="font-weight:bold; font-size:1.1rem; color:var(--accent-color);">
                    <td colspan="3" style="padding:1rem 0.5rem; text-align:right;">TOTAL</td>
                    <td style="padding:1rem 0.5rem; text-align:right;">${formatCurrency(data.total_biaya)}</td>
                </tr>
            </tfoot>
        </table>
    `;

    container.innerHTML = itemsHtml;
}

window.confirmBillGeneration = async () => {
    if (!window.currentBillId) return;

    const btn = document.getElementById('confirm-bill-btn');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    try {
        const res = await fetch('/api/billing/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_daftar: window.currentBillId, metode_bayar: 'Cash' }) // Default Cash for now
        });

        const result = await res.json();

        if (res.ok) {
            alert('Bill generated successfully! Transaction ID: #' + (result.id || ''));
            closeModal('billPreviewModal');
            window.reloadQueue(); // Refresh queue to show 'Paid' or remove button
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to generate bill');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Confirm & Generate';
    }
};
