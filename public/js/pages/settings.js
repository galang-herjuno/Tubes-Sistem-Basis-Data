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

// Secure Delete Account Logic
const deleteSecureBtn = document.getElementById('btn-delete-account-secure');
if (deleteSecureBtn) {
    deleteSecureBtn.addEventListener('click', async () => {
        if (!confirm('Are you absolutely sure you want to delete your account? This action cannot be undone.')) {
            return;
        }

        const password = prompt('Please enter your password to confirm deletion:');
        if (!password) {
            return; // User cancelled or entered empty
        }

        try {
            const res = await fetch('/api/users/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password })
            });

            const data = await res.json();

            if (res.ok) {
                alert(data.message);
                window.location.href = '/login';
            } else {
                alert('Account deletion failed: ' + data.message);
            }
        } catch (err) {
            console.error('Delete error:', err);
            alert('An error occurred while deleting the account');
        }
    });
}
