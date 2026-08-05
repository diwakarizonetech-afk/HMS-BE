# HMS Backend (FastAPI + SQLAlchemy + Alembic)

Backend API service for the **Hospital Management System (HMS)**, providing RESTful endpoints for Reception, Clinical/Nurse care, Store/Inventory, and Super Admin administration.

---

## 🛠️ Stack & Architecture

- **FastAPI** — High-performance REST API framework
- **SQLAlchemy ORM (v2)** — Database modeling and queries
- **Alembic** — Database schema migrations
- **Pydantic (v2)** — Request/Response validation and serialization
- **JWT (python-jose) + bcrypt** — Security and role-based access control
- **Uvicorn** — ASGI web server

---

## 📁 Package Layout

```
app/
  core/          # Database session, config settings, security (bcrypt & JWT), CRUD helpers
  models/        # SQLAlchemy ORM models (User, Patient, Doctor, IPD, Clinical, Store, SuperAdmin)
  schemas/       # Pydantic validation & response schemas
  routers/       # API route controllers (`/api/v1/*`)
  services/      # Service logic (notification_service.py)
  seed/          # Pre-seeding scripts (Roles, Permissions, Accounts, Depts, Hospital Profile)
  deps.py        # Authentication & Role guards (get_current_user, require_roles)
  main.py        # FastAPI app initialization & CORS middleware
  seed.py        # Master seed entrypoint
alembic/         # Database migration scripts & versions
alembic.ini      # Alembic configuration
requirements.txt # Dependencies
```

---

## ⚡ Quick Start

```bash
# 1. Active virtual environment
python -m venv .venv
.venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create environment configuration
cp .env.example .env

# 4. Run database migrations
alembic upgrade head

# 5. Seed system accounts & hospital profile
python -m app.seed

# 6. Start development server
uvicorn app.main:app --reload
```

Server URL: **`http://127.0.0.1:8000`**  
Swagger UI Docs: **`http://127.0.0.1:8000/docs`**  
ReDoc UI Docs: **`http://127.0.0.1:8000/redoc`**

---

## 🔑 System Accounts (Password: `ChangeMe@123`)

| Username / Email | Role | Module Access |
|---|---|---|
| `superadmin` / `admin@hospital.com` | `super_admin` | Full system administration |
| `reception` / `reception@hospital.com` | `reception` | Patients, Appointments, OPD Queue, Beds |
| `doctor` / `doctor@hospital.com` | `doctor` | Consultations, Prescriptions, IPD Care |
| `nurse` / `nurse@hospital.com` | `nurse` | Vitals, Nursing Notes, Drug Admin, Bed Transfers |
| `store` / `store@hospital.com` | `store_manager` | Central Store, POs, GRN, Stock In/Out, Batches |
| `lab` / `lab@hospital.com` | `lab` | Diagnostics & Pathology processing |
| `pharmacy` / `pharmacy@hospital.com` | `pharmacy` | Drug inventory & Pharmacy distribution |
| `admin` / `admin@hms.com` | `admin` | Operations management |

---

## 🗄️ Database Migrations

```bash
# Generate migration after modifying models in app/models/
alembic revision --autogenerate -m "migration_description"

# Apply pending migrations
alembic upgrade head
```
