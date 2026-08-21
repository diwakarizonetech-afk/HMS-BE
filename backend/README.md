# HMS Backend (FastAPI + SQLAlchemy + Alembic)

Backend API service for the **Hospital Management System (HMS)**, providing high-performance RESTful endpoints for Reception, Emergency & Trauma (ER), Doctor OPD Consultations, Nursing & In-Patient Department (IPD), Laboratory Diagnostics, Pharmacy, Central Store/Inventory, Hospital Billing, and Super Admin administration.

---

## 🛠️ Stack & Architecture

- **FastAPI** — High-performance asynchronous REST API framework
- **SQLAlchemy ORM (v2)** — Declarative database modeling and typed queries
- **Alembic** — Schema migrations with 17 sequential revisions
- **Pydantic (v2)** — Request/Response validation and serialization
- **JWT (`python-jose`) + `passlib[bcrypt]`** — Security, authentication and RBAC guards
- **Uvicorn** — Production-ready ASGI web server

---

## 📁 Package Layout

```
backend/
├── alembic/              # Database migration scripts & versions
│   ├── versions/         # Revision files (Initial schema -> Billing & ER models)
│   ├── env.py            # Migration runtime environment
│   ├── README            # Migration changelog & usage commands
│   └── script.py.mako    # Revision script template
├── app/
│   ├── core/             # Database session, config settings, security, CRUD helpers
│   ├── models/           # SQLAlchemy ORM models (19 domain entities)
│   ├── schemas/          # Pydantic validation & response schemas
│   ├── routers/          # API route controllers (`/api/v1/*`)
│   │   ├── appointments.py, auth.py, billing.py, clinical.py, doctors.py,
│   │   ├── emergency.py, goods_receipts.py, ipd.py, lab.py, notifications.py,
│   │   ├── patients.py, pharmacy.py, purchase_orders.py, queue.py, reorder_batch.py,
│   │   ├── staff.py, stock_movements.py, store_items.py, superadmin.py
│   ├── services/         # Domain service logic (notification_service.py)
│   ├── seed/             # Seeding scripts (Superadmin bootstrap)
│   ├── deps.py           # Authentication & Permission guards (get_current_active_user, require_roles)
│   ├── main.py           # FastAPI app initialization, Lifespan handler & CORS middleware
│   └── seed.py           # Master seed entrypoint
├── alembic.ini           # Alembic configuration
├── requirements.txt      # Python dependencies
└── seed_db.py            # Standalone DB creation and admin seeding script
```

---

## ⚡ Quick Start

```bash
# 1. Activate virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate

# Linux / Mac:
# source .venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create environment configuration
cp .env.example .env

# 4. Run database migrations to apply latest schema
alembic upgrade head

# 5. Seed initial superadmin account
python -m app.seed

# 6. Start development server
uvicorn app.main:app --reload
```

- **Server URL**: `http://127.0.0.1:8000`
- **Swagger UI Docs**: `http://127.0.0.1:8000/docs`
- **ReDoc UI Docs**: `http://127.0.0.1:8000/redoc`

---

## 🔑 System Accounts (Password: `ChangeMe@123`)

| Username / Email | Role | Module Access |
|---|---|---|
| `superadmin` / `admin@hospital.com` | `super_admin` | Full system administration & hospital setup |
| `reception` / `reception@hospital.com` | `reception` | Patients, Appointments, OPD Queue, Tokens, ER Intake |
| `doctor` / `doctor@hospital.com` | `doctor` | Consultations, Prescriptions, IPD Care, ER Care |
| `nurse` / `nurse@hospital.com` | `nurse` | Vitals, Nursing Notes, Drug Admin, Bed Transfers |
| `pharmacy` / `pharmacy@hospital.com` | `pharmacy` | Drug inventory, POS dispensing, returns |
| `lab` / `lab@hospital.com` | `lab` | Diagnostics & Pathology processing |
| `store` / `store@hospital.com` | `store_manager` | Central Store, POs, GRN, Stock In/Out, Batches |
| `admin` / `admin@hms.com` | `admin` | Operations management & supervision |

---

## 🗄️ Database Migrations

```bash
# Apply all pending migrations to the latest revision (head)
alembic upgrade head

# Check current database migration version
alembic current

# Auto-generate a new migration revision after modifying models in app/models/
alembic revision --autogenerate -m "migration_description"
```
