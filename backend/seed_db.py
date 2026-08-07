import os
import sys
import psycopg2

# Add backend root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Auto-create the database if it does not exist
try:
    from app.core.config import settings
    db_url = settings.DATABASE_URL
    if "postgresql" in db_url:
        cleaned = db_url.split("://")[1]
        auth, rest = cleaned.split("@")
        user, password = auth.split(":")
        host_port, dbname = rest.split("/")
        host = host_port.split(":")[0]
        port = host_port.split(":")[1] if ":" in host_port else "5432"
        
        conn = psycopg2.connect(dbname="postgres", user=user, password=password, host=host, port=port)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(f"SELECT 1 FROM pg_database WHERE datname='{dbname}'")
        if not cur.fetchone():
            cur.execute(f'CREATE DATABASE "{dbname}"')
            print(f"Database '{dbname}' created successfully.")
        cur.close()
        conn.close()
except Exception as e:
    print(f"Database creation check notice (might already exist or run on diff credentials): {e}")

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
import app.models

from app.models.user import User, UserRole
from app.models.doctor import Doctor, Department
from app.models.patient import Patient, PatientStatus, Gender, BloodGroup, MaritalStatus
from app.models.lab import LabTestMaster
from app.models.pharmacy import MedicineCategory, Medicine, PharmacyBatch
from app.models.store_item import ItemMaster, Vendor
from app.models.batch import BatchItem, StoreActivity
from app.models.ipd import Bed
from app.models.clinical import PatientVital, NursingNote
from app.models.staff import Consultation
from app.models.superadmin import LeaveRequest


def seed_database():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Seed Users
        print("Seeding Users...")
        default_users = [
            {"name": "Sarah Jenkins", "email": "reception@hms.com", "role": UserRole.reception, "username": "reception", "department": "Front Desk", "assigned_ward": None},
            {"name": "Dr. Vikram Malhotra", "email": "doctor@hms.com", "role": UserRole.doctor, "username": "doctor", "department": "Cardiology", "assigned_ward": None},
            # Phase 13: assigned_ward scopes nurse to ICU ward — matches Bed.ward /
            # NursingNote.ward / MedicationLog.ward / WardTransfer.current_ward values.
            # Set to None for an unscoped nurse (sees all wards).
            {"name": "Nurse Anjali Rao", "email": "nurse@hms.com", "role": UserRole.nurse, "username": "nurse", "department": "ICU", "assigned_ward": "ICU"},
            # Phase 14: department for lab role must match LabTestMaster.department to scope
            # the lab tech's view to their section. Set to None for an unscoped tech.
            {"name": "Robert Vance", "email": "lab@hms.com", "role": UserRole.lab, "username": "lab", "department": "Hematology", "assigned_ward": None},
            {"name": "Elena Rostova", "email": "pharmacy@hms.com", "role": UserRole.pharmacy, "username": "pharmacy", "department": "Pharmacy", "assigned_ward": None},
            {"name": "Store Manager", "email": "store@hms.com", "role": UserRole.admin, "username": "store", "department": "Store & Inventory", "assigned_ward": None},
            {"name": "Administrator", "email": "admin@hms.com", "role": UserRole.admin, "username": "admin", "department": "Administration", "assigned_ward": None},
            {"name": "Priya Patel", "email": "patient@hms.com", "role": UserRole.patient, "username": "patient", "department": "Outpatient", "assigned_ward": None},
        ]

        for u in default_users:
            existing = db.query(User).filter(User.email == u["email"]).first()
            user_pwd = "admin123" if u["email"] == "admin@hms.com" else "123456"
            if not existing:
                new_user = User(
                    name=u["name"],
                    email=u["email"],
                    username=u["username"],
                    role=UserRole.admin if u["email"] == "admin@hms.com" else u["role"],
                    department=u["department"],
                    assigned_ward=u.get("assigned_ward"),
                    hashed_password=hash_password(user_pwd),
                    status="Active",
                )
                db.add(new_user)
            else:
                if u["email"] == "admin@hms.com":
                    existing.hashed_password = hash_password("admin123")
                    existing.role = UserRole.admin
        db.commit()


        # 2. Seed Departments
        print("Seeding Departments...")
        departments = [
            {"name": "Cardiology", "code": "CARD", "icon_name": "Heart", "doctor_count": 2, "description": "Heart care and surgeries"},
            {"name": "Pediatrics", "code": "PEDS", "icon_name": "Baby", "doctor_count": 1, "description": "Child healthcare"},
            {"name": "General Medicine", "code": "GEN", "icon_name": "Stethoscope", "doctor_count": 3, "description": "Routine checkups"},
            {"name": "Dermatology", "code": "DERM", "icon_name": "Sparkles", "doctor_count": 1, "description": "Skin and hair care"},
            {"name": "ENT", "code": "ENT", "icon_name": "Ear", "doctor_count": 1, "description": "Ear, Nose, Throat care"},
        ]

        for dept in departments:
            existing = db.query(Department).filter(Department.code == dept["code"]).first()
            if not existing:
                new_dept = Department(
                    name=dept["name"],
                    code=dept["code"],
                    icon_name=dept["icon_name"],
                    doctor_count=dept["doctor_count"],
                    description=dept["description"]
                )
                db.add(new_dept)
        db.commit()

        # 3. Seed Doctors
        print("Seeding Doctors...")
        doctors = [
            {
                "id": "doc-1", "name": "Dr. Vikram Malhotra", "department": "Cardiology",
                "specialization": "Interventional Cardiologist", "room_no": "OPD-101",
                "consultation_fee": 800.0, "email": "doctor@hms.com",
                "available_days": ["Monday", "Wednesday", "Friday"],
                "slots": ["09:00 AM", "10:00 AM", "11:00 AM", "02:00 PM"]
            },
            {
                "id": "doc-5", "name": "Dr. Rajesh Iyer", "department": "General Medicine",
                "specialization": "Senior Internal Medicine Physician", "room_no": "OPD-105",
                "consultation_fee": 500.0, "email": "rajesh.gen@hms.com",
                "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                "slots": ["09:00 AM", "10:00 AM", "11:00 AM"]
            },
            {
                "id": "doc-6", "name": "Dr. Ananya Roy", "department": "Dermatology",
                "specialization": "Skin Specialist", "room_no": "OPD-106",
                "consultation_fee": 700.0, "email": "ananya.derm@hms.com",
                "available_days": ["Monday", "Tuesday", "Thursday", "Friday"],
                "slots": ["10:00 AM", "11:30 AM", "02:00 PM"]
            }
        ]

        for doc in doctors:
            existing = db.query(Doctor).filter(Doctor.id == doc["id"]).first()
            if not existing:
                new_doc = Doctor(
                    id=doc["id"],
                    name=doc["name"],
                    department=doc["department"],
                    specialization=doc["specialization"],
                    room_no=doc["room_no"],
                    consultation_fee=doc["consultation_fee"],
                    email=doc["email"],
                    available_days=doc["available_days"],
                    slots=doc["slots"],
                    status="Available"
                )
                db.add(new_doc)
        db.commit()

        # 4. Seed Patients
        print("Seeding Patients...")
        patients = [
            {
                "id": "p1", "uhid": "UHID-2026-1001", "first_name": "Rajesh", "last_name": "Sharma",
                "gender": Gender.Male, "dob": "1985-06-15", "age": 41, "blood_group": BloodGroup.B_pos,
                "marital_status": MaritalStatus.Married, "nationality": "Indian", "mobile": "+91 98765 43210",
                "email": "rajesh.sharma@example.com", "address": "42 MG Road, Indiranagar", "city": "Bengaluru",
                "state": "Karnataka", "country": "India", "pincode": "560038", "aadhaar": "4532 8901 2345",
                "emergency_contact_name": "Sunita Sharma", "emergency_relationship": "Spouse", "emergency_phone": "+91 98765 43212",
                "status": PatientStatus.Admitted, "registration_date": "2026-01-10"
            },
            {
                "id": "p2", "uhid": "UHID-2026-1002", "first_name": "Priya", "last_name": "Patel",
                "gender": Gender.Female, "dob": "1992-09-22", "age": 33, "blood_group": BloodGroup.O_pos,
                "marital_status": MaritalStatus.Single, "nationality": "Indian", "mobile": "+91 98123 45678",
                "email": "priya.patel@example.com", "address": "108 Park Avenue, Bandra West", "city": "Mumbai",
                "state": "Maharashtra", "country": "India", "pincode": "400050", "aadhaar": "8910 2345 6789",
                "emergency_contact_name": "Ramesh Patel", "emergency_relationship": "Father", "emergency_phone": "+91 98123 45679",
                "status": PatientStatus.Active, "registration_date": "2026-02-14"
            }
        ]

        for pat in patients:
            existing = db.query(Patient).filter(Patient.id == pat["id"]).first()
            if not existing:
                new_pat = Patient(
                    id=pat["id"],
                    uhid=pat["uhid"],
                    first_name=pat["first_name"],
                    last_name=pat["last_name"],
                    gender=pat["gender"],
                    dob=pat["dob"],
                    age=pat["age"],
                    blood_group=pat["blood_group"],
                    marital_status=pat["marital_status"],
                    nationality=pat["nationality"],
                    mobile=pat["mobile"],
                    email=pat["email"],
                    address=pat["address"],
                    city=pat["city"],
                    state=pat["state"],
                    country=pat["country"],
                    pincode=pat["pincode"],
                    aadhaar=pat["aadhaar"],
                    emergency_contact_name=pat["emergency_contact_name"],
                    emergency_relationship=pat["emergency_relationship"],
                    emergency_phone=pat["emergency_phone"],
                    status=pat["status"],
                    registration_date=pat["registration_date"]
                )
                db.add(new_pat)
        db.commit()

        # 5. Seed Lab Tests
        print("Seeding Lab Tests...")
        lab_tests = [
            {
                "id": "tm-101", "test_code": "CBC-001", "test_name": "Complete Blood Count (CBC)",
                "department": "Pathology", "category": "Hematology", "sub_category": "Routine Blood",
                "sample_type": "Whole Blood", "container_type": "EDTA Vial (Lavender Top)", "method": "Automated Cell Counter",
                "machine": "Sysmex XN-1000", "normal_range": "WBC: 4,000-11,000 /µL, Hb: 13.5-17.5 g/dL",
                "critical_range": "Hb < 7.0 g/dL or WBC > 30,000 /µL", "unit": "Multiple", "tat_hours": 2,
                "price": 450.0, "status": "Active"
            },
            {
                "id": "tm-102", "test_code": "LIP-002", "test_name": "Lipid Profile Complete",
                "department": "Biochemistry", "category": "Biochemistry", "sub_category": "Cardiovascular Risk",
                "sample_type": "Serum", "container_type": "SST Gel Separator (Yellow Top)", "method": "Spectrophotometry",
                "machine": "Roche Cobas c501", "normal_range": "Cholesterol: <200 mg/dL, Triglycerides: <150 mg/dL",
                "critical_range": "Triglycerides > 500 mg/dL", "unit": "mg/dL", "tat_hours": 4,
                "price": 750.0, "status": "Active"
            }
        ]

        for lt in lab_tests:
            existing = db.query(LabTestMaster).filter(LabTestMaster.id == lt["id"]).first()
            if not existing:
                new_lt = LabTestMaster(
                    id=lt["id"],
                    test_code=lt["test_code"],
                    test_name=lt["test_name"],
                    department=lt["department"],
                    category=lt["category"],
                    sub_category=lt["sub_category"],
                    sample_type=lt["sample_type"],
                    container_type=lt["container_type"],
                    method=lt["method"],
                    machine=lt["machine"],
                    normal_range=lt["normal_range"],
                    critical_range=lt["critical_range"],
                    unit=lt["unit"],
                    tat_hours=lt["tat_hours"],
                    price=lt["price"],
                    status=lt["status"]
                )
                db.add(new_lt)
        db.commit()

        # 6. Seed Pharmacy Categories
        print("Seeding Pharmacy Categories...")
        categories = [
            {"id": "cat-1", "name": "Tablets", "code": "TAB", "description": "Solid dosage oral tablets", "medicine_count": 42},
            {"id": "cat-2", "name": "Capsules", "code": "CAP", "description": "Hard and soft gelatin encapsulated formulations", "medicine_count": 28},
            {"id": "cat-3", "name": "Syrups", "code": "SYR", "description": "Liquid oral suspensions", "medicine_count": 19},
        ]

        for cat in categories:
            existing = db.query(MedicineCategory).filter(MedicineCategory.id == cat["id"]).first()
            if not existing:
                new_cat = MedicineCategory(
                    id=cat["id"],
                    name=cat["name"],
                    code=cat["code"],
                    description=cat["description"],
                    medicine_count=cat["medicine_count"]
                )
                db.add(new_cat)
        db.commit()

        # 7. Seed Pharmacy Medicines & Batches
        print("Seeding Pharmacy Medicines & Batches...")
        medicines = [
            {
                "id": "med-101", "code": "MED-1001", "name": "Paracetamol 650mg", "generic_name": "Acetaminophen",
                "brand": "Dolo 650", "category": "Tablets", "manufacturer": "Micro Labs Ltd", "dosage_form": "Tablet",
                "strength": "650 mg", "unit": "Strip of 15", "purchase_price": 22.5, "selling_price": 34.0, "gst": 12.0,
                "storage_condition": "Store below 25°C", "rack_location": "Rack A-02", "status": "Active",
                "current_stock": 480, "min_stock": 100, "max_stock": 1000, "reorder_level": 150
            },
            {
                "id": "med-102", "code": "MED-1002", "name": "Amoxicillin & Clavulanate 625mg", "generic_name": "Amoxicillin + Clavulanic Acid",
                "brand": "Augmentin 625 Duo", "category": "Tablets", "manufacturer": "GSK Pharmaceuticals", "dosage_form": "Tablet",
                "strength": "625 mg", "unit": "Strip of 10", "purchase_price": 135.0, "selling_price": 201.5, "gst": 12.0,
                "storage_condition": "Store in dry place below 25°C", "rack_location": "Rack A-05", "status": "Active",
                "current_stock": 85, "min_stock": 50, "max_stock": 500, "reorder_level": 60
            }
        ]

        for med in medicines:
            existing = db.query(Medicine).filter(Medicine.id == med["id"]).first()
            if not existing:
                new_med = Medicine(
                    id=med["id"],
                    code=med["code"],
                    name=med["name"],
                    generic_name=med["generic_name"],
                    brand=med["brand"],
                    category=med["category"],
                    manufacturer=med["manufacturer"],
                    dosage_form=med["dosage_form"],
                    strength=med["strength"],
                    unit=med["unit"],
                    purchase_price=med["purchase_price"],
                    selling_price=med["selling_price"],
                    gst=med["gst"],
                    storage_condition=med["storage_condition"],
                    rack_location=med["rack_location"],
                    status=med["status"],
                    current_stock=med["current_stock"],
                    min_stock=med["min_stock"],
                    max_stock=med["max_stock"],
                    reorder_level=med["reorder_level"]
                )
                db.add(new_med)
        db.commit()

        batches = [
            {
                "id": "bat-101", "batch_number": "BAT-2025-412", "medicine_id": "med-101", "medicine_name": "Paracetamol 650mg",
                "supplier_name": "Metro Pharma Distributors", "manufacturing_date": "2024-09-10", "expiry_date": "2026-08-15",
                "purchase_price": 22.5, "selling_price": 34.0, "quantity_received": 1000, "available_quantity": 480,
                "batch_status": "Available"
            }
        ]

        for bat in batches:
            existing = db.query(PharmacyBatch).filter(PharmacyBatch.id == bat["id"]).first()
            if not existing:
                new_bat = PharmacyBatch(
                    id=bat["id"],
                    batch_number=bat["batch_number"],
                    medicine_id=bat["medicine_id"],
                    medicine_name=bat["medicine_name"],
                    supplier_name=bat["supplier_name"],
                    manufacturing_date=bat["manufacturing_date"],
                    expiry_date=bat["expiry_date"],
                    purchase_price=bat["purchase_price"],
                    selling_price=bat["selling_price"],
                    quantity_received=bat["quantity_received"],
                    available_quantity=bat["available_quantity"],
                    batch_status=bat["batch_status"]
                )
                db.add(new_bat)
        db.commit()

        # 8. Seed Item Master & Vendors
        print("Seeding Item Master & Vendors...")
        vendors = [
            {
                "id": "v-1", "vendor_code": "VND-001", "vendor_name": "Global Medical Supplies Pvt Ltd",
                "contact_person": "Vikram Sethi", "email": "contact@globalmed.com", "mobile": "+91 98220 11223",
                "address": "Indiranagar, Bengaluru", "category": "Medical Consumables", "rating": 5,
                "gst_number": "29ABCDE1234F1Z5", "status": "Active"
            }
        ]
        for v in vendors:
            existing = db.query(Vendor).filter(Vendor.id == v["id"]).first()
            if not existing:
                new_v = Vendor(
                    id=v["id"], vendor_code=v["vendor_code"], vendor_name=v["vendor_name"],
                    contact_person=v["contact_person"], email=v["email"], mobile=v["mobile"],
                    address=v["address"], category=v["category"], rating=v["rating"],
                    gst_number=v["gst_number"], status=v["status"]
                )
                db.add(new_v)
        db.commit()

        items = [
            {
                "id": "item-1", "item_code": "ITM-001", "item_name": "Surgical Gloves (Size 7.5)", "category": "Consumables",
                "sub_category": "PPE", "unit": "Box", "current_stock": 250, "min_stock": 50, "max_stock": 1000,
                "reorder_level": 75, "pack_quantity": 100, "issue_unit": "Pairs", "unit_price": 450.0, "status": "Active"
            }
        ]
        for item in items:
            existing = db.query(ItemMaster).filter(ItemMaster.id == item["id"]).first()
            if not existing:
                new_item = ItemMaster(
                    id=item["id"], item_code=item["item_code"], item_name=item["item_name"], category=item["category"],
                    sub_category=item["sub_category"], unit=item["unit"], current_stock=item["current_stock"],
                    min_stock=item["min_stock"], max_stock=item["max_stock"], reorder_level=item["reorder_level"],
                    pack_quantity=item["pack_quantity"], issue_unit=item["issue_unit"], unit_price=item["unit_price"],
                    status=item["status"]
                )
                db.add(new_item)
        db.commit()

        # 9. Seed Beds
        print("Seeding IPD Beds...")
        beds = [
            {"id": "bed-101", "bed_number": "ICU-BED-01", "room_number": "ICU-101", "ward": "ICU", "category": "ICU", "status": "Occupied", "current_patient_name": "Rajesh Sharma", "current_patient_id": "p1", "daily_rate": 4500.0},
            {"id": "bed-102", "bed_number": "GEN-BED-02", "room_number": "GEN-201", "ward": "General_Ward", "category": "Standard Bed", "status": "Available", "daily_rate": 1500.0},
        ]
        for b in beds:
            existing = db.query(Bed).filter(Bed.id == b["id"]).first()
            if not existing:
                new_b = Bed(
                    id=b["id"], bed_number=b["bed_number"], room_number=b["room_number"], ward=b["ward"],
                    category=b["category"], status=b["status"], current_patient_name=b.get("current_patient_name"),
                    current_patient_id=b.get("current_patient_id"), daily_rate=b["daily_rate"]
                )
                db.add(new_b)
        db.commit()

        # 10. Seed Leave Requests
        print("Seeding Leave Requests...")
        leaves = [
            {
                "id": "leave-101",
                "employee_id": "EMP-DOC-004",
                "employee_name": "Dr. Vikram Malhotra",
                "role": "Doctor",
                "department": "Cardiology",
                "leave_type": "Casual Leave",
                "start_date": "2026-08-10",
                "end_date": "2026-08-12",
                "total_days": 3,
                "reason": "Attending Interventional Cardiology Conference",
                "approval_status": "Approved",
                "applied_date": "2026-08-01",
            },
            {
                "id": "leave-102",
                "employee_id": "EMP-NUR-002",
                "employee_name": "Nurse Anjali Rao",
                "role": "Nurse",
                "department": "ICU",
                "leave_type": "Sick Leave",
                "start_date": "2026-08-15",
                "end_date": "2026-08-16",
                "total_days": 2,
                "reason": "Fever & Viral Infection Recovery",
                "approval_status": "Pending",
                "applied_date": "2026-08-05",
            },
            {
                "id": "leave-103",
                "employee_id": "EMP-LAB-005",
                "employee_name": "Robert Vance",
                "role": "Lab Technician",
                "department": "Hematology",
                "leave_type": "Paid Leave",
                "start_date": "2026-08-20",
                "end_date": "2026-08-22",
                "total_days": 3,
                "reason": "Family emergency & travel",
                "approval_status": "Approved",
                "applied_date": "2026-08-02",
            },
            {
                "id": "leave-104",
                "employee_id": "EMP-PHARM-001",
                "employee_name": "Elena Rostova",
                "role": "Pharmacist",
                "department": "Pharmacy",
                "leave_type": "Casual Leave",
                "start_date": "2026-08-18",
                "end_date": "2026-08-19",
                "total_days": 2,
                "reason": "Personal errand",
                "approval_status": "Pending",
                "applied_date": "2026-08-04",
            },
            {
                "id": "leave-105",
                "employee_id": "EMP-STR-001",
                "employee_name": "Store Manager",
                "role": "Store Manager",
                "department": "Store & Inventory",
                "leave_type": "Duty Leave",
                "start_date": "2026-08-25",
                "end_date": "2026-08-27",
                "total_days": 3,
                "reason": "Annual Inventory Audit at Central Warehouse",
                "approval_status": "Approved",
                "applied_date": "2026-08-03",
            },
        ]
        for l in leaves:
            existing = db.query(LeaveRequest).filter(LeaveRequest.id == l["id"]).first()
            if not existing:
                new_l = LeaveRequest(
                    id=l["id"],
                    employee_id=l["employee_id"],
                    employee_name=l["employee_name"],
                    role=l["role"],
                    department=l["department"],
                    leave_type=l["leave_type"],
                    start_date=l["start_date"],
                    end_date=l["end_date"],
                    total_days=l["total_days"],
                    reason=l["reason"],
                    approval_status=l["approval_status"],
                    applied_date=l["applied_date"],
                )
                db.add(new_l)
        db.commit()

        print("Database seeded successfully with HMS mock data!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
