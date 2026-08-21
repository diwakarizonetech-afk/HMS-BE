import enum

from sqlalchemy import String, Integer, Float, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import UUIDPKMixin, TimestampMixin


class POStatus(str, enum.Enum):
    Draft = "Draft"
    Pending = "Pending"
    Approved = "Approved"
    Rejected = "Rejected"
    Fulfilled = "Fulfilled"


class PurchaseOrder(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "purchase_orders"

    po_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    vendor_id: Mapped[str | None] = mapped_column(ForeignKey("vendors.id", ondelete="SET NULL"), nullable=True)
    vendor_name: Mapped[str] = mapped_column(String(200), nullable=False)
    purchase_date: Mapped[str] = mapped_column(String(20), nullable=False)
    expected_delivery: Mapped[str] = mapped_column(String(20), nullable=True)
    sub_total: Mapped[float] = mapped_column(Float, default=0)
    total_discount: Mapped[float] = mapped_column(Float, default=0)
    total_gst: Mapped[float] = mapped_column(Float, default=0)
    total_amount: Mapped[float] = mapped_column(Float, default=0)
    status: Mapped[POStatus] = mapped_column(Enum(POStatus, name="po_status"), default=POStatus.Draft)
    created_date: Mapped[str] = mapped_column(String(20), nullable=False)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)

    items: Mapped[list["POItem"]] = relationship(back_populates="purchase_order", cascade="all, delete-orphan")


class POItem(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "po_items"

    purchase_order_id: Mapped[str] = mapped_column(ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False)
    item_id: Mapped[str | None] = mapped_column(ForeignKey("item_master.id", ondelete="SET NULL"), nullable=True)
    item_code: Mapped[str] = mapped_column(String(50), nullable=False)
    item_name: Mapped[str] = mapped_column(String(200), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[float] = mapped_column(Float, nullable=False)
    discount: Mapped[float] = mapped_column(Float, default=0)
    gst: Mapped[float] = mapped_column(Float, default=0)
    total: Mapped[float] = mapped_column(Float, default=0)

    purchase_order: Mapped["PurchaseOrder"] = relationship(back_populates="items")
