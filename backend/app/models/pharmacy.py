from sqlalchemy import String, Integer, Float, Boolean, Text, JSON
from sqlalchemy import String, Integer, Float, Boolean, Text, JSON
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base
from app.models.mixins import UUIDPKMixin, TimestampMixin


class MedicineCategory(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "medicine_categories"
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    medicine_count: Mapped[int] = mapped_column(Integer, default=0)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)


class Medicine(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "medicines"
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    generic_name: Mapped[str] = mapped_column(String(200), nullable=False)
    brand: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    manufacturer: Mapped[str] = mapped_column(String(200), nullable=False)
    dosage_form: Mapped[str] = mapped_column(String(100), nullable=False)
    strength: Mapped[str] = mapped_column(String(100), nullable=False)
    unit: Mapped[str] = mapped_column(String(100), nullable=False)
    purchase_price: Mapped[float] = mapped_column(Float, default=0.0)
    selling_price: Mapped[float] = mapped_column(Float, default=0.0)
    gst: Mapped[float] = mapped_column(Float, default=12.0)
    storage_condition: Mapped[str] = mapped_column(String(200), nullable=False)
    rack_location: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="Active")
    current_stock: Mapped[int] = mapped_column(Integer, default=0)
    min_stock: Mapped[int] = mapped_column(Integer, default=0)
    max_stock: Mapped[int] = mapped_column(Integer, default=0)
    reorder_level: Mapped[int] = mapped_column(Integer, default=0)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)


class PharmacyBatch(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "pharmacy_batches"
    batch_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    medicine_id: Mapped[str] = mapped_column(String(50), nullable=False)
    medicine_name: Mapped[str] = mapped_column(String(200), nullable=False)
    supplier_name: Mapped[str] = mapped_column(String(200), nullable=False)
    manufacturing_date: Mapped[str] = mapped_column(String(20), nullable=False)
    expiry_date: Mapped[str] = mapped_column(String(20), nullable=False)
    purchase_price: Mapped[float] = mapped_column(Float, default=0.0)
    selling_price: Mapped[float] = mapped_column(Float, default=0.0)
    quantity_received: Mapped[int] = mapped_column(Integer, default=0)
    available_quantity: Mapped[int] = mapped_column(Integer, default=0)
    batch_status: Mapped[str] = mapped_column(String(30), default="Available")
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)


class PharmacyPurchase(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "pharmacy_purchases"
    purchase_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    supplier_name: Mapped[str] = mapped_column(String(200), nullable=False)
    supplier_gst: Mapped[str] = mapped_column(String(50), nullable=False)
    invoice_number: Mapped[str] = mapped_column(String(100), nullable=False)
    purchase_date: Mapped[str] = mapped_column(String(20), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(30), default="Completed")
    items: Mapped[list] = mapped_column(JSON, default=list)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)


class Prescription(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "prescriptions"
    prescription_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    patient_uhid: Mapped[str] = mapped_column(String(50), nullable=False)
    patient_name: Mapped[str] = mapped_column(String(150), nullable=False)
    patient_age: Mapped[int] = mapped_column(Integer, default=0)
    patient_gender: Mapped[str] = mapped_column(String(20), nullable=False)
    doctor_name: Mapped[str] = mapped_column(String(150), nullable=False)
    department: Mapped[str] = mapped_column(String(100), nullable=False)
    visit_date: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="Pending")
    payment_status: Mapped[str | None] = mapped_column(String(20), nullable=True)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    amount_paid: Mapped[float] = mapped_column(Float, default=0.0)
    due_amount: Mapped[float] = mapped_column(Float, default=0.0)
    payment_method: Mapped[str | None] = mapped_column(String(50), nullable=True)
    items: Mapped[list] = mapped_column(JSON, default=list)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)
    er_encounter_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    is_emergency: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class POSInvoice(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "pos_invoices"
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    customer_name: Mapped[str] = mapped_column(String(150), nullable=False)
    customer_phone: Mapped[str] = mapped_column(String(30), nullable=False)
    customer_uhid: Mapped[str | None] = mapped_column(String(50), nullable=True)
    date: Mapped[str] = mapped_column(String(50), nullable=False)
    payment_method: Mapped[str] = mapped_column(String(30), nullable=False)
    subtotal: Mapped[float] = mapped_column(Float, default=0.0)
    discount: Mapped[float] = mapped_column(Float, default=0.0)
    gst_amount: Mapped[float] = mapped_column(Float, default=0.0)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    items: Mapped[list] = mapped_column(JSON, default=list)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)


class CustomerReturn(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "customer_returns"
    return_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    invoice_number: Mapped[str] = mapped_column(String(50), nullable=False)
    patient_name: Mapped[str] = mapped_column(String(150), nullable=False)
    patient_uhid: Mapped[str | None] = mapped_column(String(50), nullable=True)
    patient_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    medicine_name: Mapped[str] = mapped_column(String(200), nullable=False)
    batch_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    refund_amount: Mapped[float] = mapped_column(Float, default=0.0)
    refund_method: Mapped[str | None] = mapped_column(String(50), default="Cash")
    status: Mapped[str] = mapped_column(String(30), default="Approved")
    date: Mapped[str] = mapped_column(String(20), nullable=False)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)


class SupplierReturn(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "supplier_returns"
    return_number: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    supplier_name: Mapped[str] = mapped_column(String(200), nullable=False)
    medicine_name: Mapped[str] = mapped_column(String(200), nullable=False)
    batch_number: Mapped[str] = mapped_column(String(50), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=0)
    reason: Mapped[str] = mapped_column(String(50), nullable=False)
    credit_note_no: Mapped[str] = mapped_column(String(50), nullable=False)
    amount: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(30), default="Pending Credit")
    date: Mapped[str] = mapped_column(String(20), nullable=False)
    branch: Mapped[str | None] = mapped_column(String(200), nullable=True)
