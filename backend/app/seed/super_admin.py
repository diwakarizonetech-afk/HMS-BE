# Super Admin & Core Application Seed File.
# Ensures System Roles, Accounts, Hospital Profile, and Departments are initialized.
# All default accounts use password: ChangeMe@123

from sqlalchemy import select, text
from app.core.database import SessionLocal, engine, Base
from app.core.security import hash_password
import app.models  # noqa ensure all models are registered

from app.models.user import User, UserRole
from app.models.superadmin import RoleItem, PermissionItem, HospitalProfile, Branch, Specialization
from app.models.doctor import Department


INITIAL_MODULES = [
    'Patient Management',
    'Appointment Mgmt',
    'IPD Bed Allocation',
    'Pharmacy & Drugs',
    'Lab & Diagnostics',
    'Inventory & Store',
    'Billing & Accounts',
    'Super Admin & Setup',
]

ACTIONS = ['View', 'Create', 'Update', 'Delete', 'Export', 'Print', 'Manage', 'Assign']

DEFAULT_ROLES_DATA = [
    {
        "code": "SUPER_ADMIN",
        "name": "Super Admin",
        "desc": "System Administrator with full access rights.",
        "user_role": UserRole.super_admin,
    },
    {
        "code": "RECEPTION",
        "name": "Receptionist",
        "desc": "Front desk management for patient registration, appointments, and billing.",
        "user_role": UserRole.reception,
    },
    {
        "code": "DOCTOR",
        "name": "Doctor",
        "desc": "Clinical practitioner managing OP/IP patients, vitals, prescriptions, and consults.",
        "user_role": UserRole.doctor,
    },
    {
        "code": "NURSE",
        "name": "Nurse",
        "desc": "Nursing staff responsible for IPD bed care, vitals tracking, and medication logs.",
        "user_role": UserRole.nurse,
    },
    {
        "code": "STORE_MANAGER",
        "name": "Store Manager",
        "desc": "Inventory control, stock inward/outward, batch expiry, and purchase orders.",
        "user_role": UserRole.store_manager,
    },
    {
        "code": "LAB",
        "name": "Lab Technician",
        "desc": "Diagnostics and lab test processing.",
        "user_role": UserRole.lab,
    },
    {
        "code": "PHARMACY",
        "name": "Pharmacist",
        "desc": "Pharmacy stock and drug distribution.",
        "user_role": UserRole.pharmacy,
    },
    {
        "code": "ADMIN",
        "name": "Administrator",
        "desc": "Hospital operations administrator.",
        "user_role": UserRole.admin,
    },
]

DEFAULT_USERS_DATA = [
    {
        "username": "superadmin",
        "name": "Super Admin",
        "email": "admin@hospital.com",
        "role": UserRole.super_admin,
        "department": "System Administration",
        "employee_id": "EMP-SA-001",
        "phone": "+1 800 555 0199",
    },
    {
        "username": "reception",
        "name": "Sarah Jenkins",
        "email": "reception@hospital.com",
        "role": UserRole.reception,
        "department": "Front Desk & Reception",
        "employee_id": "EMP-REC-001",
        "phone": "+1 800 555 0101",
    },
    {
        "username": "doctor",
        "name": "Dr. Vikram Malhotra",
        "email": "doctor@hospital.com",
        "role": UserRole.doctor,
        "department": "Cardiology",
        "employee_id": "EMP-DOC-001",
        "phone": "+1 800 555 0102",
    },
    {
        "username": "nurse",
        "name": "Nurse Anjali Rao",
        "email": "nurse@hospital.com",
        "role": UserRole.nurse,
        "department": "IPD Ward",
        "employee_id": "EMP-NRS-001",
        "phone": "+1 800 555 0103",
    },
    {
        "username": "store",
        "name": "Suresh Kumar",
        "email": "store@hospital.com",
        "role": UserRole.store_manager,
        "department": "Central Store & Inventory",
        "employee_id": "EMP-STR-001",
        "phone": "+1 800 555 0104",
    },
    {
        "username": "lab",
        "name": "Rajesh Mehta",
        "email": "lab@hospital.com",
        "role": UserRole.lab,
        "department": "Diagnostics & Pathology",
        "employee_id": "EMP-LAB-001",
        "phone": "+1 800 555 0105",
    },
    {
        "username": "pharmacy",
        "name": "Priya Sharma",
        "email": "pharmacy@hospital.com",
        "role": UserRole.pharmacy,
        "department": "Pharmacy",
        "employee_id": "EMP-PHR-001",
        "phone": "+1 800 555 0106",
    },
    {
        "username": "admin",
        "name": "Alexander Wright",
        "email": "admin@hms.com",
        "role": UserRole.admin,
        "department": "Hospital Operations",
        "employee_id": "EMP-ADM-001",
        "phone": "+1 800 555 0107",
    },
]


def seed_super_admin() -> None:
    Base.metadata.create_all(bind=engine)
    
    # Ensure missing user, hospital_profile & notification columns exist
    with engine.begin() as conn:
        for col_sql in [
            "ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50) USING role::text",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(100)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active'",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS branch VARCHAR(200)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login VARCHAR(50)",
            "ALTER TABLE hospital_profiles ADD COLUMN IF NOT EXISTS logo TEXT",
            "ALTER TABLE hospital_profiles ADD COLUMN IF NOT EXISTS hospital_logo_url TEXT",
            "ALTER TABLE hospital_profiles ADD COLUMN IF NOT EXISTS license_number VARCHAR(100)",
            "ALTER TABLE hospital_profiles ADD COLUMN IF NOT EXISTS timezone VARCHAR(100)",
            "ALTER TABLE hospital_profiles ADD COLUMN IF NOT EXISTS currency VARCHAR(50)",
            "ALTER TABLE hospital_profiles ADD COLUMN IF NOT EXISTS established_year VARCHAR(20)",
            "ALTER TABLE hospital_profiles ADD COLUMN IF NOT EXISTS accreditation VARCHAR(200)",
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS module VARCHAR(100)",
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS event_type VARCHAR(100)",
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_id VARCHAR(100)",
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS sender_name VARCHAR(150)",
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_role VARCHAR(50)",
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_record_id VARCHAR(100)",
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium'",
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'unread'",
        ]:
            try:
                conn.execute(text(col_sql))
            except Exception:
                pass

    db = SessionLocal()
    try:
        # 1. System Hospital Profile — create if missing
        profile = db.scalar(select(HospitalProfile))
        if not profile:
            profile = HospitalProfile(
                hospital_name="Apex Multi-Specialty Hospital",
                hospital_code="HOSP-001",
                tagline="Excellence in Healthcare & Patient Compassion",
                registration_number="REG-2024-9982",
                license_number="LIC-MED-7712",
                tax_id="TAX-994812",
                phone="+91 80000 12345",
                email="info@apex-hospital.com",
                website="https://apex-hospital.com",
                address="100 Healthcare Boulevard, Tech City",
                city="Central City",
                state="State Province",
                country="India",
                pincode="400001",
                timezone="Asia/Kolkata (IST +5:30)",
                currency="INR (₹)",
                establishment_year="2010",
                established_year="2010",
                accreditation="NABH & JCI Accredited",
                total_bed_capacity=250,
                emergency_contact_number="+91 80000 99999",
            )
            db.add(profile)
            db.commit()
            print("Created default Hospital Profile.")

        # 2. Main Branch — create if missing
        main_branch = db.scalar(select(Branch).where(Branch.branch_code == "MAIN-01"))
        if not main_branch:
            main_branch = Branch(
                branch_name="Apex Hospital Main Campus",
                branch_code="MAIN-01",
                address="100 Healthcare Boulevard, Tech City",
                city="Central City",
                state="State Province",
                country="India",
                pincode="400001",
                phone="+91 80000 12345",
                email="main@apex-hospital.com",
                status="Active",
                is_main_branch=True,
                bed_capacity=250,
                total_staff=120,
            )
            db.add(main_branch)
            db.commit()
            print("Created Main Hospital Branch.")

        # 3. System Roles & Default Permissions
        for role_info in DEFAULT_ROLES_DATA:
            r = db.scalar(select(RoleItem).where(RoleItem.role_code == role_info["code"]))
            if not r:
                r = RoleItem(
                    role_name=role_info["name"],
                    role_code=role_info["code"],
                    description=role_info["desc"],
                    is_system_default=True,
                    assigned_user_count=1,
                )
                db.add(r)
                db.commit()
                db.refresh(r)
                print(f"Created Role: {role_info['name']}.")

            # Ensure default permissions exist for this role
            existing_perm = db.scalar(select(PermissionItem).where(PermissionItem.role_id == r.id))
            if not existing_perm:
                for mod in INITIAL_MODULES:
                    # Grant all permissions to SUPER_ADMIN & ADMIN, selective for others
                    is_granted = True if role_info["code"] in ["SUPER_ADMIN", "ADMIN"] else (
                        (role_info["code"] == "RECEPTION" and mod in ['Patient Management', 'Appointment Mgmt', 'Billing & Accounts']) or
                        (role_info["code"] == "DOCTOR" and mod in ['Patient Management', 'Appointment Mgmt', 'IPD Bed Allocation', 'Lab & Diagnostics']) or
                        (role_info["code"] == "NURSE" and mod in ['IPD Bed Allocation', 'Pharmacy & Drugs', 'Patient Management']) or
                        (role_info["code"] in ["STORE_MANAGER", "STORE"] and mod in ['Inventory & Store', 'Pharmacy & Drugs']) or
                        (role_info["code"] == "LAB" and mod in ['Lab & Diagnostics']) or
                        (role_info["code"] == "PHARMACY" and mod in ['Pharmacy & Drugs', 'Inventory & Store'])
                    )
                    for act in ACTIONS:
                        perm = PermissionItem(
                            role_id=r.id,
                            module_name=mod,
                            action=act,
                            is_granted=is_granted,
                        )
                        db.add(perm)
                db.commit()
                print(f"Created permissions for role: {role_info['name']}.")

        # 4. System Users — create or update default accounts
        for u_data in DEFAULT_USERS_DATA:
            u = db.scalar(
                select(User).where(
                    (User.username == u_data["username"])
                    | (User.email == u_data["email"])
                )
            )
            if not u:
                u = User(
                    username=u_data["username"],
                    name=u_data["name"],
                    email=u_data["email"],
                    hashed_password=hash_password("ChangeMe@123"),
                    role=u_data["role"],
                    department=u_data["department"],
                    employee_id=u_data["employee_id"],
                    phone=u_data["phone"],
                    branch="Apex Hospital Main Campus",
                    status="Active",
                    is_active=True,
                )
                db.add(u)
                db.commit()
                print(f"Created user: {u_data['username']} ({u_data['email']}) / ChangeMe@123")
            else:
                u.hashed_password = hash_password("ChangeMe@123")
                u.status = "Active"
                u.is_active = True
                db.commit()
                print(f"Updated credentials for user: {u_data['username']}.")

        # 5. Default Departments — create if missing
        default_depts = [
            ("Cardiology", "Cardiovascular care and heart surgery."),
            ("General Medicine", "General outpatient and inpatient care."),
            ("Neurology", "Brain and nervous system disorders."),
            ("Orthopedics", "Bone and joint surgery."),
            ("Pediatrics", "Childhood medicine and child care."),
            ("Emergency & Trauma", "24/7 Casualty and critical emergency care."),
            ("IPD Ward", "In-patient department wards and ICU."),
            ("Pharmacy", "Drug dispensing and pharmacy operations."),
            ("Central Store & Inventory", "Medical supplies, reorder management, and stock control."),
            ("Diagnostics & Pathology", "Lab tests, radiology, and blood bank."),
        ]
        for dept_name, dept_desc in default_depts:
            dept = db.scalar(select(Department).where(Department.name == dept_name))
            if not dept:
                dept = Department(
                    name=dept_name,
                    description=dept_desc,
                    is_active=True,
                )
                db.add(dept)
        db.commit()
        print("Created default departments.")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_super_admin()
