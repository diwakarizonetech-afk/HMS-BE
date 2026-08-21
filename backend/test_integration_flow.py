"""
End-to-end cross-module integration test, run against the REAL FastAPI app
(app.main.app) over real HTTP request/response cycles via TestClient, backed
by a fresh in-memory SQLite database (same verification standard as
test_phase13_14_live.py, but exercising the actual routers/serialization
instead of calling internal functions directly).

Goal: verify that data created by one role/module is actually visible to
and usable by the next role/module in a realistic patient journey, i.e. the
thing the handoff explicitly asked to confirm before frontend mock data is
removed:

    Admin creates staff -> Reception registers patient + books appointment
    -> Queue -> Doctor consults, records vitals, orders a lab test, writes
    a prescription -> Lab collects/processes/reports the sample -> Doctor
    reviews the report -> Pharmacy dispenses the prescription and stock
    is actually deducted.

Run: python3 test_integration_flow.py
"""
import os
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import sys

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool

# --- Build an isolated in-memory SQLite engine, sharing one connection so
# the in-memory DB persists across requests (each TestClient call would
# otherwise get a brand new empty :memory: DB). Same override pattern as
# a pytest conftest would use.
from app.core.database import Base, get_db
import app.models  # noqa: F401 registers all models on Base.metadata

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base.metadata.create_all(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

from app.main import app
app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

passed = 0
failed = 0

def check(label, cond):
    global passed, failed
    if cond:
        passed += 1
        print(f"  PASS: {label}")
    else:
        failed += 1
        print(f"  FAIL: {label}")

def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ── Seed only the Super Admin, exactly like app startup does ──────────────
from app.seed.super_admin import seed_super_admin
# seed_super_admin() uses its own engine/SessionLocal (app.core.database),
# which we haven't overridden -- so seed manually against our test engine
# instead, using the same logic, to keep this test fully isolated.
from app.core.security import hash_password
from app.models.user import User, UserRole

db = TestingSessionLocal()
admin = User(
    name="Super Admin", email="admin@hms.com",
    hashed_password=hash_password("admin123"),
    role=UserRole.admin, department="System Administration",
    status="Active", is_active=True,
)
db.add(admin)
db.commit()
db.close()

print("=== Bootstrap: only the Super Admin exists ===")
r = client.post("/api/v1/auth/login-json", json={"email": "admin@hms.com", "password": "admin123"})
check("Admin login succeeds", r.status_code == 200)
admin_token = r.json()["access_token"]
check("Logged-in user role is admin", r.json()["user"]["role"] == "admin")

r = client.get("/api/v1/users", headers=auth_headers(admin_token))
check("Only the admin exists yet (no staff users seeded)", r.status_code == 200 and len(r.json()) == 1)


# ── Admin creates one staff account per role ───────────────────────────
print("\n=== Admin creates staff accounts (doctor, reception, nurse, lab, pharmacist, store) ===")

def create_user(payload):
    return client.post("/api/v1/users", json=payload, headers=auth_headers(admin_token))

r = create_user({
    "fullName": "Dr. Asha Rao", "email": "doctor@hms.com", "role": "doctor",
    "userId": "doctor", "department": "Cardiology", "password": "Doctor@123",
})
check("Doctor account created by admin", r.status_code == 201)
doctor_user = r.json()

r = create_user({
    "fullName": "Meera Nair", "email": "reception@hms.com", "role": "reception",
    "userId": "reception", "department": "Front Desk", "password": "Reception@123",
})
check("Reception account created by admin", r.status_code == 201)

r = create_user({
    "fullName": "Nurse Kavya", "email": "nurse@hms.com", "role": "nurse",
    "userId": "nurse", "department": "ICU", "assignedWard": "ICU", "password": "Nurse@123",
})
check("Nurse account created by admin (with assignedWard)", r.status_code == 201)

r = create_user({
    "fullName": "Rohit Lab Tech", "email": "lab@hms.com", "role": "lab",
    "userId": "labtech", "department": "Hematology", "password": "Lab@123",
})
check("Lab tech account created by admin (with department)", r.status_code == 201)

r = create_user({
    "fullName": "Priya Pharmacist", "email": "pharmacist@hms.com", "role": "pharmacist",
    "userId": "pharmacist", "department": "Pharmacy", "password": "Pharma@123",
})
check("Pharmacist account created by admin", r.status_code == 201)
if r.status_code != 201:
    print("    ->", r.status_code, r.text[:300])

r = client.get("/api/v1/users", headers=auth_headers(admin_token))
check("6 users now exist (admin + 5 staff created by admin)", r.status_code == 200 and len(r.json()) == 6)


def login(email, password):
    r = client.post("/api/v1/auth/login-json", json={"email": email, "password": password})
    check(f"{email} can log in with admin-set password", r.status_code == 200)
    return r.json()["access_token"]

doctor_token = login("doctor@hms.com", "Doctor@123")
reception_token = login("reception@hms.com", "Reception@123")
nurse_token = login("nurse@hms.com", "Nurse@123")
lab_token = login("lab@hms.com", "Lab@123")
pharmacist_token = login("pharmacist@hms.com", "Pharma@123")


# ── Reception registers a patient and books an appointment ────────────
print("\n=== Reception: register patient + book appointment ===")
patient_payload = {
    "first_name": "Rahul", "last_name": "Verma", "gender": "Male", "dob": "1990-05-14",
    "age": 35, "blood_group": "O+", "marital_status": "Married", "nationality": "Indian",
    "mobile": "9876543210", "email": "rahul.verma@example.com", "address": "12 MG Road",
    "city": "Madurai", "state": "Tamil Nadu", "country": "India", "pincode": "625001",
    "aadhaar": "123456789012",
    "emergency_contact_name": "Sita Verma", "emergency_relationship": "Spouse",
    "emergency_phone": "9876543211",
}
r = client.post("/api/v1/patients", json=patient_payload, headers=auth_headers(reception_token))
check("Reception can register a real patient", r.status_code == 201)
patient = r.json()
uhid = patient["uhid"]
check("Patient got a real auto-generated UHID", bool(uhid))

r = client.get("/api/v1/doctors", headers=auth_headers(reception_token))
check("Reception can see the admin-created doctor in /doctors", r.status_code == 200 and any(d["email"] == "doctor@hms.com" for d in r.json()))
doctor_record = next(d for d in r.json() if d["email"] == "doctor@hms.com")

appt_payload = {
    "patient_uhid": uhid, "patient_name": f"{patient['first_name']} {patient['last_name']}",
    "patient_mobile": patient["mobile"], "department": "Cardiology",
    "doctor_id": doctor_record["id"], "doctor_name": doctor_record["name"],
    "date": "2026-08-10", "time_slot": "10:00 AM", "reason": "Chest pain follow-up",
}
r = client.post("/api/v1/appointments", json=appt_payload, headers=auth_headers(reception_token))
check("Reception can book an appointment for the real patient with the real doctor", r.status_code == 201)
appointment = r.json()

r = client.get("/api/v1/appointments", headers=auth_headers(doctor_token))
check(
    "Doctor sees exactly their own booked appointment (own-record scoping)",
    r.status_code == 200 and len(r.json()) == 1 and r.json()[0]["patient_uhid"] == uhid,
)


# ── Nurse records vitals ───────────────────────────────────────────────
print("\n=== Nurse: records vitals ===")
vitals_payload = {
    "patientUhid": uhid, "patientName": appt_payload["patient_name"],
    "bloodPressure": "120/80", "temperature": "98.6", "pulse": 72,
    "respiratoryRate": 16, "spo2": 98, "weight": 70, "height": 172,
    "recordedBy": "Nurse Kavya", "recordedDate": "2026-08-10",
}
r = client.post("/api/v1/clinical/vitals", json=vitals_payload, headers=auth_headers(nurse_token))
check("Nurse can record vitals for the real patient", r.status_code == 201, )
if r.status_code != 201:
    print("    ->", r.status_code, r.text[:300])


# ── Lab admin/tech populates the test catalog first (a real prerequisite:
# department scoping resolves against LabTestMaster.department, so a fresh
# install needs this catalog populated before scoping can do anything) ──
print("\n=== Lab: populate test-master catalog (prerequisite for dept scoping) ===")
r = client.post("/api/v1/lab/test-master", json={
    "testCode": "CBC01", "testName": "CBC", "department": "Hematology",
    "category": "Blood Test", "subCategory": "Complete Blood Count",
    "sampleType": "Blood", "containerType": "EDTA Tube", "method": "Automated",
    "machine": "Sysmex XN-1000", "normalRange": "13-17 g/dL", "criticalRange": "<7 or >20",
    "unit": "g/dL", "price": 300,
}, headers=auth_headers(lab_token))
check("Lab tech can add a test to the Lab Test Master catalog", r.status_code == 201)


# ── Doctor consults: orders a lab test + writes a prescription ────────
print("\n=== Doctor: orders lab test + writes prescription ===")
opd_order_payload = {
    "patientName": appt_payload["patient_name"], "patientUhid": uhid,
    "age": patient["age"], "gender": patient["gender"],
    "doctorName": doctor_record["name"], "department": "Cardiology",
    "tests": ["CBC"],
}
r = client.post("/api/v1/lab/opd-order", json=opd_order_payload, headers=auth_headers(doctor_token))
check("Doctor can order a lab test from OPD consultation", r.status_code == 201)
order = r.json()
check("Order creates a real PENDING SampleCollection (not a fake report)", order["status"] == "Pending")
collection_id = order["collectionId"]  # human-readable business id, e.g. SMP-2026-101
collection_pk = order["id"]  # real UUID primary key -- required by PATCH .../status (uses db.get())

rx_payload = {
    "patientUhid": uhid, "patientName": appt_payload["patient_name"],
    "patientAge": patient["age"], "patientGender": patient["gender"],
    "doctorName": doctor_record["name"], "department": "Cardiology",
    "visitDate": "2026-08-10", "status": "Pending", "paymentStatus": "Unpaid",
    "totalAmount": 150.0, "amountPaid": 0, "dueAmount": 150.0, "paymentMethod": "Cash",
    "items": [{"id": "rx-1", "medicineName": "Paracetamol 500mg", "dosage": "1-0-1",
               "duration": "5 Days", "quantity": 10, "unitPrice": 15.0, "price": 150.0,
               "dispensed": False}],
}
r = client.post("/api/v1/pharmacy/prescriptions", json=rx_payload, headers=auth_headers(doctor_token))
check("Doctor can write a real prescription", r.status_code == 201)
prescription = r.json()


# ── Lab: collects sample, processes it, enters result, generates report ─
print("\n=== Lab: collect -> process -> result -> report (Hematology tech) ===")
r = client.get("/api/v1/lab/sample-collections", headers=auth_headers(lab_token))
check("Hematology tech's worklist includes the doctor's CBC order (real pipeline, not a fake report)",
      r.status_code == 200 and any(s["collectionId"] == collection_id for s in r.json()))

r = client.patch(
    f"/api/v1/lab/sample-collections/{collection_pk}/status",
    json={"status": "Collected", "technician": "Rohit Lab Tech"},
    headers=auth_headers(lab_token),
)
check("Lab tech can mark the sample as physically collected", r.status_code == 200 and r.json()["status"] == "Collected")
if r.status_code != 200:
    print("    ->", r.status_code, r.text[:500])

processing_payload = {
    "sampleId": collection_id, "patientName": appt_payload["patient_name"],
    "patientUhid": uhid, "testName": "CBC", "assignedTechnician": "Rohit Lab Tech",
    "status": "In Progress",
}
r = client.post("/api/v1/lab/sample-processing", json=processing_payload, headers=auth_headers(lab_token))
check("Lab tech can create a sample-processing record", r.status_code == 201)

result_payload = {
    "patientName": appt_payload["patient_name"], "patientUhid": uhid,
    "testName": "CBC", "testCode": "CBC01", "sampleId": collection_id,
    "resultValue": "13.5 g/dL", "unit": "g/dL", "referenceRange": "13-17",
    "flag": "Normal", "technician": "Rohit Lab Tech", "entryDate": "2026-08-10",
}
r = client.post("/api/v1/lab/results", json=result_payload, headers=auth_headers(lab_token))
check("Lab tech can enter a CBC result", r.status_code == 201)

# A tech from a *different* department must not see this Hematology-only work
r = create_user({
    "fullName": "Bio Lab Tech", "email": "labbio@hms.com", "role": "lab",
    "userId": "labbio", "department": "Biochemistry", "password": "Lab@123",
})
bio_lab_token = login("labbio@hms.com", "Lab@123")
r = client.get("/api/v1/lab/sample-processing", headers=auth_headers(bio_lab_token))
check("Biochemistry tech does NOT see the Hematology CBC processing record (department scoping holds end-to-end over HTTP)",
      r.status_code == 200 and not any(p["testName"] == "CBC" for p in r.json()))


# ── Doctor reviews the report ──────────────────────────────────────────
print("\n=== Doctor: reviews lab report ===")
r = client.get("/api/v1/lab/reports", headers=auth_headers(doctor_token))
check("Doctor's own lab-order data is reachable via /lab/reports endpoint", r.status_code == 200)


# ── Pharmacy: dispenses the prescription, stock actually deducts ──────
print("\n=== Pharmacy: dispense prescription, verify real stock deduction ===")
r = client.post("/api/v1/pharmacy/medicines", json={
    "code": "MED-PARA-500", "name": "Paracetamol 500mg", "genericName": "Paracetamol",
    "category": "Analgesic", "dosageForm": "Tablet", "unit": "Strip",
    "purchasePrice": 10, "sellingPrice": 15, "currentStock": 100, "minStock": 20,
}, headers=auth_headers(pharmacist_token))
check("Pharmacist can add a medicine to the catalog", r.status_code == 201)
medicine = r.json()

r = client.post("/api/v1/pharmacy/batches", json={
    "batchNumber": "BATCH-001", "medicineId": medicine["id"], "medicineName": "Paracetamol 500mg",
    "supplierName": "MedSupply Co", "manufacturingDate": "2026-01-01", "expiryDate": "2027-01-01",
    "purchasePrice": 10, "sellingPrice": 15, "quantityReceived": 100, "availableQuantity": 100,
}, headers=auth_headers(pharmacist_token))
check("Pharmacist can receive a real batch of stock", r.status_code == 201)

r = client.get("/api/v1/pharmacy/batches", headers=auth_headers(pharmacist_token))
before_qty = next(b["availableQuantity"] for b in r.json() if b["batchNumber"] == "BATCH-001")
check("Batch starts with 100 units available", before_qty == 100)

rx_id = prescription["id"]
dispense_payload = {"items": [{**rx_payload["items"][0], "dispensed": True}]}
r = client.put(f"/api/v1/pharmacy/prescriptions/{rx_id}", json=dispense_payload, headers=auth_headers(pharmacist_token))
check("Pharmacist can mark the doctor's prescription as dispensed", r.status_code == 200)

r = client.get("/api/v1/pharmacy/batches", headers=auth_headers(pharmacist_token))
after_qty = next(b["availableQuantity"] for b in r.json() if b["batchNumber"] == "BATCH-001")
check(f"Dispensing 10 units actually deducted real stock (100 -> {after_qty})", after_qty == before_qty - 10)


# ── Backend "no mock data on empty" sanity check ───────────────────────
print("\n=== Backend data integrity: no phantom/mock rows leak into real endpoints ===")
r = client.get("/api/v1/pharmacy/prescriptions", headers=auth_headers(pharmacist_token))
rx_list = r.json()
check("Prescription list contains only the ONE real prescription created above (no auto-seeded demo rows)",
      len(rx_list) == 1 and rx_list[0]["id"] == rx_id)


print("\n" + "=" * 70)
print(f"Results: {passed} passed, {failed} failed")
print("ALL CHECKS PASSED" if failed == 0 else "SOME CHECKS FAILED")
sys.exit(0 if failed == 0 else 1)
