import os

def main():
    base_dir = r"d:\Github\Tubes-Sistem-Basis-Data\logic"
    server_path = os.path.join(base_dir, "server.js")
    
    with open(server_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    routes_dir = os.path.join(base_dir, "routes")
    os.makedirs(routes_dir, exist_ok=True)
    
    def get_lines(start, end):
        # 1-based start and end, inclusive
        return "".join(lines[start-1:end])
        
    def to_router(content):
        return content.replace("app.get(", "router.get(")\
                      .replace("app.post(", "router.post(")\
                      .replace("app.put(", "router.put(")\
                      .replace("app.delete(", "router.delete(")
                      
    def write_router(filename, imports, content):
        with open(os.path.join(routes_dir, filename), "w", encoding="utf-8") as f:
            f.write("const express = require('express');\n")
            f.write("const router = express.Router();\n")
            if imports:
                f.write(imports + "\n")
            f.write("\n")
            f.write(to_router(content))
            f.write("\nmodule.exports = router;\n")

    imports_common = """const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { authMiddleware, authorizeRole } = require('../middlewares/auth');"""

    # 1. Pages
    pages_lines = get_lines(83, 118) + get_lines(120, 144) + get_lines(2229, 2232)
    write_router("pages.js", imports_common, pages_lines)
    
    # 2. Auth
    auth_lines = get_lines(146, 190)
    write_router("auth.js", imports_common, auth_lines)
    
    # 3. Users
    users_lines = get_lines(192, 349) + get_lines(418, 424)
    write_router("users.js", imports_common, users_lines)
    
    # 4. Appointments
    appoint_lines = get_lines(351, 414)
    write_router("appointments.js", imports_common, appoint_lines)
    
    # 5. Dashboard
    dash_lines = get_lines(426, 579)
    write_router("dashboard.js", imports_common, dash_lines)
    
    # 6. Owners & Pets
    owner_lines = get_lines(581, 744)
    write_router("owners.js", imports_common, owner_lines)
    
    pet_lines = get_lines(746, 821)
    write_router("pets.js", imports_common, pet_lines)
    
    # 7. Staff & Profile
    staff_lines = get_lines(823, 1013) + get_lines(1840, 1913)
    write_router("staff.js", imports_common, staff_lines)
    
    # 8. Inventory & Services
    inv_lines = get_lines(1016, 1116) + get_lines(1622, 1631) + get_lines(1634, 1744)
    write_router("inventory.js", imports_common, inv_lines)
    
    # 9. Transactions & Billing
    tx_lines = get_lines(1119, 1227) + get_lines(1229, 1389) + get_lines(1458, 1619)
    write_router("transactions.js", imports_common, tx_lines)
    
    # 10. Medical Records
    mr_lines = get_lines(1391, 1456) + get_lines(1746, 1838)
    write_router("medical_records.js", imports_common, mr_lines)
    
    # 11. Customer Portal
    cust_lines = get_lines(1915, 2227)
    write_router("customer.js", imports_common, cust_lines)

    # Now rewrite server.js
    server_top = get_lines(1, 36)
    
    server_routes = """
// Import Middlewares
const { authMiddleware, authorizeRole } = require('./middlewares/auth');

// Import Routes
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
    console.log(`Server running on http://localhost:${PORT}`);
});
"""
    with open(server_path, "w", encoding="utf-8") as f:
        f.write(server_top)
        f.write(server_routes)
        
if __name__ == "__main__":
    main()
