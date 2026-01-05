# Analisis Optimisasi Query & EXPLAIN ANALYZE

Dokumen ini menjelaskan hasil optimisasi yang dilakukan pada database Paw Whisker (500k data) dan cara membaca `EXPLAIN ANALYZE`.

## 1. Perubahan Optimisasi

Kami melakukan dua optimisasi utama:

### a. Menghindari `SELECT *`
Pada `server.js`, query diubah untuk hanya mengambil kolom yang dibutuhkan.
*   **Sebelum**: `SELECT * FROM pemilik` (Mengambil semua kolom, boros bandwidth memori jika tabel besar).
*   **Sesudah**: `SELECT id_pemilik, nama_pemilik, ... FROM pemilik` (Lebih ringan).

### b. Menambahkan Indexing (Database Level)
Kami menambahkan index pada kolom krusial di `database/apply_optimization.sql`:
1.  `idx_pemilik_nama`: Mempercepat pencarian nama pemilik.
2.  `idx_hewan_pemilik`: Mempercepat JOIN antara Hewan & Pemilik.
3.  `idx_daftar_status_tgl`: Mempercepat filter Dashboard (Status + Tanggal).

---

## 2. Memahami `EXPLAIN ANALYZE`

`EXPLAIN ANALYZE` adalah tool untuk melihat **Rencana Eksekusi (Plan)** dan **Kinerja Nyata (Actual Execution)** dari sebuah query.

### Query Contoh:
```sql
SELECT * FROM pemilik WHERE nama_pemilik LIKE 'Ali%' LIMIT 5;
```

### Hasil Analisis (Setelah Indexing):

```
-> Limit: 5 row(s)  (cost=430.74 rows=5) (actual time=0.038..0.120 rows=5 loops=1)
    -> Index range scan on pemilik using idx_pemilik_nama  (cost=430.74 rows=401) (actual time=0.035..0.115 rows=5 loops=1)
```

### Cara Membaca Output:

1.  **`Index range scan on pemilik using idx_pemilik_nama`**
    *   **Artinya**: Database **TIDAK** mengecek 500.000 data satu per satu (Full Table Scan).
    *   Dia langsung loncat ke daftar nama yang berawalan 'Ali' menggunakan buku indeks (`idx_pemilik_nama`).
    *   **Dampak**: Jauh lebih cepat (milidetik vs detik).

2.  **`cost=430.74`**
    *   Estimasi "biaya" komputasi menurut database. Semakin kecil semakin baik. Tanpa index, cost ini bisa mencapai ribuan/jutaan.

3.  **`actual time=0.038..0.120`**
    *   Ini adalah waktu nyata dalam milidetik.
    *   Data pertama ditemukan dalam **0.038 ms**.
    *   5 data selesai dikumpulkan dalam **0.120 ms**.
    *   Sangat cepat!

### Kesimpulan
Tanpa index, database harus membaca seluruh tabel (`Full Table Scan`) untuk mencari nama 'Ali'. Dengan index, database hanya melakukan `Range Scan` pada sebagian kecil data.

---
**File Terkait:**
- `logic/server.js`: Implementasi query efisien.
- `database/apply_optimization.sql`: Definisi index.
- `analyze_query.js`: Script untuk menjalankan tes ini lagi.
