import enum

from sqlalchemy import String, Integer, Float, Enum, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import UUIDPKMixin, TimestampMixin


class StockInward(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "stock_inward"

    inward_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    po_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    item_id: Mapped[str | None] = mapped_column(ForeignKey("item_master.id", ondelete="SET NULL"), nullable=True)
    item_code: Mapped[str] = mapped_column(String(50), nullable=False)
    item_name: Mapped[str] = mapped_column(String(200), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float | None] = mapped_column(Float, default=0.0)
    batch_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    expiry_date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    supplier: Mapped[str | None] = mapped_column(String(200), nullable=True)
    supplier_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    warehouse: Mapped[str | None] = mapped_column(String(150), nullable=True)
    received_by: Mapped[str | None] = mapped_column(String(150), nullable=True)
    date: Mapped[str] = mapped_column(String(20), nullable=False)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)


class StockOutward(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "stock_outward"

    outward_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    department: Mapped[str] = mapped_column(String(150), nullable=False)
    issued_to_department: Mapped[str | None] = mapped_column(String(150), nullable=True)
    ward: Mapped[str | None] = mapped_column(String(150), nullable=True)
    lab: Mapped[str | None] = mapped_column(String(150), nullable=True)
    pharmacy: Mapped[str | None] = mapped_column(String(150), nullable=True)
    operation_theatre: Mapped[str | None] = mapped_column(String(150), nullable=True)
    doctor: Mapped[str | None] = mapped_column(String(150), nullable=True)
    issued_to_person: Mapped[str | None] = mapped_column(String(150), nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    item_id: Mapped[str | None] = mapped_column(ForeignKey("item_master.id", ondelete="SET NULL"), nullable=True)
    item_code: Mapped[str] = mapped_column(String(50), nullable=False)
    item_name: Mapped[str] = mapped_column(String(200), nullable=False)
    batch_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    issued_by: Mapped[str | None] = mapped_column(String(150), nullable=True)
    date: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str | None] = mapped_column(String(50), default="Pending Approval")
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)


class TransferStatus(str, enum.Enum):
    Pending = "Pending"
    In_Transit = "In Transit"
    Completed = "Completed"
    Cancelled = "Cancelled"


class StockTransfer(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "stock_transfer"

    transfer_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    item_id: Mapped[str | None] = mapped_column(ForeignKey("item_master.id", ondelete="SET NULL"), nullable=True)
    source: Mapped[str] = mapped_column(String(150), nullable=False)
    destination: Mapped[str] = mapped_column(String(150), nullable=False)
    from_location: Mapped[str | None] = mapped_column(String(150), nullable=True)
    to_location: Mapped[str | None] = mapped_column(String(150), nullable=True)
    item_code: Mapped[str] = mapped_column(String(50), nullable=False)
    item_name: Mapped[str] = mapped_column(String(200), nullable=False)
    batch_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    transfer_date: Mapped[str] = mapped_column(String(20), nullable=False)
    date: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[TransferStatus] = mapped_column(
        Enum(TransferStatus, name="transfer_status"), default=TransferStatus.Pending
    )
    requested_by: Mapped[str | None] = mapped_column(String(150), nullable=True)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)


class AdjustmentType(str, enum.Enum):
    Damage = "Damage"
    Lost = "Lost"
    Expired = "Expired"
    Manual_Correction = "Manual Correction"
    Write_Off = "Write-Off"


class StockAdjustment(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "stock_adjustment"

    adjustment_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    item_id: Mapped[str | None] = mapped_column(ForeignKey("item_master.id", ondelete="SET NULL"), nullable=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False, default="Damage")
    item_code: Mapped[str] = mapped_column(String(50), nullable=False)
    item_name: Mapped[str] = mapped_column(String(200), nullable=False)
    current_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    adjusted_quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    approved_by: Mapped[str | None] = mapped_column(String(150), nullable=True)
    date: Mapped[str] = mapped_column(String(20), nullable=False)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)
