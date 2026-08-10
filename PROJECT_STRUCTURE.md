# Hospital Management System (HMS) - Project Structure & Architecture

This document provides an overview of the modular directory structure and architectural organization for both the backend (FastAPI) and frontend (React / Vite / TypeScript) applications.

---

## Workspace Layout

```
hms/
├── backend/                  # FastAPI Python Backend
│   ├── alembic/              # Alembic database migration scripts
│   │   ├── versions/         # Migration revisions
│   │   ├── env.py            # Migration runtime configuration
│   │   └── script.py.mako    # Revision script template
│   ├── app/                  # Application code
│   │   ├── core/             # Core settings, security, and database connection
│   │   ├── models/           # SQLAlchemy ORM database models
│   │   ├── routers/          # FastAPI API endpoint routes
│   │   ├── schemas/          # Pydantic data schemas & request/response DTOs
│   │   ├── seed/             # Database seeders (e.g. super admin, initial data)
│   │   ├── services/         # Domain business logic & helper utilities
│   │   ├── deps.py           # Dependency injection (Auth, DB sessions, RBAC)
│   │   └── main.py           # FastAPI application entrypoint (Lifespan handler)
│   ├── alembic.ini           # Alembic configuration file
│   ├── Dockerfile            # Container configuration
│   └── requirements.txt      # Python package dependencies
│
├── frontend/                 # React + TypeScript + Vite Frontend
│   ├── public/               # Static assets & favicon
│   ├── src/
│   │   ├── components/       # Reusable UI components (Sidebar, Navbar, Modals)
│   │   ├── context/          # React Context providers (AuthContext, BranchContext)
│   │   ├── pages/            # Page components grouped by hospital module
│   │   │   ├── admin/        # Super Admin module pages
│   │   │   ├── clinical/     # Clinical & Doctor module pages
│   │   │   ├── ipd/          # In-Patient Department pages
│   │   │   ├── lab/          # Laboratory module pages
│   │   │   ├── pharmacy/     # Pharmacy module pages
│   │   │   ├── reception/    # Reception & Appointments pages
│   │   │   └── store/        # Inventory & Store Management pages
│   │   ├── services/         # Axios API clients & backend communication
│   │   ├── types/            # TypeScript interfaces & types (`hms.ts`)
│   │   ├── App.tsx           # Main App routes component
│   │   └── main.tsx          # React application entry point
│   ├── package.json          # Node dependencies & npm scripts
│   └── vite.config.ts        # Vite build & dev server setup
│
├── CHANGELOG.md              # Revision history & updates log
├── PROJECT_STRUCTURE.md      # Architecture & directory documentation
└── .gitignore                # Workspace git ignore rules
```

---

## Architectural Highlights

1. **FastAPI Lifespan Management**:
   - Backend uses modern `lifespan` context manager (`@asynccontextmanager`) in `app/main.py` for database auto-patching and superadmin seeding on startup.

2. **Alembic Database Migrations**:
   - Migration scripts are managed in `backend/alembic/versions/` with timestamped filename generation.

3. **Role-Based Access & Multi-Branch Support**:
   - Multi-branch operational support enabled across backend SQLAlchemy models (`branch` column) and frontend `BranchContext`.
