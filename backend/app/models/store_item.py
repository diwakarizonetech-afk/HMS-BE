import enum

from sqlalchemy import String, Integer, Float, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.mixins import UUIDPKMixin, TimestampMixin


class ItemCategory(str, enum.Enum):
    Pharmaceuticals = "Pharmaceuticals"
    Surgical_Supplies = "Surgical Supplies"
    Consumables = "Consumables"
    Lab_Reagents = "Lab Reagents"
    Medical_Equipment = "Medical Equipment"
    General_Store = "General Store"


class ItemUnit(str, enum.Enum):
    Box = "Box"
    Strip = "Strip"
    Bottle = "Bottle"
    Vial = "Vial"
    Piece = "Piece"
    Pack = "Pack"
    Roll = "Roll"
    Set = "Set"


class ItemStatus(str, enum.Enum):
    Active = "Active"
    Inactive = "Inactive"


class ItemMaster(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "item_master"

    item_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    item_name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[ItemCategory] = mapped_column(Enum(ItemCategory, name="item_category"), nullable=False)
    sub_category: Mapped[str] = mapped_column(String(150), nullable=True)
    generic_composition: Mapped[str | None] = mapped_column(String(250), nullable=True)
    strength: Mapped[str | None] = mapped_column(String(100), nullable=True)
    dosage_form: Mapped[str | None] = mapped_column(String(100), nullable=True)
    unit: Mapped[ItemUnit] = mapped_column(Enum(ItemUnit, name="item_unit"), nullable=False)
    pack_quantity: Mapped[int] = mapped_column(Integer, default=1)
    issue_unit: Mapped[str] = mapped_column(String(50), nullable=True, default="Piece")
    opening_stock: Mapped[int] = mapped_column(Integer, default=0)
    brand: Mapped[str] = mapped_column(String(150), nullable=True)
    hsn_code: Mapped[str] = mapped_column(String(50), nullable=True)
    gst_percentage: Mapped[float] = mapped_column(Float, default=0)
    min_stock: Mapped[int] = mapped_column(Integer, default=0)
    max_stock: Mapped[int] = mapped_column(Integer, default=0)
    reorder_level: Mapped[int] = mapped_column(Integer, default=0)
    storage_location: Mapped[str] = mapped_column(String(150), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[ItemStatus] = mapped_column(Enum(ItemStatus, name="item_status"), default=ItemStatus.Active)
    current_stock: Mapped[int] = mapped_column(Integer, default=0)
    unit_price: Mapped[float] = mapped_column(Float, default=0)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)


class PaymentTerms(str, enum.Enum):
    Net_15 = "Net 15"
    Net_30 = "Net 30"
    Net_60 = "Net 60"
    Advance = "Advance"
    COD = "COD"


class VendorStatus(str, enum.Enum):
    Active = "Active"
    Inactive = "Inactive"


class Vendor(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "vendors"

    vendor_code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    vendor_name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True, default="Pharmaceuticals")
    contact_person: Mapped[str | None] = mapped_column(String(150), nullable=True)
    mobile: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    gst_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    pan: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    state: Mapped[str | None] = mapped_column(String(100), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    payment_terms: Mapped[PaymentTerms] = mapped_column(
        Enum(PaymentTerms, name="payment_terms"), default=PaymentTerms.Net_30
    )
    rating: Mapped[int | None] = mapped_column(Integer, default=5)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)
    status: Mapped[VendorStatus] = mapped_column(Enum(VendorStatus, name="vendor_status"), default=VendorStatus.Active)
