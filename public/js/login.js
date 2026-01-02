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
        btn.textContent = 'Signing in...';
        btn.disabled = true;

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
            // Store token if applicable, or just redirect
            // localStorage.setItem('token', data.token);
            window.location.href = '/dashboard'; // Redirect to dashboard or home
        } else {
            alert(data.message || 'Login failed');
            btn.textContent = 'Sign In';
            btn.disabled = false;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again.');
        btn.textContent = 'Sign In';
        btn.disabled = false;
    }
});
