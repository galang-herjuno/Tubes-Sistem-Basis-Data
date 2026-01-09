/**
 * Shared Layout Logic (Sidebar, Header, Role Management)
 */

document.addEventListener('DOMContentLoaded', async () => {
    injectLayout();


    try {
        const res = await fetch('/api/me');
        if (res.ok) {
            const user = await res.json();


            const nameEl = document.getElementById('user-name');
            const roleEl = document.getElementById('user-role');
            if (nameEl) nameEl.textContent = user.username;
            if (roleEl) roleEl.textContent = user.role;


            window.currentUserRole = user.role;


            updateUIBasedOnRole(user.role);

            // Set active menu item based on current URL
            setActiveMenuItem();
        }
    } catch (err) {
        console.error('Layout init error:', err);
    }

    const dateEl = document.getElementById('current-date');
    if (dateEl) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('en-US', options);
    }

    setTimeout(checkBillNotifications, 2000); // Check after render
});

async function checkBillNotifications() {
    // Only for Resepsionis
    if (window.currentUserRole !== 'Resepsionis' && window.currentUserRole !== 'Admin') return;

    try {
        // Check today's completed queue
        const res = await fetch('/api/dashboard/queue?date=today&status=completed&limit=5');
        if (res.ok) {
            const result = await res.json();
            const data = Array.isArray(result) ? result : result.data;

            // Check if any is unbilled (id_transaksi is null)
            const hasUnpaid = data.some(item => item.status === 'Selesai' && !item.id_transaksi);

            if (hasUnpaid) {
                const links = document.querySelectorAll('.menu a');
                links.forEach(link => {
                    // Check if href is dashboard (where queue is) or transactions
                    // User requested "sidebar Transactions".
                    if (link.getAttribute('href') === '/transactions') {
                        link.style.textShadow = '0 0 10px #f59e0b';
                        link.style.color = '#f59e0b';
                        // Add dot
                        if (!link.querySelector('.notif-dot')) {
                            const dot = document.createElement('span');
                            dot.className = 'notif-dot';
                            dot.style.cssText = 'display:inline-block; width:8px; height:8px; background:#f59e0b; border-radius:50%; margin-left:10px; box-shadow:0 0 5px #f59e0b;';
                            link.appendChild(dot);
                        }
                    }
                });
            }
        }
    } catch (err) {
        // quiet fail
    }
}

function injectLayout() {
    const sidebarHTML = `
    <div class="brand">
        <i class="fa-solid fa-paw" style="color:var(--primary-color)"></i> Paw <span>Whisker</span>
    </div>

    <ul class="menu">
        <li><a href="/dashboard"><i class="fa-solid fa-grid-2"></i> Dashboard</a></li>

        <!-- Appointments: All Roles -->
        <li class="role-admin role-resepsionis role-dokter"><a href="/appointments"><i class="fa-solid fa-calendar-check"></i> Appointments</a></li>

        <!-- Patients: Admin & Recep -->
        <li class="role-admin role-resepsionis"><a href="/patients"><i class="fa-solid fa-users"></i> Patients & Owners</a></li>

        <!-- Records: Admin & Doctor & Groomer -->
        <li class="role-admin role-dokter role-groomer"><a href="/medical-records"><i class="fa-solid fa-stethoscope"></i> Medical Records</a></li>

        <!-- Staff: Admin Only -->
        <li class="role-admin"><a href="/staff"><i class="fa-solid fa-user-doctor"></i> Staff Management</a></li>

        <!-- Inventory: Admin & Resepsionis -->
        <li class="role-admin role-resepsionis"><a href="/inventory"><i class="fa-solid fa-boxes-stacked"></i> Inventory</a></li>

        <!-- Transactions: Admin & Recep -->
        <li class="role-admin role-resepsionis"><a href="/transactions"><i class="fa-solid fa-cash-register"></i> Transactions</a></li>

        <li><a href="/settings"><i class="fa-solid fa-gear"></i> Settings</a></li>
    </ul>

    <div class="user-profile">
        <div class="avatar">
            <i class="fa-solid fa-user"></i>
        </div>
        <div class="user-info">
            <h4 id="user-name">Loading...</h4>
            <p id="user-role">...</p>
            <a href="/auth/logout" class="logout-btn">Logout</a>
        </div>
    </div>
    `;

    const sidebarContainer = document.querySelector('aside.sidebar');
    if (sidebarContainer) {
        sidebarContainer.innerHTML = sidebarHTML;
    }
}

function updateUIBasedOnRole(role) {
    const adminElements = document.querySelectorAll('.role-admin');
    const doctorElements = document.querySelectorAll('.role-dokter');
    const receptionElements = document.querySelectorAll('.role-resepsionis');
    const groomerElements = document.querySelectorAll('.role-groomer');

    // Default Hide
    [adminElements, doctorElements, receptionElements, groomerElements].forEach(group => {
        group.forEach(el => el.style.display = 'none');
    });

    // Show based on role
    if (role === 'Admin') {
        adminElements.forEach(el => el.style.display = '');
    } else if (role === 'Dokter') {
        doctorElements.forEach(el => el.style.display = '');
    } else if (role === 'Resepsionis') {
        receptionElements.forEach(el => el.style.display = '');
    } else if (role === 'Groomer') {
        groomerElements.forEach(el => el.style.display = '');
    }
}

function setActiveMenuItem() {
    const path = window.location.pathname;
    const links = document.querySelectorAll('.menu a');

    links.forEach(link => {
        if (link.getAttribute('href') === path) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}
