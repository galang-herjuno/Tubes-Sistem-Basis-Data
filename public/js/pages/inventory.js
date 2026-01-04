document.addEventListener('DOMContentLoaded', () => {
    loadInventory();
});

async function loadInventory() {
    try {
        const res = await fetch('/api/inventory');
        if (res.ok) {
            const items = await res.json();
            const tbody = document.querySelector('#inventory-view table tbody');
            if (tbody) {
                tbody.innerHTML = '';
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
                                class="btn-xs" style="background:rgba(255,255,255,0.1); border:none; color:white; cursor:pointer; margin-right:5px;">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button onclick="deleteItem(${i.id_barang})" 
                                class="btn-xs" style="background:rgba(239,68,68,0.2); border:none; color:#ef4444; cursor:pointer;">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    `;
                    tbody.appendChild(tr);
                });
            }

            // Update Low Stock Counter in Layout/Dashboard logic? 
            // Since we are in modular view, layout might not have access to dashboard counters.
            // That's fine, dashboard counters are on dashboard page.
        }
    } catch (err) {
        console.error('Error loading inventory:', err);
    }
}

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
                loadInventory();
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
            const res = await fetch(`/api/inventory/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (res.ok) {
                alert('Item updated');
                closeModal('editItemModal');
                loadInventory();
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
            const res = await fetch(`/api/inventory/${id}`, { method: 'DELETE' });
            if (res.ok) {
                loadInventory();
            } else {
                alert('Failed to delete item');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting item');
        }
    }
}
