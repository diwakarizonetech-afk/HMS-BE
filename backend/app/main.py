from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine
import app.models  # noqa: F401 - ensures all models are registered on Base.metadata
from app.seed.super_admin import seed_super_admin

from app.routers import (
    auth,
    patients,
    doctors,
    appointments,
    queue,
    ipd,
    notifications,
    store_items,
    purchase_orders,
    goods_receipts,
    stock_movements,
    reorder_batch,
    superadmin,
    clinical,
    lab,
    pharmacy,
    staff,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    # Ensure columns added to SQLAlchemy models exist on existing PostgreSQL tables
    try:
        import sqlalchemy as sa
        with engine.connect() as conn:
            try:
                conn.execute(sa.text("ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'Pending'"))
                conn.execute(sa.text("ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'Requested'"))
                conn.commit()
            except Exception:
                pass

            for col_name, col_type in [
                ('logo', 'TEXT'), ('hospital_logo_url', 'TEXT'), ('license_number', 'VARCHAR(100)'),
                ('timezone', 'VARCHAR(100)'), ('currency', 'VARCHAR(50)'), ('established_year', 'VARCHAR(20)'),
                ('accreditation', 'VARCHAR(200)'),
            ]:
                conn.execute(sa.text(f"ALTER TABLE hospital_profiles ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))

            for col_name, col_type in [
                ('module', 'VARCHAR(100)'), ('event_type', 'VARCHAR(100)'), ('sender_id', 'VARCHAR(100)'),
                ('sender_name', 'VARCHAR(150)'), ('recipient_role', 'VARCHAR(50)'), ('related_record_id', 'VARCHAR(100)'),
                ('priority', 'VARCHAR(20)'), ('status', 'VARCHAR(20)'),
            ]:
                conn.execute(sa.text(f"ALTER TABLE notifications ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))

            for col_name, col_type in [
                ('assigned_ward', 'VARCHAR(100)'), ('branch', 'VARCHAR(200)'), ('employee_id', 'VARCHAR(50)'),
                ('phone', 'VARCHAR(20)'), ('last_login', 'VARCHAR(50)'),
            ]:
                conn.execute(sa.text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))

            for col_name, col_type in [
                ('head_of_department', 'VARCHAR(150)'), ('email', 'VARCHAR(150)'), ('phone', 'VARCHAR(50)'),
                ('floor_location', 'VARCHAR(100)'), ('bed_count', 'INTEGER DEFAULT 0'), ('status', "VARCHAR(20) DEFAULT 'Active'"),
            ]:
                conn.execute(sa.text(f"ALTER TABLE departments ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))

            for tbl in ['appointments', 'walkin_tokens', 'queue_items', 'doctors', 'patients', 'ipd_admissions']:
                conn.execute(sa.text(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS branch VARCHAR(200)"))

            # Branch columns for pharmacy, lab, and store tables
            for tbl in [
                'pharmacy_batches', 'pharmacy_purchases', 'prescriptions',
                'pos_invoices', 'customer_returns', 'supplier_returns',
                'sample_collections', 'sample_processing', 'lab_results', 'lab_reports',
                'stock_inward', 'stock_outward', 'stock_transfer', 'stock_adjustment',
                'item_master', 'vendors', 'purchase_orders', 'goods_receipts',
                'medicines', 'medicine_categories',
            ]:
                conn.execute(sa.text(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS branch VARCHAR(200)"))



            conn.execute(sa.text("ALTER TABLE working_hours ALTER COLUMN day_of_week TYPE VARCHAR(200)"))
            conn.execute(sa.text("UPDATE users SET branch = 'Main Branch' WHERE branch IS NULL OR branch = ''"))
            conn.execute(sa.text("UPDATE appointments SET branch = 'Main Branch' WHERE branch IS NULL OR branch = ''"))
            conn.execute(sa.text("UPDATE queue_items SET branch = 'Main Branch' WHERE branch IS NULL OR branch = ''"))
            conn.execute(sa.text("UPDATE walkin_tokens SET branch = 'Main Branch' WHERE branch IS NULL OR branch = ''"))
            conn.execute(sa.text("UPDATE doctors SET branch = 'Main Branch' WHERE branch IS NULL OR branch = ''"))
            conn.execute(sa.text("UPDATE patients SET branch = 'Main Branch' WHERE branch IS NULL OR branch = ''"))
            conn.execute(sa.text("UPDATE ipd_admissions SET branch = 'Main Branch' WHERE branch IS NULL OR branch = ''"))

            # Remove dummy seed queue items if present
            conn.execute(sa.text("DELETE FROM queue_items WHERE patient_name IN ('Rahul Verma', 'Priya Sharma', 'Amitabh Bachchan')"))

            conn.commit()
    except Exception as e:
        print(f"Notice during column auto-patching: {e}")

    try:
        seed_super_admin()
    except Exception as e:
        print(f"Error seeding database on startup: {e}")

    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for the Hospital Management System (Super Admin + Clinical + Reception + Store/Inventory modules).",
    version="1.0.0",
    lifespan=lifespan,
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


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": settings.PROJECT_NAME}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}


api = settings.API_V1_PREFIX

app.include_router(auth.router, prefix=api)
app.include_router(patients.router, prefix=api)
app.include_router(staff.router, prefix=api)
app.include_router(doctors.router, prefix=api)
app.include_router(appointments.router, prefix=api)
app.include_router(queue.router, prefix=api)
app.include_router(ipd.router, prefix=api)
app.include_router(notifications.router, prefix=api)
app.include_router(superadmin.router, prefix=api)
app.include_router(clinical.router, prefix=api)
app.include_router(store_items.router, prefix=f"{api}/store")
app.include_router(purchase_orders.router, prefix=f"{api}/store")
app.include_router(goods_receipts.router, prefix=f"{api}/store")
app.include_router(stock_movements.router, prefix=f"{api}/store")
app.include_router(reorder_batch.router, prefix=f"{api}/store")
app.include_router(lab.router, prefix=api)
app.include_router(pharmacy.router, prefix=api)
