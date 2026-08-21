# from contextlib import asynccontextmanager
# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware

# from app.core.config import settings
# from app.core.database import Base, engine
# import app.models  # noqa: F401 - ensures all models are registered on Base.metadata
# from app.seed.super_admin import seed_super_admin
# from app.seed.billing import seed_billing

# # Main Application Entry Point - HMS Backend
# from app.routers import (
#     auth,
#     patients,
#     doctors,
#     appointments,
#     queue,
#     ipd,
#     notifications,
#     store_items,
#     purchase_orders,
#     goods_receipts,
#     stock_movements,
#     reorder_batch,
#     superadmin,
#     clinical,
#     lab,
#     pharmacy,
#     staff,
#     billing,
#     emergency,
# )


# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     # Alembic handles known migrations; create_all fills model tables missing from legacy migrations.
#     Base.metadata.create_all(bind=engine)

#     # Ensure columns added to SQLAlchemy models exist on existing PostgreSQL tables
#     try:
#         import sqlalchemy as sa
#         with engine.connect() as conn:
#             try:
#                 conn.execute(sa.text("ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'Pending'"))
#                 conn.execute(sa.text("ALTER TYPE appointment_status ADD VALUE IF NOT EXISTS 'Requested'"))
#                 conn.commit()
#             except Exception:
#                 pass

#             for col_name, col_type in [
#                 ('logo', 'TEXT'), ('hospital_logo_url', 'TEXT'), ('license_number', 'VARCHAR(100)'),
#                 ('timezone', 'VARCHAR(100)'), ('currency', 'VARCHAR(50)'), ('established_year', 'VARCHAR(20)'),
#                 ('accreditation', 'VARCHAR(200)'),
#             ]:
#                 conn.execute(sa.text(f"ALTER TABLE hospital_profiles ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))

#             for col_name, col_type in [
#                 ('module', 'VARCHAR(100)'), ('event_type', 'VARCHAR(100)'), ('sender_id', 'VARCHAR(100)'),
#                 ('sender_name', 'VARCHAR(150)'), ('recipient_role', 'VARCHAR(50)'), ('related_record_id', 'VARCHAR(100)'),
#                 ('priority', 'VARCHAR(20)'), ('status', 'VARCHAR(20)'),
#                 ('branch', 'VARCHAR(200)'), ('follow_up_date', 'VARCHAR(50)'),
#             ]:
#                 conn.execute(sa.text(f"ALTER TABLE notifications ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))

#             for col_name, col_type in [
#                 ('assigned_ward', 'VARCHAR(100)'), ('branch', 'VARCHAR(200)'), ('employee_id', 'VARCHAR(50)'),
#                 ('phone', 'VARCHAR(20)'), ('last_login', 'VARCHAR(50)'),
#             ]:
#                 conn.execute(sa.text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))

#             for col_name, col_type in [
#                 ('head_of_department', 'VARCHAR(150)'), ('email', 'VARCHAR(150)'), ('phone', 'VARCHAR(50)'),
#                 ('floor_location', 'VARCHAR(100)'), ('bed_count', 'INTEGER DEFAULT 0'), ('status', "VARCHAR(20) DEFAULT 'Active'"),
#             ]:
#                 conn.execute(sa.text(f"ALTER TABLE departments ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))

#             for tbl in ['appointments', 'walkin_tokens', 'queue_items', 'doctors', 'patients', 'ipd_admissions', 'emergency_encounters', 'patient_vitals', 'nursing_notes', 'medication_logs', 'ward_transfers']:
#                 conn.execute(sa.text(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS branch VARCHAR(200)"))

#             conn.execute(sa.text("ALTER TABLE ipd_admissions ADD COLUMN IF NOT EXISTS attending_nurse VARCHAR(150)"))
#             conn.execute(sa.text("ALTER TABLE emergency_encounters ADD COLUMN IF NOT EXISTS department VARCHAR(150)"))
#             conn.execute(sa.text("ALTER TABLE emergency_encounters ADD COLUMN IF NOT EXISTS assigned_nurse VARCHAR(150)"))
#             conn.execute(sa.text("ALTER TABLE emergency_encounters ADD COLUMN IF NOT EXISTS assigned_doctor VARCHAR(150)"))

#             # Branch columns for pharmacy, lab, and store tables
#             for tbl in [
#                 'pharmacy_batches', 'pharmacy_purchases', 'prescriptions',
#                 'pos_invoices', 'customer_returns', 'supplier_returns',
#                 'sample_collections', 'sample_processing', 'lab_results', 'lab_reports',
#                 'stock_inward', 'stock_outward', 'stock_transfer', 'stock_adjustment',
#                 'item_master', 'vendors', 'purchase_orders', 'goods_receipts',
#                 'medicines', 'medicine_categories',
#             ]:
#                 conn.execute(sa.text(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS branch VARCHAR(200)"))

#             # Auto-patch stock movement table columns
#             for col_name, col_type in [
#                 ('batch_number', 'VARCHAR(100)'),
#                 ('from_location', 'VARCHAR(150)'),
#                 ('to_location', 'VARCHAR(150)'),
#                 ('requested_by', 'VARCHAR(150)'),
#                 ('transfer_date', 'VARCHAR(20)'),
#                 ('date', 'VARCHAR(20)'),
#             ]:
#                 conn.execute(sa.text(f"ALTER TABLE stock_transfer ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))

#             for col_name, col_type in [
#                 ('supplier_name', 'VARCHAR(200)'),
#                 ('received_by', 'VARCHAR(150)'),
#                 ('batch_number', 'VARCHAR(100)'),
#                 ('expiry_date', 'VARCHAR(20)'),
#                 ('supplier', 'VARCHAR(200)'),
#                 ('warehouse', 'VARCHAR(150)'),
#             ]:
#                 conn.execute(sa.text(f"ALTER TABLE stock_inward ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))

#             for col_name, col_type in [
#                 ('issued_to_department', 'VARCHAR(150)'),
#                 ('ward', 'VARCHAR(150)'),
#                 ('lab', 'VARCHAR(150)'),
#                 ('pharmacy', 'VARCHAR(150)'),
#                 ('operation_theatre', 'VARCHAR(150)'),
#                 ('doctor', 'VARCHAR(150)'),
#                 ('issued_to_person', 'VARCHAR(150)'),
#                 ('batch_number', 'VARCHAR(100)'),
#                 ('issued_by', 'VARCHAR(150)'),
#                 ('status', "VARCHAR(50) DEFAULT 'Pending Approval'"),
#                 ('reason', 'TEXT'),
#             ]:
#                 conn.execute(sa.text(f"ALTER TABLE stock_outward ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))

#             for col_name, col_type in [
#                 ('approved_by', 'VARCHAR(150)'),
#                 ('reason', 'TEXT'),
#             ]:
#                 conn.execute(sa.text(f"ALTER TABLE stock_adjustment ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))

#             for col_name, col_type in [
#                 ('generic_composition', 'VARCHAR(250)'),
#                 ('strength', 'VARCHAR(100)'),
#                 ('dosage_form', 'VARCHAR(100)'),
#             ]:
#                 conn.execute(sa.text(f"ALTER TABLE item_master ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
#                 conn.execute(sa.text(f"ALTER TABLE medicines ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))

#             for col_name, col_type in [
#                 ('payer_name', 'VARCHAR(150)'),
#                 ('payer_identifier', 'VARCHAR(200)'),
#                 ('payer_contact', 'VARCHAR(50)'),
#                 ('payer_email', 'VARCHAR(150)'),
#                 ('gateway_payment_id', 'VARCHAR(150)'),
#                 ('gateway_order_id', 'VARCHAR(150)'),
#             ]:
#                 conn.execute(sa.text(f"ALTER TABLE payment_collections ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))



#             conn.execute(sa.text("ALTER TABLE working_hours ALTER COLUMN day_of_week TYPE VARCHAR(200)"))
#             conn.execute(sa.text("UPDATE users SET branch = 'Main Branch' WHERE branch IS NULL OR branch = ''"))
#             conn.execute(sa.text("UPDATE appointments SET branch = 'Main Branch' WHERE branch IS NULL OR branch = ''"))
#             conn.execute(sa.text("UPDATE queue_items SET branch = 'Main Branch' WHERE branch IS NULL OR branch = ''"))
#             conn.execute(sa.text("UPDATE walkin_tokens SET branch = 'Main Branch' WHERE branch IS NULL OR branch = ''"))
#             conn.execute(sa.text("UPDATE doctors SET branch = 'Main Branch' WHERE branch IS NULL OR branch = ''"))
#             conn.execute(sa.text("UPDATE patients SET branch = 'Main Branch' WHERE branch IS NULL OR branch = ''"))
#             conn.execute(sa.text("UPDATE ipd_admissions SET branch = 'Main Branch' WHERE branch IS NULL OR branch = ''"))
#             conn.execute(sa.text("UPDATE patient_vitals SET branch = 'Main Branch' WHERE branch IS NULL OR branch = ''"))
#             conn.execute(sa.text("UPDATE nursing_notes SET branch = 'Main Branch' WHERE branch IS NULL OR branch = ''"))
#             conn.execute(sa.text("UPDATE medication_logs SET branch = 'Main Branch' WHERE branch IS NULL OR branch = ''"))
#             conn.execute(sa.text("UPDATE ward_transfers SET branch = 'Main Branch' WHERE branch IS NULL OR branch = ''"))

#             # Remove dummy seed queue items if present
#             conn.execute(sa.text("DELETE FROM queue_items WHERE patient_name IN ('Rahul Verma', 'Priya Sharma', 'Amitabh Bachchan')"))

#             conn.commit()
#     except Exception as e:
#         print(f"Notice during column auto-patching: {e}")

#     try:
#         seed_super_admin()
#         seed_billing()
#     except Exception as e:
#         print(f"Error seeding database on startup: {e}")

#     yield


# from fastapi import Request
# from fastapi.responses import JSONResponse

# app = FastAPI(
#     title=settings.PROJECT_NAME,
#     description="Backend API for the Hospital Management System (Super Admin + Clinical + Reception + Store/Inventory modules).",
#     version="1.0.0",
#     lifespan=lifespan,
# )

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_credentials=False,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )


# @app.exception_handler(Exception)
# async def global_exception_handler(request: Request, exc: Exception):
#     return JSONResponse(
#         status_code=500,
#         content={"detail": f"Internal Server Error: {str(exc)}"},
#         headers={
#             "Access-Control-Allow-Origin": "*",
#             "Access-Control-Allow-Headers": "*",
#             "Access-Control-Allow-Methods": "*",
#         },
#     )


# @app.get("/", tags=["Health"])
# def root():
#     return {"status": "ok", "service": settings.PROJECT_NAME}


# @app.get("/health", tags=["Health"])
# def health():
#     return {"status": "healthy"}


# api = settings.API_V1_PREFIX

# app.include_router(auth.router, prefix=api)
# app.include_router(patients.router, prefix=api)
# app.include_router(staff.router, prefix=api)
# app.include_router(doctors.router, prefix=api)
# app.include_router(appointments.router, prefix=api)
# app.include_router(queue.router, prefix=api)
# app.include_router(ipd.router, prefix=api)
# app.include_router(notifications.router, prefix=api)
# app.include_router(superadmin.router, prefix=api)
# app.include_router(clinical.router, prefix=api)
# app.include_router(store_items.router, prefix=f"{api}/store")
# app.include_router(purchase_orders.router, prefix=f"{api}/store")
# app.include_router(goods_receipts.router, prefix=f"{api}/store")
# app.include_router(stock_movements.router, prefix=f"{api}/store")
# app.include_router(reorder_batch.router, prefix=f"{api}/store")
# app.include_router(lab.router, prefix=api)
# app.include_router(pharmacy.router, prefix=api)
# app.include_router(billing.router, prefix=api)
# app.include_router(emergency.router, prefix=api)

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine
import app.models  # noqa: F401 - ensures all models are registered on Base.metadata
from app.seed.super_admin import seed_super_admin
from app.seed.billing import seed_billing

# Main Application Entry Point - HMS Backend
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
    billing,
    emergency,
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
                ('priority', 'VARCHAR(20)'), ('status', 'VARCHAR(20)'), ('branch', 'VARCHAR(200)'), ('follow_up_date', 'VARCHAR(50)'),
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

            for tbl in ['appointments', 'walkin_tokens', 'queue_items', 'doctors', 'patients', 'ipd_admissions', 'emergency_encounters']:
                conn.execute(sa.text(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS branch VARCHAR(200)"))

            for tbl in ['appointments', 'walkin_tokens', 'queue_items']:
                conn.execute(sa.text(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN DEFAULT FALSE"))
                conn.execute(sa.text(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0"))

            conn.execute(sa.text("ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS blood_group VARCHAR(10)"))
            conn.execute(sa.text("ALTER TABLE queue_items ADD COLUMN IF NOT EXISTS assigned_nurse VARCHAR(150)"))
            conn.execute(sa.text("ALTER TABLE ipd_admissions ADD COLUMN IF NOT EXISTS attending_nurse VARCHAR(150)"))
            conn.execute(sa.text("ALTER TABLE emergency_encounters ADD COLUMN IF NOT EXISTS department VARCHAR(150)"))
            conn.execute(sa.text("ALTER TABLE emergency_encounters ADD COLUMN IF NOT EXISTS assigned_nurse VARCHAR(150)"))
            conn.execute(sa.text("ALTER TABLE emergency_encounters ADD COLUMN IF NOT EXISTS assigned_doctor VARCHAR(150)"))

            # Auto-heal emergency flags on existing emergency tokens
            conn.execute(sa.text("UPDATE queue_items SET is_emergency = TRUE, priority = 1 WHERE token_number LIKE 'E-%' AND (is_emergency = FALSE OR is_emergency IS NULL)"))
            conn.execute(sa.text("UPDATE appointments SET is_emergency = TRUE, priority = 1 WHERE token_number LIKE 'E-%' AND (is_emergency = FALSE OR is_emergency IS NULL)"))

            # Branch columns for pharmacy, lab, clinical, and store tables
            for tbl in [
                'pharmacy_batches', 'pharmacy_purchases', 'prescriptions',
                'pos_invoices', 'customer_returns', 'supplier_returns',
                'sample_collections', 'sample_processing', 'lab_results', 'lab_reports',
                'stock_inward', 'stock_outward', 'stock_transfer', 'stock_adjustment',
                'item_master', 'vendors', 'purchase_orders', 'goods_receipts',
                'medicines', 'medicine_categories',
                'patient_vitals', 'nursing_notes', 'medication_logs', 'ward_transfers',
            ]:
                conn.execute(sa.text(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS branch VARCHAR(200)"))

            # Auto-patch stock movement table columns
            for col_name, col_type in [
                ('batch_number', 'VARCHAR(100)'),
                ('from_location', 'VARCHAR(150)'),
                ('to_location', 'VARCHAR(150)'),
                ('requested_by', 'VARCHAR(150)'),
                ('transfer_date', 'VARCHAR(20)'),
                ('date', 'VARCHAR(20)'),
            ]:
                conn.execute(sa.text(f"ALTER TABLE stock_transfer ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))

            for col_name, col_type in [
                ('supplier_name', 'VARCHAR(200)'),
                ('received_by', 'VARCHAR(150)'),
                ('batch_number', 'VARCHAR(100)'),
                ('expiry_date', 'VARCHAR(20)'),
                ('supplier', 'VARCHAR(200)'),
                ('warehouse', 'VARCHAR(150)'),
            ]:
                conn.execute(sa.text(f"ALTER TABLE stock_inward ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))

            for col_name, col_type in [
                ('issued_to_department', 'VARCHAR(150)'),
                ('ward', 'VARCHAR(150)'),
                ('lab', 'VARCHAR(150)'),
                ('pharmacy', 'VARCHAR(150)'),
                ('operation_theatre', 'VARCHAR(150)'),
                ('doctor', 'VARCHAR(150)'),
                ('issued_to_person', 'VARCHAR(150)'),
                ('batch_number', 'VARCHAR(100)'),
                ('issued_by', 'VARCHAR(150)'),
                ('status', "VARCHAR(50) DEFAULT 'Pending Approval'"),
                ('reason', 'TEXT'),
            ]:
                conn.execute(sa.text(f"ALTER TABLE stock_outward ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))

            for col_name, col_type in [
                ('approved_by', 'VARCHAR(150)'),
                ('reason', 'TEXT'),
            ]:
                conn.execute(sa.text(f"ALTER TABLE stock_adjustment ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))

            for col_name, col_type in [
                ('generic_composition', 'VARCHAR(250)'),
                ('strength', 'VARCHAR(100)'),
                ('dosage_form', 'VARCHAR(100)'),
            ]:
                conn.execute(sa.text(f"ALTER TABLE item_master ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
                conn.execute(sa.text(f"ALTER TABLE medicines ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))

            # ER encounter ID linking columns on clinical / lab / pharmacy tables
            for tbl in ['patient_vitals', 'nursing_notes', 'medication_logs', 'sample_collections', 'prescriptions']:
                conn.execute(sa.text(f"ALTER TABLE {tbl} ADD COLUMN IF NOT EXISTS er_encounter_id VARCHAR(100)"))

            # Drop NOT NULL constraints on patients table for optional fields
            for col in ['dob', 'address', 'city', 'state', 'country', 'pincode', 'aadhaar', 'emergency_contact_name', 'emergency_relationship', 'emergency_phone', 'mobile']:
                try:
                    conn.execute(sa.text(f"ALTER TABLE patients ALTER COLUMN {col} DROP NOT NULL"))
                except Exception:
                    pass

            # Billing payment_collections extra metadata columns
            for col_name, col_type in [
                ('payer_name', 'VARCHAR(150)'),
                ('payer_identifier', 'VARCHAR(200)'),
                ('payer_contact', 'VARCHAR(50)'),
                ('payer_email', 'VARCHAR(150)'),
                ('gateway_payment_id', 'VARCHAR(150)'),
                ('gateway_order_id', 'VARCHAR(150)'),
            ]:
                conn.execute(sa.text(f"ALTER TABLE payment_collections ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))

            # Billing tables branch column
            for tbl in ['bills', 'discount_requests', 'refund_requests', 'bill_cancellations', 'supplier_payables', 'payment_collections']:
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
        seed_billing()
    except Exception as e:
        print(f"Error seeding database on startup: {e}")

    yield


from fastapi import Request
from fastapi.responses import JSONResponse

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for the Hospital Management System (Super Admin + Clinical + Reception + Store/Inventory modules).",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "*",
        },
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
app.include_router(billing.router, prefix=api)
app.include_router(emergency.router, prefix=api)
