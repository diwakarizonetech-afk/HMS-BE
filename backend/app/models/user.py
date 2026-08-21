import enum

from sqlalchemy import String, Enum
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import UUIDPKMixin, TimestampMixin


class UserRole(str, enum.Enum):
    reception = "reception"
    doctor = "doctor"
    nurse = "nurse"
    lab = "lab"
    pharmacy = "pharmacy"
    admin = "admin"
    patient = "patient"
    store = "store"
    store_manager = "store_manager"
    super_admin = "super_admin"
    billing = "billing"
    billing_manager = "billing_manager"


class User(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "users"

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    username: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True)
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(String(50), nullable=False)
    avatar: Mapped[str | None] = mapped_column(String(500), nullable=True)
    department: Mapped[str | None] = mapped_column(String(150), nullable=True)
    # Data-scoping key for the nurse role (see CHANGELOG.md Phase 13). Distinct
    # from `department` on purpose: nurses are operationally assigned by
    # physical ward (matches Bed.ward / NursingNote.ward / MedicationLog.ward /
    # WardTransfer.current_ward — all real, already-populated string data),
    # not by clinical specialty department the way doctors are. Nullable and
    # unset by default: an unassigned nurse is treated as "don't scope" (see
    # get_own_nurse_ward() in deps.py), matching the existing revoke-only /
    # allow-by-default philosophy rather than locking out every nurse account
    # the instant this column exists.
    assigned_ward: Mapped[str | None] = mapped_column(String(100), nullable=True)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)
    employee_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="Active")
    is_active: Mapped[bool] = mapped_column(default=True)
    last_login: Mapped[str | None] = mapped_column(String(50), nullable=True)

