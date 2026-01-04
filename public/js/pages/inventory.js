document.addEventListener('DOMContentLoaded', () => {
    loadInventory();
});

let currentInventoryPage = 1;

async function loadInventory(page = 1) {
    currentInventoryPage = page;
    try {
        const res = await fetch(`/api/inventory?page=${page}&limit=10`);
        if (res.ok) {
            const result = await res.json();
            const items = result.data;
            const pagination = result.pagination;

            const tbody = document.querySelector('#inventory-view table tbody');
            if (tbody) {
                tbody.innerHTML = '';
                if (items.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:2rem; color:#94a3b8">No items found</td></tr>';
                } else {
                    items.forEach(i => {
                        const isLowStock = i.stok < 10;
                        const rowClass = isLowStock ? 'style="color:#ef4444; font-weight:bold;"' : '';
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${i.nama_barang}</td>
                            <td>${i.kategori}</td>
                            <td ${rowClass}>${i.stok} ${i.satuan} ${isLowStock ? '<i class="fa-solid fa-triangle-exclamation"></i>' : ''}</td>
                            <td>${formatCurrency(i.harga_satuan)}</td>
                            <td>
                                <button onclick="openEditItemModal(${JSON.stringify(i).replace(/"/g, '&quot;')})" 
                                    class="btn-xs" style="background:var(--primary-color); border:none; color:white; cursor:pointer; margin-right:5px; padding:0.4rem 0.8rem; border-radius:4px;">
                                    <i class="fa-solid fa-pen"></i> Edit
                                </button>
                                <button onclick="deleteItem(${i.id_barang})" 
                                    class="btn-xs" style="background:rgba(239,68,68,0.2); border:none; color:#ef4444; cursor:pointer; padding:0.4rem 0.8rem; border-radius:4px;">
                                    <i class="fa-solid fa-trash"></i> Delete
                                </button>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });
                }
            }

            // Pagination Controls
            const prevBtn = document.getElementById('prev-btn');
            const nextBtn = document.getElementById('next-btn');
            const pageInfo = document.getElementById('page-info');

            if (prevBtn && nextBtn && pageInfo) {
                prevBtn.disabled = pagination.currentPage <= 1;
                nextBtn.disabled = pagination.currentPage >= pagination.totalPages;
                pageInfo.textContent = `Page ${pagination.currentPage} of ${pagination.totalPages}`;
            }
        }
    } catch (err) {
        console.error('Error loading inventory:', err);
    }
}

window.changeInventoryPage = (delta) => {
    loadInventory(currentInventoryPage + delta);
};

// Add Item
const addItemForm = document.getElementById('addItemForm');
if (addItemForm) {
    addItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            nama_barang: document.getElementById('item-name').value,
            kategori: document.getElementById('item-category').value,
            stok: document.getElementById('item-stock').value,
            harga_satuan: document.getElementById('item-price').value,
            satuan: document.getElementById('item-unit').value
        };

        try {
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (res.ok) {
                alert('Item added successfully');
                closeModal('addItemModal');
                addItemForm.reset();
                loadInventory(currentInventoryPage);
            } else {
                alert(result.message);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to add item');
        }
    });
}

function openEditItemModal(item) {
    document.getElementById('edit-item-id').value = item.id_barang;
    document.getElementById('edit-item-name').value = item.nama_barang;
    document.getElementById('edit-item-stock').value = item.stok;
    document.getElementById('edit-item-price').value = item.harga_satuan;
    document.getElementById('edit-item-unit').value = item.satuan;
    openModal('editItemModal');
}

// Edit Item
const editItemForm = document.getElementById('editItemForm');
if (editItemForm) {
    editItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-item-id').value;
        const data = {
            stok: document.getElementById('edit-item-stock').value,
            harga_satuan: document.getElementById('edit-item-price').value,
            satuan: document.getElementById('edit-item-unit').value
        };

        try {
            const res = await fetch(`/api/barang/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                alert('Item updated');
                closeModal('editItemModal');
                loadInventory(currentInventoryPage);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to update item');
        }
    });
}

async function deleteItem(id) {
    if (confirm('Are you sure you want to delete this item?')) {
        try {
            const res = await fetch(`/api/barang/${id}`, { method: 'DELETE' });
            if (res.ok) {
                loadInventory(currentInventoryPage);
            } else {
                alert('Failed to delete item');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting item');
        }
    }
}
