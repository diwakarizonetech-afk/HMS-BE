# ===========================================================================
# Master Database Seeder for HMS Application
# 
# Seeds system infrastructure:
#   1. Master Hospital Profile
#   2. Branches (Cantonment, Srirangam, Thillainagar)
#   3. Clinical & Operational Departments
#   4. Pharmacy Categories & Medicine Catalog / Initial Store Stock
#   5. Staff & Administrative Users (Admin, Doctor, Nurse, Reception, Store, Pharmacy, Lab, Billing)
#   6. Doctors & Weekly Availability Schedules
#   7. Working Hours & Staff Shift Rotations
#   8. IPD Ward Beds & Category Rates
#
# NOTE: PATIENT DATA IS INTENTIONALLY NEVER SEEDED.
# All patients, appointments, visits, and clinical encounters must be created
# organically through the Reception OPD desk or Patient online booking.
# ===========================================================================
import os
import sys
from datetime import datetime, timezone
from sqlalchemy import select

# Add backend root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Local-only database creation helper.
# Render/managed Postgres already provisions the database and often requires SSL/query params;
# trying to connect to the maintenance "postgres" DB during deploy can fail the seed command.
if os.getenv("HMS_CREATE_DATABASE", "").lower() in {"1", "true", "yes"}:
    try:
        import psycopg2
        from sqlalchemy.engine.url import make_url
        from app.core.config import settings

        url = make_url(settings.DATABASE_URL)
        if url.drivername.startswith("postgresql"):
            dbname = (url.database or "").strip()
            if dbname:
                conn = psycopg2.connect(
                    dbname="postgres",
                    user=url.username,
                    password=url.password,
                    host=url.host,
                    port=url.port or 5432,
                )
                conn.autocommit = True
                cur = conn.cursor()
                cur.execute("SELECT 1 FROM pg_database WHERE datname=%s", (dbname,))
                if not cur.fetchone():
                    cur.execute(f'CREATE DATABASE "{dbname}"')
                    print(f"Database '{dbname}' created successfully.")
                cur.close()
                conn.close()
    except Exception as e:
        print(f"Database creation check notice: {e}")

from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
import app.models  # noqa: F401 - ensures all models are registered
from app.models.superadmin import HospitalProfile, Branch, WorkingHours, ShiftRotation, ConsultationCharge
from app.models.doctor import Department, Doctor, DoctorStatus
from app.models.pharmacy import MedicineCategory, Medicine, PharmacyBatch
from app.models.store_item import ItemMaster, ItemCategory, ItemUnit, ItemStatus
from app.models.user import User, UserRole
from app.models.ipd import Bed, BedStatus
from app.seed.super_admin import seed_super_admin


# ===========================================================================
# 1. Hospital Master Profile
# ===========================================================================
def seed_hospital_profile(db) -> None:
    profile_data = {
        "hospital_name": "Cauvery Care Multi Speciality Hospital",
        "hospital_code": "CCMH-TRY-001",
        "established_year": "2016",
        "establishment_year": "2016",
        "registration_number": "TNHSP/TRY/2016/01875",
        "license_number": "TN-DMS-2026-45781",
        "accreditation": "NABH Accredited, ISO 9001:2015",
        "email": "info@cauverycarehospital.in",
        "phone": "+91 431 402 4567",
        "website": "https://www.cauverycarehospital.in",
        "address": "No. 45, Bharathidasan Salai, Tennur",
        "city": "Tiruchirappalli",
        "state": "Tamil Nadu",
        "country": "India",
        "pincode": "620017",
        "timezone": "Asia/Kolkata",
        "currency": "INR",
        "total_bed_capacity": 490,
    }

    existing = db.scalar(select(HospitalProfile).limit(1))
    if existing:
        for key, val in profile_data.items():
            setattr(existing, key, val)
        print(f"Updated Hospital Master Profile: {existing.hospital_name} ({existing.hospital_code})")
    else:
        profile = HospitalProfile(**profile_data)
        db.add(profile)
        print(f"Seeded Hospital Master Profile: {profile_data['hospital_name']} ({profile_data['hospital_code']})")


# ===========================================================================
# 2. Branches (Exactly 3 Branches: Cantonment, Srirangam, Thillainagar)
# ===========================================================================
BRANCH_CANTONMENT = "Cantonment Branch"
BRANCH_SRIRANGAM = "Srirangam Branch"
BRANCH_THILLAINAGAR = "Thillainagar Branch"

def seed_branches(db) -> None:
    branches_data = [
        {
            "branch_name": BRANCH_CANTONMENT,
            "branch_code": "CCMH-CAN",
            "address": "No. 12, Collector Office Road, Cantonment",
            "city": "Tiruchirappalli",
            "state": "Tamil Nadu",
            "country": "India",
            "pincode": "620001",
            "phone": "+91 431 402 4567",
            "email": "cantonment@cauverycarehospital.in",
            "status": "Active",
            "is_main_branch": True,
            "total_staff": 165,
            "bed_capacity": 220,
        },
        {
            "branch_name": BRANCH_SRIRANGAM,
            "branch_code": "CCMH-SRG",
            "address": "No. 88, Gandhi Road, Srirangam",
            "city": "Tiruchirappalli",
            "state": "Tamil Nadu",
            "country": "India",
            "pincode": "620006",
            "phone": "+91 431 402 4568",
            "email": "srirangam@cauverycarehospital.in",
            "status": "Active",
            "is_main_branch": False,
            "total_staff": 110,
            "bed_capacity": 150,
        },
        {
            "branch_name": BRANCH_THILLAINAGAR,
            "branch_code": "CCMH-TN",
            "address": "No. 15, 10th Cross, Thillai Nagar",
            "city": "Tiruchirappalli",
            "state": "Tamil Nadu",
            "country": "India",
            "pincode": "620018",
            "phone": "+91 431 402 4569",
            "email": "thillainagar@cauverycarehospital.in",
            "status": "Active",
            "is_main_branch": False,
            "total_staff": 95,
            "bed_capacity": 120,
        },
    ]

    for bdata in branches_data:
        existing = db.scalar(
            select(Branch).where(
                (Branch.branch_code == bdata["branch_code"]) |
                (Branch.branch_name == bdata["branch_name"])
            )
        )
        if existing:
            for key, val in bdata.items():
                setattr(existing, key, val)
            print(f"Updated Branch: {existing.branch_name} ({existing.branch_code})")
        else:
            branch = Branch(**bdata)
            db.add(branch)
            print(f"Seeded Branch: {bdata['branch_name']} ({bdata['branch_code']})")


# ===========================================================================
# 3. Clinical & Operational Departments
# ===========================================================================
def seed_departments(db) -> None:
    departments_data = [
        {
            "code": "CARD",
            "name": "Cardiology",
            "head_of_department": "Dr. Mani",
            "floor_location": "2nd Floor",
            "doctor_count": 12,
            "bed_count": 40,
            "icon_name": "Heart",
            "description": "Comprehensive cardiac care, interventional cardiology, and heart surgeries.",
            "status": "Active",
        },
        {
            "code": "MED",
            "name": "General Medicine",
            "head_of_department": "Dr. Martin",
            "floor_location": "Ground Floor",
            "doctor_count": 18,
            "bed_count": 50,
            "icon_name": "Stethoscope",
            "description": "Primary healthcare, diagnosis, and non-surgical treatment of internal diseases.",
            "status": "Active",
        },
        {
            "code": "PEDS",
            "name": "Pediatrics",
            "head_of_department": "Dr. A. Priyanka",
            "floor_location": "3rd Floor",
            "doctor_count": 10,
            "bed_count": 30,
            "icon_name": "Baby",
            "description": "Specialized medical care for infants, children, and adolescents.",
            "status": "Active",
        },
        {
            "code": "ORTH",
            "name": "Orthopedics",
            "head_of_department": "Dr. K. Senthil Kumar",
            "floor_location": "2nd Floor",
            "doctor_count": 9,
            "bed_count": 35,
            "icon_name": "Activity",
            "description": "Treatment of musculoskeletal conditions, joint replacements, and trauma care.",
            "status": "Active",
        },
        {
            "code": "DERM",
            "name": "Dermatology",
            "head_of_department": "Dr. M. Nivetha",
            "floor_location": "OPD Block - 1st Floor",
            "doctor_count": 5,
            "bed_count": 12,
            "icon_name": "Sparkles",
            "description": "Skin, hair, and nail healthcare, cosmetic dermatology, and dermatopathology.",
            "status": "Active",
        },
        {
            "code": "ENT",
            "name": "ENT",
            "head_of_department": "Dr. V. Prakash",
            "floor_location": "OPD Block - 1st Floor",
            "doctor_count": 6,
            "bed_count": 15,
            "icon_name": "Ear",
            "description": "Ear, Nose, and Throat diagnostic, medical, and surgical care.",
            "status": "Active",
        },
        {
            "code": "NEUR",
            "name": "Neurology",
            "head_of_department": "Dr. P. Aravind",
            "floor_location": "4th Floor",
            "doctor_count": 8,
            "bed_count": 25,
            "icon_name": "Brain",
            "description": "Advanced care for brain, spinal cord, and neuromuscular disorders.",
            "status": "Active",
        },
        {
            "code": "SURG",
            "name": "General Surgery",
            "head_of_department": "Dr. S. Karthikeyan",
            "floor_location": "3rd Floor",
            "doctor_count": 8,
            "bed_count": 20,
            "icon_name": "Scissors",
            "description": "Surgical procedures for abdominal organs, soft tissue, and trauma care.",
            "status": "Active",
        },
        {
            "code": "GYN",
            "name": "Obstetrics & Gynecology",
            "head_of_department": "Dr. R. Kavitha",
            "floor_location": "3rd Floor",
            "doctor_count": 7,
            "bed_count": 15,
            "icon_name": "Users",
            "description": "Comprehensive female reproductive health, maternity, and obstetrical care.",
            "status": "Active",
        },
        {
            "code": "RAD",
            "name": "Radiology",
            "head_of_department": "Dr. N. Dinesh",
            "floor_location": "Ground Floor",
            "doctor_count": 5,
            "bed_count": 8,
            "icon_name": "Scan",
            "description": "Diagnostic imaging including X-ray, CT, MRI, Ultrasound, and Mammography.",
            "status": "Active",
        },
        {
            "code": "EMG",
            "name": "Emergency & Trauma",
            "head_of_department": "Dr. Emergency In-Charge",
            "floor_location": "Ground Floor - ER Block",
            "doctor_count": 8,
            "bed_count": 20,
            "icon_name": "AlertCircle",
            "description": "24x7 Emergency Room, Trauma and Acute Care Service.",
            "status": "Active",
        },
    ]

    for ddata in departments_data:
        existing = db.scalar(select(Department).where(Department.code == ddata["code"]))
        if existing:
            for key, val in ddata.items():
                setattr(existing, key, val)
            print(f"Updated Department: {existing.name} ({existing.code})")
        else:
            dept = Department(**ddata)
            db.add(dept)
            print(f"Seeded Department: {ddata['name']} ({ddata['code']})")


# ===========================================================================
# 4. Pharmacy Categories
# ===========================================================================
def seed_pharmacy_categories(db) -> None:
    pharmacy_categories_data = [
        {"code": "ANL", "name": "Analgesics & Antipyretics", "description": "Pain and fever medicines"},
        {"code": "ANT", "name": "Antibiotics", "description": "Medicines for bacterial infections"},
        {"code": "AFG", "name": "Antifungals", "description": "Medicines for fungal infections"},
        {"code": "AVR", "name": "Antivirals", "description": "Medicines for viral infections"},
        {"code": "AHT", "name": "Antihistamines", "description": "Medicines for allergy symptoms"},
        {"code": "CVS", "name": "Cardiovascular", "description": "Heart and blood-vessel medicines"},
        {"code": "DIA", "name": "Antidiabetics", "description": "Blood-glucose control medicines"},
        {"code": "RES", "name": "Respiratory", "description": "Medicines for respiratory conditions"},
        {"code": "GIT", "name": "Gastrointestinal", "description": "Medicines for digestive conditions"},
        {"code": "CNS", "name": "Neurological / CNS", "description": "Medicines affecting the nervous system"},
        {"code": "VIT", "name": "Vitamins & Supplements", "description": "Vitamins, minerals and supplements"},
        {"code": "VAC", "name": "Vaccines", "description": "Immunization products"},
        {"code": "IV", "name": "IV Fluids", "description": "Intravenous fluids"},
        {"code": "TOP", "name": "Topical Medicines", "description": "Creams, ointments, gels etc."},
        {"code": "STE", "name": "Steroids", "description": "Corticosteroid medicines"},
        {"code": "EMG", "name": "Emergency Medicines", "description": "Emergency/critical-care medicines"},
    ]

    for cdata in pharmacy_categories_data:
        existing = db.scalar(
            select(MedicineCategory).where(
                (MedicineCategory.code == cdata["code"]) |
                (MedicineCategory.name == cdata["name"])
            )
        )
        if existing:
            existing.code = cdata["code"]
            existing.name = cdata["name"]
            existing.description = cdata["description"]
            print(f"Updated Pharmacy Category: {existing.name} ({existing.code})")
        else:
            cat = MedicineCategory(**cdata)
            db.add(cat)
            print(f"Seeded Pharmacy Category: {cdata['name']} ({cdata['code']})")


# ===========================================================================
# 5. Over 50 Tablets & Medicines (Allocated to All 3 Branch Pharmacies)
# ===========================================================================
def seed_all_tablets_and_branch_stock(db) -> None:
    """
    Seeds 56 distinct tablets/medicines into:
      1. ItemMaster (Central Store inventory)
      2. Medicine (Pharmacy Master Catalog)
      3. PharmacyBatch (Allocates stock to Cantonment, Srirangam, and Thillainagar)
    """
    tablets_catalog = [
        # --- Cardiovascular & Antihypertensives ---
        {"code": "MED-001", "name": "Aspirin 75mg", "generic": "Aspirin", "brand": "Ecosprin 75", "cat_p": "Cardiovascular", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "75mg", "unit": "Strip", "price": 6.0},
        {"code": "MED-002", "name": "Aspirin 150mg", "generic": "Aspirin", "brand": "Ecosprin 150", "cat_p": "Cardiovascular", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "150mg", "unit": "Strip", "price": 9.5},
        {"code": "MED-003", "name": "Clopidogrel 75mg", "generic": "Clopidogrel", "brand": "Plavix 75", "cat_p": "Cardiovascular", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "75mg", "unit": "Strip", "price": 14.0},
        {"code": "MED-004", "name": "Atorvastatin 10mg", "generic": "Atorvastatin", "brand": "Lipitor 10", "cat_p": "Cardiovascular", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "10mg", "unit": "Strip", "price": 16.0},
        {"code": "MED-005", "name": "Atorvastatin 20mg", "generic": "Atorvastatin", "brand": "Lipitor 20", "cat_p": "Cardiovascular", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "20mg", "unit": "Strip", "price": 24.0},
        {"code": "MED-006", "name": "Atorvastatin 40mg", "generic": "Atorvastatin", "brand": "Lipitor 40", "cat_p": "Cardiovascular", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "40mg", "unit": "Strip", "price": 38.0},
        {"code": "MED-007", "name": "Rosuvastatin 10mg", "generic": "Rosuvastatin Calcium", "brand": "Rosuvas 10", "cat_p": "Cardiovascular", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "10mg", "unit": "Strip", "price": 22.0},
        {"code": "MED-008", "name": "Metoprolol Succinate 25mg", "generic": "Metoprolol Succinate", "brand": "Betaloc 25", "cat_p": "Cardiovascular", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "25mg", "unit": "Strip", "price": 11.0},
        {"code": "MED-009", "name": "Metoprolol Succinate 50mg", "generic": "Metoprolol Succinate", "brand": "Betaloc 50", "cat_p": "Cardiovascular", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "50mg", "unit": "Strip", "price": 19.0},
        {"code": "MED-010", "name": "Amlodipine 5mg", "generic": "Amlodipine Besylate", "brand": "Norvasc 5", "cat_p": "Cardiovascular", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "5mg", "unit": "Strip", "price": 7.0},
        {"code": "MED-011", "name": "Telmisartan 40mg", "generic": "Telmisartan", "brand": "Telma 40", "cat_p": "Cardiovascular", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "40mg", "unit": "Strip", "price": 15.0},
        {"code": "MED-012", "name": "Telmisartan 80mg", "generic": "Telmisartan", "brand": "Telma 80", "cat_p": "Cardiovascular", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "80mg", "unit": "Strip", "price": 26.0},
        {"code": "MED-013", "name": "Telmisartan 40mg + Amlodipine 5mg", "generic": "Telmisartan + Amlodipine", "brand": "Telma-AM", "cat_p": "Cardiovascular", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "40mg+5mg", "unit": "Strip", "price": 21.0},
        {"code": "MED-014", "name": "Ramipril 2.5mg", "generic": "Ramipril", "brand": "Cardace 2.5", "cat_p": "Cardiovascular", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "2.5mg", "unit": "Strip", "price": 10.0},
        {"code": "MED-015", "name": "Ramipril 5mg", "generic": "Ramipril", "brand": "Cardace 5", "cat_p": "Cardiovascular", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "5mg", "unit": "Strip", "price": 16.0},
        {"code": "MED-016", "name": "Losartan Potassium 50mg", "generic": "Losartan Potassium", "brand": "Losar 50", "cat_p": "Cardiovascular", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "50mg", "unit": "Strip", "price": 13.0},

        # --- Antidiabetics ---
        {"code": "MED-017", "name": "Metformin 500mg", "generic": "Metformin Hydrochloride", "brand": "Glycomet 500", "cat_p": "Antidiabetics", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "500mg", "unit": "Strip", "price": 8.0},
        {"code": "MED-018", "name": "Metformin 850mg", "generic": "Metformin Hydrochloride", "brand": "Glycomet 850", "cat_p": "Antidiabetics", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "850mg", "unit": "Strip", "price": 12.0},
        {"code": "MED-019", "name": "Metformin 1000mg SR", "generic": "Metformin Hydrochloride SR", "brand": "Glucophage 1000", "cat_p": "Antidiabetics", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "1000mg", "unit": "Strip", "price": 16.0},
        {"code": "MED-020", "name": "Glimepiride 1mg", "generic": "Glimepiride", "brand": "Amaryl 1", "cat_p": "Antidiabetics", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "1mg", "unit": "Strip", "price": 9.0},
        {"code": "MED-021", "name": "Glimepiride 2mg", "generic": "Glimepiride", "brand": "Amaryl 2", "cat_p": "Antidiabetics", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "2mg", "unit": "Strip", "price": 14.0},
        {"code": "MED-022", "name": "Glimepiride 2mg + Metformin 500mg", "generic": "Glimepiride + Metformin", "brand": "Glycomet-GP 2", "cat_p": "Antidiabetics", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "2mg+500mg", "unit": "Strip", "price": 18.0},
        {"code": "MED-023", "name": "Teneligliptin 20mg", "generic": "Teneligliptin Hydrobromide", "brand": "Ziten 20", "cat_p": "Antidiabetics", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "20mg", "unit": "Strip", "price": 20.0},
        {"code": "MED-024", "name": "Dapagliflozin 10mg", "generic": "Dapagliflozin", "brand": "Forxiga 10", "cat_p": "Antidiabetics", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "10mg", "unit": "Strip", "price": 32.0},

        # --- Analgesics, Antipyretics & Anti-inflammatory ---
        {"code": "MED-025", "name": "Paracetamol 500mg", "generic": "Paracetamol", "brand": "Crocin 500", "cat_p": "Analgesics & Antipyretics", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "500mg", "unit": "Strip", "price": 3.5},
        {"code": "MED-026", "name": "Paracetamol 650mg", "generic": "Paracetamol", "brand": "Dolo 650", "cat_p": "Analgesics & Antipyretics", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "650mg", "unit": "Strip", "price": 4.5},
        {"code": "MED-027", "name": "Ibuprofen 400mg", "generic": "Ibuprofen", "brand": "Brufen 400", "cat_p": "Analgesics & Antipyretics", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "400mg", "unit": "Strip", "price": 5.0},
        {"code": "MED-028", "name": "Diclofenac Sodium 50mg", "generic": "Diclofenac Sodium", "brand": "Voveran 50", "cat_p": "Analgesics & Antipyretics", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "50mg", "unit": "Strip", "price": 7.0},
        {"code": "MED-029", "name": "Aceclofenac 100mg + Paracetamol 325mg", "generic": "Aceclofenac + Paracetamol", "brand": "Zerodol-P", "cat_p": "Analgesics & Antipyretics", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "100mg+325mg", "unit": "Strip", "price": 10.0},
        {"code": "MED-030", "name": "Tramadol 50mg + Paracetamol 325mg", "generic": "Tramadol + Paracetamol", "brand": "Ultracet", "cat_p": "Analgesics & Antipyretics", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "37.5mg+325mg", "unit": "Strip", "price": 28.0},
        {"code": "MED-031", "name": "Mefenamic Acid 500mg", "generic": "Mefenamic Acid", "brand": "Meftal 500", "cat_p": "Analgesics & Antipyretics", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "500mg", "unit": "Strip", "price": 8.0},

        # --- Antibiotics & Antifungals ---
        {"code": "MED-032", "name": "Amoxicillin 500mg", "generic": "Amoxicillin Trihydrate", "brand": "Mox 500", "cat_p": "Antibiotics", "cat_s": ItemCategory.Pharmaceuticals, "form": "Capsule", "strength": "500mg", "unit": "Strip", "price": 18.0},
        {"code": "MED-033", "name": "Amoxicillin + Clavulanate 625mg", "generic": "Amoxicillin + Potassium Clavulanate", "brand": "Augmentin 625", "cat_p": "Antibiotics", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "625mg", "unit": "Strip", "price": 42.0},
        {"code": "MED-034", "name": "Azithromycin 500mg", "generic": "Azithromycin Dihydrate", "brand": "Azithral 500", "cat_p": "Antibiotics", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "500mg", "unit": "Strip", "price": 28.0},
        {"code": "MED-035", "name": "Ciprofloxacin 500mg", "generic": "Ciprofloxacin Hydrochloride", "brand": "Cifran 500", "cat_p": "Antibiotics", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "500mg", "unit": "Strip", "price": 14.0},
        {"code": "MED-036", "name": "Cefixime 200mg", "generic": "Cefixime Trihydrate", "brand": "Zifi 200", "cat_p": "Antibiotics", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "200mg", "unit": "Strip", "price": 26.0},
        {"code": "MED-037", "name": "Metronidazole 400mg", "generic": "Metronidazole", "brand": "Flagyl 400", "cat_p": "Antibiotics", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "400mg", "unit": "Strip", "price": 6.5},
        {"code": "MED-038", "name": "Doxycycline 100mg", "generic": "Doxycycline Hyclate", "brand": "Doxicip 100", "cat_p": "Antibiotics", "cat_s": ItemCategory.Pharmaceuticals, "form": "Capsule", "strength": "100mg", "unit": "Strip", "price": 11.0},
        {"code": "MED-039", "name": "Fluconazole 150mg", "generic": "Fluconazole", "brand": "Forcan 150", "cat_p": "Antifungals", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "150mg", "unit": "Strip", "price": 13.0},

        # --- Gastrointestinal ---
        {"code": "MED-040", "name": "Pantoprazole 40mg", "generic": "Pantoprazole Sodium", "brand": "Pan-40", "cat_p": "Gastrointestinal", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "40mg", "unit": "Strip", "price": 12.0},
        {"code": "MED-041", "name": "Pantoprazole 40mg + Domperidone 30mg", "generic": "Pantoprazole + Domperidone SR", "brand": "Pan-D", "cat_p": "Gastrointestinal", "cat_s": ItemCategory.Pharmaceuticals, "form": "Capsule", "strength": "40mg+30mg", "unit": "Strip", "price": 19.0},
        {"code": "MED-042", "name": "Omeprazole 20mg", "generic": "Omeprazole", "brand": "Omez 20", "cat_p": "Gastrointestinal", "cat_s": ItemCategory.Pharmaceuticals, "form": "Capsule", "strength": "20mg", "unit": "Strip", "price": 9.0},
        {"code": "MED-043", "name": "Rabeprazole 20mg", "generic": "Rabeprazole Sodium", "brand": "Razo 20", "cat_p": "Gastrointestinal", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "20mg", "unit": "Strip", "price": 15.0},
        {"code": "MED-044", "name": "Ondansetron 4mg", "generic": "Ondansetron Hydrochloride", "brand": "Emeset 4", "cat_p": "Gastrointestinal", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "4mg", "unit": "Strip", "price": 8.0},

        # --- Antihistamines & Respiratory ---
        {"code": "MED-045", "name": "Cetirizine 10mg", "generic": "Cetirizine Hydrochloride", "brand": "Zyrtec", "cat_p": "Antihistamines", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "10mg", "unit": "Strip", "price": 4.5},
        {"code": "MED-046", "name": "Levocetirizine 5mg", "generic": "Levocetirizine Dihydrochloride", "brand": "Levocet 5", "cat_p": "Antihistamines", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "5mg", "unit": "Strip", "price": 7.0},
        {"code": "MED-047", "name": "Montelukast 10mg + Levocetirizine 5mg", "generic": "Montelukast + Levocetirizine", "brand": "Montair-LC", "cat_p": "Respiratory", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "10mg+5mg", "unit": "Strip", "price": 22.0},
        {"code": "MED-048", "name": "Salbutamol 4mg", "generic": "Salbutamol Sulphate", "brand": "Asthalin 4", "cat_p": "Respiratory", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "4mg", "unit": "Strip", "price": 3.0},

        # --- Vitamins, Minerals & Supplements ---
        {"code": "MED-049", "name": "Vitamin B-Complex with B12", "generic": "Vitamin B-Complex + B12", "brand": "Becosules", "cat_p": "Vitamins & Supplements", "cat_s": ItemCategory.Pharmaceuticals, "form": "Capsule", "strength": "Standard B-Complex", "unit": "Strip", "price": 6.0},
        {"code": "MED-050", "name": "Vitamin D3 60,000 IU", "generic": "Cholecalciferol", "brand": "Calcirol 60K", "cat_p": "Vitamins & Supplements", "cat_s": ItemCategory.Pharmaceuticals, "form": "Capsule", "strength": "60000 IU", "unit": "Strip", "price": 35.0},
        {"code": "MED-051", "name": "Calcium 500mg + Vitamin D3", "generic": "Calcium Carbonate + Vit D3", "brand": "Shelcal 500", "cat_p": "Vitamins & Supplements", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "500mg+250IU", "unit": "Strip", "price": 14.0},
        {"code": "MED-052", "name": "Ferrous Ascorbate + Folic Acid", "generic": "Iron + Folic Acid", "brand": "Orofer-XT", "cat_p": "Vitamins & Supplements", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "100mg+1.5mg", "unit": "Strip", "price": 18.0},
        {"code": "MED-053", "name": "Vitamin C 500mg Chewable", "generic": "Ascorbic Acid", "brand": "Limcee 500", "cat_p": "Vitamins & Supplements", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "500mg", "unit": "Strip", "price": 4.0},
        {"code": "MED-054", "name": "Multivitamin with Zinc", "generic": "Multivitamin + Multimineral + Zinc", "brand": "Zincovit", "cat_p": "Vitamins & Supplements", "cat_s": ItemCategory.Pharmaceuticals, "form": "Tablet", "strength": "Standard Formula", "unit": "Strip", "price": 11.0},

        # --- Emergency & Critical Care ---
        {"code": "MED-055", "name": "Hydrocortisone 100mg", "generic": "Hydrocortisone Sodium Succinate", "brand": "Efcorlin 100", "cat_p": "Emergency Medicines", "cat_s": ItemCategory.Pharmaceuticals, "form": "Vial", "strength": "100mg", "unit": "Vial", "price": 45.0},
        {"code": "MED-056", "name": "Normal Saline 0.9% 500ml", "generic": "Sodium Chloride 0.9%", "brand": "NS 500ml", "cat_p": "IV Fluids", "cat_s": ItemCategory.Pharmaceuticals, "form": "Bottle", "strength": "0.9%", "unit": "Bottle", "price": 40.0},
    ]

    branches = [BRANCH_CANTONMENT, BRANCH_SRIRANGAM, BRANCH_THILLAINAGAR]
    per_branch_stock = 250  # 250 units in each branch = 750 total stock per medicine

    for item in tablets_catalog:
        total_medicine_stock = len(branches) * per_branch_stock

        # 1. Global / Central Pharmacy Medicine Catalog
        existing_med = db.scalar(
            select(Medicine).where(
                (Medicine.code == item["code"]) |
                (Medicine.name == item["name"])
            )
        )
        if existing_med:
            existing_med.code = item["code"]
            existing_med.name = item["name"]
            existing_med.generic_name = item["generic"]
            existing_med.brand = item["brand"]
            existing_med.category = item["cat_p"]
            existing_med.dosage_form = item["form"]
            existing_med.strength = item["strength"]
            existing_med.unit = item["unit"]
            existing_med.selling_price = item["price"]
            existing_med.purchase_price = round(item["price"] * 0.75, 2)
            existing_med.current_stock = total_medicine_stock
            existing_med.status = "Active"
            existing_med.branch = None
        else:
            new_med = Medicine(
                code=item["code"],
                name=item["name"],
                generic_name=item["generic"],
                brand=item["brand"],
                category=item["cat_p"],
                manufacturer=f"{item['brand'].split()[0]} Pharmaceuticals",
                dosage_form=item["form"],
                strength=item["strength"],
                unit=item["unit"],
                purchase_price=round(item["price"] * 0.75, 2),
                selling_price=item["price"],
                gst=12.0,
                storage_condition="Store in cool, dry place below 25Â°C",
                rack_location="Rack A",
                status="Active",
                current_stock=total_medicine_stock,
                min_stock=50,
                max_stock=2000,
                reorder_level=200,
                branch=None,
            )
            db.add(new_med)

        # 2. Branch-Scoped ItemMaster (Central Store inventory master for EACH branch)
        # 3. Branch-Scoped PharmacyBatch (Allocates stock to Cantonment, Srirangam, and Thillainagar)
        for branch_name in branches:
            branch_prefix = "CAN" if "Cantonment" in branch_name else ("SRG" if "Srirangam" in branch_name else "TN")
            item_code_branch = f"ITM-{branch_prefix}-{item['code']}"

            existing_store = db.scalar(
                select(ItemMaster).where(
                    (ItemMaster.item_code == item_code_branch) |
                    ((ItemMaster.item_code == item["code"]) & (ItemMaster.branch == branch_name))
                )
            )
            if existing_store:
                existing_store.item_code = item_code_branch
                existing_store.item_name = item["name"]
                existing_store.category = item["cat_s"]
                existing_store.generic_composition = item["generic"]
                existing_store.strength = item["strength"]
                existing_store.dosage_form = item["form"]
                existing_store.unit = ItemUnit.Strip if item["unit"] == "Strip" else ItemUnit.Piece
                existing_store.brand = item["brand"]
                existing_store.unit_price = item["price"]
                existing_store.current_stock = per_branch_stock
                existing_store.opening_stock = per_branch_stock
                existing_store.status = ItemStatus.Active
                existing_store.branch = branch_name
            else:
                new_store_item = ItemMaster(
                    item_code=item_code_branch,
                    item_name=item["name"],
                    category=item["cat_s"],
                    sub_category="Tablets & Capsules",
                    generic_composition=item["generic"],
                    strength=item["strength"],
                    dosage_form=item["form"],
                    unit=ItemUnit.Strip if item["unit"] == "Strip" else ItemUnit.Piece,
                    pack_quantity=10,
                    issue_unit="Piece",
                    opening_stock=per_branch_stock,
                    current_stock=per_branch_stock,
                    brand=item["brand"],
                    hsn_code="30049099",
                    gst_percentage=12.0,
                    min_stock=50,
                    max_stock=2000,
                    reorder_level=200,
                    storage_location=f"Store Rack - {branch_prefix}",
                    description=f"Prescription tablet {item['name']} ({branch_name})",
                    status=ItemStatus.Active,
                    unit_price=item["price"],
                    branch=branch_name,
                )
                db.add(new_store_item)

            batch_num = f"BAT-{branch_prefix}-{item['code']}"
            existing_batch = db.scalar(select(PharmacyBatch).where(PharmacyBatch.batch_number == batch_num))
            if existing_batch:
                existing_batch.medicine_name = item["name"]
                existing_batch.medicine_id = item["code"]
                existing_batch.branch = branch_name
                existing_batch.quantity_received = per_branch_stock
                existing_batch.available_quantity = per_branch_stock
                existing_batch.batch_status = "Available"
                existing_batch.purchase_price = round(item["price"] * 0.75, 2)
                existing_batch.selling_price = item["price"]
            else:
                new_batch = PharmacyBatch(
                    batch_number=batch_num,
                    medicine_id=item["code"],
                    medicine_name=item["name"],
                    supplier_name="Apex Healthcare Distributors",
                    manufacturing_date="2026-01-15",
                    expiry_date="2028-12-31",
                    purchase_price=round(item["price"] * 0.75, 2),
                    selling_price=item["price"],
                    quantity_received=per_branch_stock,
                    available_quantity=per_branch_stock,
                    batch_status="Available",
                    branch=branch_name,
                )
                db.add(new_batch)

    print(f"Successfully seeded {len(tablets_catalog)} tablets & medicines with dedicated Store and Pharmacy allocations for Cantonment, Srirangam, and Thillainagar branches!")


# ===========================================================================
# 6. Branch-Related Users & Staff Accounts with Logical Credentials
# ===========================================================================
def seed_users(db) -> None:
    """
    Seeds logical, clearly named accounts for each of the 3 branches:
      - Doctors (Cardiology, General Medicine)
      - Nurse
      - Reception
      - Store
      - Pharmacy
      - Lab
      - Billing
    Plus global Super Admin and Central Billing.
    """
    pw_admin = hash_password("admin123")
    pw_doc = hash_password("Doctor@123")
    pw_nurse = hash_password("Nurse@123")
    pw_rec = hash_password("Reception@123")
    pw_store = hash_password("Store@123")
    pw_pharma = hash_password("Pharma@123")
    pw_lab = hash_password("Lab@123")
    pw_bill = hash_password("Billing@123")

    users_data = [
        # --- Global Accounts ---
        {
            "name": "Super Admin",
            "email": "admin@hms.com",
            "hashed_password": pw_admin,
            "role": UserRole.admin,
            "department": "System Administration",
            "username": "admin",
            "employee_id": "EMP-ADM-01",
            "phone": "9876543210",
            "branch": "Main Branch",
        },
        {
            "name": "Central Billing Manager",
            "email": "billing@hms.com",
            "hashed_password": pw_bill,
            "role": UserRole.billing,
            "department": "Accounts & Billing",
            "username": "USR-BIL-01",
            "employee_id": "EMP-BIL-01",
            "phone": "9876543211",
            "branch": "Main Branch",
        },

        # ===================================================================
        # BRANCH 1: CANTONMENT BRANCH
        # ===================================================================
        {
            "name": "Dr. Mani",
            "email": "doctor.cantonment@hms.com",
            "hashed_password": pw_doc,
            "role": UserRole.doctor,
            "department": "Cardiology",
            "username": "doc.cantonment",
            "employee_id": "EMP-CAN-DOC-01",
            "phone": "9843100001",
            "branch": BRANCH_CANTONMENT,
        },
        {
            "name": "Dr. Martin",
            "email": "doctor.general.cantonment@hms.com",
            "hashed_password": pw_doc,
            "role": UserRole.doctor,
            "department": "General Medicine",
            "username": "doc.gen.cantonment",
            "employee_id": "EMP-CAN-DOC-02",
            "phone": "9843100002",
            "branch": BRANCH_CANTONMENT,
        },
        {
            "name": "Nurse Cantonment",
            "email": "nurse.cantonment@hms.com",
            "hashed_password": pw_nurse,
            "role": UserRole.nurse,
            "department": "Nursing",
            "assigned_ward": "ICU",
            "username": "nurse.cantonment",
            "employee_id": "EMP-CAN-NUR-01",
            "phone": "9843100003",
            "branch": BRANCH_CANTONMENT,
        },
        {
            "name": "Reception Cantonment",
            "email": "reception.cantonment@hms.com",
            "hashed_password": pw_rec,
            "role": UserRole.reception,
            "department": "Front Desk",
            "username": "reception.cantonment",
            "employee_id": "EMP-CAN-REC-01",
            "phone": "9843100004",
            "branch": BRANCH_CANTONMENT,
        },
        {
            "name": "Store Cantonment",
            "email": "store.cantonment@hms.com",
            "hashed_password": pw_store,
            "role": UserRole.store,
            "department": "Central Store",
            "username": "store.cantonment",
            "employee_id": "EMP-CAN-STR-01",
            "phone": "9843100005",
            "branch": BRANCH_CANTONMENT,
        },
        {
            "name": "Pharmacy Cantonment",
            "email": "pharmacy.cantonment@hms.com",
            "hashed_password": pw_pharma,
            "role": UserRole.pharmacy,
            "department": "Pharmacy",
            "username": "pharmacy.cantonment",
            "employee_id": "EMP-CAN-PHR-01",
            "phone": "9843100006",
            "branch": BRANCH_CANTONMENT,
        },
        {
            "name": "Lab Cantonment",
            "email": "lab.cantonment@hms.com",
            "hashed_password": pw_lab,
            "role": UserRole.lab,
            "department": "Laboratory",
            "username": "lab.cantonment",
            "employee_id": "EMP-CAN-LAB-01",
            "phone": "9843100007",
            "branch": BRANCH_CANTONMENT,
        },
        {
            "name": "Billing Cantonment",
            "email": "billing.cantonment@hms.com",
            "hashed_password": pw_bill,
            "role": UserRole.billing,
            "department": "Accounts & Billing",
            "username": "billing.cantonment",
            "employee_id": "EMP-CAN-BIL-01",
            "phone": "9843100008",
            "branch": BRANCH_CANTONMENT,
        },

        # ===================================================================
        # BRANCH 2: SRIRANGAM BRANCH
        # ===================================================================
        {
            "name": "Dr. Senthil",
            "email": "doctor.srirangam@hms.com",
            "hashed_password": pw_doc,
            "role": UserRole.doctor,
            "department": "Cardiology",
            "username": "doc.srirangam",
            "employee_id": "EMP-SRG-DOC-01",
            "phone": "9843200001",
            "branch": BRANCH_SRIRANGAM,
        },
        {
            "name": "Dr. Balan",
            "email": "doctor.general.srirangam@hms.com",
            "hashed_password": pw_doc,
            "role": UserRole.doctor,
            "department": "General Medicine",
            "username": "doc.gen.srirangam",
            "employee_id": "EMP-SRG-DOC-02",
            "phone": "9843200002",
            "branch": BRANCH_SRIRANGAM,
        },
        {
            "name": "Nurse Srirangam",
            "email": "nurse.srirangam@hms.com",
            "hashed_password": pw_nurse,
            "role": UserRole.nurse,
            "department": "Nursing",
            "assigned_ward": "General Ward - Srirangam",
            "username": "nurse.srirangam",
            "employee_id": "EMP-SRG-NUR-01",
            "phone": "9843200003",
            "branch": BRANCH_SRIRANGAM,
        },
        {
            "name": "Reception Srirangam",
            "email": "reception.srirangam@hms.com",
            "hashed_password": pw_rec,
            "role": UserRole.reception,
            "department": "Front Desk",
            "username": "reception.srirangam",
            "employee_id": "EMP-SRG-REC-01",
            "phone": "9843200004",
            "branch": BRANCH_SRIRANGAM,
        },
        {
            "name": "Store Srirangam",
            "email": "store.srirangam@hms.com",
            "hashed_password": pw_store,
            "role": UserRole.store,
            "department": "Central Store",
            "username": "store.srirangam",
            "employee_id": "EMP-SRG-STR-01",
            "phone": "9843200005",
            "branch": BRANCH_SRIRANGAM,
        },
        {
            "name": "Pharmacy Srirangam",
            "email": "pharmacy.srirangam@hms.com",
            "hashed_password": pw_pharma,
            "role": UserRole.pharmacy,
            "department": "Pharmacy",
            "username": "pharmacy.srirangam",
            "employee_id": "EMP-SRG-PHR-01",
            "phone": "9843200006",
            "branch": BRANCH_SRIRANGAM,
        },
        {
            "name": "Lab Srirangam",
            "email": "lab.srirangam@hms.com",
            "hashed_password": pw_lab,
            "role": UserRole.lab,
            "department": "Laboratory",
            "username": "lab.srirangam",
            "employee_id": "EMP-SRG-LAB-01",
            "phone": "9843200007",
            "branch": BRANCH_SRIRANGAM,
        },
        {
            "name": "Billing Srirangam",
            "email": "billing.srirangam@hms.com",
            "hashed_password": pw_bill,
            "role": UserRole.billing,
            "department": "Accounts & Billing",
            "username": "billing.srirangam",
            "employee_id": "EMP-SRG-BIL-01",
            "phone": "9843200008",
            "branch": BRANCH_SRIRANGAM,
        },

        # ===================================================================
        # BRANCH 3: THILLAINAGAR BRANCH
        # ===================================================================
        {
            "name": "Dr. Aravind",
            "email": "doctor.thillainagar@hms.com",
            "hashed_password": pw_doc,
            "role": UserRole.doctor,
            "department": "Cardiology",
            "username": "doc.thillainagar",
            "employee_id": "EMP-TN-DOC-01",
            "phone": "9843300001",
            "branch": BRANCH_THILLAINAGAR,
        },
        {
            "name": "Dr. Nivetha",
            "email": "doctor.general.thillainagar@hms.com",
            "hashed_password": pw_doc,
            "role": UserRole.doctor,
            "department": "General Medicine",
            "username": "doc.gen.thillainagar",
            "employee_id": "EMP-TN-DOC-02",
            "phone": "9843300002",
            "branch": BRANCH_THILLAINAGAR,
        },
        {
            "name": "Nurse Thillainagar",
            "email": "nurse.thillainagar@hms.com",
            "hashed_password": pw_nurse,
            "role": UserRole.nurse,
            "department": "Nursing",
            "assigned_ward": "Emergency Ward",
            "username": "nurse.thillainagar",
            "employee_id": "EMP-TN-NUR-01",
            "phone": "9843300003",
            "branch": BRANCH_THILLAINAGAR,
        },
        {
            "name": "Reception Thillainagar",
            "email": "reception.thillainagar@hms.com",
            "hashed_password": pw_rec,
            "role": UserRole.reception,
            "department": "Front Desk",
            "username": "reception.thillainagar",
            "employee_id": "EMP-TN-REC-01",
            "phone": "9843300004",
            "branch": BRANCH_THILLAINAGAR,
        },
        {
            "name": "Store Thillainagar",
            "email": "store.thillainagar@hms.com",
            "hashed_password": pw_store,
            "role": UserRole.store,
            "department": "Central Store",
            "username": "store.thillainagar",
            "employee_id": "EMP-TN-STR-01",
            "phone": "9843300005",
            "branch": BRANCH_THILLAINAGAR,
        },
        {
            "name": "Pharmacy Thillainagar",
            "email": "pharmacy.thillainagar@hms.com",
            "hashed_password": pw_pharma,
            "role": UserRole.pharmacy,
            "department": "Pharmacy",
            "username": "pharmacy.thillainagar",
            "employee_id": "EMP-TN-PHR-01",
            "phone": "9843300006",
            "branch": BRANCH_THILLAINAGAR,
        },
        {
            "name": "Lab Thillainagar",
            "email": "lab.thillainagar@hms.com",
            "hashed_password": pw_lab,
            "role": UserRole.lab,
            "department": "Laboratory",
            "username": "lab.thillainagar",
            "employee_id": "EMP-TN-LAB-01",
            "phone": "9843300007",
            "branch": BRANCH_THILLAINAGAR,
        },
        {
            "name": "Billing Thillainagar",
            "email": "billing.thillainagar@hms.com",
            "hashed_password": pw_bill,
            "role": UserRole.billing,
            "department": "Accounts & Billing",
            "username": "billing.thillainagar",
            "employee_id": "EMP-TN-BIL-01",
            "phone": "9843300008",
            "branch": BRANCH_THILLAINAGAR,
        },
    ]

    for udata in users_data:
        existing = db.scalar(select(User).where(User.email == udata["email"]))
        if existing:
            for key, val in udata.items():
                setattr(existing, key, val)
            existing.is_active = True
            existing.status = "Active"
            print(f"Updated User: {existing.name} ({existing.email}) [{existing.branch}]")
        else:
            user = User(
                name=udata["name"],
                email=udata["email"],
                hashed_password=udata["hashed_password"],
                role=udata["role"],
                department=udata.get("department"),
                assigned_ward=udata.get("assigned_ward"),
                username=udata.get("username"),
                employee_id=udata.get("employee_id"),
                phone=udata.get("phone"),
                branch=udata.get("branch"),
                is_active=True,
                status="Active",
            )
            db.add(user)
            print(f"Seeded User: {udata['name']} ({udata['email']}) [{udata.get('branch')}]")

        # Sync doctor table if user is a doctor
        if udata["role"] in (UserRole.doctor, "doctor"):
            doc_name = udata["name"] if udata["name"].startswith("Dr.") else f"Dr. {udata['name']}"
            existing_doc = db.scalar(select(Doctor).where(Doctor.email == udata["email"]))
            spec = "Cardiologist" if udata.get("department") == "Cardiology" else "General Physician"
            if existing_doc:
                existing_doc.name = doc_name
                existing_doc.department = udata.get("department") or "Cardiology"
                existing_doc.specialization = spec
                existing_doc.branch = udata.get("branch")
                existing_doc.status = DoctorStatus.Available
                existing_doc.available_days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
                existing_doc.slots = [
                    "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM",
                    "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
                    "12:00 PM", "12:30 PM", "02:00 PM", "02:30 PM",
                    "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
                    "05:00 PM", "05:30 PM", "06:00 PM",
                ]
            else:
                doc = Doctor(
                    name=doc_name,
                    email=udata["email"],
                    department=udata.get("department") or "Cardiology",
                    specialization=spec,
                    room_no="OPD-101",
                    consultation_fee=500.0,
                    available_days=["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
                    slots=[
                        "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM",
                        "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
                        "12:00 PM", "12:30 PM", "02:00 PM", "02:30 PM",
                        "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
                        "05:00 PM", "05:30 PM", "06:00 PM",
                    ],
                    status=DoctorStatus.Available,
                    branch=udata.get("branch"),
                )
                db.add(doc)

    # Flush these users/doctors before the dedicated doctor availability seed runs.
    # Without this, the same doctor email can be inserted twice in one pending unit of work.
    db.flush()


# ===========================================================================
# 7. Comprehensive Doctor Profiles & Availability Seeder
# ===========================================================================
def seed_doctors_and_availability(db) -> None:
    """
    Seeds and synchronizes overall doctor profiles, 6-day weekly availability schedules,
    daily consultation time slots, working hours, and shift allocations across
    all hospital clinical departments and branches.
    """
    all_day_slots = [
        "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM",
        "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
        "12:00 PM", "12:30 PM", "02:00 PM", "02:30 PM",
        "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM",
        "05:00 PM", "05:30 PM", "06:00 PM",
    ]
    working_days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    pw_doc = hash_password("Doctor@123")

    doctors_master_data = [
        # --- CANTONMENT BRANCH (Main Hospital) ---
        {
            "name": "Dr. Mani",
            "email": "doctor.cantonment@hms.com",
            "department": "Cardiology",
            "specialization": "Senior Interventional Cardiologist",
            "room_no": "OPD-101",
            "consultation_fee": 600.0,
            "branch": BRANCH_CANTONMENT,
            "employee_id": "EMP-CAN-DOC-01",
            "phone": "9843100001",
            "shift_type": "Morning",
            "morning_shift": "08:00 AM - 04:00 PM",
            "evening_shift": "02:00 PM - 10:00 PM",
            "night_shift": "10:00 PM - 06:00 AM",
        },
        {
            "name": "Dr. Martin",
            "email": "doctor.general.cantonment@hms.com",
            "department": "General Medicine",
            "specialization": "Senior Consultant - Internal Medicine",
            "room_no": "OPD-102",
            "consultation_fee": 500.0,
            "branch": BRANCH_CANTONMENT,
            "employee_id": "EMP-CAN-DOC-02",
            "phone": "9843100002",
            "shift_type": "Morning",
            "morning_shift": "08:00 AM - 04:00 PM",
            "evening_shift": "02:00 PM - 10:00 PM",
            "night_shift": "10:00 PM - 06:00 AM",
        },
        {
            "name": "Dr. A. Priyanka",
            "email": "priyanka.pediatrics@hms.com",
            "department": "Pediatrics",
            "specialization": "Senior Pediatrician & Neonatologist",
            "room_no": "OPD-103",
            "consultation_fee": 550.0,
            "branch": BRANCH_CANTONMENT,
            "employee_id": "EMP-CAN-DOC-03",
            "phone": "9843100011",
            "shift_type": "Morning",
            "morning_shift": "08:00 AM - 04:00 PM",
            "evening_shift": "02:00 PM - 10:00 PM",
            "night_shift": "10:00 PM - 06:00 AM",
        },
        {
            "name": "Dr. K. Senthil Kumar",
            "email": "senthil.ortho@hms.com",
            "department": "Orthopedics",
            "specialization": "Senior Orthopedic & Joint Replacement Surgeon",
            "room_no": "OPD-201",
            "consultation_fee": 650.0,
            "branch": BRANCH_CANTONMENT,
            "employee_id": "EMP-CAN-DOC-04",
            "phone": "9843100012",
            "shift_type": "Morning",
            "morning_shift": "08:00 AM - 04:00 PM",
            "evening_shift": "02:00 PM - 10:00 PM",
            "night_shift": "10:00 PM - 06:00 AM",
        },
        {
            "name": "Dr. M. Nivetha",
            "email": "nivetha.dermatology@hms.com",
            "department": "Dermatology",
            "specialization": "Consultant Dermatologist & Cosmetologist",
            "room_no": "OPD-202",
            "consultation_fee": 500.0,
            "branch": BRANCH_CANTONMENT,
            "employee_id": "EMP-CAN-DOC-05",
            "phone": "9843100013",
            "shift_type": "Morning",
            "morning_shift": "08:00 AM - 04:00 PM",
            "evening_shift": "02:00 PM - 10:00 PM",
            "night_shift": "10:00 PM - 06:00 AM",
        },
        {
            "name": "Dr. V. Prakash",
            "email": "prakash.ent@hms.com",
            "department": "ENT",
            "specialization": "Senior ENT, Head & Neck Surgeon",
            "room_no": "OPD-203",
            "consultation_fee": 500.0,
            "branch": BRANCH_CANTONMENT,
            "employee_id": "EMP-CAN-DOC-06",
            "phone": "9843100014",
            "shift_type": "Morning",
            "morning_shift": "08:00 AM - 04:00 PM",
            "evening_shift": "02:00 PM - 10:00 PM",
            "night_shift": "10:00 PM - 06:00 AM",
        },
        {
            "name": "Dr. P. Aravind",
            "email": "aravind.neurology@hms.com",
            "department": "Neurology",
            "specialization": "Chief Neurologist & Stroke Specialist",
            "room_no": "OPD-301",
            "consultation_fee": 750.0,
            "branch": BRANCH_CANTONMENT,
            "employee_id": "EMP-CAN-DOC-07",
            "phone": "9843100015",
            "shift_type": "Morning",
            "morning_shift": "08:00 AM - 04:00 PM",
            "evening_shift": "02:00 PM - 10:00 PM",
            "night_shift": "10:00 PM - 06:00 AM",
        },
        {
            "name": "Dr. S. Karthikeyan",
            "email": "karthikeyan.surgery@hms.com",
            "department": "General Surgery",
            "specialization": "Chief General & Laparoscopic Surgeon",
            "room_no": "OPD-302",
            "consultation_fee": 650.0,
            "branch": BRANCH_CANTONMENT,
            "employee_id": "EMP-CAN-DOC-08",
            "phone": "9843100016",
            "shift_type": "Morning",
            "morning_shift": "08:00 AM - 04:00 PM",
            "evening_shift": "02:00 PM - 10:00 PM",
            "night_shift": "10:00 PM - 06:00 AM",
        },
        {
            "name": "Dr. R. Kavitha",
            "email": "kavitha.gyn@hms.com",
            "department": "Obstetrics & Gynecology",
            "specialization": "Senior Gynecologist & High-Risk Obstetrician",
            "room_no": "OPD-303",
            "consultation_fee": 600.0,
            "branch": BRANCH_CANTONMENT,
            "employee_id": "EMP-CAN-DOC-09",
            "phone": "9843100017",
            "shift_type": "Morning",
            "morning_shift": "08:00 AM - 04:00 PM",
            "evening_shift": "02:00 PM - 10:00 PM",
            "night_shift": "10:00 PM - 06:00 AM",
        },
        {
            "name": "Dr. N. Dinesh",
            "email": "dinesh.radiology@hms.com",
            "department": "Radiology",
            "specialization": "Chief Radiologist & Diagnostic Imaging Specialist",
            "room_no": "OPD-G01",
            "consultation_fee": 500.0,
            "branch": BRANCH_CANTONMENT,
            "employee_id": "EMP-CAN-DOC-10",
            "phone": "9843100018",
            "shift_type": "Morning",
            "morning_shift": "08:00 AM - 04:00 PM",
            "evening_shift": "02:00 PM - 10:00 PM",
            "night_shift": "10:00 PM - 06:00 AM",
        },

        # --- SRIRANGAM BRANCH ---
        {
            "name": "Dr. Senthil",
            "email": "doctor.srirangam@hms.com",
            "department": "Cardiology",
            "specialization": "Consultant Cardiologist",
            "room_no": "OPD-101",
            "consultation_fee": 550.0,
            "branch": BRANCH_SRIRANGAM,
            "employee_id": "EMP-SRG-DOC-01",
            "phone": "9843200001",
            "shift_type": "Morning",
            "morning_shift": "08:00 AM - 04:00 PM",
            "evening_shift": "02:00 PM - 10:00 PM",
            "night_shift": "10:00 PM - 06:00 AM",
        },
        {
            "name": "Dr. Balan",
            "email": "doctor.general.srirangam@hms.com",
            "department": "General Medicine",
            "specialization": "Consultant General Physician",
            "room_no": "OPD-102",
            "consultation_fee": 500.0,
            "branch": BRANCH_SRIRANGAM,
            "employee_id": "EMP-SRG-DOC-02",
            "phone": "9843200002",
            "shift_type": "Morning",
            "morning_shift": "08:00 AM - 04:00 PM",
            "evening_shift": "02:00 PM - 10:00 PM",
            "night_shift": "10:00 PM - 06:00 AM",
        },

        # --- THILLAINAGAR BRANCH ---
        {
            "name": "Dr. Aravind",
            "email": "doctor.thillainagar@hms.com",
            "department": "Cardiology",
            "specialization": "Consultant Cardiologist",
            "room_no": "OPD-101",
            "consultation_fee": 550.0,
            "branch": BRANCH_THILLAINAGAR,
            "employee_id": "EMP-TN-DOC-01",
            "phone": "9843300001",
            "shift_type": "Morning",
            "morning_shift": "08:00 AM - 04:00 PM",
            "evening_shift": "02:00 PM - 10:00 PM",
            "night_shift": "10:00 PM - 06:00 AM",
        },
        {
            "name": "Dr. Nivetha",
            "email": "doctor.general.thillainagar@hms.com",
            "department": "General Medicine",
            "specialization": "Consultant General Physician",
            "room_no": "OPD-102",
            "consultation_fee": 500.0,
            "branch": BRANCH_THILLAINAGAR,
            "employee_id": "EMP-TN-DOC-02",
            "phone": "9843300002",
            "shift_type": "Morning",
            "morning_shift": "08:00 AM - 04:00 PM",
            "evening_shift": "02:00 PM - 10:00 PM",
            "night_shift": "10:00 PM - 06:00 AM",
        },
    ]

    for d in doctors_master_data:
        # 1. Synchronize User Account
        existing_user = db.scalar(select(User).where(User.email == d["email"]))
        if existing_user:
            existing_user.name = d["name"]
            existing_user.role = UserRole.doctor
            existing_user.department = d["department"]
            existing_user.branch = d["branch"]
            existing_user.employee_id = d["employee_id"]
            existing_user.phone = d["phone"]
            existing_user.status = "Active"
            existing_user.is_active = True
        else:
            new_u = User(
                name=d["name"],
                email=d["email"],
                hashed_password=pw_doc,
                role=UserRole.doctor,
                department=d["department"],
                username=d["email"].split("@")[0],
                employee_id=d["employee_id"],
                phone=d["phone"],
                branch=d["branch"],
                status="Active",
                is_active=True,
            )
            db.add(new_u)

        # 2. Synchronize Doctor Master Table
        existing_doc = db.scalar(select(Doctor).where(Doctor.email == d["email"]))
        if existing_doc:
            existing_doc.name = d["name"]
            existing_doc.department = d["department"]
            existing_doc.specialization = d["specialization"]
            existing_doc.room_no = d["room_no"]
            existing_doc.consultation_fee = d["consultation_fee"]
            existing_doc.available_days = working_days
            existing_doc.slots = all_day_slots
            existing_doc.status = DoctorStatus.Available
            existing_doc.branch = d["branch"]
            doc_id = existing_doc.id
        else:
            new_doc = Doctor(
                name=d["name"],
                email=d["email"],
                department=d["department"],
                specialization=d["specialization"],
                room_no=d["room_no"],
                consultation_fee=d["consultation_fee"],
                available_days=working_days,
                slots=all_day_slots,
                status=DoctorStatus.Available,
                branch=d["branch"],
            )
            db.add(new_doc)
            db.flush()
            doc_id = new_doc.id

        # 3. Synchronize Consultation Charges
        existing_charge = db.scalar(
            select(ConsultationCharge).where(
                (ConsultationCharge.doctor_name == d["name"]) |
                (ConsultationCharge.doctor_id == str(doc_id))
            )
        )
        if existing_charge:
            existing_charge.doctor_id = str(doc_id)
            existing_charge.doctor_name = d["name"]
            existing_charge.department = d["department"]
            existing_charge.consultation_fee = d["consultation_fee"]
            existing_charge.follow_up_fee = round(d["consultation_fee"] * 0.5, 2)
            existing_charge.emergency_fee = round(d["consultation_fee"] * 1.5, 2)
            existing_charge.validity_days = 7
            existing_charge.status = "Active"
        else:
            charge = ConsultationCharge(
                doctor_id=str(doc_id),
                doctor_name=d["name"],
                department=d["department"],
                consultation_fee=d["consultation_fee"],
                follow_up_fee=round(d["consultation_fee"] * 0.5, 2),
                emergency_fee=round(d["consultation_fee"] * 1.5, 2),
                validity_days=7,
                status="Active",
            )
            db.add(charge)

    print(f"Successfully seeded and synchronized availability, time slots, and charges for all {len(doctors_master_data)} doctors!")


# ===========================================================================
# 8. Overall Working Hours & Shift Rotations Across All Roles
# ===========================================================================
def seed_working_hours_and_staff_shifts(db) -> None:
    """
    Seeds standard working hours for all hospital clinical & operational departments
    and seeds live shift allocations for all users/staff across all roles and branches.
    """
    days_of_week = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    
    # 1. Department Working Hours
    departments_hours = [
        {"dept": "Cardiology", "start": "08:00 AM", "end": "08:00 PM", "sunday": True, "sun_end": "02:00 PM"},
        {"dept": "General Medicine", "start": "08:00 AM", "end": "08:00 PM", "sunday": True, "sun_end": "02:00 PM"},
        {"dept": "Pediatrics", "start": "08:30 AM", "end": "07:30 PM", "sunday": True, "sun_end": "01:30 PM"},
        {"dept": "Orthopedics", "start": "09:00 AM", "end": "06:00 PM", "sunday": False},
        {"dept": "Dermatology", "start": "09:00 AM", "end": "05:00 PM", "sunday": False},
        {"dept": "ENT", "start": "09:00 AM", "end": "06:00 PM", "sunday": False},
        {"dept": "Neurology", "start": "09:00 AM", "end": "06:00 PM", "sunday": False},
        {"dept": "General Surgery", "start": "08:00 AM", "end": "06:00 PM", "sunday": False},
        {"dept": "Obstetrics & Gynecology", "start": "08:30 AM", "end": "07:30 PM", "sunday": True, "sun_end": "01:30 PM"},
        {"dept": "Radiology", "start": "08:00 AM", "end": "08:00 PM", "sunday": True, "sun_end": "04:00 PM"},
        {"dept": "Emergency & Trauma", "start": "12:00 AM", "end": "11:59 PM", "sunday": True, "sun_end": "11:59 PM"},
        {"dept": "Nursing", "start": "12:00 AM", "end": "11:59 PM", "sunday": True, "sun_end": "11:59 PM"},
        {"dept": "Pharmacy", "start": "08:00 AM", "end": "11:00 PM", "sunday": True, "sun_end": "10:00 PM"},
        {"dept": "Laboratory", "start": "07:00 AM", "end": "09:00 PM", "sunday": True, "sun_end": "06:00 PM"},
        {"dept": "Central Store", "start": "08:00 AM", "end": "08:00 PM", "sunday": False},
        {"dept": "Accounts & Billing", "start": "08:00 AM", "end": "10:00 PM", "sunday": True, "sun_end": "08:00 PM"},
        {"dept": "Front Desk", "start": "07:00 AM", "end": "10:00 PM", "sunday": True, "sun_end": "09:00 PM"},
        {"dept": "System Administration", "start": "09:00 AM", "end": "06:00 PM", "sunday": False},
    ]

    for dh in departments_hours:
        dept = dh["dept"]
        for day in days_of_week:
            is_sun = (day == "Sun")
            is_working = dh.get("sunday", False) if is_sun else True
            start_t = dh["start"]
            end_t = dh.get("sun_end", dh["end"]) if is_sun else dh["end"]
            
            existing_wh = db.scalar(
                select(WorkingHours).where(
                    WorkingHours.department == dept,
                    WorkingHours.day_of_week == day
                )
            )
            if existing_wh:
                existing_wh.start_time = start_t
                existing_wh.end_time = end_t
                existing_wh.slot_duration_minutes = 15
                existing_wh.max_patients_per_slot = 1
                existing_wh.is_working_day = is_working
            else:
                wh = WorkingHours(
                    department=dept,
                    day_of_week=day,
                    start_time=start_t,
                    end_time=end_t,
                    slot_duration_minutes=15,
                    max_patients_per_slot=1,
                    is_working_day=is_working,
                )
                db.add(wh)

    # 2. Staff Shift Rotations for All Users & Roles
    all_users = list(db.scalars(select(User)).all())
    for u in all_users:
        emp_id = u.employee_id or f"EMP-{u.username.upper() if u.username else str(u.id)[:6]}"
        role_str = str(u.role).lower().replace("userrole.", "")
        
        # Determine logical shift per role
        assigned_shift = "Morning"
        if role_str == "nurse":
            assigned_shift = "Morning" if "srirangam" in (u.branch or "").lower() else ("Evening" if "thillai" in (u.branch or "").lower() else "Morning")
        elif role_str == "admin":
            assigned_shift = "Morning"
        elif role_str == "store":
            assigned_shift = "Morning"
            
        existing_shift = db.scalar(
            select(ShiftRotation).where(
                (ShiftRotation.employee_id == emp_id) |
                (ShiftRotation.employee_name == u.name)
            )
        )
        if existing_shift:
            existing_shift.employee_id = emp_id
            existing_shift.employee_name = u.name
            existing_shift.department = u.department or "General"
            existing_shift.branch = u.branch or "Main Branch"
            existing_shift.assigned_shift = assigned_shift
            existing_shift.morning_shift = "08:00 AM - 04:00 PM"
            existing_shift.evening_shift = "02:00 PM - 10:00 PM"
            existing_shift.night_shift = "10:00 PM - 06:00 AM"
            existing_shift.start_date = "2026-01-01"
            existing_shift.end_date = "2026-12-31"
            existing_shift.status = "Active"
        else:
            shift = ShiftRotation(
                employee_id=emp_id,
                employee_name=u.name,
                department=u.department or "General",
                branch=u.branch or "Main Branch",
                assigned_shift=assigned_shift,
                morning_shift="08:00 AM - 04:00 PM",
                evening_shift="02:00 PM - 10:00 PM",
                night_shift="10:00 PM - 06:00 AM",
                start_date="2026-01-01",
                end_date="2026-12-31",
                status="Active",
            )
            db.add(shift)

    print(f"Successfully seeded and synchronized Working Hours for {len(departments_hours)} departments and Shift Rotations for all {len(all_users)} hospital staff!")


# ===========================================================================
# 9. Hospital Beds Allocation (Srirangam, Cantonment, Thillainagar)
# ===========================================================================
def seed_beds(db) -> None:
    """
    Seeds and updates full IPD beds inventory across all hospital branches,
    with dedicated allocations for Srirangam Branch, Cantonment Branch,
    and Thillainagar Branch across General Ward, ICU, Deluxe Suite,
    Semi-Private, and Surgical Wards.
    """
    beds_data = [
        # ===================================================================
        # BRANCH: SRIRANGAM BRANCH (CCMH-SRG)
        # ===================================================================
        # --- General Ward ---
        {"bed_number": "SRG-GW-101", "ward": "General Ward", "room_number": "GW-101", "category": "Standard", "daily_rate": 1200.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Balan", "nurse": "Nurse Srirangam", "status": BedStatus.Available},
        {"bed_number": "SRG-GW-102", "ward": "General Ward", "room_number": "GW-101", "category": "Standard", "daily_rate": 1200.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Balan", "nurse": "Nurse Srirangam", "status": BedStatus.Available},
        {"bed_number": "SRG-GW-103", "ward": "General Ward", "room_number": "GW-102", "category": "Standard", "daily_rate": 1200.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Balan", "nurse": "Nurse Srirangam", "status": BedStatus.Available},
        {"bed_number": "SRG-GW-104", "ward": "General Ward", "room_number": "GW-102", "category": "Standard", "daily_rate": 1200.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Balan", "nurse": "Nurse Srirangam", "status": BedStatus.Occupied},
        {"bed_number": "SRG-GW-105", "ward": "General Ward", "room_number": "GW-103", "category": "Standard", "daily_rate": 1200.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Balan", "nurse": "Nurse Srirangam", "status": BedStatus.Available},
        {"bed_number": "SRG-GW-106", "ward": "General Ward", "room_number": "GW-103", "category": "Standard", "daily_rate": 1200.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Balan", "nurse": "Nurse Srirangam", "status": BedStatus.Available},
        {"bed_number": "SRG-GW-107", "ward": "General Ward", "room_number": "GW-104", "category": "Standard", "daily_rate": 1200.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Balan", "nurse": "Nurse Srirangam", "status": BedStatus.Cleaning},
        {"bed_number": "SRG-GW-108", "ward": "General Ward", "room_number": "GW-104", "category": "Standard", "daily_rate": 1200.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Balan", "nurse": "Nurse Srirangam", "status": BedStatus.Available},

        # --- Intensive Care Unit (ICU) ---
        {"bed_number": "SRG-ICU-201", "ward": "ICU", "room_number": "ICU-201", "category": "ICU", "daily_rate": 5000.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Senthil", "nurse": "Nurse Srirangam", "status": BedStatus.Available},
        {"bed_number": "SRG-ICU-202", "ward": "ICU", "room_number": "ICU-202", "category": "ICU", "daily_rate": 5000.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Senthil", "nurse": "Nurse Srirangam", "status": BedStatus.Occupied},
        {"bed_number": "SRG-ICU-203", "ward": "ICU", "room_number": "ICU-203", "category": "ICU", "daily_rate": 5000.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Senthil", "nurse": "Nurse Srirangam", "status": BedStatus.Available},
        {"bed_number": "SRG-ICU-204", "ward": "ICU", "room_number": "ICU-204", "category": "ICU", "daily_rate": 5000.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Senthil", "nurse": "Nurse Srirangam", "status": BedStatus.Available},

        # --- Deluxe Suite ---
        {"bed_number": "SRG-DLX-301", "ward": "Deluxe Suite", "room_number": "DLX-301", "category": "Deluxe", "daily_rate": 4000.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Senthil", "nurse": "Nurse Srirangam", "status": BedStatus.Available},
        {"bed_number": "SRG-DLX-302", "ward": "Deluxe Suite", "room_number": "DLX-302", "category": "Deluxe", "daily_rate": 4000.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Senthil", "nurse": "Nurse Srirangam", "status": BedStatus.Available},
        {"bed_number": "SRG-DLX-303", "ward": "Deluxe Suite", "room_number": "DLX-303", "category": "Deluxe", "daily_rate": 4000.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Senthil", "nurse": "Nurse Srirangam", "status": BedStatus.Occupied},
        {"bed_number": "SRG-DLX-304", "ward": "Deluxe Suite", "room_number": "DLX-304", "category": "Deluxe", "daily_rate": 4000.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Senthil", "nurse": "Nurse Srirangam", "status": BedStatus.Available},

        # --- Semi-Private ---
        {"bed_number": "SRG-SP-401", "ward": "Semi-Private", "room_number": "SP-401", "category": "Semi-Private", "daily_rate": 2200.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Balan", "nurse": "Nurse Srirangam", "status": BedStatus.Available},
        {"bed_number": "SRG-SP-402", "ward": "Semi-Private", "room_number": "SP-401", "category": "Semi-Private", "daily_rate": 2200.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Balan", "nurse": "Nurse Srirangam", "status": BedStatus.Available},
        {"bed_number": "SRG-SP-403", "ward": "Semi-Private", "room_number": "SP-402", "category": "Semi-Private", "daily_rate": 2200.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Balan", "nurse": "Nurse Srirangam", "status": BedStatus.Available},
        {"bed_number": "SRG-SP-404", "ward": "Semi-Private", "room_number": "SP-402", "category": "Semi-Private", "daily_rate": 2200.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Balan", "nurse": "Nurse Srirangam", "status": BedStatus.Available},

        # --- Surgical Ward ---
        {"bed_number": "SRG-SUR-501", "ward": "Surgical Ward", "room_number": "SUR-501", "category": "Surgical", "daily_rate": 2500.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Senthil", "nurse": "Nurse Srirangam", "status": BedStatus.Available},
        {"bed_number": "SRG-SUR-502", "ward": "Surgical Ward", "room_number": "SUR-501", "category": "Surgical", "daily_rate": 2500.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Senthil", "nurse": "Nurse Srirangam", "status": BedStatus.Available},
        {"bed_number": "SRG-SUR-503", "ward": "Surgical Ward", "room_number": "SUR-502", "category": "Surgical", "daily_rate": 2500.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Senthil", "nurse": "Nurse Srirangam", "status": BedStatus.Available},
        {"bed_number": "SRG-SUR-504", "ward": "Surgical Ward", "room_number": "SUR-502", "category": "Surgical", "daily_rate": 2500.0, "branch": BRANCH_SRIRANGAM, "doctor": "Dr. Senthil", "nurse": "Nurse Srirangam", "status": BedStatus.Available},

        # ===================================================================
        # BRANCH: CANTONMENT BRANCH (CCMH-CAN)
        # ===================================================================
        {"bed_number": "CAN-GW-101", "ward": "General Ward", "room_number": "GW-101", "category": "Standard", "daily_rate": 1200.0, "branch": BRANCH_CANTONMENT, "doctor": "Dr. Martin", "nurse": "Nurse Cantonment", "status": BedStatus.Available},
        {"bed_number": "CAN-GW-102", "ward": "General Ward", "room_number": "GW-101", "category": "Standard", "daily_rate": 1200.0, "branch": BRANCH_CANTONMENT, "doctor": "Dr. Martin", "nurse": "Nurse Cantonment", "status": BedStatus.Available},
        {"bed_number": "CAN-GW-103", "ward": "General Ward", "room_number": "GW-102", "category": "Standard", "daily_rate": 1200.0, "branch": BRANCH_CANTONMENT, "doctor": "Dr. Martin", "nurse": "Nurse Cantonment", "status": BedStatus.Occupied},
        {"bed_number": "CAN-GW-104", "ward": "General Ward", "room_number": "GW-102", "category": "Standard", "daily_rate": 1200.0, "branch": BRANCH_CANTONMENT, "doctor": "Dr. Martin", "nurse": "Nurse Cantonment", "status": BedStatus.Available},
        {"bed_number": "CAN-ICU-201", "ward": "ICU", "room_number": "ICU-201", "category": "ICU", "daily_rate": 5000.0, "branch": BRANCH_CANTONMENT, "doctor": "Dr. Mani", "nurse": "Nurse Cantonment", "status": BedStatus.Available},
        {"bed_number": "CAN-ICU-202", "ward": "ICU", "room_number": "ICU-202", "category": "ICU", "daily_rate": 5000.0, "branch": BRANCH_CANTONMENT, "doctor": "Dr. Mani", "nurse": "Nurse Cantonment", "status": BedStatus.Occupied},
        {"bed_number": "CAN-DLX-301", "ward": "Deluxe Suite", "room_number": "DLX-301", "category": "Deluxe", "daily_rate": 4000.0, "branch": BRANCH_CANTONMENT, "doctor": "Dr. Mani", "nurse": "Nurse Cantonment", "status": BedStatus.Available},
        {"bed_number": "CAN-SP-401", "ward": "Semi-Private", "room_number": "SP-401", "category": "Semi-Private", "daily_rate": 2200.0, "branch": BRANCH_CANTONMENT, "doctor": "Dr. Martin", "nurse": "Nurse Cantonment", "status": BedStatus.Available},
        {"bed_number": "CAN-SUR-501", "ward": "Surgical Ward", "room_number": "SUR-501", "category": "Surgical", "daily_rate": 2500.0, "branch": BRANCH_CANTONMENT, "doctor": "Dr. S. Karthikeyan", "nurse": "Nurse Cantonment", "status": BedStatus.Available},

        # ===================================================================
        # BRANCH: THILLAINAGAR BRANCH (CCMH-TN)
        # ===================================================================
        {"bed_number": "TN-GW-101", "ward": "General Ward", "room_number": "GW-101", "category": "Standard", "daily_rate": 1200.0, "branch": BRANCH_THILLAINAGAR, "doctor": "Dr. Nivetha", "nurse": "Nurse Thillainagar", "status": BedStatus.Available},
        {"bed_number": "TN-GW-102", "ward": "General Ward", "room_number": "GW-101", "category": "Standard", "daily_rate": 1200.0, "branch": BRANCH_THILLAINAGAR, "doctor": "Dr. Nivetha", "nurse": "Nurse Thillainagar", "status": BedStatus.Available},
        {"bed_number": "TN-ICU-201", "ward": "ICU", "room_number": "ICU-201", "category": "ICU", "daily_rate": 5000.0, "branch": BRANCH_THILLAINAGAR, "doctor": "Dr. Aravind", "nurse": "Nurse Thillainagar", "status": BedStatus.Available},
        {"bed_number": "TN-DLX-301", "ward": "Deluxe Suite", "room_number": "DLX-301", "category": "Deluxe", "daily_rate": 4000.0, "branch": BRANCH_THILLAINAGAR, "doctor": "Dr. Aravind", "nurse": "Nurse Thillainagar", "status": BedStatus.Available},
        {"bed_number": "TN-SP-401", "ward": "Semi-Private", "room_number": "SP-401", "category": "Semi-Private", "daily_rate": 2200.0, "branch": BRANCH_THILLAINAGAR, "doctor": "Dr. Nivetha", "nurse": "Nurse Thillainagar", "status": BedStatus.Available},
        {"bed_number": "TN-SUR-501", "ward": "Surgical Ward", "room_number": "SUR-501", "category": "Surgical", "daily_rate": 2500.0, "branch": BRANCH_THILLAINAGAR, "doctor": "Dr. Aravind", "nurse": "Nurse Thillainagar", "status": BedStatus.Available},
    ]

    for b in beds_data:
        existing = db.scalar(select(Bed).where(Bed.bed_number == b["bed_number"]))
        if existing:
            existing.ward = b["ward"]
            existing.room_number = b["room_number"]
            existing.category = b["category"]
            existing.daily_rate = b["daily_rate"]
            existing.branch = b["branch"]
            existing.doctor_assigned = b["doctor"]
            existing.nurse_in_charge = b["nurse"]
            existing.status = b["status"]
        else:
            bed = Bed(
                bed_number=b["bed_number"],
                ward=b["ward"],
                room_number=b["room_number"],
                category=b["category"],
                daily_rate=b["daily_rate"],
                branch=b["branch"],
                doctor_assigned=b["doctor"],
                nurse_in_charge=b["nurse"],
                status=b["status"],
            )
            db.add(bed)

    srg_count = sum(1 for b in beds_data if b["branch"] == BRANCH_SRIRANGAM)
    print(f"Successfully seeded {len(beds_data)} beds with dedicated allocation of {srg_count} beds for {BRANCH_SRIRANGAM}!")


# ===========================================================================
# Master Seeder Runner
# ===========================================================================
def seed_database() -> None:
    # Run alembic upgrade head before seeding. create_all fills model tables
    # that are missing from older legacy migrations.
    Base.metadata.create_all(bind=engine)
    seed_super_admin()

    db = SessionLocal()
    try:
        seed_hospital_profile(db)
        seed_branches(db)
        seed_departments(db)
        seed_pharmacy_categories(db)
        seed_users(db)
        seed_doctors_and_availability(db)
        seed_working_hours_and_staff_shifts(db)
        seed_all_tablets_and_branch_stock(db)
        seed_beds(db)
        db.commit()
        print("\n=======================================================")
        print("âœ… Database seeding completed successfully!")
        print("=======================================================")
    except Exception as e:
        db.rollback()
        print(f"\nâŒ Error seeding database: {e}")
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()

