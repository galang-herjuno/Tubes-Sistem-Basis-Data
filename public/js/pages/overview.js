document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
    window.reloadQueue();
    loadSalesChart();
});

let queueTab = 'active';
let queuePage = 1;



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



window.currentBillId = null;



window.currentBillId = null;
window.billOriginalTotal = 0;

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
    // 1. Populate Info
    document.getElementById('bill-owner').textContent = data.owner.nama;
    document.getElementById('bill-patient').textContent = `${data.pet.nama} (${data.pet.jenis})`;
    document.getElementById('bill-doctor').textContent = data.doctor.nama;

    // 2. Populate Items
    const tbody = document.getElementById('bill-items');
    tbody.innerHTML = '';

    data.items.forEach(item => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #e2e8f0';
        tr.innerHTML = `
            <td style="padding:0.8rem; color:#334155;">${item.nama} <span style="font-size:0.8rem; color:#94a3b8">(${item.jenis_item})</span></td>
            <td style="padding:0.8rem; text-align:right; color:#334155;">${formatCurrency(item.harga || item.harga_saat_ini)}</td>
            <td style="padding:0.8rem; text-align:center; color:#334155;">${item.qty}</td>
            <td style="padding:0.8rem; text-align:right; font-weight:600; color:#1e293b;">${formatCurrency(item.subtotal)}</td>
        `;
        tbody.appendChild(tr);
    });

    // 3. Set Base Values
    window.billOriginalTotal = parseFloat(data.total_biaya);
    document.getElementById('bill-subtotal').textContent = formatCurrency(window.billOriginalTotal);

    // 4. Reset Inputs
    document.querySelector('input[name="discountType"][value="nominal"]').checked = true;
    document.getElementById('bill-discount-input').value = 0;
    document.getElementById('bill-payment-method').value = 'Cash';

    // 5. Initial Calc
    calculateBillTotal();
}

window.calculateBillTotal = () => {
    const original = window.billOriginalTotal || 0;
    const discountType = document.querySelector('input[name="discountType"]:checked').value;
    const discountInput = parseFloat(document.getElementById('bill-discount-input').value) || 0;

    let discountAmount = 0;

    if (discountType === 'persen') {
        // Limit percent to 100
        const percent = Math.min(discountInput, 100);
        discountAmount = original * (percent / 100);
    } else {
        // Nominal
        discountAmount = discountInput;
    }

    // Prevent negative total
    let finalTotal = original - discountAmount;
    if (finalTotal < 0) finalTotal = 0;

    // Update UI
    document.getElementById('bill-discount-display').textContent = `-${formatCurrency(discountAmount)}`;
    document.getElementById('bill-final-total').textContent = formatCurrency(finalTotal);
};

window.confirmBillGeneration = async () => {
    if (!window.currentBillId) return;

    const btn = document.getElementById('confirm-bill-btn'); // Note: ID might need to match HTML button or I should add ID to button in HTML

    // In my HTML update I didn't verify the button ID. The old one had id="confirm-bill-btn".
    // I will assume layout is correct or select by onclick attribute if needed.
    // Ideally ensure HTML has id="confirm-bill-btn"

    // Just in case, define button by function call context if possible, but ID is safer.
    // The previous HTML update DID NOT include id="confirm-bill-btn" in the new button!
    // Wait, let me check the HTML update content...
    // <button class="cta-button" onclick="confirmBillGeneration()" ...>
    // It MISSING id="confirm-bill-btn". I should fix that via DOM or assumes user won't double click fast.
    // Or I can select querySelector('.cta-button[onclick*="confirmBillGeneration"]')

    // To be safe, I'll update HTML ID in next step or just use generic selector.
    // Let's use generic selector for now to avoid another HTML edit if possible.
    const buttons = document.querySelectorAll('button');
    let targetBtn = null;
    buttons.forEach(b => {
        if (b.textContent.includes('Complete Payment')) targetBtn = b;
    });
    if (targetBtn) {
        targetBtn.disabled = true;
        targetBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    }

    try {
        // Gather Data
        const discountType = document.querySelector('input[name="discountType"]:checked').value;
        const discountInput = parseFloat(document.getElementById('bill-discount-input').value) || 0;
        const paymentMethod = document.getElementById('bill-payment-method').value;

        // Calculate discount amount for backend (though backend might recalc, it helps to match)
        // Backend expects: diskon (amount), tipe_diskon, input_diskon

        // Actually server.js line 1500 recalculates it based on `input_diskon` and `tipe_diskon`.
        // So I just send those.

        const payload = {
            id_daftar: window.currentBillId,
            diskon: discountInput, // This is actually 'input_diskon' param name in server?
            // Wait, server.js: const { id_daftar, diskon = 0, tipe_diskon = 'nominal', ... } = req.body;
            // AND const inputDiskon = parseFloat(diskon) || 0;
            // So `diskon` in body is treated as the INPUT value.

            tipe_diskon: discountType,
            metode_bayar: paymentMethod
        };

        const res = await fetch('/api/billing/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (res.ok) {
            alert('Transcation Successful!\nTotal: ' + formatCurrency(result.total_biaya));
            closeModal('billPreviewModal');
            window.reloadQueue();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to generate bill');
    } finally {
        if (targetBtn) {
            targetBtn.disabled = false;
            targetBtn.innerHTML = '<i class="fa-solid fa-check-circle"></i> Complete Payment';
        }
    }
};
