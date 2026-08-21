# Hospital Management System (HMS) - Project Structure & Architecture

This document provides a comprehensive overview of the modular directory structure and architectural organization for both the backend (FastAPI) and frontend (React / Vite / TypeScript) applications.

---

## Workspace Layout

```
HMS_main/
├── backend/                              # FastAPI Python Backend
│   ├── alembic/                          # Alembic database migration scripts
│   │   ├── versions/                     # Migration revisions (17 revisions up to Billing & ER)
│   │   ├── env.py                        # Migration runtime configuration & model registration
│   │   ├── README                        # Migration overview & revision history documentation
│   │   └── script.py.mako                # Revision script template
│   ├── app/                              # Core application code
│   │   ├── core/                         # Application core configuration & security
│   │   │   ├── config.py                 # Pydantic environment & app settings
│   │   │   ├── crud_utils.py             # Reusable CRUD helper utilities
│   │   │   ├── database.py               # SQLAlchemy database session & engine
│   │   │   ├── logging_utils.py          # Structured logger configuration
│   │   │   └── security.py               # Password hashing (bcrypt) & JWT token management
│   │   ├── models/                       # SQLAlchemy ORM database models (19 domain files)
│   │   │   ├── appointment.py            # OPD Appointments, WalkInToken, QueueItem
│   │   │   ├── batch.py                  # Inventory & Pharmacy batch tracking, StoreActivity
│   │   │   ├── billing.py                # Bills, BillItems, Payments, Discounts, Refunds, Audit Logs
│   │   │   ├── clinical.py               # PatientVital, NursingNote, MedicationLog, WardTransfer
│   │   │   ├── doctor.py                 # Doctor profiles, availability schedules, Departments
│   │   │   ├── emergency.py              # EmergencyEncounter, ERAssessment, ERProcedure, Triage
│   │   │   ├── goods_receipt.py          # Goods Receipt Note (GRN) & GRN items
│   │   │   ├── ipd.py                    # In-Patient beds, IPD admissions, discharges
│   │   │   ├── lab.py                    # Lab tests, samples, processing, results & report models
│   │   │   ├── mixins.py                 # Reusable model mixins (UUIDPKMixin, TimestampMixin)
│   │   │   ├── notification.py           # System alert notifications
│   │   │   ├── patient.py                # Patient demographics, UHID, emergency contacts
│   │   │   ├── pharmacy.py               # Pharmacy stock, POS sales, dispensing, customer/supplier returns
│   │   │   ├── purchase_order.py         # Store purchase orders & line items
│   │   │   ├── staff.py                  # Staff leaves, OPD consultations, IPD records
│   │   │   ├── stock_movement.py         # Stock inward, outward, transfers, adjustments
│   │   │   ├── store_item.py             # Central store inventory items, categories, vendors
│   │   │   ├── superadmin.py             # Hospital profile, branches, depts, permissions, roles
│   │   │   └── user.py                   # System user credentials, roles & auth identity
│   │   ├── routers/                      # FastAPI REST API endpoint routers (`/api/v1/*`)
│   │   │   ├── appointments.py           # OPD appointment scheduling & booking workflows
│   │   │   ├── auth.py                   # Login authentication & JWT token issuance
│   │   │   ├── billing.py                # Billing lifecycle, payments, invoices, discounts, refunds
│   │   │   ├── clinical.py               # Clinical consults, nursing notes, vitals logging
│   │   │   ├── doctors.py                # Doctor management, schedules, department rosters
│   │   │   ├── emergency.py              # Emergency ER triage, rapid registration, clinical care
│   │   │   ├── goods_receipts.py         # GRN processing & stock inwarding
│   │   │   ├── ipd.py                    # IPD bed allocation, admissions, ward transfers
│   │   │   ├── lab.py                    # Diagnostic lab tests, sample collection, results & reports
│   │   │   ├── notifications.py          # Real-time alert notifications & user subscriptions
│   │   │   ├── patients.py               # Patient registration, records & cross-branch history
│   │   │   ├── pharmacy.py               # Drug inventory, POS dispensing & batch stock
│   │   │   ├── purchase_orders.py        # Central store purchase order lifecycle
│   │   │   ├── queue.py                  # Live OPD consultation queue & token management
│   │   │   ├── reorder_batch.py          # Low-stock detection & reordering logic
│   │   │   ├── staff.py                  # Staff roster, shift rotations & leave approvals
│   │   │   ├── stock_movements.py        # Stock transfers, inward/outward & adjustments
│   │   │   ├── store_items.py            # Central store inventory master & vendor catalog
│   │   │   └── superadmin.py             # RBAC matrix, department config, hospital profile
│   │   ├── schemas/                      # Pydantic data validation & request/response DTOs
│   │   │   ├── appointment.py, batch.py, billing.py, clinical.py, common.py, doctor.py,
│   │   │   ├── emergency.py, goods_receipt.py, ipd.py, lab.py, notification.py,
│   │   │   ├── patient.py, pharmacy.py, purchase_order.py, staff.py, stock_movement.py,
│   │   │   ├── store_item.py, superadmin.py, user.py
│   │   ├── seed/                         # Database bootstrap seeders
│   │   │   └── super_admin.py            # Superadmin system account seeder
│   │   ├── services/                     # Domain business services
│   │   │   └── notification_service.py   # In-app notification delivery engine
│   │   ├── deps.py                       # FastAPI dependency injection (Auth, DB, RBAC guards)
│   │   ├── main.py                       # FastAPI application entrypoint & Lifespan handler
│   │   └── seed.py                       # Seeder execution runner
│   ├── alembic.ini                       # Alembic database migration config
│   ├── Dockerfile                        # Docker container configuration
│   ├── docker-compose.yml                # Docker Compose orchestration setup
│   ├── pyrefly.toml                      # Pyrefly linter/formatter config
│   ├── requirements.txt                  # Python package dependencies
│   ├── seed_db.py                        # Standalone database seed runner
│   └── test_*.py                         # Integration & live flow test suites
│
├── frontend/                             # React + TypeScript + Vite Frontend
│   ├── public/                           # Static assets, icons & favicons
│   ├── src/
│   │   ├── components/                   # Reusable UI Component library
│   │   │   ├── common/                   # Global components (PatientHistoryViewer, Navbar, Footer, Modal, Toast)
│   │   │   ├── dashboard/                # Dashboards, Sidebars & Header widgets
│   │   │   └── nurse/                    # Nurse-specific UI widgets & patient cards
│   │   ├── context/                      # React Context Global State Providers
│   │   │   ├── AuthContext.tsx           # Authentication state & user session
│   │   │   ├── BillingContext.tsx        # Hospital billing & payment collection state
│   │   │   ├── ERContext.tsx             # Emergency & Trauma department state manager
│   │   │   ├── HMSContext.tsx            # Main operational state management
│   │   │   ├── LabContext.tsx            # Diagnostics lab state manager
│   │   │   ├── NurseContext.tsx          # IPD nursing & bed allocation state
│   │   │   ├── PharmacyContext.tsx       # Pharmacy POS & stock state manager
│   │   │   └── SuperAdminContext.tsx     # Superadmin, roles, & hospital settings state
│   │   ├── pages/                        # Page components grouped by domain module
│   │   │   ├── auth/                     # Authentication pages (LoginPage)
│   │   │   ├── billing/                  # Billing & Accounts module
│   │   │   │   ├── BillingDashboard.tsx  # Financial metrics, revenue charts & quick actions
│   │   │   │   ├── BillingLayout.tsx     # Billing workspace layout wrapper
│   │   │   │   ├── BillingSidebar.tsx    # Sub-navigation for billing features
│   │   │   │   ├── components/           # Invoice modal, payment collection dialogs
│   │   │   │   ├── financial/            # Daily collection summaries & reconciliations
│   │   │   │   ├── invoices/             # OPD/IPD bill generation & history
│   │   │   │   ├── payments/             # Transactions, refunds & discount approvals
│   │   │   │   ├── reports/              # Revenue analytics, aging reports & department sales
│   │   │   │   └── settings/             # Tax rates, tariff master & payment gateway setup
│   │   │   ├── common/                   # Shared pages (Staff Leave, Roster)
│   │   │   ├── doctor/                   # Doctor module (Dashboard, Consultations, History, ER Workbench)
│   │   │   ├── lab/                      # Laboratory module (Test Master, Sample Collection, Results, Reports)
│   │   │   ├── landing/                  # Public landing / portal homepage
│   │   │   ├── nurse/                    # Nursing care, ward management & IPD vitals
│   │   │   ├── patient/                  # Patient portal (Self Booking, Medical History)
│   │   │   ├── pharmacy/                 # Pharmacy module (POS, Stock Batches, Prescriptions, Returns)
│   │   │   ├── reception/                # Reception module (Appointments, Tokens, Queue, ER Rapid Intake)
│   │   │   ├── store/                    # Central Store module (Items, POs, GRN, Batches, Stock Movements)
│   │   │   └── superadmin/               # Super Admin module (Hospital setup, Depts, Roles, Staff, Audits)
│   │   ├── services/                     # Backend API client communication
│   │   │   └── api.ts                    # Axios client instance & REST service wrappers
│   │   ├── types/                        # TypeScript Interfaces & Definitions
│   │   │   ├── billing.ts                # Invoicing, payments, refunds, tariffs, and bill items
│   │   │   ├── er.ts                     # Emergency encounters, triage categories, procedures
│   │   │   ├── hms.ts                    # Main HMS core domain interfaces
│   │   │   ├── nurse.ts                  # Nurse & IPD patient domain types
│   │   │   ├── store.ts                  # Central store & inventory interfaces
│   │   │   └── superAdmin.ts             # Superadmin & RBAC state types
│   │   ├── utils/                        # Utility & helper functions
│   │   │   └── helpers.ts                # Date formatting, currency & status helpers
│   │   ├── App.tsx                       # Main application routing container
│   │   ├── main.tsx                      # React root entry point
│   │   ├── index.css                     # Global design tokens & CSS styles
│   │   └── vite-env.d.ts                 # Vite environment definitions
│   ├── package.json                      # Node project configuration & npm scripts
│   ├── tsconfig.json                     # TypeScript compiler configuration
│   ├── vite.config.ts                    # Vite build tool & proxy dev server configuration
│   └── vercel.json                       # Vercel deployment configuration
│
├── CHANGELOG.md                          # Revision history & updates log
├── PROJECT_STRUCTURE.md                  # Comprehensive folder layout documentation (this file)
├── README.md                             # Main repository overview & setup instructions
└── .gitignore                            # Workspace git ignore rules
```

---

## Architectural Highlights

1. **FastAPI Lifespan Management**:
   - Backend uses modern `@asynccontextmanager` in `app/main.py` for database auto-patching and superadmin bootstrapping on startup.

2. **Alembic Database Migrations**:
   - Database migrations are versioned under `backend/alembic/versions/` (17 sequential revisions covering all modules from Core to Emergency & Billing).

3. **Fine-Grained Role-Based Access Control (RBAC)**:
   - Module-level permission matrix enforcement built into FastAPI router dependencies (`app/deps.py`) with explicit permission checks across all REST endpoints.

4. **Multi-Branch Operations**:
   - Operational scoping supported across backend models (`branch` entity relations) and frontend state contexts for multi-facility hospital chains.

5. **Cross-Branch Patient Timeline**:
   - Unified cross-branch patient medical history viewer aggregating past OPD consultations, IPD admissions, diagnostic lab results, vitals trends, and e-prescriptions.

6. **Emergency & Trauma Workflow**:
   - Rapid emergency intake, triage color grading (Red/Yellow/Green/Black), bedside doctor procedures, and fast-track admissions.

7. **Comprehensive Hospital Billing & Accounts**:
   - End-to-end financial workflows: OPD/IPD bill generation, multi-mode payment collection, discount authorizations, refund processing, and automated audit logging.
