document.addEventListener('DOMContentLoaded', () => {
    loadMedicalWorkspace();
    loadDrugs();
});

let availableDrugs = [];

async function loadDrugs() {
    try {
        const res = await fetch('/api/medicines');
        if (res.ok) {
            const result = await res.json();
            // API medicines returns array of drugs
            availableDrugs = result;
        }
    } catch (err) {
        console.error('Failed to load drugs', err);
    }
}

async function loadMedicalWorkspace() {
    const queueList = document.getElementById('medical-queue-list');
    if (!queueList) return;

    queueList.innerHTML = '<div style="text-align:center; padding:1rem; color: #94a3b8;">Loading queue...</div>';

    try {
        const res = await fetch('/api/dashboard/queue?date=today&status=active&limit=100');
        if (res.ok) {
            const data = await res.json();
            const queue = Array.isArray(data) ? data : data.data;

            queueList.innerHTML = '';

            if (!queue || queue.length === 0) {
                queueList.innerHTML = '<div style="text-align:center; padding:1rem; color: #94a3b8;">No patients in queue</div>';
                return;
            }

            queue.forEach(q => {
                const div = document.createElement('div');
                div.style.cssText = 'padding:1rem; border-bottom:1px solid #e2e8f0; cursor:pointer; transition:background 0.2s;';

                // Parse Service from keluhan_awal (e.g., "[Grooming] ...")
                let serviceInfo = q.keluhan_awal || 'General Checkup';
                let doctorName = q.dokter || 'Unassigned';

                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <h4 style="margin:0; font-weight:600; color:var(--text-color); font-size:1.1rem;">${q.nama_hewan || 'Unknown'}</h4>
                            <p style="margin:0.3rem 0; font-size:0.9rem; color:var(--text-muted);">
                                <span style="font-weight:500; color:var(--text-color);">${q.jenis_hewan || 'Pet'}</span> • Owner: ${q.nama_pemilik || '-'}
                            </p>
                            <p style="margin:0.2rem 0; font-size:0.9rem; color:var(--primary-color);">
                                <i class="fa-solid fa-stethoscope"></i> ${serviceInfo}
                            </p> 
                            <p style="margin:0.2rem 0; font-size:0.85rem; color:var(--text-muted);">
                                <i class="fa-solid fa-user-doctor"></i> ${doctorName}
                            </p>
                        </div>
                        <div style="text-align:right;">
                            <span class="status-badge status-${q.status.toLowerCase()}">${q.status}</span>
                            <div style="margin-top:0.5rem; font-size:0.9rem; font-weight:600; color:var(--accent-color);">
                                <i class="fa-solid fa-clock"></i> ${q.jam || '-'}
                            </div>
                        </div>
                    </div>
                `;

                div.addEventListener('mouseenter', () => div.style.background = '#f8fafc');
                div.addEventListener('mouseleave', () => div.style.background = 'transparent');

                div.onclick = () => selectPatient(q);
                queueList.appendChild(div);
            });
        }
    } catch (err) {
        console.error(err);
        queueList.innerHTML = '<div style="text-align:center; color:red;">Failed to load queue</div>';
    }
}

async function selectPatient(patient) {
    // Open Modal
    openModal('medicalRecordModal');

    // Set Active Badge inside Modal
    const badge = document.getElementById('active-patient-badge');
    if (badge) {
        badge.textContent = `${patient.nama_hewan} (${patient.jenis_hewan}) - Owner: ${patient.nama_pemilik}`;
    }

    // Set Hidden IDs
    const idDaftarInput = document.getElementById('mr-id-daftar');
    const idHewanInput = document.getElementById('mr-id-hewan');
    if (idDaftarInput) idDaftarInput.value = patient.id_daftar;
    if (idHewanInput) idHewanInput.value = patient.id_hewan;

    // Fetch History
    loadPatientHistoryForRecord(patient.nama_hewan);

    // Clear form fields
    const diagnosa = document.getElementById('mr-diagnosa');
    const tindakan = document.getElementById('mr-tindakan');
    const catatan = document.getElementById('mr-catatan');
    const rxList = document.getElementById('prescription-list');

    if (diagnosa) diagnosa.value = '';
    if (tindakan) tindakan.value = '';
    if (catatan) catatan.value = '';
    if (rxList) rxList.innerHTML = '';
}

function addPrescriptionRow() {
    const container = document.getElementById('prescription-list');
    const row = document.createElement('div');
    row.style.cssText = 'display:grid; grid-template-columns: 2fr 1fr 2fr auto; gap:0.5rem; margin-bottom:0.5rem; align-items:center;';

    let drugOptions = '<option value="">Select Drug</option>';
    if (Array.isArray(availableDrugs)) {
        availableDrugs.forEach(d => {
            drugOptions += `<option value="${d.id_barang}">${d.nama_barang} (${d.stok} ${d.satuan})</option>`;
        });
    }

    // Fixed Styles for Light Mode Visibility
    const inputStyle = 'padding:0.6rem; border-radius:5px; background:white; color:var(--text-color); border:1px solid #cbd5e1; width:100%;';

    row.innerHTML = `
        <select class="drug-select" style="${inputStyle}">
            ${drugOptions}
        </select>
        <input type="number" class="drug-qty" placeholder="Qty" style="${inputStyle}">
        <input type="text" class="drug-notes" placeholder="Aturan Pakai (e.g., 3x1)" style="${inputStyle}">
        <button onclick="this.parentElement.remove()" style="background:transparent; border:none; color:#ef4444; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
    `;

    container.appendChild(row);
}

async function saveMedicalRecord(status) {
    const idDaftar = document.getElementById('mr-id-daftar').value;
    const diagnosa = document.getElementById('mr-diagnosa').value;
    const tindakan = document.getElementById('mr-tindakan').value;
    const catatan = document.getElementById('mr-catatan').value;

    if (!idDaftar) {
        alert('Please select a patient first');
        return;
    }

    // Gather Prescriptions
    const prescriptions = [];
    document.querySelectorAll('#prescription-list > div').forEach(row => {
        const idBarang = row.querySelector('.drug-select').value;
        const qty = row.querySelector('.drug-qty').value;
        const notes = row.querySelector('.drug-notes').value;

        if (idBarang && qty) {
            prescriptions.push({ id_barang: idBarang, jumlah: qty, aturan_pakai: notes });
        }
    });

    const payload = {
        id_daftar: idDaftar,
        diagnosa,
        tindakan,
        catatan_dokter: catatan,
        prescriptions: prescriptions
    };

    try {
        const res = await fetch('/api/medical-records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (res.ok) {
            alert(result.message);
            closeModal('medicalRecordModal'); // Close Modal
            loadMedicalWorkspace(); // Reload Queue
        } else {
            alert('Error: ' + result.message);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to save record');
    }
}

async function loadPatientHistoryForRecord(patientName) {
    const container = document.getElementById('patient-history-list');
    if (!container) return;

    container.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:2rem;">Loading history...</p>';

    try {
        // Use a valid endpoint. Assuming we have one, or use existing dashboard/records logic?
        // Server lacks specific 'history by name' endpoint in previous view.
        // But dashboard.js implemented search.
        // Let's rely on /api/dashboard/records (limited) or create new.
        // For now, let's skip history if endpoint missing, or assume /api/medical/history was implemented by user recently?
        // User request focused on Workspace Queue and Saving.
        // I will gracefully handle history failure.

        // Actually, assuming /api/medical/history doesn't exist (grep didn't find specific medical endpoints).
        // I'll render a placeholder.
        container.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:2rem;">History module unavailable</p>';

    } catch (err) {
        // console.error(err);
    }
}

window.searchPatientHistory = () => {
    const search = document.getElementById('patient-search').value;
    loadPatientHistoryForRecord(search);
};
