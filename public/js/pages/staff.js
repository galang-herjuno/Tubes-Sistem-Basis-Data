document.addEventListener('DOMContentLoaded', () => {
    loadStaff();
});

async function loadStaff() {
    try {
        const res = await fetch('/api/staff');
        if (res.ok) {
            const staff = await res.json();
            const tbody = document.querySelector('#staff-view table tbody');
            const emptyState = document.getElementById('staff-empty-state');

            if (tbody) {
                tbody.innerHTML = '';

                if (staff.length === 0) {
                    if (emptyState) emptyState.style.display = 'block';
                    document.querySelector('.table-container').style.display = 'none';
                } else {
                    if (emptyState) emptyState.style.display = 'none';
                    document.querySelector('.table-container').style.display = 'block';

                    staff.forEach(s => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${s.nama_lengkap}</td>
                            <td><span class="status-badge" style="background:var(--primary-color); color:var(--bg-color);">${s.jabatan}</span></td>
                            <td>${s.username || '<em style="color:#999">No Account</em>'}</td>
                            <td>${s.spesialisasi || '-'}</td>
                            <td>${s.no_hp || '-'}</td>
                            <td>
                                <button onclick="openEditStaff(${s.id_pegawai})" class="btn-xs" style="background:rgba(255,255,255,0.1); border:none; color:white; cursor:pointer;" title="Edit">
                                    <i class="fa-solid fa-pen"></i>
                                </button>
                                <button onclick="deleteStaff(${s.id_pegawai})" class="btn-xs" style="background:rgba(239,68,68,0.2); border:none; color:#ef4444; cursor:pointer; margin-left:5px;" title="Delete">
                                    <i class="fa-solid fa-trash"></i>
                                </button>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });
                }
            }
        }
    } catch (err) {
        console.error('Error loading staff:', err);
    }
}

function toggleSpesialisasi(val) {
    const group = document.getElementById('spesialisasi-group');
    if (group) {
        if (val === 'Dokter Hewan') {
            group.style.display = 'block';
        } else {
            group.style.display = 'none';
            document.getElementById('staff-spec').value = '';
        }
    }
}

// Add Staff
const addStaffForm = document.getElementById('addStaffForm');
if (addStaffForm) {
    addStaffForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
            nama_lengkap: document.getElementById('staff-name').value,
            jabatan: document.getElementById('staff-position').value,
            spesialisasi: document.getElementById('staff-spec').value,
            no_hp: document.getElementById('staff-phone').value,
            username: document.getElementById('staff-username').value,
            password: document.getElementById('staff-password').value,
            role: document.getElementById('staff-role').value
        };

        try {
            const res = await fetch('/api/staff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();

            if (res.ok) {
                alert('Staff added successfully!');
                closeModal('addStaffModal');
                addStaffForm.reset();
                loadStaff();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to add staff');
        }
    });
}

// Edit Staff
async function openEditStaff(id) {
    try {
        const res = await fetch(`/api/staff/${id}`);
        if (res.ok) {
            const staff = await res.json();

            document.getElementById('edit-staff-id').value = staff.id_pegawai;
            document.getElementById('edit-staff-name').value = staff.nama_lengkap;
            document.getElementById('edit-staff-position').value = staff.jabatan;
            document.getElementById('edit-staff-spec').value = staff.spesialisasi || '';
            document.getElementById('edit-staff-phone').value = staff.no_hp || '';
            document.getElementById('edit-staff-username').value = staff.username || '';
            document.getElementById('edit-staff-role').value = staff.role || 'Resepsionis'; // Default if null?

            toggleEditSpesialisasi(staff.jabatan);
            openModal('editStaffModal');
        }
    } catch (err) {
        console.error(err);
        alert('Failed to fetch staff details');
    }
}

function toggleEditSpesialisasi(val) {
    const group = document.getElementById('edit-spesialisasi-group');
    if (group) {
        group.style.display = val === 'Dokter Hewan' ? 'block' : 'none';
    }
}

window.submitEditStaff = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-staff-id').value;

    const data = {
        nama_lengkap: document.getElementById('edit-staff-name').value,
        jabatan: document.getElementById('edit-staff-position').value,
        spesialisasi: document.getElementById('edit-staff-spec').value,
        no_hp: document.getElementById('edit-staff-phone').value,
        role: document.getElementById('edit-staff-role').value
    };

    try {
        const res = await fetch(`/api/staff/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await res.json();
        if (res.ok) {
            alert('Staff updated successfully');
            closeModal('editStaffModal');
            loadStaff();
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to update staff');
    }
};

async function deleteStaff(id) {
    if (confirm('Are you sure you want to delete this staff member?')) {
        try {
            const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
            if (res.ok) {
                loadStaff();
            } else {
                alert('Failed to delete staff');
            }
        } catch (err) {
            console.error(err);
            alert('Error deleting staff');
        }
    }
}
