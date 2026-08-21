import enum

from sqlalchemy import String, Integer, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import UUIDPKMixin, TimestampMixin


class BatchStatus(str, enum.Enum):
    Expired = "Expired"
    Near_Expiry = "Near Expiry"
    Normal = "Normal"


class BatchItem(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "batch_items"

    item_id: Mapped[str | None] = mapped_column(ForeignKey("item_master.id", ondelete="SET NULL"), nullable=True)
    batch_number: Mapped[str] = mapped_column(String(100), nullable=False)
    item_code: Mapped[str] = mapped_column(String(50), nullable=False)
    item_name: Mapped[str] = mapped_column(String(200), nullable=False)
    mfg_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    manufacturing_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    expiry_date: Mapped[str] = mapped_column(String(20), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    available_quantity: Mapped[int] = mapped_column(Integer, default=0)
    expired_quantity: Mapped[int] = mapped_column(Integer, default=0)
    days_to_expiry: Mapped[int] = mapped_column(Integer, default=0)
    supplier_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    location: Mapped[str | None] = mapped_column(String(150), nullable=True)
    status: Mapped[BatchStatus] = mapped_column(Enum(BatchStatus, name="batch_status"), default=BatchStatus.Normal)



class StoreActivityStatus(str, enum.Enum):
    Completed = "Completed"
    Pending = "Pending"
    Approved = "Approved"
    In_Progress = "In Progress"
    Alert = "Alert"


class StoreActivity(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "store_activity"

    date: Mapped[str] = mapped_column(String(20), nullable=False)
    activity: Mapped[str] = mapped_column(String(200), nullable=False)
    item: Mapped[str] = mapped_column(String(200), nullable=True)
    quantity: Mapped[str] = mapped_column(String(50), nullable=True)
    user: Mapped[str] = mapped_column(String(150), nullable=True)
    status: Mapped[StoreActivityStatus] = mapped_column(
        Enum(StoreActivityStatus, name="store_activity_status"), default=StoreActivityStatus.Completed
    )
