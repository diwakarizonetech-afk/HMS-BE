from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text, inspect

from app.core.config import settings
from app.core.database import Base, engine
import app.models  # noqa: F401 - ensures all models are registered on Base.metadata

from app.routers import (
    auth,
    patients,
    doctors,
    appointments,
    queue,
    ipd,
    notifications,
    clinical,
    lab,
    pharmacy,
    staff,
)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for the Hospital Management System (Super Admin + Clinical + Reception + Store/Inventory modules).",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
    ] + settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    
    # Check if ward_type enum exists in postgresql
    has_ward_type = False
    if engine.dialect.name == "postgresql":
        try:
            with engine.begin() as conn:
                res = conn.execute(text("SELECT 1 FROM pg_type WHERE typname = 'ward_type'"))
                has_ward_type = res.fetchone() is not None
        except Exception:
            pass

    for col_sql in [
            "ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50) USING role::text",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active'",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS branch VARCHAR(200)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login VARCHAR(50)",
            "ALTER TABLE working_hours ALTER COLUMN day_of_week TYPE VARCHAR(200)",
            "ALTER TABLE item_master ADD COLUMN IF NOT EXISTS pack_quantity INTEGER DEFAULT 1",
            "ALTER TABLE item_master ADD COLUMN IF NOT EXISTS issue_unit VARCHAR(50) DEFAULT 'Piece'",
            "ALTER TABLE item_master ADD COLUMN IF NOT EXISTS opening_stock INTEGER DEFAULT 0",
            "ALTER TABLE beds ALTER COLUMN ward TYPE VARCHAR(100) USING ward::text",
            "ALTER TABLE ipd_admissions ALTER COLUMN ward TYPE VARCHAR(100) USING ward::text",
            "ALTER TABLE beds ADD COLUMN IF NOT EXISTS branch VARCHAR(200)",
            "ALTER TABLE beds ADD COLUMN IF NOT EXISTS daily_rate FLOAT DEFAULT 0",
            "ALTER TABLE beds ADD COLUMN IF NOT EXISTS doctor_assigned VARCHAR(200)",
            "ALTER TABLE beds ADD COLUMN IF NOT EXISTS nurse_in_charge VARCHAR(200)",
            "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'Deluxe Suite' AND enumtypid = 'ward_type'::regtype) THEN ALTER TYPE ward_type ADD VALUE 'Deluxe Suite'; END IF; END $$",
            "ALTER TABLE stock_adjustment ALTER COLUMN type TYPE VARCHAR(50) USING type::text",
            "ALTER TABLE patient_vitals ADD COLUMN IF NOT EXISTS age INTEGER",
            "ALTER TABLE patient_vitals ADD COLUMN IF NOT EXISTS gender VARCHAR(20)",
            "ALTER TABLE patient_vitals ADD COLUMN IF NOT EXISTS doctor_id VARCHAR(100)",
            "ALTER TABLE patient_vitals ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(150)",
            "ALTER TABLE patient_vitals ADD COLUMN IF NOT EXISTS department VARCHAR(150)",
            "ALTER TABLE patient_vitals ADD COLUMN IF NOT EXISTS height FLOAT",
            "ALTER TABLE patient_vitals ADD COLUMN IF NOT EXISTS weight FLOAT",
            "ALTER TABLE patient_vitals ADD COLUMN IF NOT EXISTS blood_pressure VARCHAR(50)",
            "ALTER TABLE patient_vitals ADD COLUMN IF NOT EXISTS pulse_rate FLOAT",
            "ALTER TABLE patient_vitals ADD COLUMN IF NOT EXISTS respiratory_rate FLOAT",
            "ALTER TABLE patient_vitals ADD COLUMN IF NOT EXISTS blood_sugar FLOAT",
            "ALTER TABLE patient_vitals ADD COLUMN IF NOT EXISTS pain_scale INTEGER",
            "ALTER TABLE patient_vitals ADD COLUMN IF NOT EXISTS remarks TEXT",
            "ALTER TABLE patient_vitals ADD COLUMN IF NOT EXISTS date VARCHAR(20)",
            "ALTER TABLE patient_vitals ADD COLUMN IF NOT EXISTS time VARCHAR(20)",
            "ALTER TABLE nursing_notes ADD COLUMN IF NOT EXISTS ward VARCHAR(150)",
            "ALTER TABLE nursing_notes ADD COLUMN IF NOT EXISTS diagnosis TEXT",
            "ALTER TABLE nursing_notes ADD COLUMN IF NOT EXISTS observation TEXT",
            "ALTER TABLE nursing_notes ADD COLUMN IF NOT EXISTS symptoms TEXT",
            "ALTER TABLE nursing_notes ADD COLUMN IF NOT EXISTS treatment_response TEXT",
            "ALTER TABLE nursing_notes ADD COLUMN IF NOT EXISTS doctor_instructions TEXT",
            "ALTER TABLE nursing_notes ADD COLUMN IF NOT EXISTS fluid_intake FLOAT",
            "ALTER TABLE nursing_notes ADD COLUMN IF NOT EXISTS fluid_output FLOAT",
            "ALTER TABLE nursing_notes ADD COLUMN IF NOT EXISTS patient_condition VARCHAR(50)",
            "ALTER TABLE nursing_notes ADD COLUMN IF NOT EXISTS notes TEXT",
            "ALTER TABLE nursing_notes ADD COLUMN IF NOT EXISTS recorded_by VARCHAR(150)",
            "ALTER TABLE nursing_notes ADD COLUMN IF NOT EXISTS date VARCHAR(20)",
            "ALTER TABLE nursing_notes ADD COLUMN IF NOT EXISTS time VARCHAR(20)",
            "ALTER TABLE medication_logs ADD COLUMN IF NOT EXISTS ward VARCHAR(150)",
            "ALTER TABLE medication_logs ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(150)",
            "ALTER TABLE medication_logs ADD COLUMN IF NOT EXISTS frequency VARCHAR(100)",
            "ALTER TABLE medication_logs ADD COLUMN IF NOT EXISTS given_time VARCHAR(50)",
            "ALTER TABLE medication_logs ADD COLUMN IF NOT EXISTS reason_if_missed TEXT",
            "ALTER TABLE medication_logs ADD COLUMN IF NOT EXISTS remarks TEXT",
        ]:
            if col_sql.startswith("ALTER TABLE "):
                parts = col_sql.split()
                if len(parts) > 2:
                    table_name = parts[2]
                    if table_name not in existing_tables:
                        continue
            elif "ward_type" in col_sql and not has_ward_type:
                continue

            try:
                with engine.begin() as conn:
                    conn.execute(text(col_sql))
            except Exception as ex:
                print(f"Migration column check notice: {ex}")


    # Startup seed handled externally


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": settings.PROJECT_NAME}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}


api = settings.API_V1_PREFIX

app.include_router(auth.router, prefix=api)
app.include_router(patients.router, prefix=api)
app.include_router(doctors.router, prefix=api)
app.include_router(appointments.router, prefix=api)
app.include_router(queue.router, prefix=api)
app.include_router(ipd.router, prefix=api)
app.include_router(notifications.router, prefix=api)
app.include_router(clinical.router, prefix=api)
app.include_router(lab.router, prefix=api)
app.include_router(pharmacy.router, prefix=api)
app.include_router(staff.router, prefix=api)
