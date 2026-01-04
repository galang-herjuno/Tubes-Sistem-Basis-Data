import mysql.connector
from faker import Faker
import random
from datetime import datetime, timedelta

# ==============================================================================
# PAW WHISKER DUMMY DATA GENERATOR
# usage: pip install faker mysql-connector-python
#        python generate_dummy.py
# ==============================================================================

# Database Configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'paw_whisker'
}

fake = Faker('id_ID')

def create_connection():
    """Create a database connection"""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        if conn.is_connected():
            print("Connected to MySQL database")
            return conn
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return None

def generate_data(conn, num_owners=20):
    cursor = conn.cursor()
    
    print(f"\n🚀 Generating {num_owners} dummy owners and their pets...")
    
    try:
        for i in range(num_owners):
            # 1. Create Owner (Offline/Walk-in, so no id_user linked)
            nama = fake.name()
            alamat = fake.address().replace('\n', ', ')
            # Generate phone number format 08xx...
            hp = f"08{random.randint(100000000, 999999999)}"
            email = fake.email()
            
            sql_owner = "INSERT INTO pemilik (nama_pemilik, alamat, no_hp, email) VALUES (%s, %s, %s, %s)"
            cursor.execute(sql_owner, (nama, alamat, hp, email))
            owner_id = cursor.lastrowid
            
            # 2. Create Pets (1-3 pets per owner)
            num_pets = random.randint(1, 3)
            for _ in range(num_pets):
                nama_hewan = fake.first_name()  # Using human names for pets is common
                jenis = random.choice(['Kucing', 'Anjing'])
                
                if jenis == 'Kucing':
                    ras = random.choice(['Persia', 'Anggora', 'British Shorthair', 'Maine Coon', 'Domestik'])
                else:
                    ras = random.choice(['Golden Retriever', 'Husky', 'Bulldog', 'Poodle', 'Chihuahua', 'Mix'])
                
                gender = random.choice(['Jantan', 'Betina'])
                
                # Random birth date (1 to 12 years old)
                age_days = random.randint(365, 365 * 12)
                tgl_lahir = datetime.now() - timedelta(days=age_days)
                
                berat = round(random.uniform(2.5, 25.0) if jenis == 'Anjing' else random.uniform(2.0, 8.0), 2)
                
                sql_pet = """
                    INSERT INTO hewan (id_pemilik, nama_hewan, jenis_hewan, ras, gender, tgl_lahir, berat)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """
                cursor.execute(sql_pet, (owner_id, nama_hewan, jenis, ras, gender, tgl_lahir.strftime('%Y-%m-%d'), berat))
        
        conn.commit()
        print(f"✅ Successfully inserted {num_owners} owners and their pets.")
        
    except mysql.connector.Error as err:
        print(f"Error inserting data: {err}")
        conn.rollback()

if __name__ == "__main__":
    connection = create_connection()
    if connection:
        generate_data(connection)
        connection.close()
