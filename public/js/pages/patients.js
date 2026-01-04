document.addEventListener('DOMContentLoaded', () => {
    loadPatients();
});


let currentPatientPage = 1;
window.totalPatientPages = 1; // Defined on window to avoid scope issues

async function loadPatients() {
    const searchInput = document.getElementById('owner-search-input');
    const searchTerm = searchInput ? searchInput.value : '';

    try {
        const res = await fetch(`/api/owners?page=${currentPatientPage}&limit=10&search=${searchTerm}`);
        if (res.ok) {
            const result = await res.json();
            const owners = result.data;
            const pagination = result.pagination;

            const tbody = document.querySelector('table tbody');
            if (tbody) {
                tbody.innerHTML = '';

                if (owners.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:2rem; color: #94a3b8;">No owners found matching your search</td></tr>';
                } else {
                    owners.forEach(o => {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${o.nama_pemilik}</td>
                            <td>${o.no_hp || '-'}</td>
                            <td>${o.pet_count} Pets</td>
                            <td>#${o.id_pemilik}</td>
                            <td>${new Date(o.created_at).toLocaleDateString()}</td>
                            <td>
                                <button onclick="viewOwnerDetails(${o.id_pemilik})" class="btn-xs" style="background:var(--primary-color); border:none; color:var(--bg-color); cursor:pointer;">
                                    View Details
                                </button>
                            </td>
                        `;
                        tbody.appendChild(tr);
                    });
                }
            }

            // Update Pagination Controls
            const prevBtn = document.getElementById('prev-btn');
            const nextBtn = document.getElementById('next-btn');
            const pageInfo = document.getElementById('page-info');

            if (prevBtn && nextBtn && pageInfo) {
                window.totalPatientPages = pagination.totalPages;
                prevBtn.disabled = pagination.currentPage === 1;
                nextBtn.disabled = pagination.currentPage === pagination.totalPages || pagination.totalRecords === 0;
                pageInfo.textContent = `Page ${pagination.currentPage} of ${pagination.totalPages || 1}`;
            }
        }
    } catch (err) {
        console.error('Error loading patients:', err);
    }
}

let searchTimeout;
function searchOwners() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        currentPatientPage = 1;
        loadPatients();
    }, 500);
}

function changePatientPage(delta) {
    const newPage = currentPatientPage + delta;
    if (newPage > 0 && newPage <= window.totalPatientPages) {
        currentPatientPage = newPage;
        loadPatients();
    }
}

async function viewOwnerDetails(id) {
    try {
        const res = await fetch(`/api/owners/${id}`);
        if (res.ok) {
            const owner = await res.json();

            // Get pets
            const petRes = await fetch(`/api/owners/${id}/pets`);
            const pets = await petRes.json();

            let petsHtml = '<div style="margin-top:1rem; display:grid; gap:1rem; grid-template-columns:repeat(auto-fill, minmax(150px, 1fr));">';
            if (pets.length === 0) {
                petsHtml += '<p style="color:var(--text-muted)">No pets registered</p>';
            } else {
                pets.forEach(p => {
                    petsHtml += `
                        <div style="background:rgba(255,255,255,0.05); padding:1rem; border-radius:8px; text-align:center;">
                            <div style="width:50px; height:50px; background:var(--primary-color); border-radius:50%; margin:0 auto 0.5rem; display:flex; align-items:center; justify-content:center; color:var(--bg-color); font-weight:bold;">
                                ${p.nama_hewan.charAt(0)}
                            </div>
                            <h4 style="margin:0;">${p.nama_hewan}</h4>
                            <p style="font-size:0.8rem; opacity:0.7;">${p.jenis_hewan} • ${p.gender}</p>
                        </div>
                     `;
                });
            }
            petsHtml += '</div>';

            const content = document.getElementById('owner-details-content');
            content.innerHTML = `
                <div style="background:rgba(255,255,255,0.03); padding:1.5rem; border-radius:10px; border:1px solid var(--glass-border);">
                    <div style="display:flex; justify-content:space-between;">
                        <h2 style="color:var(--primary-color); margin:0;">${owner.nama_pemilik}</h2>
                        <span style="background:rgba(255,255,255,0.1); padding:0.2rem 0.8rem; border-radius:20px; font-size:0.8rem;">ID: #${owner.id_pemilik}</span>
                    </div>
                    <div style="margin-top:1rem; display:grid; grid-template-columns: 1fr 1fr; gap:1rem;">
                        <div>
                            <label style="color:var(--text-muted); font-size:0.85rem">Phone</label>
                            <p>${owner.no_hp || '-'}</p>
                        </div>
                        <div>
                            <label style="color:var(--text-muted); font-size:0.85rem">Email</label>
                            <p>${owner.email || '-'}</p>
                        </div>
                        <div style="grid-column:span 2">
                            <label style="color:var(--text-muted); font-size:0.85rem">Address</label>
                            <p>${owner.alamat || '-'}</p>
                        </div>
                    </div>
                </div>
                <h4 style="margin:1.5rem 0 0.5rem;">Registered Pets</h4>
                ${petsHtml}
            `;

            // Set ID for adding new pet
            document.getElementById('pet-owner-id').value = id;

            openModal('ownerDetailsModal');
        }
    } catch (err) {
        console.error(err);
        alert('Failed to load owner details');
    }
}

// Add Owner Form
const addOwnerForm = document.getElementById('addOwnerForm');
if (addOwnerForm) {
    addOwnerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        try {
            const data = {
                username: document.getElementById('owner-name').value.toLowerCase().replace(/\s+/g, '') + Math.floor(Math.random() * 100),
                password: 'password123', // Default
                fullname: document.getElementById('owner-name').value,
                email: document.getElementById('owner-email').value,
                phone: document.getElementById('owner-phone').value,
                address: document.getElementById('owner-address').value
            };

            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();
            if (res.ok) {
                alert('Success: Owner added! Default password is "password123".');
                closeModal('addOwnerModal');
                addOwnerForm.reset();
                loadPatients();
            } else {
                alert('Error: ' + result.message);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to add owner');
        }
    });
}


// Add Pet Form
const addPetForm = document.getElementById('addPetForm');
if (addPetForm) {
    addPetForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const ownerId = document.getElementById('pet-owner-id').value;
        const data = {
            id_pemilik: ownerId,
            nama_hewan: document.getElementById('pet-name').value,
            jenis_hewan: document.getElementById('pet-type').value,
            ras: document.getElementById('pet-breed').value,
            gender: document.getElementById('pet-gender').value,
            tgl_lahir: document.getElementById('pet-dob').value,
            berat: document.getElementById('pet-weight').value
        };

        try {
            const res = await fetch('/api/pets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                alert('Pet added successfully');
                addPetForm.reset();
                // Refresh details
                viewOwnerDetails(ownerId);
            }
        } catch (err) {
            console.error(err);
            alert('Failed to add pet');
        }
    });
}
