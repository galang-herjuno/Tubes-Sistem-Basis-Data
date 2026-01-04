# Panduan Pengujian Beban dengan Apache JMeter (Skenario Login -> Dashboard -> Patients)

Panduan ini menjelaskan cara melakukan load testing dengan skenario User Journey: Login, lalu membuka Dashboard, lalu membuka halaman Patients.

## Prasyarat
1.  **Java** (JDK/JRE) sudah terinstall.
2.  **Apache JMeter** sudah didownload dan diekstrak.

## Konsep Penting
Agar JMeter bisa "ingat" bahwa user sudah login saat pindah halaman, kita **WAJIB** menggunakan **HTTP Cookie Manager**. Ini akan menyimpan session cookie dari Login dan mengirimnya otomatis ke request berikutnya.

---

## Langkah 1: Thread Group Setup
1.  Buka JMeter.
2.  Klik kanan **Test Plan** > **Add** > **Threads (Users)** > **Thread Group**.
3.  Set **Number of Threads**: `50` (50 User simulasi).
4.  Set **Ramp-up period**: `10`.

## Langkah 2: Konfigurasi Cookie Manager (Sangat Penting!)
1.  Klik kanan pada **Thread Group** > **Add** > **Config Element** > **HTTP Cookie Manager**.
    *   *Tanpa ini, setiap request dianggap user baru yang belum login.*

## Langkah 3: Konfigurasi Header Global
1.  Klik kanan pada **Thread Group** > **Add** > **Config Element** > **HTTP Header Manager**.
2.  Add: `Content-Type` value `application/json`.

## Langkah 4: Request 1 - Login (POST)
1.  Klik kanan **Thread Group** > **Add** > **Sampler** > **HTTP Request**.
2.  Ubah **Name** menjadi `1. Login Request`.
3.  Isi konfigurasi:
    *   **Method**: `POST`
    *   **Path**: `/api/login`
    *   **Body Data**:
        ```json
        {
            "username": "admin_1_6049", 
            "password": "password_admin"
        }
        ```
        *(Sesuaikan dengan akun database Anda)*

## Langkah 5: Request 2 - Buka Dashboard (GET)
Setelah login sukses, user diarahkan ke dashboard.
1.  Klik kanan **Thread Group** > **Add** > **Sampler** > **HTTP Request**.
2.  Ubah **Name** menjadi `2. Open Dashboard`.
3.  Isi konfigurasi:
    *   **Method**: `GET`
    *   **Path**: `/dashboard`

## Langkah 6: Request 3 - Buka Patients & Owner (GET)
Kemudian user mengklik menu Patients.
1.  Klik kanan **Thread Group** > **Add** > **Sampler** > **HTTP Request**.
2.  Ubah **Name** menjadi `3. Open Patients Page`.
3.  Isi konfigurasi:
    *   **Method**: `GET`
    *   **Path**: `/patients`
4.  *(Opsional)*: Tambahkan request untuk mengambil data API-nya juga (`GET /api/owners`), karena halaman fisik `/patients` biasanya memanggil API ini via JavaScript.
    *   Buat HTTP Request baru: `4. Get Patients Data (API)`
    *   Path: `/api/owners?page=1&limit=10`

## Langkah 7: Menambahkan Timer (Pause antar halaman)
User asli tidak mengeklik secepat kilat. Beri jeda agar realistis.
1.  Klik kanan **Thread Group** > **Add** > **Timer** > **Constant Timer**.
2.  Set `Thread Delay`: `2000` (2 detik).

## Langkah 8: Jalankan
1.  Tambahkan Listener (**View Results Tree** & **Summary Report**).
2.  Jalankan Test.
3.  Anda akan melihat urutan eksekusi:
    *   Login (Sukses) -> (Simpan Cookie)
    *   Dashboard (Sukses karena ada Cookie)
    *   Patients (Sukses karena ada Cookie)

Jika Cookie Manager lupa ditambahkan, Request 2 dan 3 akan gagal (403/Login Page/Redirect).
