# AegisCare HMS - Folder Structure

```text
HMS0/
│
├── backend/                       # Python FastAPI Backend
│   ├── app/                       
│   │   ├── core/                  # Configuration & Database setup
│   │   │   ├── config.py
│   │   │   └── database.py
│   │   ├── models/                # SQLAlchemy DB Models (Tables)
│   │   │   ├── clinical.py
│   │   │   ├── lab.py
│   │   │   ├── pharmacy.py
│   │   │   └── ...
│   │   ├── routers/               # API Endpoints (Controllers)
│   │   │   ├── appointments.py
│   │   │   ├── lab.py
│   │   │   ├── pharmacy.py
│   │   │   ├── staff.py
│   │   │   └── ...
│   │   ├── deps.py                # Dependencies (Auth/DB Session)
│   │   └── main.py                # FastAPI Application Entry Point
│   │
│   ├── .env                       # Backend Environment Variables (DB URL, Secrets)
│   ├── requirements.txt           # Python Dependencies
│   └── seed_db.py                 # Script to create tables and seed mock data
│
└── frontend/                      # React Frontend
    ├── src/
    │   ├── components/            # Reusable UI components
    │   ├── context/               # Global State Management (Auth, HMS, Lab, Pharmacy)
    │   ├── pages/                 # Page Views based on Roles
    │   │   ├── auth/              # Login Page
    │   │   ├── doctor/            # Doctor Dashboard & Consultation
    │   │   ├── lab/               # Laboratory Dashboard & Operations
    │   │   ├── pharmacy/          # Pharmacy POS, Inventory, Prescriptions
    │   │   └── reception/         # Reception Dashboard & Appointments
    │   ├── types/                 # TypeScript Interfaces & Types
    │   ├── App.tsx                # Main React Component & Routing
    │   └── main.tsx               # React Entry Point
    │
    ├── .env                       # Frontend Environment Variables (VITE_API_URL)
    ├── index.html
    ├── package.json               # Node.js Dependencies
    ├── tailwind.config.js         # Tailwind CSS Config
    ├── tsconfig.json              # TypeScript Config
    └── vite.config.ts             # Vite Bundler Config
```
