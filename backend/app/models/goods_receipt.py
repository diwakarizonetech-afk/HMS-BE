import enum

from sqlalchemy import String, Integer, Enum, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.mixins import UUIDPKMixin, TimestampMixin


class GRNStatus(str, enum.Enum):
    Received = "Received"
    Verified = "Verified"
    Completed = "Completed"


class GoodsReceipt(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "goods_receipts"

    grn_number: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    po_number: Mapped[str] = mapped_column(String(50), nullable=True)
    purchase_order_id: Mapped[str | None] = mapped_column(
        ForeignKey("purchase_orders.id", ondelete="SET NULL"), nullable=True
    )
    vendor_name: Mapped[str] = mapped_column(String(200), nullable=False)
    received_date: Mapped[str] = mapped_column(String(20), nullable=False)
    remarks: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[GRNStatus] = mapped_column(Enum(GRNStatus, name="grn_status"), default=GRNStatus.Received)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)

    items: Mapped[list["GRNItem"]] = relationship(back_populates="goods_receipt", cascade="all, delete-orphan")


class GRNItem(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "grn_items"

    goods_receipt_id: Mapped[str] = mapped_column(ForeignKey("goods_receipts.id", ondelete="CASCADE"), nullable=False)
    item_id: Mapped[str | None] = mapped_column(ForeignKey("item_master.id", ondelete="SET NULL"), nullable=True)
    item_code: Mapped[str] = mapped_column(String(50), nullable=False)
    item_name: Mapped[str] = mapped_column(String(200), nullable=False)
    received_quantity: Mapped[int] = mapped_column(Integer, default=0)
    accepted_quantity: Mapped[int] = mapped_column(Integer, default=0)
    rejected_quantity: Mapped[int] = mapped_column(Integer, default=0)

    goods_receipt: Mapped["GoodsReceipt"] = relationship(back_populates="items")
