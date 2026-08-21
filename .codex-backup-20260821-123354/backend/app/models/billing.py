from sqlalchemy import String, Float, Integer, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from app.core.database import Base
from app.models.mixins import UUIDPKMixin, TimestampMixin


class Bill(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "bills"

    bill_number: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    patient_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    patient_name: Mapped[str] = mapped_column(String(150), nullable=False)
    uhid: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    appointment_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ipd_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bill_type: Mapped[str] = mapped_column(String(50), nullable=False)  # OPD, IPD, Lab, Pharmacy, Procedure, Other
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    doctor_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    
    gross_amount: Mapped[float] = mapped_column(Float, default=0.0)
    discount_amount: Mapped[float] = mapped_column(Float, default=0.0)
    tax_amount: Mapped[float] = mapped_column(Float, default=0.0)
    net_amount: Mapped[float] = mapped_column(Float, default=0.0)
    paid_amount: Mapped[float] = mapped_column(Float, default=0.0)
    pending_amount: Mapped[float] = mapped_column(Float, default=0.0)
    
    payment_mode: Mapped[str] = mapped_column(String(50), default="Cash")  # Cash, UPI, Card, Bank Transfer, Pending
    payment_status: Mapped[str] = mapped_column(String(50), default="Pending")  # Paid, Partially Paid, Pending, Overdue, Refunded, Cancelled
    discharge_status: Mapped[str | None] = mapped_column(String(50), nullable=True)  # Advance, Interim, Final Discharge
    
    bill_date: Mapped[str] = mapped_column(String(50), nullable=False)
    due_date: Mapped[str | None] = mapped_column(String(50), nullable=True)
    billing_staff: Mapped[str] = mapped_column(String(150), default="System Billing")
    branch: Mapped[str] = mapped_column(String(150), default="Main Branch")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    items: Mapped[list["BillItem"]] = relationship("BillItem", back_populates="bill", cascade="all, delete-orphan")


class BillItem(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "bill_items"

    bill_id: Mapped[str] = mapped_column(String(100), ForeignKey("bills.id"), nullable=False)
    service_name: Mapped[str] = mapped_column(String(200), nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="General")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    unit_price: Mapped[float] = mapped_column(Float, default=0.0)
    gross_amount: Mapped[float] = mapped_column(Float, default=0.0)
    discount: Mapped[float] = mapped_column(Float, default=0.0)
    tax: Mapped[float] = mapped_column(Float, default=0.0)
    net_amount: Mapped[float] = mapped_column(Float, default=0.0)

    bill: Mapped["Bill"] = relationship("Bill", back_populates="items")


class PaymentCollection(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "payment_collections"

    receipt_number: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    bill_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bill_number: Mapped[str] = mapped_column(String(100), nullable=False)
    patient_name: Mapped[str] = mapped_column(String(150), nullable=False)
    uhid: Mapped[str] = mapped_column(String(100), nullable=False)
    service_type: Mapped[str] = mapped_column(String(50), default="OPD")
    
    total_bill: Mapped[float] = mapped_column(Float, default=0.0)
    previously_paid: Mapped[float] = mapped_column(Float, default=0.0)
    current_payment: Mapped[float] = mapped_column(Float, default=0.0)
    remaining_due: Mapped[float] = mapped_column(Float, default=0.0)
    
    payment_mode: Mapped[str] = mapped_column(String(50), nullable=False)  # Cash, UPI, Card, Bank Transfer, Other
    transaction_ref: Mapped[str | None] = mapped_column(String(100), nullable=True)
    payer_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    payer_identifier: Mapped[str | None] = mapped_column(String(200), nullable=True)
    payer_contact: Mapped[str | None] = mapped_column(String(50), nullable=True)
    payer_email: Mapped[str | None] = mapped_column(String(150), nullable=True)
    gateway_payment_id: Mapped[str | None] = mapped_column(String(150), nullable=True)
    gateway_order_id: Mapped[str | None] = mapped_column(String(150), nullable=True)
    payment_date: Mapped[str] = mapped_column(String(50), nullable=False)
    collected_by: Mapped[str] = mapped_column(String(150), nullable=False)
    branch: Mapped[str] = mapped_column(String(150), default="Main Branch")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)


class PaymentTransaction(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "payment_transactions"

    provider: Mapped[str] = mapped_column(String(50), default="Razorpay")
    provider_reference: Mapped[str | None] = mapped_column(String(150), index=True, nullable=True)
    bill_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bill_number: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    patient_name: Mapped[str] = mapped_column(String(150), nullable=False)
    uhid: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[float] = mapped_column(Float, default=0.0)
    payment_mode: Mapped[str] = mapped_column(String(50), default="UPI")
    status: Mapped[str] = mapped_column(String(30), default="Created")
    qr_image_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    qr_short_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    upi_intent_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    receipt_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    provider_payment_id: Mapped[str | None] = mapped_column(String(150), nullable=True)
    raw_response: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by: Mapped[str | None] = mapped_column(String(150), nullable=True)


class DiscountRequest(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "discount_requests"

    discount_code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    bill_number: Mapped[str] = mapped_column(String(100), nullable=False)
    patient_name: Mapped[str] = mapped_column(String(150), nullable=False)
    uhid: Mapped[str] = mapped_column(String(100), nullable=False)
    original_amount: Mapped[float] = mapped_column(Float, default=0.0)
    discount_type: Mapped[str] = mapped_column(String(20), default="Percentage")  # Percentage | Fixed Amount
    discount_value: Mapped[float] = mapped_column(Float, default=0.0)
    discount_amount: Mapped[float] = mapped_column(Float, default=0.0)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    requested_by: Mapped[str] = mapped_column(String(150), nullable=False)
    approved_by: Mapped[str | None] = mapped_column(String(150), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="Pending")  # Pending, Approved, Rejected
    request_date: Mapped[str] = mapped_column(String(50), nullable=False)


class RefundRequest(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "refund_requests"

    refund_code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    bill_number: Mapped[str] = mapped_column(String(100), nullable=False)
    patient_name: Mapped[str] = mapped_column(String(150), nullable=False)
    uhid: Mapped[str] = mapped_column(String(100), nullable=False)
    original_amount: Mapped[float] = mapped_column(Float, default=0.0)
    paid_amount: Mapped[float] = mapped_column(Float, default=0.0)
    refund_amount: Mapped[float] = mapped_column(Float, default=0.0)
    refund_reason: Mapped[str] = mapped_column(Text, nullable=False)
    refund_mode: Mapped[str] = mapped_column(String(50), default="Cash")
    requested_by: Mapped[str] = mapped_column(String(150), nullable=False)
    approved_by: Mapped[str | None] = mapped_column(String(150), nullable=True)
    refund_date: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="Requested")  # Requested, Approved, Processed, Rejected


class BillCancellation(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "bill_cancellations"

    cancellation_code: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    bill_number: Mapped[str] = mapped_column(String(100), nullable=False)
    patient_name: Mapped[str] = mapped_column(String(150), nullable=False)
    uhid: Mapped[str] = mapped_column(String(100), nullable=False)
    original_amount: Mapped[float] = mapped_column(Float, default=0.0)
    cancellation_reason: Mapped[str] = mapped_column(Text, nullable=False)
    requested_by: Mapped[str] = mapped_column(String(150), nullable=False)
    approved_by: Mapped[str | None] = mapped_column(String(150), nullable=True)
    cancellation_date: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(30), default="Pending")  # Pending, Approved, Cancelled, Rejected


class SupplierPayable(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "supplier_payables"

    supplier_name: Mapped[str] = mapped_column(String(200), nullable=False)
    invoice_number: Mapped[str] = mapped_column(String(100), nullable=False)
    purchase_date: Mapped[str] = mapped_column(String(50), nullable=False)
    invoice_amount: Mapped[float] = mapped_column(Float, default=0.0)
    paid_amount: Mapped[float] = mapped_column(Float, default=0.0)
    outstanding_amount: Mapped[float] = mapped_column(Float, default=0.0)
    due_date: Mapped[str | None] = mapped_column(String(50), nullable=True)
    payment_status: Mapped[str] = mapped_column(String(50), default="Pending")  # Paid, Partially Paid, Pending, Overdue
    module_source: Mapped[str] = mapped_column(String(50), default="Pharmacy")
    branch: Mapped[str] = mapped_column(String(150), default="Main Branch")


class BillingAuditLog(UUIDPKMixin, TimestampMixin, Base):
    __tablename__ = "billing_audit_logs"

    transaction_id: Mapped[str] = mapped_column(String(100), nullable=False)
    bill_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)  # Bill, Payment, Discount, Refund, Cancellation
    action: Mapped[str] = mapped_column(String(50), nullable=False)  # Created, Updated, Approved, Rejected, Refunded, Cancelled
    previous_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)
    user_name: Mapped[str] = mapped_column(String(150), nullable=False)
    user_role: Mapped[str] = mapped_column(String(100), nullable=False)
    timestamp: Mapped[str] = mapped_column(String(50), nullable=False)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
