import mysql.connector
from faker import Faker
import random
from datetime import datetime, timedelta
import time

# ==============================================================================
# PAW WHISKER LARGE DUMMY DATA GENERATOR (CORRECTED RELATIONSHIP)
# ==============================================================================

DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'paw_whisker'
}

fake = Faker('id_ID')

def create_connection():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        if conn.is_connected():
            return conn
    except mysql.connector.Error as err:
        print(f"Error: {err}")
        return None

def get_base_password_hash(cursor):
    """Fetch a valid bcrypt hash from an existing user to reuse"""
    cursor.execute("SELECT password FROM users LIMIT 1")
    result = cursor.fetchone()
    if result:
        return result[0]
    return "$2a$10$YourDummyHashHereForSpeed......................" # Fallback

def generate_large_data(conn, target_pets=500000):
    cursor = conn.cursor()
    
    print(f"\n🚀 Starting generation of {target_pets} pets with linked Owners & Users...")
    
    # Get a real hash to use for all dummy users (for performance)
    password_hash = get_base_password_hash(cursor)
    
    current_pets = 0
    batch_size = 1000  # Process 1k owners at a time
    global_user_counter = 1
    
    # Performance optimization: Pre-define lists
    jenis_list = ['Kucing', 'Anjing']
    ras_kucing = ['Persia', 'Anggora', 'British Shorthair', 'Maine Coon', 'Domestik']
    ras_anjing = ['Golden Retriever', 'Husky', 'Bulldog', 'Poodle', 'Chihuahua', 'Mix']
    gender_list = ['Jantan', 'Betina']
    
    start_time = time.time()
    
    while current_pets < target_pets:
        users_values = []
        owners_values = []
        
        # 1. Prepare User & Owner Data
        current_batch_size = 0
        pets_in_this_batch = 0
        
        # Determine how many owners we need to reach pet target
        # Avg 2 pets/owner, but we generate dynamically
        
        # We'll generate a fixed batch of Owner+User first
        batch_data = [] # Temporary storage
        
        for _ in range(batch_size):
            # User Data
            username = f"user_{int(time.time())}_{global_user_counter}"
            users_values.append((username, password_hash, 'Pelanggan'))
            
            # Owner Data (Profile)
            nama = fake.name()
            alamat = fake.address().replace('\n', ', ')
            hp = f"08{random.randint(100000000, 999999999)}"
            email = f"user{global_user_counter}@{fake.free_email_domain()}"
            
            batch_data.append({
                'nama': nama, 'alamat': alamat, 'hp': hp, 'email': email
            })
            
            global_user_counter += 1
            current_batch_size += 1
            
            # Check heuristic break to avoid over-generating too much
            # But we only add pets later, so we can control exact pet count then
            
        # 2. INSERT USERS
        sql_users = "INSERT INTO users (username, password, role) VALUES (%s, %s, %s)"
        try:
            cursor.executemany(sql_users, users_values)
            conn.commit()
            
            # Get the first ID of the batch
            cursor.execute("SELECT LAST_INSERT_ID()")
            first_user_id = cursor.fetchone()[0]
            
        except mysql.connector.Error as err:
            print(f"Error inserting users: {err}")
            continue # Skip this batch
            
        # 3. INSERT OWNERS (Using linked IDs)
        # Match generated User IDs to Owners (1:1)
        for i in range(current_batch_size):
            u_id = first_user_id + i
            d = batch_data[i]
            owners_values.append((u_id, d['nama'], d['alamat'], d['hp'], d['email']))
            
        sql_owners = "INSERT INTO pemilik (id_user, nama_pemilik, alamat, no_hp, email) VALUES (%s, %s, %s, %s, %s)"
        try:
            cursor.executemany(sql_owners, owners_values)
            conn.commit()
            
            cursor.execute("SELECT LAST_INSERT_ID()")
            first_owner_id = cursor.fetchone()[0]
            
        except mysql.connector.Error as err:
            print(f"Error inserting owners: {err}")
            continue

        # 4. INSERT PETS (For these new owners)
        pets_values = []
        
        for i in range(current_batch_size):
            owner_id = first_owner_id + i
            
            # 1-3 Pets per owner
            num_pets = random.randint(1, 3)
            
            # Cap if near target
            if current_pets + num_pets > target_pets:
                num_pets = target_pets - current_pets
            
            if num_pets <= 0:
                continue

            for _ in range(num_pets):
                nama_hewan = fake.first_name()
                jenis = random.choice(jenis_list)
                ras = random.choice(ras_kucing) if jenis == 'Kucing' else random.choice(ras_anjing)
                gender = random.choice(gender_list)
                
                # Random age
                age_days = random.randint(365, 365 * 12)
                tgl_lahir = datetime.now() - timedelta(days=age_days)
                tgl_str = tgl_lahir.strftime('%Y-%m-%d')
                
                berat = round(random.uniform(2.5, 25.0) if jenis == 'Anjing' else random.uniform(2.0, 8.0), 2)
                
                pets_values.append((owner_id, nama_hewan, jenis, ras, gender, tgl_str, berat))
                current_pets += 1
            
            if current_pets >= target_pets:
                break
        
        if pets_values:
            sql_pets = "INSERT INTO hewan (id_pemilik, nama_hewan, jenis_hewan, ras, gender, tgl_lahir, berat) VALUES (%s, %s, %s, %s, %s, %s, %s)"
            try:
                cursor.executemany(sql_pets, pets_values)
                conn.commit()
            except mysql.connector.Error as err:
                print(f"Error inserting pets: {err}")

        # Logging
        if current_pets % 10000 < 2000 or current_pets >= target_pets:
            elapsed = time.time() - start_time
            print(f"   ... {current_pets}/{target_pets} pets linked to owners/users ({(current_pets/target_pets)*100:.1f}%) - {elapsed:.0f}s")
            
    print(f"\n✅ COMPLETED! Total pets generated: {current_pets}")
    cursor.close()

if __name__ == "__main__":
    connection = create_connection()
    if connection:
        generate_large_data(connection)
        connection.close()
