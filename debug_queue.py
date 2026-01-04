import mysql.connector
from datetime import datetime

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'paw_whisker'
}

def debug_queue():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        print("✅ Connected.")

        # 1. Check Pendaftaran Today
        print("\n--- Queue Items (Today) ---")
        sql = """
            SELECT p.id_daftar, p.tgl_kunjungan, p.status, 
                   h.nama_hewan, h.jenis_hewan, 
                   pm.nama_pemilik 
            FROM pendaftaran p
            LEFT JOIN hewan h ON p.id_hewan = h.id_hewan
            LEFT JOIN pemilik pm ON h.id_pemilik = pm.id_pemilik
            WHERE DATE(p.tgl_kunjungan) = CURRENT_DATE
            LIMIT 3
        """
        cursor.execute(sql)
        rows = cursor.fetchall()
        
        if not rows:
            print("No queue items found for today.")
        else:
            for r in rows:
                print(r)

        # 2. Check for NULL names in Hewan
        print("\n--- Animals with NULL Name/Type ---")
        cursor.execute("SELECT COUNT(*) as count FROM hewan WHERE nama_hewan IS NULL OR jenis_hewan IS NULL")
        bad_hewan = cursor.fetchone()
        print(f"Bad Animals: {bad_hewan['count']}")

        # 3. Check for recently created pendaftaran (ID > X?)
        # Just show last 5 pendaftaran globally
        print("\n--- Last 5 Assignments ---")
        cursor.execute("SELECT id_daftar, tgl_kunjungan FROM pendaftaran ORDER BY id_daftar DESC LIMIT 5")
        for r in cursor.fetchall():
            print(r)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if conn and conn.is_connected():
            conn.close()

if __name__ == "__main__":
    debug_queue()
