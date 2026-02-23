const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

// Define exactly the boundaries of each block
const extractBlock = (startMarker, endMarker) => {
    let startIdx = code.indexOf(startMarker);
    if (startIdx === -1) throw new Error(`Start marker not found: ${startMarker}`);
    let endIdx = endMarker ? code.indexOf(endMarker, startIdx) : code.lastIndexOf('app.listen');
    if (endIdx === -1) throw new Error(`End marker not found: ${endMarker}`);
    let block = code.substring(startIdx, endIdx);
    return block.replace(/app\.(get|post|put|delete)\(/g, 'router.$1(');
};

const boilerplate = `const express = require('express');\nconst router = express.Router();\nconst path = require('path');\nconst bcrypt = require('bcryptjs');\nconst db = require('../config/db');\nconst { authMiddleware, authorizeRole } = require('../middlewares/auth');\n\n`;

const footer = `\n\nmodule.exports = router;\n`;

function writeFile(filename, content) {
    fs.writeFileSync(path.join(__dirname, 'routes', filename), boilerplate + content + footer);
    console.log(`Created ${filename}`);
}

try {
    const authCode = extractBlock("// API Login", "// --- USER MANAGEMENT API ---");
    writeFile('auth.js', authCode);

    const usersCode = extractBlock("// Create Account (Register)", "// --- APPOINTMENT SYSTEM API ---");
    writeFile('users.js', usersCode);

    const appointmentsCode = extractBlock("// Get Pets by Owner ID", "// --- DASHBOARD API ENDPOINTS ---");
    writeFile('appointments.js', appointmentsCode);

    const dashboardCode = extractBlock("// Get Current User Info", "// --- NEW CRUD API ENDPOINTS ---");
    writeFile('dashboard.js', dashboardCode);

    const ownersCode = extractBlock("// Get Single Owner", "// Get All Pets");
    writeFile('owners.js', ownersCode);

    const petsCode = extractBlock("// Get All Pets", "// 5. Staff Management");
    writeFile('pets.js', petsCode);

    const staffCode = extractBlock("// Get All Staff", "// 6. Inventory");
    writeFile('staff.js', staffCode);

    const inventoryCode = extractBlock("// Get All Items (Paginated)", "// 7. Transactions (Enhanced with CRUD)");
    writeFile('inventory.js', inventoryCode);

    // From Transactions until Customer Portal includes both transactions and medical records (or we can split further)
    // Let's split transactions
    const transCode = extractBlock("// Get Recent Transactions with Details", "// ========================================\n// MEDICAL RECORDS");
    writeFile('transactions.js', transCode);

    const medCode = extractBlock("// Add Medical Record with Prescriptions & Stock Check", "// ==========================================\n// CUSTOMER PORTAL API ENDPOINTS");
    writeFile('medical_records.js', medCode);

    const custCode = extractBlock("// Get or Create Customer Profile", "// Default Route");
    writeFile('customer.js', custCode);


    // Rewrite server.js
    const newServerContent = `const express = require('express');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let db;
try {
    db = require('./config/db');
} catch (error) {
    console.error("Database module error:", error);
}

if (!db) {
    console.error('Database module not available. Exiting to avoid runtime errors in routes.');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET || 'secret_key_sbd_tubes',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));

const { authMiddleware, authorizeRole } = require('./middlewares/auth');

// Modular Routes
app.use('/', require('./routes/pages'));
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/users'));
app.use('/', require('./routes/appointments'));
app.use('/', require('./routes/dashboard'));
app.use('/', require('./routes/owners'));
app.use('/', require('./routes/pets'));
app.use('/', require('./routes/staff'));
app.use('/', require('./routes/inventory'));
app.use('/', require('./routes/transactions'));
app.use('/', require('./routes/medical_records'));
app.use('/', require('./routes/customer'));

app.listen(PORT, () => {
    console.log(\`Server running on http://localhost:\${PORT}\`);
});
`;

    // backup original
    fs.copyFileSync(serverFile, serverFile + '.bak');
    fs.writeFileSync(serverFile, newServerContent);
    console.log('Successfully replaced server.js');

} catch (e) {
    console.error("Error during extraction:", e);
}
