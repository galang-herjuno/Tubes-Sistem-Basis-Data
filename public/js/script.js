document.addEventListener('DOMContentLoaded', () => {
    console.log("Paw Whisker App Initialized");

    // Test API connection
    fetch('/api/test-db')
        .then(response => response.json())
        .then(data => {
            console.log('Backend Status:', data);
        })
        .catch(err => {
            console.error('Backend connection error:', err);
        });

    // Simple scroll effect for header
    const header = document.querySelector('.glass-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.background = 'rgba(15, 23, 42, 0.9)';
            header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
        } else {
            header.style.background = 'rgba(15, 23, 42, 0.7)';
            header.style.boxShadow = 'none';
        }
    });
});
