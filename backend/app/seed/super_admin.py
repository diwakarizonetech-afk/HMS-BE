# Application bootstrap seed.
#
# On a fresh database this creates exactly ONE record: the Super Admin
# account used to log in and configure the rest of the system (hospital
# profile, branches, departments, roles, and staff) from inside the app.
#
# No demo patients, doctors, medicines, inventory, appointments, roles,
# permissions, or hospital-profile data are seeded. Everything else is
# created by the Super Admin through the UI after first login.
#
# Credentials:
#   Email:    admin@hms.com
#   Password: admin123
#
# IMPORTANT: change this password after first login in a real deployment.

from sqlalchemy import select

from app.core.database import SessionLocal
from app.core.security import hash_password
import app.models  # noqa: F401 - ensures all models are registered on Base.metadata

from app.models.user import User, UserRole

SUPER_ADMIN_EMAIL = "admin@hms.com"
SUPER_ADMIN_PASSWORD = "admin123"


def seed_super_admin() -> None:
    """Idempotent bootstrap: ensures exactly one Super Admin user is present.\r\n    Run Alembic migrations before this seed on deploy/startup."""
    db = SessionLocal()
    try:
        existing = db.scalar(select(User).where(User.email == SUPER_ADMIN_EMAIL))
        if existing:
            existing.hashed_password = hash_password(SUPER_ADMIN_PASSWORD)
            existing.role = UserRole.admin
            existing.is_active = True
            existing.status = "Active"
            db.commit()
            print(f"Updated Super Admin account: {SUPER_ADMIN_EMAIL} / {SUPER_ADMIN_PASSWORD}")
            return

        admin = User(
            name="Super Admin",
            email=SUPER_ADMIN_EMAIL,
            hashed_password=hash_password(SUPER_ADMIN_PASSWORD),
            role=UserRole.admin,
            department="System Administration",
            status="Active",
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print(f"Seeded Super Admin account: {SUPER_ADMIN_EMAIL} / {SUPER_ADMIN_PASSWORD}")
    except Exception as e:
        db.rollback()
        print(f"Error seeding Super Admin account: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed_super_admin()

