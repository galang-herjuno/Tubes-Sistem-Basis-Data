document.addEventListener('DOMContentLoaded', () => {
    loadSettingsProfile();
});

async function loadSettingsProfile() {
    try {
        const res = await fetch('/api/me');
        if (res.ok) {
            const user = await res.json();
            document.getElementById('settings-username').textContent = user.username;
            document.getElementById('settings-role').textContent = user.role;
        }
    } catch (err) {
        console.error(err);
    }
}

const changePasswordForm = document.getElementById('changePasswordForm');
if (changePasswordForm) {
    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        if (newPassword !== confirmPassword) {
            alert('New passwords do not match');
            return;
        }

        try {
            const res = await fetch('/api/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword })
            });

            const result = await res.json();
            alert(result.message);

            if (res.ok) {
                changePasswordForm.reset();
            }
        } catch (err) {
            console.error(err);
            alert('Failed to change password');
        }
    });
}
