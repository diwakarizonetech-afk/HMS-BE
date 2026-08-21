# Hospital Management System (HMS)

A full-stack, enterprise-grade **Hospital Management System (HMS)** built with a **FastAPI** Python backend and a **React + TypeScript + Vite** frontend.

Designed for modern healthcare facilities and multi-branch hospital networks, featuring comprehensive workflows for Super Admin, Reception & OPD, Emergency & Trauma (ER), Doctors & Clinical Care, IPD (In-Patient Department), Pharmacy, Laboratory Diagnostics, Central Store & Inventory, and Hospital Billing & Financial Operations.

---

## 🌟 Key Features & Modules

- 🏢 **Multi-Branch Operations**: Seamless multi-hospital / multi-branch support across all operational modules with branch-scoped data isolation.
- 🔐 **Role-Based Access Control (RBAC)**: Fine-grained roles (`super_admin`, `admin`, `reception`, `doctor`, `nurse`, `pharmacy`, `lab`, `store_manager`, `billing`) with module-level permission enforcement.
- 🚨 **Emergency & Trauma Care (ER)**: Rapid triage categorization (Red/Yellow/Green/Black), bedside emergency procedures, immediate bed allocation, and priority lab/pharmacy integration.
- 🩺 **OPD & Queue Management**: Patient registration, appointment scheduling, real-time doctor queue tracking, and walk-in token generation.
- 👨‍⚕️ **Doctor Workbench & Clinical EHR**: Electronic health records, diagnosis tracking, digital prescriptions, vital monitoring, and past medical history viewer.
- 📋 **Cross-Branch Patient History**: Unified historical record aggregation displaying past visits, OPD consultations, IPD admissions, lab results, and vitals across all branches.
- 🏥 **IPD Management**: Ward & bed allocation, admissions, nurse shift handovers, nursing notes, vitals logging, and discharge summaries.
- 💳 **Billing & Financial Operations**: OPD/IPD invoicing, multi-mode payment collection (Cash, Card, UPI, Insurance), discount approvals, refund tracking, and financial audit logs.
- 💊 **Pharmacy Management**: POS dispensing, medicine stock management, prescription fulfillment, batch expiry tracking, and returns.
- 🧪 **Laboratory Diagnostics**: Diagnostic test orders, barcoded sample collection & processing, result entry with normal/critical ranges, and report validation.
- 📦 **Store & Inventory**: Central store management, Purchase Orders (PO), Goods Receipt Notes (GRN), stock inward/outward transfers, reorder level alerts, and vendor catalogs.
- ⚙️ **Super Admin Dashboard**: Hospital profile branding, department management, user administration, staff shift scheduling, and system audit logs.

---

## 🛠️ Technology Stack

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **ORM & DB**: SQLAlchemy v2 + PostgreSQL (or SQLite for local dev)
- **Migrations**: Alembic (17 sequential migration revisions)
- **Validation**: Pydantic v2 & Pydantic Settings
- **Auth & Security**: JWT (`python-jose`) + `passlib[bcrypt]`
- **Server**: Uvicorn (ASGI)

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Routing**: React Router DOM v6
- **State Management**: Domain-scoped React Context Providers
- **Icons & Styling**: Lucide React + Premium Vanilla CSS Design Tokens
- **HTTP Client**: Axios with request/response interceptors

---

## 📁 Repository Structure

```
HMS_main/
├── backend/                  # FastAPI Python Backend
│   ├── alembic/              # Alembic database migration revisions & config
│   ├── app/                  # Application core, models, routers, schemas, services
│   ├── alembic.ini           # Alembic settings
│   ├── Dockerfile            # Container build specification
│   ├── requirements.txt      # Python dependencies
│   └── seed_db.py            # Standalone database seed runner
│
├── frontend/                 # React + TypeScript + Vite Frontend
│   ├── src/
│   │   ├── components/       # Shared UI components (Common, Dashboard, Nurse)
│   │   ├── context/          # React Context providers (Auth, Billing, ER, HMS, Lab, Nurse, Pharmacy, SuperAdmin)
│   │   ├── pages/            # Feature pages (Auth, Billing, Common, Doctor, Lab, Landing, Nurse, Patient, Pharmacy, Reception, Store, SuperAdmin)
│   │   ├── services/         # Axios API service client
│   │   ├── types/            # TypeScript type definitions (billing, er, hms, nurse, store, superAdmin)
│   │   └── utils/            # Utility helpers & formatters
│   └── package.json          # Frontend dependencies & npm scripts
│
├── CHANGELOG.md              # Project revision history & update log
├── PROJECT_STRUCTURE.md      # Detailed directory architecture documentation
├── README.md                 # Root documentation (this file)
└── .gitignore                # Workspace git ignore rules
```

---

## ⚡ Getting Started

### Prerequisites
- **Python** >= 3.10
- **Node.js** >= 18
- **npm** or **bun** / **yarn**

---

### 1. Backend Setup

```bash
# Navigate to backend folder
cd backend

# Create & activate virtual environment
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\activate

# Mac / Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env from template (configure DATABASE_URL if using PostgreSQL)
cp .env.example .env

# Run database migrations to apply latest schema
alembic upgrade head

# Seed initial superadmin account
python -m app.seed

# Start backend dev server
uvicorn app.main:app --reload
```

Backend will be live at **`http://localhost:8000`**  
- **Interactive Swagger API Docs**: `http://localhost:8000/docs`  
- **ReDoc API Docs**: `http://localhost:8000/redoc`

---

### 2. Frontend Setup

```bash
# Navigate to frontend folder
cd frontend

# Install packages
npm install

# Start Vite development server
npm run dev
```

Frontend will be live at **`http://localhost:5173`** (or `http://localhost:3000`).

---

## 🔑 Pre-Configured Test Accounts (Default Password: `ChangeMe@123`)

| Username / Email | Role | Accessible Modules |
|---|---|---|
| `superadmin` / `admin@hospital.com` | `super_admin` | Full system administration, branding, depts, staff |
| `reception` / `reception@hospital.com` | `reception` | Patients, OPD queue, booking, tokens, ER intake |
| `doctor` / `doctor@hospital.com` | `doctor` | Doctor workbench, consultations, e-prescriptions, ER care |
| `nurse` / `nurse@hospital.com` | `nurse` | IPD bed allocations, vitals, nursing care, ward transfers |
| `pharmacy` / `pharmacy@hospital.com` | `pharmacy` | Drug POS, stock batches, prescriptions, returns |
| `lab` / `lab@hospital.com` | `lab` | Test requests, sample collection, result entry, reports |
| `store` / `store@hospital.com` | `store_manager` | Inventory items, POs, GRN, stock inward/outward |
| `admin` / `admin@hms.com` | `admin` | Operations management & department supervision |

---

## 🗄️ Database Migrations (Alembic)

```bash
cd backend

# Apply pending migrations to the database
alembic upgrade head

# Check current database migration version
alembic current

# Generate a new migration script after changing models in app/models/
alembic revision --autogenerate -m "Add new feature columns"
```

---

## 📜 Documentation & References

- [PROJECT_STRUCTURE.md](file:///e:/HMS_main/PROJECT_STRUCTURE.md) — Complete folder layout & architecture reference
- [backend/README.md](file:///e:/HMS_main/backend/README.md) — Backend-specific API details & configuration
- [backend/alembic/README](file:///e:/HMS_main/backend/alembic/README) — Migration revision history & commands
- [CHANGELOG.md](file:///e:/HMS_main/CHANGELOG.md) — Full changelog & implementation log
