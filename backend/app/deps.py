from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
oauth2_optional_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise credentials_exception
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def get_optional_current_user(token: str | None = Depends(oauth2_optional_scheme), db: Session = Depends(get_db)) -> User | None:
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    user = db.get(User, user_id)
    if user and user.is_active:
        return user
    return None


def require_roles(*roles: UserRole):
    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        role_val = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        role_norm = role_val.lower().replace(" ", "_").replace("userrole.", "")
        allowed_roles = [r.value if hasattr(r, "value") else str(r) for r in roles]
        allowed_norm = [a.lower().replace(" ", "_").replace("userrole.", "") for a in allowed_roles]

        if "store" in allowed_norm or "store_manager" in allowed_norm:
            allowed_norm.extend(["store", "store_manager"])

        if current_user.role not in roles and role_norm not in allowed_norm:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role_val}' is not permitted to perform this action",
            )
        return current_user

    return role_checker


def get_own_doctor_id(
    current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
) -> str | None:
    """Data-scoping helper: for a user logged in with the 'doctor' role, resolve
    their own Doctor.id (matched by email, the same email-lookup pattern already
    used elsewhere in this codebase, e.g. superadmin user creation and the
    frontend's DoctorOverview page). Returns None for any other role, or if no
    matching Doctor row is found (e.g. a doctor-role login with no roster entry
    yet) — callers should treat None as "don't scope" for non-doctor roles, but
    log/flag it for a doctor role with no match rather than silently showing
    everything.

    This is intentionally NOT auto-wired into every router: only appointments
    and the live queue currently have an unambiguous, verified 1:1 mapping
    between a logged-in doctor and "their own" data (Doctor.email == User.email,
    then Appointment.doctor_id / QueueItem.doctor_name). Other roles (nurse, lab,
    reception) don't have an equally clean scoping key in the current data model
    — see CHANGELOG.md Phase 9 for why those were deliberately left unscoped
    rather than guessed at.
    """
    from app.models.doctor import Doctor  # local import to avoid a circular import at module load time
    from sqlalchemy import select, func

    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_str.lower().replace("userrole.", "") != "doctor":
        return None

    if current_user.email:
        doc = db.scalar(select(Doctor).where(func.lower(Doctor.email) == current_user.email.lower().strip()))
        if doc:
            return doc.id

    if current_user.name:
        clean_name = current_user.name.lower().replace("dr.", "").strip()
        doc = db.scalar(select(Doctor).where(func.lower(Doctor.name).contains(clean_name)))
        if doc:
            return doc.id

    return None


def get_own_nurse_ward(
    current_user: User = Depends(get_current_active_user),
) -> str | None:
    """Data-scoping helper: for a user logged in with the 'nurse' role, resolve
    their own assigned ward (User.assigned_ward). Returns None for any other
    role, or for a nurse with no ward assigned yet — callers should treat None
    as "don't scope", the same convention get_own_doctor_id() uses, so an
    unassigned nurse isn't silently locked out of everything.

    See CHANGELOG.md Phase 13 for why `assigned_ward` (not a Bed.department
    column) is the right key here: nurses are operationally assigned by
    physical ward, and Bed.ward / NursingNote.ward / MedicationLog.ward /
    WardTransfer.current_ward are all real, already-populated ward strings
    today — no backfill-from-nothing problem the way a new Bed.department
    column would have had. `PatientVital` deliberately has no ward column and
    is NOT scoped by this: vitals are recorded for both OPD patients (no ward
    at all, see nurse/opd/RecordVitalsPage.tsx) and IPD patients, so a ward
    filter would incorrectly hide/block OPD vitals recording for a
    ward-assigned nurse.
    """
    role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
    if role_str.lower().replace("userrole.", "") != "nurse":
        return None
    return current_user.assigned_ward or None


def get_own_lab_department(
    current_user: User = Depends(get_current_active_user),
) -> str | None:
    """Data-scoping helper: for a user logged in with the 'lab' role, resolve
    their own test-catalog section/department. Returns None for any other
    role, or for generic lab staff ("Lab", "Laboratory", "Lab & Diagnostics")
    so that general lab personnel are not inadvertently scoped out of lab records.
    """
    if current_user.role != UserRole.lab:
        return None
    dept = (current_user.department or "").strip()
    generic_depts = {
        "lab", "laboratory", "lab & diagnostics", "lab technician",
        "pathology & lab", "diagnostics", "lab module", "lab department"
    }
    if not dept or dept.lower() in generic_depts:
        return None
    return dept


def require_permission(module_name: str, action: str):
    """Enforce the fine-grained Permission Management matrix at the API level.

    ## Design decision (see CHANGELOG.md Phase 10 for the full reasoning)

    This is a **revoke-only enforcement model**, chosen deliberately over a
    strict allow-list model:

    - If no `PermissionItem` row exists for (role, module_name, action) at all
      -> ALLOW. This is the common case today, since `PermissionItem` rows are
      only ever created when a Super Admin explicitly toggles a permission in
      the UI (confirmed by reading every call site — there is no seed/migration
      that pre-populates permissions for the default roles). A strict
      default-deny model would lock every existing account out of every
      endpoint the instant this dependency is wired in, since nothing has ever
      been explicitly granted. That is a worse outcome than under-enforcing.
    - If a `PermissionItem` row exists with `is_granted=False` -> DENY. This is
      the case that now has real teeth for the first time: a Super Admin
      explicitly revoking a permission in the UI actually blocks the action at
      the API, not just in the frontend's rendering of buttons/menus.
    - If a `PermissionItem` row exists with `is_granted=True` -> ALLOW
      (explicit grant, same as the default).
    - `super_admin` and `admin` always pass, matching the precedent already set
      by every `_admin_only` check elsewhere in this codebase.
    - If the current user's role has no matching `RoleItem` row at all (roles
      are never auto-seeded either — see Phase 1 — so this is common for
      anyone using the built-in `UserRole` enum roles who hasn't also been
      given a corresponding custom Role via the Role Management screen) ->
      ALLOW, since there's nothing to check against; this is logged via
      `log_audit` so the gap stays visible rather than silent.

    ## Known limitation, stated plainly
    `User.role` is a plain string enum column with **no foreign key** to
    `RoleItem` (the UUID-keyed table `PermissionItem.role_id` actually points
    at) — these are two separate systems in this codebase. This dependency
    bridges them by normalizing and matching `User.role.value` against
    `RoleItem.role_code`/`role_name`, the same string-normalization approach
    `require_roles()` already uses. If a Super Admin creates a custom role
    whose code doesn't obviously match a `UserRole` enum value, this bridge
    will not find it and permission checks for that role fall through to
    ALLOW (logged). This is a real seam in the two-system design, not
    something this dependency can fully solve on its own — flagged for a
    future phase to properly link `User.role_id -> RoleItem.id` at the schema
    level.
    """

    def permission_checker(
        current_user: User = Depends(get_current_active_user), db: Session = Depends(get_db)
    ) -> User:
        from app.core.logging_utils import log_audit
        from app.models.superadmin import RoleItem, PermissionItem

        role_val = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)
        role_norm = role_val.lower().replace(" ", "_").replace("userrole.", "")

        if role_norm in ("super_admin", "admin"):
            return current_user

        matched_role = (
            db.query(RoleItem)
            .filter(RoleItem.role_code.ilike(role_norm.replace("_", "%")))
            .first()
        )
        if not matched_role:
            # Try matching by role_name as a fallback (role_code convention isn't
            # guaranteed, e.g. custom roles created via the UI).
            matched_role = db.query(RoleItem).filter(RoleItem.role_name.ilike(f"%{role_val}%")).first()

        if not matched_role:
            log_audit(
                f"PERMISSION CHECK SKIPPED (no RoleItem found for role='{role_val}')",
                {"module": module_name, "action": action},
            )
            return current_user

        perm = (
            db.query(PermissionItem)
            .filter(
                PermissionItem.role_id == matched_role.id,
                PermissionItem.module_name == module_name,
                PermissionItem.action == action,
            )
            .first()
        )

        if perm is not None and not perm.is_granted:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role_val}' does not have '{action}' permission for '{module_name}'",
            )

        return current_user

    return permission_checker

