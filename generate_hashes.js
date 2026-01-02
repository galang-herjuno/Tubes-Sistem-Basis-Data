const bcrypt = require('bcryptjs');
const fs = require('fs');

(async () => {
    const adminHash = await bcrypt.hash('admin123', 10);
    const doctorHash = await bcrypt.hash('dokter123', 10);
    const recepHash = await bcrypt.hash('resepsionis123', 10);
    const pelangganHash = await bcrypt.hash('pelanggan123', 10);

    const content = `INSERT INTO users (username, password, role) VALUES 
('admin', '${adminHash}', 'Admin'),
('dokter', '${doctorHash}', 'Dokter'),
('resepsionis', '${recepHash}', 'Resepsionis'),
('pelanggan', '${pelangganHash}', 'Pelanggan');`;

    console.log(content);
})();
