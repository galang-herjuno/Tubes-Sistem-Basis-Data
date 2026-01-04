import mysql.connector

# Database Configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'paw_whisker'
}

INDEXES = [
    # Table: pemilik
    "CREATE INDEX idx_pemilik_nama ON pemilik(nama_pemilik)",
    "CREATE INDEX idx_pemilik_user ON pemilik(id_user)",

    # Table: hewan
    "CREATE INDEX idx_hewan_pemilik ON hewan(id_pemilik)",

    # Table: pendaftaran
    "CREATE INDEX idx_pendaftaran_tgl_status ON pendaftaran(tgl_kunjungan, status)",
    "CREATE INDEX idx_pendaftaran_hewan ON pendaftaran(id_hewan)",
    "CREATE INDEX idx_pendaftaran_pegawai ON pendaftaran(id_pegawai)",

    # Table: transaksi
    "CREATE INDEX idx_transaksi_tgl ON transaksi(tgl_transaksi)",
    "CREATE INDEX idx_transaksi_pemilik ON transaksi(id_pemilik)",

    # Table: barang
    "CREATE INDEX idx_barang_stok ON barang(stok)"
]

def apply_indexes():
    conn = None
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("✅ Connected to database.")
        
        print("\n🚀 Applying Indexes...")
        for sql in INDEXES:
            try:
                # Check if index exists by catching the specific error (Error 1061: Duplicate key name)
                cursor.execute(sql)
                print(f"  [OK] Executed: {sql}")
            except mysql.connector.Error as err:
                if err.errno == 1061:
                    print(f"  [SKIP] Index already exists: {sql.split('ON')[0].replace('CREATE INDEX ', '').strip()}")
                else:
                    print(f"  [ERROR] Failed to execute: {sql}")
                    print(f"          Reason: {err}")
        
        print("\n✨ Indexing complete!")
        
    except mysql.connector.Error as err:
        print(f"❌ Database Error: {err}")
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()
            print("🔌 Connection closed.")

if __name__ == "__main__":
    apply_indexes()
