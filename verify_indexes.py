import mysql.connector

# Database Configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'paw_whisker'
}

TABLES_TO_CHECK = ['pemilik', 'hewan', 'pendaftaran', 'transaksi', 'barang']

def check_indexes():
    conn = None
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()
        print("✅ Connected to database.\n")
        
        for table in TABLES_TO_CHECK:
            print(f"--- Indexes on table '{table}' ---")
            cursor.execute(f"SHOW INDEX FROM {table}")
            indexes = cursor.fetchall()
            
            if not indexes:
                print("  (No indexes found)")
            
            seen_indexes = set()
            for idx in indexes:
                # idx[2] is Key_name, idx[4] is Column_name
                key_name = idx[2]
                column_name = idx[4]
                
                # Filter out PRIMARY keys to focus on our custom indexes
                if key_name == 'PRIMARY':
                    continue
                    
                print(f"  🔑 Key: {key_name:<30} Column: {column_name}")
                seen_indexes.add(key_name)
            
            if not seen_indexes:
                 print("  (Only Primary Key)")
            print("")

    except mysql.connector.Error as err:
        print(f"❌ Database Error: {err}")
    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    check_indexes()
