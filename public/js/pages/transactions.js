document.addEventListener('DOMContentLoaded', () => {
    loadTransactions();
});

async function loadTransactions() {
    try {
        const res = await fetch('/api/transactions');
        if (res.ok) {
            const transactions = await res.json();
            const tbody = document.querySelector('#transactions-view table tbody');
            if (tbody) {
                tbody.innerHTML = '';
                transactions.forEach(t => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${new Date(t.tgl_transaksi).toLocaleString()}</td>
                        <td>${t.nama_pemilik || 'Guest'}</td>
                        <td style="font-weight:bold; color:var(--accent-color);">${formatCurrency(t.total_biaya)}</td>
                        <td>${t.metode_bayar}</td>
                        <td>
<button onclick="viewBillDetail(${t.id_transaksi})" class="btn-action">
                                <i class="fa-solid fa-eye"></i> Detail
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }
        }
    } catch (err) {
        console.error('Error loading transactions:', err);
    }
}

async function viewBillDetail(id) {
    try {
        const res = await fetch(`/api/transactions/${id}/details`);
        if (res.ok) {
            const data = await res.json();
            const tx = data.transaction;
            const items = data.details;

            let itemHtml = '<table style="width:100%; border-collapse:collapse; margin-top:1rem;"><thead><tr style="border-bottom:1px solid #ddd; text-align:left;"><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>';

            items.forEach(i => {
                const name = i.jenis_item === 'Layanan' ? i.nama_layanan : i.nama_barang;
                itemHtml += `
                    <tr>
                        <td style="padding:0.5rem 0;">${name}</td>
                        <td>${i.qty}</td>
                        <td>${formatCurrency(i.harga_saat_ini)}</td>
                        <td>${formatCurrency(i.subtotal)}</td>
                    </tr>
                `;
            });

            itemHtml += `</tbody><tfoot>
                <tr style="border-top:1px solid #ddd;">
                    <td colspan="3" style="text-align:right; padding-top:1rem;"><strong>Total:</strong></td>
                    <td style="padding-top:1rem;"><strong>${formatCurrency(tx.total_biaya)}</strong></td>
                </tr>
            </tfoot></table>`;

            const content = document.getElementById('bill-detail-content');
            content.innerHTML = `
                <div style="text-align:center; margin-bottom:1rem;">
                    <h2 style="margin:0;">Paw Whisker</h2>
                    <p style="margin:0; font-size:0.9rem;">Invoice #${tx.id_transaksi}</p>
                    <p style="margin:0; font-size:0.8rem; color:#666;">${new Date(tx.tgl_transaksi).toLocaleString()}</p>
                </div>
                <div style="margin-bottom:1rem; font-size:0.9rem;">
                    <strong>Customer:</strong> ${tx.nama_pemilik || 'Guest'} <br>
                    <strong>Payment:</strong> ${tx.metode_bayar}
                </div>
                ${itemHtml}
            `;

            openModal('billDetailModal');
        }
    } catch (err) {
        console.error(err);
        alert('Failed to load detail');
    }
}

function printBill() {
    const originalContent = document.body.innerHTML;
    const printContent = document.getElementById('bill-detail-content').innerHTML;

    document.body.innerHTML = `
        <div style="padding:2rem; color:black; background:white;">
            ${printContent}
        </div>
    `;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // Reload to restore events
}
