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

---

## 2026-01-02 (Part 2) - Customer Portal Implementation

### Database Schema Changes
1. **Updated `pemilik` table**
   - Added `id_user INT UNIQUE` column
   - Added foreign key constraint to `users(id_user)`
   - Enables linking customer accounts to owner profiles

### Backend API Endpoints - Customer Portal

#### Profile Management
- `GET /api/customer/profile` - Get or auto-create customer profile
- `PUT /api/customer/profile` - Update customer profile information

#### Dashboard
- `GET /api/customer/dashboard` - Get dashboard statistics (total pets, upcoming appointments, recent transactions)

#### Pets Management
- `GET /api/customer/pets` - Get all pets owned by customer
- `POST /api/customer/pets` - Add new pet (auto-linked to customer's profile)
- `GET /api/customer/pets/:id/medical-records` - Get complete medical history for a pet including prescriptions

#### Appointments
- `GET /api/customer/appointments` - Get all customer's appointments
- `GET /api/customer/appointments/next` - Get next upcoming appointment

#### Billing & Invoices
- `GET /api/customer/transactions` - Get all customer's transactions with items summary
- `GET /api/customer/transactions/:id` - Get detailed invoice with line items

### Frontend - Customer Portal

#### New Files Created
- `customer-dashboard.html` - Complete customer portal interface
- `customer-dashboard.js` - Full customer portal functionality

#### Features Implemented

**1. Dashboard (Overview)**
- Pet cards showing owned pets with icons
- Next appointment reminder with date, time, and doctor
- Recent transactions summary
- Quick stats: Total Pets, Upcoming Appointments, Recent Transactions

**2. My Pets Section**
- Grid view of all pets with detailed cards
- Pet information: Name, Species, Breed, Gender, Age, Weight
- "Add New Pet" functionality with modal form
- "View Medical Records" button for each pet
- Digital Health Card showing:
  - Complete medical history
  - Diagnosis and treatments
  - Prescriptions with dosage instructions
  - Doctor information
  - Visit dates

**3. Appointments Section**
- Table view of all appointments (past and upcoming)
- Shows: Date/Time, Pet, Doctor, Complaint, Status
- Status badges for visual clarity

**4. Billing & Invoices**
- Complete transaction history
- Invoice details with:
  - Transaction ID and date
  - Itemized list (services and products)
  - Payment method
  - Total amount
- "View Invoice" modal for detailed breakdown
- Quantity, unit price, and subtotals for each item

**5. Profile Settings**
- Update personal information:
  - Full Name
  - Email
  - Phone Number
  - Address
- Form validation and success feedback

### Routing & Access Control
- Updated `/dashboard` route to check user role
- Customers automatically redirected to `/customer-dashboard`
- Staff (Admin, Dokter, Resepsionis) use standard dashboard
- Role-based access control enforced on all endpoints

### Security Features
- All customer endpoints verify ownership before returning data
- Customers can only view their own pets, appointments, and transactions
- Profile auto-creation on first login for seamless onboarding
- Session-based authentication required for all customer portal features

### User Experience Enhancements
- Automatic profile creation for new customers
- Pet age calculation (years/months)
- Currency formatting (IDR)
- Date/time formatting (localized)
- Empty states with helpful messages
- Loading states for async operations
- Modal dialogs for detailed views
- Responsive card-based layouts
- Icon-based visual indicators

### Integration Points
```
Customer Account (users.role = 'Pelanggan')
    ↓ (id_user)
Owner Profile (pemilik)
    ↓ (id_pemilik)
Pets (hewan)
    ↓ (id_hewan)
Appointments (pendaftaran) → Medical Records (rekam_medis) → Prescriptions (resep_obat)
    ↓ (id_daftar)
Transactions (transaksi) → Transaction Details (detail_transaksi)
```

### Migration Script
- `update_pemilik_schema.js` - Adds `id_user` column to existing `pemilik` table
- Safe to run on existing databases (checks if column exists first)

### Benefits for Customers
✅ Complete pet health tracking
✅ Easy appointment viewing
✅ Transparent billing with detailed invoices
✅ Self-service pet registration
✅ Access to complete medical history
✅ Profile management
✅ No need to call clinic for basic information

### Benefits for Clinic
✅ Reduced receptionist workload
✅ Better customer engagement
✅ Digital record keeping
✅ Improved customer satisfaction
✅ Modern, professional image
✅ Reduced phone inquiries
