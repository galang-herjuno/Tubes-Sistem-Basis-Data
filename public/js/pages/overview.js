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
        const res = await fetch('/api/stats/summary');
        if (res.ok) {
            const stats = await res.json();

            const totalPatientsEl = document.getElementById('total-patients');
            const revenueTodayEl = document.getElementById('revenue-today');
            const activeStaffEl = document.getElementById('active-staff');
            const lowStockEl = document.getElementById('low-stock');

            if (totalPatientsEl) totalPatientsEl.textContent = stats.total_patients;
            if (revenueTodayEl) revenueTodayEl.textContent = formatCurrency(stats.revenue_today);
            if (activeStaffEl) activeStaffEl.textContent = stats.active_staff;
            if (lowStockEl) lowStockEl.textContent = stats.low_stock;
        }
    } catch (err) {
        console.error('Error loading stats:', err);
    }
}

async function loadSalesChart() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    // Check Role Access? 
    // Handled by layout.js hiding the container, but we check existence anyway

    try {
        const res = await fetch('/api/stats/sales');
        if (res.ok) {
            const data = await res.json();

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: data.dates,
                    datasets: [{
                        label: 'Revenue',
                        data: data.revenues,
                        borderColor: '#ec4899',
                        backgroundColor: 'rgba(236, 72, 153, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
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
    // Update button styles
    const activeBtn = document.getElementById('tab-active');
    const completedBtn = document.getElementById('tab-completed');

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
    const dateFilter = document.getElementById('queue-date-filter').value;
    const tbody = document.getElementById('queue-body');
    const loadMoreBtn = document.getElementById('queue-load-more');

    if (reset) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#94a3b8">Loading...</td></tr>';
    }

    try {
        const res = await fetch(`/api/queue?filter=${dateFilter}&status=${queueTab}&page=${queuePage}`);
        if (res.ok) {
            const result = await res.json();
            const data = result.data;

            if (reset) tbody.innerHTML = '';

            if (data.length === 0 && reset) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:2rem; color:#94a3b8">No appointments found</td></tr>';
                loadMoreBtn.style.display = 'none';
                return;
            }

            data.forEach(item => {
                const tr = document.createElement('tr');
                const time = new Date(item.tgl_kunjungan).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                // Status Color
                let statusClass = 'status-badge';
                if (item.status === 'Menunggu') statusClass += ' status-menunggu';
                else if (item.status === 'Diperiksa') statusClass += ' status-diperiksa';
                else if (item.status === 'Selesai') statusClass += ' status-selesai';
                else if (item.status === 'Batal') statusClass += ' status-batal';

                tr.innerHTML = `
                    <td>
                        <div style="font-weight:600; color:white;">${item.nama_hewan}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">${item.jenis_hewan}</div>
                    </td>
                    <td>${item.dokter}</td>
                    <td>${time}</td>
                    <td><span class="${statusClass}">${item.status}</span></td>
                `;
                tbody.appendChild(tr);
            });

            // Show/Hide Load More
            if (result.pagination.currentPage < result.pagination.totalPages) {
                loadMoreBtn.style.display = 'inline-block';
            } else {
                loadMoreBtn.style.display = 'none';
            }
        }
    } catch (err) {
        console.error('Queue error:', err);
        if (reset) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:red">Error loading queue</td></tr>';
    }
}
