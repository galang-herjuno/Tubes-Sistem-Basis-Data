document.addEventListener('DOMContentLoaded', () => {
    loadAppointmentFormData();
});

// Initialize Owner Search for Appointment Form
function initOwnerSearch() {
    const searchInput = document.getElementById('apt-owner-search');
    const resultsDiv = document.getElementById('apt-owner-results');
    let debounceTimer;

    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();

        if (query.length < 2) {
            resultsDiv.style.display = 'none';
            return;
        }

        debounceTimer = setTimeout(() => searchAppointmentOwners(query), 300);
    });

    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
            resultsDiv.style.display = 'none';
        }
    });
};

async function searchAppointmentOwners(query) {
    const resultsDiv = document.getElementById('apt-owner-results');

    try {
        const res = await fetch(`/api/owners?search=${encodeURIComponent(query)}&limit=10`);
        if (res.ok) {
            const result = await res.json();
            const owners = result.data;

            resultsDiv.innerHTML = '';
            if (owners.length === 0) {
                resultsDiv.innerHTML = '<div style="padding:0.8rem; color:var(--text-muted); text-align:center;">No owner found</div>';
            } else {
                owners.forEach(o => {
                    const div = document.createElement('div');
                    div.style.padding = '0.8rem';
                    div.style.cursor = 'pointer';
                    div.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                    div.innerHTML = `<strong>${o.nama_pemilik}</strong> <br> <span style="font-size:0.8rem; color:var(--text-muted);">${o.no_hp}</span>`;

                    div.addEventListener('mouseenter', () => div.style.background = 'rgba(255,255,255,0.1)');
                    div.addEventListener('mouseleave', () => div.style.background = 'transparent');

                    div.onclick = () => selectAppointmentOwner(o);
                    resultsDiv.appendChild(div);
                });
            }
            resultsDiv.style.display = 'block';
        }
    } catch (err) {
        console.error('Search error:', err);
    }
}

async function selectAppointmentOwner(owner) {
    const searchInput = document.getElementById('apt-owner-search');
    const hiddenId = document.getElementById('apt-owner-id');
    const resultsDiv = document.getElementById('apt-owner-results');
    const petSelect = document.getElementById('apt-pet');

    searchInput.value = owner.nama_pemilik;
    hiddenId.value = owner.id_pemilik;
    resultsDiv.style.display = 'none';

    // Load Pets for selected owner
    petSelect.disabled = true;
    petSelect.innerHTML = '<option>Loading pets...</option>';

    try {
        const res = await fetch(`/api/owners/${owner.id_pemilik}/pets`);
        if (res.ok) {
            const pets = await res.json();
            petSelect.innerHTML = '<option value="">Select Pet</option>';

            if (pets.length === 0) {
                petSelect.innerHTML = '<option value="">No pets found</option>';
            } else {
                pets.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id_hewan;
                    opt.textContent = `${p.nama_hewan} (${p.jenis_hewan})`;
                    petSelect.appendChild(opt);
                });
                petSelect.disabled = false;
            }
        }
    } catch (err) {
        console.error('Load pets error:', err);
        petSelect.innerHTML = '<option>Error loading pets</option>';
    }
}

async function loadAppointmentFormData() {
    initOwnerSearch();


    const serviceSelect = document.getElementById('apt-service');

    if (serviceSelect) {
        serviceSelect.innerHTML = '<option value="">Loading services...</option>';
        try {
            const res = await fetch('/api/services');
            if (res.ok) {
                const services = await res.json();
                serviceSelect.innerHTML = '<option value="">Select Service</option>';
                services.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.id_layanan; // Value is ID
                    opt.textContent = s.nama_layanan; // Text is Name
                    serviceSelect.appendChild(opt);
                });
            } else {
                serviceSelect.innerHTML = '<option value="">Failed to load services</option>';
            }
        } catch (err) {
            console.error('Error loading services:', err);
            serviceSelect.innerHTML = '<option value="">Error loading services</option>';
        }

        // Event Listener for Service Change -> Filter Staff
        serviceSelect.onchange = () => {
            const selectedOption = serviceSelect.options[serviceSelect.selectedIndex];
            const serviceName = selectedOption ? selectedOption.textContent : '';
            filterStaffByService(serviceName);
        };
    }

    await loadStaffForDropdown();
};

async function loadStaffForDropdown() {
    try {
        const res = await fetch('/api/staff');
        if (res.ok) {
            window.allStaffCache = await res.json(); // Cache for filtering
            filterStaffByService('');
        }
    } catch (err) {
        console.error('Error loading staff:', err);
    }
}

function filterStaffByService(serviceName) {
    const doctorSelect = document.getElementById('apt-doctor');
    if (!doctorSelect || !window.allStaffCache) return;

    doctorSelect.innerHTML = '<option value="">Select Doctor/Groomer</option>';

    let filteredStaff = [];

    if (serviceName && serviceName.toLowerCase().includes('grooming')) {
        filteredStaff = window.allStaffCache.filter(s => s.jabatan === 'Groomer');
    } else if (serviceName) {
        filteredStaff = window.allStaffCache.filter(s => s.jabatan === 'Dokter Hewan');
    } else {
        filteredStaff = window.allStaffCache.filter(s =>
            s.jabatan === 'Dokter Hewan' || s.jabatan === 'Groomer'
        );
    }

    if (filteredStaff.length === 0) {
        const uniqueTitle = (serviceName && serviceName.toLowerCase().includes('grooming')) ? 'Groomers' : 'Doctors';
        doctorSelect.innerHTML = `<option value="">No ${uniqueTitle} available</option>`;
    } else {
        filteredStaff.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id_pegawai;
            opt.textContent = `${s.nama_lengkap} (${s.jabatan})`;
            doctorSelect.appendChild(opt);
        });
    }
}

// Handle Appointment Submission
const appointmentForm = document.getElementById('appointmentForm');
if (appointmentForm) {
    appointmentForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const data = {
            id_pemilik: document.getElementById('apt-owner-id').value, // Use hidden ID
            id_hewan: document.getElementById('apt-pet').value,
            id_pegawai: document.getElementById('apt-doctor').value,
            tgl_kunjungan: document.getElementById('apt-date').value,
            keluhan: `[${document.getElementById('apt-service').options[document.getElementById('apt-service').selectedIndex].text}] ${document.getElementById('apt-complaint').value}`
        };

        try {
            const res = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            alert(result.message);
            if (res.ok) {
                appointmentForm.reset();
                window.location.href = '/dashboard';
            }
        } catch (err) {
            console.error(err);
            alert('Error submitting appointment');
        }
    });
}
