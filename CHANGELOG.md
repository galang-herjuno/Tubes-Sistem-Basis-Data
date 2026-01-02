# Changelog - Paw Whisker Clinic Management System

## 2026-01-02 - Major Feature Updates

### Database Schema Changes
1. **Updated `users` table**
   - Added `'Pelanggan'` role to ENUM
   - Role options: `'Admin', 'Dokter', 'Resepsionis', 'Pelanggan'`

### Backend API Endpoints Added

#### Owners Management
- `GET /api/owners` - Get all owners with pet count
- `POST /api/owners` - Create new owner
- `PUT /api/owners/:id` - Update owner information
- `DELETE /api/owners/:id` - Delete owner
- `GET /api/owners/:id/pets` - Get pets by owner ID

#### Pets Management
- `GET /api/pets` - Get all pets with owner information
- `POST /api/pets` - Create new pet
- `PUT /api/pets/:id` - Update pet information
- `DELETE /api/pets/:id` - Delete pet

#### Appointments
- `GET /api/appointments` - Get all appointments with full details
- `POST /api/appointments` - Create new appointment (existing)
- `GET /api/doctors` - Get list of doctors and groomers (existing)

### Frontend Features

#### Registration Page
- **Removed** role selection dropdown
- All public registrations automatically assigned `'Pelanggan'` role
- Only admins can create users with other roles through Staff Management

#### Dashboard - Patients & Owners Section
- Added "Add Owner" button with modal form
- Added "Add Pet" button with modal form
- Owner form fields:
  - Owner Name (required)
  - Phone Number (required)
  - Email
  - Address
- Pet form fields:
  - Owner (dropdown, required)
  - Pet Name (required)
  - Species (Kucing/Anjing/Lainnya)
  - Breed
  - Gender (Jantan/Betina)
  - Date of Birth
  - Weight (kg)
- Table displays all owners with pet count

#### Dashboard - Appointments Section
- Fully functional appointment booking form
- Dynamic owner selection
- Pet dropdown populated based on selected owner
- Doctor/Groomer selection
- Date & Time picker
- Initial complaint/notes field
- Form validation and submission

### Integration & Tracking
- Appointments linked to pets (which are linked to owners)
- Transactions can reference appointments through `id_daftar`
- Full tracking chain: Owner → Pet → Appointment → Medical Record → Transaction

### Security Improvements
- Role-based access control enforced
- Public users cannot self-assign privileged roles
- Only admins can create staff accounts with elevated permissions

## Database Structure Summary

```
pemilik (owners)
  ↓
hewan (pets)
  ↓
pendaftaran (appointments)
  ↓
rekam_medis (medical records) → resep_obat (prescriptions)
  ↓
transaksi (transactions) → detail_transaksi (transaction details)
```

## Next Steps / TODO
- [ ] Add medical records management interface
- [ ] Implement transaction creation with appointment linking
- [ ] Add reporting and analytics features
- [ ] Implement prescription management
- [ ] Add services (layanan) management CRUD
