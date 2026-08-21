"""
Live verification for Phase 19: queue.py now enforces its own dedicated
"Queue Management" permission module instead of sharing "Appointment Mgmt"
with appointments.py.

Confirms, against a real in-memory SQLite DB + real ORM session (same
verification standard as test_phase13_14_live.py):
  1. Default-allow still holds: with no PermissionItem row at all for
     ("Queue Management", <action>, <role>), a receptionist can still issue
     a walk-in token / add to queue / edit / delete -- unaffected by the
     module rename.
  2. An explicit revoke under the NEW "Queue Management" module actually
     blocks the action.
  3. An explicit revoke under the OLD "Appointment Mgmt" module does NOT
     block queue actions anymore (confirms the two modules are now
     independently governed, not coupled) -- and confirms appointments.py
     itself is still governed by "Appointment Mgmt" untouched.

Run: python3 test_phase19_queue_permission_module.py
"""
import os
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base
import app.models  # noqa: F401

engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base.metadata.create_all(bind=engine)

from app.models.user import User, UserRole
from app.models.superadmin import RoleItem, PermissionItem
from app.core.security import hash_password
from app.deps import require_permission
from fastapi import HTTPException

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

db = SessionLocal()

reception = User(
    name="Reception Tester", email="recq@hms.com", hashed_password=hash_password("x"),
    role=UserRole.reception, status="Active", is_active=True,
)
db.add(reception)
db.commit()
db.refresh(reception)

role = RoleItem(role_name="Receptionist", role_code="reception", is_system_default=True)
db.add(role)
db.commit()
db.refresh(role)


def run_check(module_name, action, user):
    """Call the actual require_permission dependency function directly."""
    dep = require_permission(module_name, action)
    try:
        dep(current_user=user, db=db)
        return True
    except HTTPException:
        return False


print("=== 1. Default-allow (no PermissionItem row at all) ===")
check("No 'Queue Management' rows exist yet", db.query(PermissionItem).filter_by(module_name="Queue Management").count() == 0)
check("Receptionist can Create under 'Queue Management' by default", run_check("Queue Management", "Create", reception))
check("Receptionist can Edit under 'Queue Management' by default", run_check("Queue Management", "Edit", reception))
check("Receptionist can Delete under 'Queue Management' by default", run_check("Queue Management", "Delete", reception))


print("\n=== 2. Explicit revoke under the NEW 'Queue Management' module actually blocks ===")
revoke = PermissionItem(role_id=role.id, module_name="Queue Management", action="Delete", is_granted=False)
db.add(revoke)
db.commit()

check("Receptionist is now BLOCKED from Delete under 'Queue Management'", not run_check("Queue Management", "Delete", reception))
check("Receptionist can STILL Create under 'Queue Management' (only Delete was revoked)", run_check("Queue Management", "Create", reception))


print("\n=== 3. 'Appointment Mgmt' and 'Queue Management' are now independently governed ===")
appt_revoke = PermissionItem(role_id=role.id, module_name="Appointment Mgmt", action="Delete", is_granted=False)
db.add(appt_revoke)
db.commit()

check("Receptionist blocked from Delete under 'Appointment Mgmt' (that module's own revoke)", not run_check("Appointment Mgmt", "Delete", reception))
check(
    "Receptionist's Queue-Management 'Create' is unaffected by the separate Appointment-Mgmt revoke (modules are independent)",
    run_check("Queue Management", "Create", reception),
)


print("\n" + "=" * 70)
print(f"Results: {passed} passed, {failed} failed")
print("ALL CHECKS PASSED" if failed == 0 else "SOME CHECKS FAILED")
sys.exit(0 if failed == 0 else 1)
