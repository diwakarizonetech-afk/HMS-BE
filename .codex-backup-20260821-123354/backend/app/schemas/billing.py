from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List


class BillItemSchema(BaseModel):
    id: Optional[str] = None
    service_name: str
    category: Optional[str] = "General"
    description: Optional[str] = None
    quantity: int = 1
    unit_price: float = 0.0
    gross_amount: float = 0.0
    discount: float = 0.0
    tax: float = 0.0
    net_amount: float = 0.0

    model_config = ConfigDict(from_attributes=True)


class BillCreateSchema(BaseModel):
    bill_number: Optional[str] = None
    patient_id: Optional[str] = None
    patient_name: str
    uhid: str
    appointment_id: Optional[str] = None
    ipd_number: Optional[str] = None
    bill_type: str  # OPD, IPD, Lab, Pharmacy, Procedure, Other
    department: Optional[str] = None
    doctor_name: Optional[str] = None
    gross_amount: float = 0.0
    discount_amount: float = 0.0
    tax_amount: float = 0.0
    net_amount: float = 0.0
    paid_amount: float = 0.0
    pending_amount: float = 0.0
    payment_mode: str = "Cash"
    payment_status: str = "Pending"
    discharge_status: Optional[str] = None
    bill_date: Optional[str] = None
    due_date: Optional[str] = None
    billing_staff: str = "System Billing"
    branch: str = "Main Branch"
    notes: Optional[str] = None
    items: List[BillItemSchema] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class BillResponseSchema(BillCreateSchema):
    id: str
    items: List[BillItemSchema] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class PaymentCollectionCreateSchema(BaseModel):
    receipt_number: Optional[str] = None
    bill_id: Optional[str] = None
    bill_number: str
    patient_name: str
    uhid: str
    service_type: str = "OPD"
    total_bill: float = 0.0
    previously_paid: float = 0.0
    current_payment: float = 0.0
    remaining_due: float = 0.0
    payment_mode: str  # Cash, UPI, Card, Bank Transfer, Other
    transaction_ref: Optional[str] = None
    payer_name: Optional[str] = None
    payer_identifier: Optional[str] = None
    payer_contact: Optional[str] = None
    payer_email: Optional[str] = None
    gateway_payment_id: Optional[str] = None
    gateway_order_id: Optional[str] = None
    payment_date: Optional[str] = None
    collected_by: str
    branch: str = "Main Branch"
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PaymentCollectionResponseSchema(PaymentCollectionCreateSchema):
    id: str

    model_config = ConfigDict(from_attributes=True)


class PaymentQrCreateSchema(BaseModel):
    bill_number: str
    amount: float
    payment_mode: str = "UPI"
    collected_by: str = "Billing"
    branch: Optional[str] = None
    notes: Optional[str] = None


class PaymentTransactionResponseSchema(BaseModel):
    id: str
    provider: str
    provider_reference: Optional[str] = None
    bill_id: Optional[str] = None
    bill_number: str
    patient_name: str
    uhid: str
    amount: float
    payment_mode: str
    status: str
    qr_image_url: Optional[str] = None
    qr_short_url: Optional[str] = None
    upi_intent_url: Optional[str] = None
    receipt_number: Optional[str] = None
    provider_payment_id: Optional[str] = None
    created_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PaymentTransactionConfirmSchema(BaseModel):
    provider_payment_id: Optional[str] = None
    collected_by: str = "Billing"
    notes: Optional[str] = None


class PaymentTransactionConfirmResponseSchema(BaseModel):
    transaction: PaymentTransactionResponseSchema
    receipt: Optional[PaymentCollectionResponseSchema] = None

    model_config = ConfigDict(from_attributes=True)


class RazorpayOrderCreateSchema(BaseModel):
    bill_number: str
    amount: float
    payment_mode: str = "Card"
    collected_by: str = "Billing"
    branch: Optional[str] = None
    notes: Optional[str] = None


class RazorpayCheckoutOrderResponseSchema(BaseModel):
    transaction: PaymentTransactionResponseSchema
    key_id: str
    order_id: str
    amount_paise: int
    currency: str = "INR"
    name: str = "AegisCare HMS"
    description: str

    model_config = ConfigDict(from_attributes=True)


class RazorpayCheckoutVerifySchema(BaseModel):
    transaction_id: str
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    collected_by: str = "Billing"
    notes: Optional[str] = None


class DiscountRequestSchema(BaseModel):
    id: Optional[str] = None
    discount_code: Optional[str] = None
    bill_number: str
    patient_name: str
    uhid: str
    original_amount: float
    discount_type: str  # Percentage | Fixed Amount
    discount_value: float
    discount_amount: float
    reason: str
    requested_by: str
    approved_by: Optional[str] = None
    status: str = "Pending"
    request_date: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RefundRequestSchema(BaseModel):
    id: Optional[str] = None
    refund_code: Optional[str] = None
    bill_number: str
    patient_name: str
    uhid: str
    original_amount: float
    paid_amount: float
    refund_amount: float
    refund_reason: str
    refund_mode: str = "Cash"
    requested_by: str
    approved_by: Optional[str] = None
    refund_date: Optional[str] = None
    status: str = "Requested"

    model_config = ConfigDict(from_attributes=True)


class BillCancellationSchema(BaseModel):
    id: Optional[str] = None
    cancellation_code: Optional[str] = None
    bill_number: str
    patient_name: str
    uhid: str
    original_amount: float
    cancellation_reason: str
    requested_by: str
    approved_by: Optional[str] = None
    cancellation_date: Optional[str] = None
    status: str = "Pending"

    model_config = ConfigDict(from_attributes=True)


class SupplierPayableSchema(BaseModel):
    id: Optional[str] = None
    supplier_name: str
    invoice_number: str
    purchase_date: str
    invoice_amount: float
    paid_amount: float
    outstanding_amount: float
    due_date: Optional[str] = None
    payment_status: str = "Pending"
    module_source: str = "Pharmacy"
    branch: str = "Main Branch"

    model_config = ConfigDict(from_attributes=True)


class BillingAuditLogSchema(BaseModel):
    id: Optional[str] = None
    transaction_id: str
    bill_number: Optional[str] = None
    entity_type: str
    action: str
    previous_value: Optional[str] = None
    new_value: Optional[str] = None
    user_name: str
    user_role: str
    timestamp: str
    reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class StatusUpdateSchema(BaseModel):
    status: str
    approved_by: Optional[str] = None
    reason: Optional[str] = None


class SupplierPaymentSchema(BaseModel):
    amount: float
    payment_mode: str
    reference_no: str
    paid_by: Optional[str] = None
    remarks: Optional[str] = None
    payment_date: Optional[str] = None
