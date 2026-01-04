document.addEventListener('DOMContentLoaded', () => {
    loadMedicalWorkspace();

    // Load drugs for prescription dropdown
    loadDrugs();
});

let availableDrugs = [];

async function loadDrugs() {
    try {
        const res = await fetch('/api/inventory?category=Obat');
        if (res.ok) {
            availableDrugs = await res.json();
        }
    } catch (err) {
        console.error('Failed to load drugs', err);
    }
}

async function loadMedicalWorkspace() {
    const queueList = document.getElementById('medical-queue-list');
    queueList.innerHTML = '<div style="text-align:center; padding:1rem; color: #94a3b8;">Loading queue...</div>';

    try {
        // Fetch appointments that are 'Menunggu' or 'Diperiksa' and belong to this doctor (if logged in as doctor)
        // Or show all if Admin
        const res = await fetch('/api/medical/queue');
        if (res.ok) {
            const queue = await res.json();
            queueList.innerHTML = '';

            if (queue.length === 0) {
                queueList.innerHTML = '<div style="text-align:center; padding:1rem; color: #94a3b8;">No patients in queue</div>';
                return;
            }

            queue.forEach(q => {
                const div = document.createElement('div');
                div.style.cssText = 'padding:1rem; border-bottom:1px solid rgba(255,255,255,0.05); cursor:pointer; transition:background 0.2s;';
                div.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h4 style="margin:0; font-weight:600;">${q.nama_hewan}</h4>
                        <span class="status-badge status-${q.status.toLowerCase()}">${q.status}</span>
                    </div>
                    <p style="margin:0.3rem 0; font-size:0.85rem; color:var(--text-muted);">${q.jenis_hewan} • ${q.nama_pemilik}</p>
                    <p style="margin:0; font-size:0.85rem; color:var(--accent-color);"><i class="fa-solid fa-clock"></i> ${new Date(q.tgl_kunjungan).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                `;

                div.addEventListener('mouseenter', () => div.style.background = 'rgba(255,255,255,0.05)');
                div.addEventListener('mouseleave', () => {
                    if (!div.classList.contains('active-patient')) div.style.background = 'transparent';
                });

                div.onclick = () => selectPatient(q, div);
                queueList.appendChild(div);
            });
        }
    } catch (err) {
        console.error(err);
        queueList.innerHTML = '<div style="text-align:center; color:red;">Failed to load queue</div>';
    }
}

async function selectPatient(patient, elem) {
    // UI Highlight
    document.querySelectorAll('#medical-queue-list > div').forEach(d => {
        d.style.background = 'transparent';
        d.classList.remove('active-patient');
    });
    elem.style.background = 'rgba(255,255,255,0.1)';
    elem.classList.add('active-patient');

    // Unlock Form
    const container = document.getElementById('medical-form-container');
    container.style.opacity = '1';
    container.style.pointerEvents = 'all';

    // Set Active Badge
    const badge = document.getElementById('active-patient-badge');
    badge.style.display = 'inline-block';
    badge.textContent = `${patient.nama_hewan} (${patient.jenis_hewan})`;

    // Set Hidden IDs
    document.getElementById('mr-id-daftar').value = patient.id_daftar;
    document.getElementById('mr-id-hewan').value = patient.id_hewan;

    // Fetch History
    loadPatientHistoryForRecord(patient.nama_hewan);

    // Clear form fields
    document.getElementById('mr-diagnosa').value = '';
    document.getElementById('mr-tindakan').value = '';
    document.getElementById('mr-catatan').value = '';
    document.getElementById('prescription-list').innerHTML = '';

    // If there is existing medical record (draft), load it?
    // TODO: Implementation for loading draft
}

function addPrescriptionRow() {
    const container = document.getElementById('prescription-list');
    const row = document.createElement('div');
    row.style.cssText = 'display:grid; grid-template-columns: 2fr 1fr 2fr auto; gap:0.5rem; margin-bottom:0.5rem; align-items:center;';

    let drugOptions = '<option value="">Select Drug</option>';
    availableDrugs.forEach(d => {
        drugOptions += `<option value="${d.id_barang}">${d.nama_barang} (${d.stok} ${d.satuan})</option>`;
    });

    row.innerHTML = `
        <select class="drug-select" style="padding:0.5rem; border-radius:5px; background:rgba(255,255,255,0.1); color:white; border:none;">
            ${drugOptions}
        </select>
        <input type="number" class="drug-qty" placeholder="Qty" style="padding:0.5rem; border-radius:5px; background:rgba(255,255,255,0.1); color:white; border:none;">
        <input type="text" class="drug-notes" placeholder="Aturan Pakai (e.g., 3x1)" style="padding:0.5rem; border-radius:5px; background:rgba(255,255,255,0.1); color:white; border:none;">
        <button onclick="this.parentElement.remove()" style="background:transparent; border:none; color:#ef4444; cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
    `;

    container.appendChild(row);
}

async function saveMedicalRecord(status) {
    const idDaftar = document.getElementById('mr-id-daftar').value;
    const diagnosa = document.getElementById('mr-diagnosa').value;
    const tindakan = document.getElementById('mr-tindakan').value;
    const catatan = document.getElementById('mr-catatan').value;

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
        status: status, // 'Diperiksa' or 'Selesai'
        resep: prescriptions
    };

    try {
        const res = await fetch('/api/medical/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await res.json();
        alert(result.message);

        if (res.ok && status === 'Selesai') {
            // Remove from queue visually or reload queue
            loadMedicalWorkspace();
            // Reset form
            document.getElementById('medical-form-container').style.opacity = '0.5';
            document.getElementById('medical-form-container').style.pointerEvents = 'none';
        }
    } catch (err) {
        console.error(err);
        alert('Failed to save record');
    }
}

async function loadPatientHistoryForRecord(patientName) {
    const container = document.getElementById('patient-history-list');
    container.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:2rem;">Loading history...</p>';

    try {
        const res = await fetch(`/api/medical/history?search=${encodeURIComponent(patientName)}`);
        if (res.ok) {
            const history = await res.json();
            container.innerHTML = '';

            if (history.length === 0) {
                container.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:2rem;">No medical records found</p>';
                return;
            }

            history.forEach(record => {
                const card = document.createElement('div');
                card.style.cssText = 'background:rgba(255,255,255,0.03); padding:1.5rem; border-radius:10px; border:1px solid var(--glass-border); margin-bottom:1rem;';

                let prescriptionHtml = '';
                if (record.prescriptions && record.prescriptions.length > 0) {
                    prescriptionHtml = '<div style="margin-top:1rem; padding-top:1rem; border-top:1px solid rgba(255,255,255,0.1);"><strong>Prescriptions:</strong><ul style="margin:0.5rem 0;">';
                    record.prescriptions.forEach(rx => {
                        prescriptionHtml += `<li>${rx.nama_barang} - ${rx.jumlah}${rx.satuan} (${rx.aturan_pakai || 'As needed'})</li>`;
                    });
                    prescriptionHtml += '</ul></div>';
                }

                card.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                        <h4 style="margin:0; color:white;">${record.nama_hewan} (${record.jenis_hewan})</h4>
                        <span style="color:#94a3b8; font-size:0.9rem;">${new Date(record.tgl_periksa).toLocaleDateString()}</span>
                    </div>
                    <p style="margin:0.5rem 0; color:#94a3b8; font-size:0.9rem;">Owner: ${record.nama_pemilik} • Doctor: ${record.dokter}</p>
                    <p style="margin:0.5rem 0; color:#e2e8f0;"><strong>Diagnosis:</strong> ${record.diagnosa || '-'}</p>
                    <p style="margin:0.5rem 0; color:#e2e8f0;"><strong>Treatment:</strong> ${record.tindakan || '-'}</p>
                    ${record.catatan_dokter ? `<p style="margin:0.5rem 0; color:#94a3b8; font-size:0.9rem;"><strong>Notes:</strong> ${record.catatan_dokter}</p>` : ''}
                    ${prescriptionHtml}
                `;
                container.appendChild(card);
            });
        }
    } catch (err) {
        console.error(err);
    }
}

// Search Patient History
window.searchPatientHistory = () => {
    const search = document.getElementById('patient-search').value;
    loadPatientHistoryForRecord(search);
};
