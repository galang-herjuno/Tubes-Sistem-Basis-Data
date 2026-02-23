const authMiddleware = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
};

const authorizeRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.session.role || !allowedRoles.includes(req.session.role)) {
            return res.status(403).send(`
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>403 Forbidden</title>
                    <link rel="stylesheet" href="/css/style.css">
                    <style>
                        body { display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f8f9fa; flex-direction: column; }
                        .error-container { text-align: center; padding: 40px; background: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                        h1 { color: #dc3545; font-size: 3rem; margin-bottom: 10px; }
                        p { font-size: 1.2rem; color: #6c757d; margin-bottom: 20px; }
                        a { text-decoration: none; padding: 10px 20px; background: #0d6efd; color: white; border-radius: 5px; transition: 0.3s; }
                        a:hover { background: #0b5ed7; }
                    </style>
                </head>
                <body>
                    <div class="error-container">
                        <h1>403 Forbidden</h1>
                        <p>Oops! You don't have permission to access this page.</p>
                        <a href="/dashboard">Back to Dashboard</a>
                    </div>
                </body>
                </html>
            `);
        }
        next();
    };
};

module.exports = { authMiddleware, authorizeRole };
