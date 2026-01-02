document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const btn = document.querySelector('.btn-login');

    if (!username || !password) {
        alert('Please fill in all fields');
        return;
    }

    try {
        if (btn) {
            btn.textContent = 'Signing in...';
            btn.disabled = true;
        }

        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Login success
            window.location.href = '/dashboard';
        } else {
            alert(data.message || 'Login failed');
            if (btn) {
                btn.textContent = 'Sign In';
                btn.disabled = false;
            }
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
        if (btn) {
            btn.textContent = 'Sign In';
            btn.disabled = false;
        }
    }
});

// Toggle password
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', function () {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.textContent = type === 'password' ? 'Show' : 'Hide';
    });
}

// Forgot password
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', function (e) {
        e.preventDefault();
        alert('Please contact the administrator to reset your password.');
    });
}
