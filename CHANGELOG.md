# Changelog

All notable changes to this project will be documented in this file.

## [Optimization] - 2026-01-04
### Performance Tuning
- **API Optimization**:
  - Refactored `/api/owners` to use "Divide & Conquer" strategy (splitting joins) to prevent N+1 query issues.
  - Optimized `/api/dashboard/stats` (Revenue) to use SARGable date queries (`>= CURRENT_DATE` instead of `DATE()` function).
  - Optimized `/api/dashboard/queue` to use indexed date range queries for 'today' and 'tomorrow'.
  - Added Pagination and Search to `/api/inventory` endpoint to handle large datasets effectively.
- **Database Indexing**:
  - Re-applied critical indexes on `pendaftaran(tgl_kunjungan, status)`, `transaksi(tgl_transaksi)`, and others.
  - Added composite index `idx_pendaftaran_filter` for efficient queue filtering.
- **Frontend Optimization**:
  - Refactored `overview.js` to correctly map Server API responses (fixing blank stats).
  - Implemented Pagination on `inventory.js` and `inventory.html`.
  - Restored Action Buttons (Edit/Delete) on Inventory and Patients view for better UX/UI consistency.
  - Verified Debounce on search inputs (500ms) to reduce API load.
