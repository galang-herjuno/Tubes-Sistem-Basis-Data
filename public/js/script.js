document.addEventListener('DOMContentLoaded', () => {
    console.log("Paw Whisker App Initialized");

    // Test API connection
    /*
    fetch('/api/test-db')
        .then(response => response.json())
        .then(data => {
            console.log('Backend Status:', data);
        })
        .catch(err => {
            console.error('Backend connection error:', err);
        });
    */

    // Simple scroll effect for header
    const header = document.querySelector('.glass-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
            // Remove inline styles to allow CSS to take over
            header.style.background = '';
            header.style.boxShadow = '';
        } else {
            header.classList.remove('scrolled');
            header.style.background = '';
            header.style.boxShadow = '';
        }
    });
});
