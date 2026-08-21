from datetime import datetime, timedelta
import json
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
import razorpay
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.database import get_db
from app.models.billing import (
    Bill,
    BillCancellation,
    BillItem,
    BillingAuditLog,
    DiscountRequest,
    PaymentCollection,
    PaymentTransaction,
    RefundRequest,
    SupplierPayable,
)
from app.models.goods_receipt import GoodsReceipt, GRNItem
from app.models.pharmacy import Medicine, PharmacyPurchase, POSInvoice, Prescription
from app.models.purchase_order import PurchaseOrder
from app.schemas.billing import (
    BillCancellationSchema,
    BillCreateSchema,
    BillResponseSchema,
    BillingAuditLogSchema,
    DiscountRequestSchema,
    PaymentQrCreateSchema,
    PaymentCollectionCreateSchema,
    PaymentCollectionResponseSchema,
    RazorpayCheckoutOrderResponseSchema,
    RazorpayCheckoutVerifySchema,
    RazorpayOrderCreateSchema,
    PaymentTransactionConfirmResponseSchema,
    PaymentTransactionConfirmSchema,
    PaymentTransactionResponseSchema,
    RefundRequestSchema,
    StatusUpdateSchema,
    SupplierPayableSchema,
    SupplierPaymentSchema,
)

router = APIRouter(prefix="/billing", tags=["Billing & Revenue Management"])


def _now() -> datetime:
    return datetime.now()


def _date_str() -> str:
    return _now().strftime("%Y-%m-%d")


def _timestamp_str() -> str:
    return _now().strftime("%Y-%m-%d %H:%M:%S")


def _clean_amount(value: float | int | None) -> float:
    return round(float(value or 0), 2)


def _razorpay_client() -> razorpay.Client:
    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    try:
        client.set_app_details({"title": "AegisCare HMS", "version": "1.0.0"})
    except Exception:
        pass
    return client


def _razorpay_error_message(exc: Exception) -> str:
    message = str(exc)
    data = getattr(exc, "data", None)
    if isinstance(data, dict):
        message = data.get("description") or data.get("reason") or data.get("message") or message
    return message


def _razorpay_payer_details(payment: dict | None, fallback_name: str = "") -> dict:
    payment = payment or {}
    upi = payment.get("upi") if isinstance(payment.get("upi"), dict) else {}
    card = payment.get("card") if isinstance(payment.get("card"), dict) else {}
    vpa = payment.get("vpa") or upi.get("vpa")
    card_id = payment.get("card_id") or card.get("id")
    bank = payment.get("bank")
    wallet = payment.get("wallet")
    identifier = vpa or card_id or bank or wallet or payment.get("id")

    return {
        "payer_name": payment.get("name") or fallback_name,
        "payer_identifier": identifier,
        "payer_contact": payment.get("contact"),
        "payer_email": payment.get("email"),
        "gateway_payment_id": payment.get("id"),
        "gateway_order_id": payment.get("order_id"),
    }


def _next_code(db: Session, model, field_name: str, prefix: str, width: int = 5) -> str:
    year = _now().year
    field = getattr(model, field_name)
    pattern = f"{prefix}-{year}-%"
    rows = db.query(field).filter(field.like(pattern)).all()
    max_num = 0
    for (value,) in rows:
        try:
            max_num = max(max_num, int(str(value).rsplit("-", 1)[-1]))
        except (TypeError, ValueError):
            continue

    count = max_num + 1
    candidate = f"{prefix}-{year}-{count:0{width}d}"
    while db.query(model).filter(field == candidate).first():
        count += 1
        candidate = f"{prefix}-{year}-{count:0{width}d}"
    return candidate


def _audit(
    db: Session,
    *,
    entity_type: str,
    action: str,
    user_name: str,
    user_role: str,
    bill_number: str | None = None,
    previous_value: str | None = None,
    new_value: str | None = None,
    reason: str | None = None,
) -> None:
    db.add(
        BillingAuditLog(
            transaction_id=_next_code(db, BillingAuditLog, "transaction_id", "AUD", 6),
            bill_number=bill_number,
            entity_type=entity_type,
            action=action,
            previous_value=previous_value,
            new_value=new_value,
            user_name=user_name or "System",
            user_role=user_role or "Billing",
            timestamp=_timestamp_str(),
            reason=reason,
        )
    )


def _bill_or_404(db: Session, bill_number: str) -> Bill:
    bill = db.query(Bill).options(selectinload(Bill.items)).filter(Bill.bill_number == bill_number).first()
    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")
    return bill


def _recalculate_bill_status(bill: Bill) -> None:
    bill.paid_amount = _clean_amount(bill.paid_amount)
    bill.net_amount = _clean_amount(bill.net_amount)
    bill.pending_amount = max(0.0, _clean_amount(bill.net_amount - bill.paid_amount))
    if bill.payment_status == "Cancelled":
        return
    if bill.pending_amount <= 0:
        bill.payment_status = "Paid"
    elif bill.paid_amount > 0:
        bill.payment_status = "Partially Paid"
    else:
        bill.payment_status = "Pending"


@router.get("/kpis")
def get_billing_kpis(db: Session = Depends(get_db)):
    bills = db.query(Bill).all()
    collections = db.query(PaymentCollection).all()
    refunds = db.query(RefundRequest).filter(RefundRequest.status.in_(["Approved", "Processed"])).all()
    discounts = db.query(DiscountRequest).filter(DiscountRequest.status == "Approved").all()
    payables = db.query(SupplierPayable).all()

    today = _date_str()
    active_bills = [b for b in bills if b.payment_status != "Cancelled"]

    today_collected = sum(c.current_payment for c in collections if (c.payment_date or "").startswith(today))
    today_billing = sum(b.net_amount for b in active_bills if (b.bill_date or "").startswith(today))
    total_outstanding = sum(b.pending_amount for b in active_bills if b.payment_status in ["Pending", "Partially Paid", "Overdue"])
    today_refunds = sum(r.refund_amount for r in refunds if (r.refund_date or "").startswith(today))
    today_discounts = sum(d.discount_amount for d in discounts if (d.request_date or "").startswith(today))

    def revenue_for(kind: str) -> float:
        return sum(b.paid_amount for b in active_bills if b.bill_type == kind)

    total_revenue = sum(b.paid_amount for b in active_bills)
    total_expenses = sum(p.paid_amount for p in payables) + sum(r.refund_amount for r in refunds)

    return {
        "today_revenue": today_collected,
        "today_billing": today_billing,
        "today_collection": today_collected,
        "total_outstanding": total_outstanding,
        "today_refunds": today_refunds,
        "today_discounts": today_discounts,
        "opd_revenue": revenue_for("OPD"),
        "ipd_revenue": revenue_for("IPD"),
        "lab_revenue": revenue_for("Lab"),
        "pharmacy_revenue": revenue_for("Pharmacy"),
        "procedure_revenue": revenue_for("Procedure"),
        "total_revenue": total_revenue,
        "total_expenses": total_expenses,
        "net_revenue": total_revenue - total_expenses,
    }


@router.get("/bills", response_model=List[BillResponseSchema])
def get_all_bills(
    bill_type: Optional[str] = None,
    payment_status: Optional[str] = None,
    search: Optional[str] = None,
    branch: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Bill).options(selectinload(Bill.items))
    if bill_type:
        query = query.filter(Bill.bill_type == bill_type)
    if payment_status:
        query = query.filter(Bill.payment_status == payment_status)
    if branch:
        query = query.filter(Bill.branch == branch)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            or_(
                Bill.bill_number.ilike(search_fmt),
                Bill.patient_name.ilike(search_fmt),
                Bill.uhid.ilike(search_fmt),
                Bill.doctor_name.ilike(search_fmt),
                Bill.appointment_id.ilike(search_fmt),
                Bill.ipd_number.ilike(search_fmt),
            )
        )
    return query.order_by(Bill.created_at.desc()).all()


@router.get("/bills/{bill_number}", response_model=BillResponseSchema)
def get_bill(bill_number: str, db: Session = Depends(get_db)):
    return _bill_or_404(db, bill_number)


@router.post("/bills", response_model=BillResponseSchema, status_code=status.HTTP_201_CREATED)
def create_bill(payload: BillCreateSchema, db: Session = Depends(get_db)):
    bill_no = payload.bill_number or _next_code(db, Bill, "bill_number", "BILL", 5)
    if db.query(Bill).filter(Bill.bill_number == bill_no).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bill number already exists")

    item_gross = sum(_clean_amount(i.gross_amount if i.gross_amount else i.quantity * i.unit_price) for i in payload.items)
    item_discount = sum(_clean_amount(i.discount) for i in payload.items)
    item_tax = sum(_clean_amount(i.tax) for i in payload.items)
    item_net = sum(_clean_amount(i.net_amount if i.net_amount else (i.quantity * i.unit_price) - i.discount + i.tax) for i in payload.items)

    gross_amount = _clean_amount(payload.gross_amount or item_gross)
    discount_amount = _clean_amount(payload.discount_amount if payload.discount_amount is not None else item_discount)
    tax_amount = _clean_amount(payload.tax_amount if payload.tax_amount is not None else item_tax)
    net_amount = _clean_amount(payload.net_amount or item_net or (gross_amount - discount_amount + tax_amount))
    paid_amount = _clean_amount(payload.paid_amount)
    if paid_amount > net_amount:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Paid amount cannot exceed net bill amount")

    new_bill = Bill(
        bill_number=bill_no,
        patient_id=payload.patient_id,
        patient_name=payload.patient_name,
        uhid=payload.uhid,
        appointment_id=payload.appointment_id,
        ipd_number=payload.ipd_number,
        bill_type=payload.bill_type,
        department=payload.department,
        doctor_name=payload.doctor_name,
        gross_amount=gross_amount,
        discount_amount=discount_amount,
        tax_amount=tax_amount,
        net_amount=net_amount,
        paid_amount=paid_amount,
        pending_amount=_clean_amount(net_amount - paid_amount),
        payment_mode=payload.payment_mode,
        payment_status=payload.payment_status,
        discharge_status=payload.discharge_status,
        bill_date=payload.bill_date or _date_str(),
        due_date=payload.due_date,
        billing_staff=payload.billing_staff or "Billing",
        branch=payload.branch or "Main Branch",
        notes=payload.notes,
    )
    _recalculate_bill_status(new_bill)
    db.add(new_bill)
    db.flush()

    for item in payload.items:
        gross = _clean_amount(item.gross_amount if item.gross_amount else item.quantity * item.unit_price)
        net = _clean_amount(item.net_amount if item.net_amount else gross - item.discount + item.tax)
        db.add(
            BillItem(
                bill_id=new_bill.id,
                service_name=item.service_name,
                category=item.category or "General",
                description=item.description,
                quantity=item.quantity,
                unit_price=_clean_amount(item.unit_price),
                gross_amount=gross,
                discount=_clean_amount(item.discount),
                tax=_clean_amount(item.tax),
                net_amount=net,
            )
        )

    if paid_amount > 0:
        receipt_no = _next_code(db, PaymentCollection, "receipt_number", "REC", 5)
        db.add(
            PaymentCollection(
                receipt_number=receipt_no,
                bill_id=new_bill.id,
                bill_number=new_bill.bill_number,
                patient_name=new_bill.patient_name,
                uhid=new_bill.uhid,
                service_type=new_bill.bill_type,
                total_bill=new_bill.net_amount,
                previously_paid=0,
                current_payment=paid_amount,
                remaining_due=new_bill.pending_amount,
                payment_mode=new_bill.payment_mode,
                payment_date=_timestamp_str(),
                collected_by=new_bill.billing_staff,
                branch=new_bill.branch,
                notes="Initial payment collected during bill creation",
            )
        )

    _audit(
        db,
        entity_type="Bill",
        action="Created",
        bill_number=bill_no,
        new_value=f"Bill created for {payload.patient_name} ({payload.uhid}) amount {net_amount}",
        user_name=new_bill.billing_staff,
        user_role="Billing",
        reason="New bill generation",
    )

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Duplicate billing reference")
    db.refresh(new_bill)
    return new_bill


@router.get("/payments", response_model=List[PaymentCollectionResponseSchema])
def get_payment_collections(db: Session = Depends(get_db)):
    return db.query(PaymentCollection).order_by(PaymentCollection.created_at.desc()).all()


def _record_payment_collection_for_bill(db: Session, bill: Bill, payload: PaymentCollectionCreateSchema) -> PaymentCollection:
    if bill.payment_status == "Cancelled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot collect payment for a cancelled bill")

    amount = _clean_amount(payload.current_payment)
    if amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment amount must be greater than zero")
    if amount > bill.pending_amount:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment amount cannot exceed pending amount")

    previous_paid = _clean_amount(bill.paid_amount)
    bill.paid_amount = _clean_amount(bill.paid_amount + amount)
    bill.payment_mode = payload.payment_mode
    _recalculate_bill_status(bill)

    payment = PaymentCollection(
        receipt_number=payload.receipt_number or _next_code(db, PaymentCollection, "receipt_number", "REC", 5),
        bill_id=bill.id,
        bill_number=bill.bill_number,
        patient_name=bill.patient_name,
        uhid=bill.uhid,
        service_type=payload.service_type or bill.bill_type,
        total_bill=bill.net_amount,
        previously_paid=previous_paid,
        current_payment=amount,
        remaining_due=bill.pending_amount,
        payment_mode=payload.payment_mode,
        transaction_ref=payload.transaction_ref,
        payer_name=payload.payer_name or bill.patient_name,
        payer_identifier=payload.payer_identifier,
        payer_contact=payload.payer_contact,
        payer_email=payload.payer_email,
        gateway_payment_id=payload.gateway_payment_id,
        gateway_order_id=payload.gateway_order_id,
        payment_date=payload.payment_date or _timestamp_str(),
        collected_by=payload.collected_by or "Billing",
        branch=payload.branch or bill.branch,
        notes=payload.notes,
    )
    db.add(payment)
    _audit(
        db,
        entity_type="Payment",
        action="Collected",
        bill_number=bill.bill_number,
        previous_value=f"Paid {previous_paid}, pending {bill.net_amount - previous_paid}",
        new_value=f"Collected {amount}; paid {bill.paid_amount}, pending {bill.pending_amount}",
        user_name=payment.collected_by,
        user_role="Billing",
        reason=f"Payment receipt {payment.receipt_number}",
    )
    db.commit()
    db.refresh(payment)
    return payment


@router.post("/payments", response_model=PaymentCollectionResponseSchema, status_code=status.HTTP_201_CREATED)
def record_payment_collection(payload: PaymentCollectionCreateSchema, db: Session = Depends(get_db)):
    bill = _bill_or_404(db, payload.bill_number)
    return _record_payment_collection_for_bill(db, bill, payload)


def _mock_qr_svg_data_url(bill_number: str, amount: float) -> str:
    svg = f"""
    <svg xmlns="http://www.w3.org/2000/svg" width="260" height="260" viewBox="0 0 260 260">
      <rect width="260" height="260" fill="#ffffff"/>
      <rect x="18" y="18" width="64" height="64" fill="#0f172a"/>
      <rect x="178" y="18" width="64" height="64" fill="#0f172a"/>
      <rect x="18" y="178" width="64" height="64" fill="#0f172a"/>
      <g fill="#0f172a">
        <rect x="105" y="35" width="16" height="16"/><rect x="137" y="35" width="16" height="16"/>
        <rect x="105" y="75" width="16" height="16"/><rect x="153" y="75" width="16" height="16"/>
        <rect x="98" y="112" width="24" height="24"/><rect x="142" y="112" width="16" height="16"/><rect x="190" y="112" width="16" height="16"/>
        <rect x="118" y="156" width="16" height="16"/><rect x="154" y="154" width="28" height="28"/><rect x="210" y="154" width="16" height="16"/>
        <rect x="98" y="202" width="16" height="16"/><rect x="134" y="204" width="16" height="16"/><rect x="182" y="198" width="38" height="16"/>
      </g>
      <text x="130" y="132" text-anchor="middle" font-family="Arial" font-size="12" font-weight="700" fill="#2563eb">TEST QR</text>
      <text x="130" y="147" text-anchor="middle" font-family="Arial" font-size="10" fill="#334155">{bill_number}</text>
      <text x="130" y="162" text-anchor="middle" font-family="Arial" font-size="10" fill="#334155">Rs.{amount:.2f}</text>
    </svg>
    """
    return "data:image/svg+xml;utf8," + svg.replace("\n", "").replace("#", "%23")


def _apply_mock_qr_transaction(tx: PaymentTransaction, reason: str | None = None) -> None:
    tx.provider_reference = f"mock_qr_{tx.bill_number}_{int(_now().timestamp())}"
    tx.qr_image_url = _mock_qr_svg_data_url(tx.bill_number, tx.amount)
    tx.qr_short_url = f"razorpay-test://{tx.provider_reference}"
    tx.raw_response = json.dumps({
        "mock": True,
        "message": reason or "Add Razorpay keys to backend/.env for real test QR creation.",
    })


@router.post("/payments/razorpay-qr", response_model=PaymentTransactionResponseSchema, status_code=status.HTTP_201_CREATED)
def create_razorpay_qr_payment(payload: PaymentQrCreateSchema, db: Session = Depends(get_db)):
    bill = _bill_or_404(db, payload.bill_number)
    if bill.payment_status == "Cancelled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot collect payment for a cancelled bill")

    amount = _clean_amount(payload.amount)
    if amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment amount must be greater than zero")
    if amount > bill.pending_amount:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment amount cannot exceed pending amount")

    tx = PaymentTransaction(
        provider="Razorpay",
        bill_id=bill.id,
        bill_number=bill.bill_number,
        patient_name=bill.patient_name,
        uhid=bill.uhid,
        amount=amount,
        payment_mode=payload.payment_mode or "UPI",
        status="Pending",
        created_by=payload.collected_by,
    )

    if settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET:
        request_payload = {
            "type": "upi_qr",
            "name": f"{bill.patient_name} - {bill.bill_number}",
            "usage": "single_use",
            "fixed_amount": True,
            "payment_amount": int(round(amount * 100)),
            "description": f"HMS bill payment {bill.bill_number}",
            "customer_id": None,
            "notes": {"bill_number": bill.bill_number, "uhid": bill.uhid},
        }
        request_payload = {k: v for k, v in request_payload.items() if v is not None}
        try:
            data = _razorpay_client().qrcode.create(request_payload)
            tx.provider_reference = data.get("id")
            tx.qr_image_url = data.get("image_url")
            tx.qr_short_url = data.get("short_url")
            tx.upi_intent_url = data.get("upi_intent_url") or data.get("upi_url")
            tx.raw_response = json.dumps(data)
        except Exception as exc:
            error_message = _razorpay_error_message(exc)
            if "requested URL was not found" in error_message or "URL was not found" in error_message:
                _apply_mock_qr_transaction(
                    tx,
                    "Razorpay QR Codes API is not enabled for this account yet. Mock QR generated for local testing.",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Could not create Razorpay QR payment: {error_message}",
                )
    else:
        _apply_mock_qr_transaction(tx)

    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


@router.get("/payments/transactions/{transaction_id}", response_model=PaymentTransactionResponseSchema)
def get_payment_transaction(transaction_id: str, db: Session = Depends(get_db)):
    tx = db.get(PaymentTransaction, transaction_id)
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment transaction not found")
    return tx


@router.post("/payments/transactions/{transaction_id}/sync-razorpay", response_model=PaymentTransactionConfirmResponseSchema)
def sync_razorpay_payment_transaction(transaction_id: str, db: Session = Depends(get_db)):
    tx = db.get(PaymentTransaction, transaction_id)
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment transaction not found")
    if tx.status == "Success":
        receipt = db.query(PaymentCollection).filter(PaymentCollection.receipt_number == tx.receipt_number).first()
        return {"transaction": tx, "receipt": receipt}
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        return {"transaction": tx, "receipt": None}
    if not tx.provider_reference or tx.provider_reference.startswith("mock_"):
        return {"transaction": tx, "receipt": None}

    try:
        data = _razorpay_client().qrcode.fetch_all_payments(tx.provider_reference, {"count": 10})
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not fetch Razorpay QR payments: {_razorpay_error_message(exc)}",
        )

    captured = next(
        (
            item
            for item in data.get("items", [])
            if item.get("status") == "captured" and int(item.get("amount") or 0) >= int(round(tx.amount * 100))
        ),
        None,
    )
    if not captured:
        tx.raw_response = json.dumps(data)
        db.add(tx)
        db.commit()
        db.refresh(tx)
        return {"transaction": tx, "receipt": None}

    bill = _bill_or_404(db, tx.bill_number)
    payer_details = _razorpay_payer_details(captured, bill.patient_name)
    receipt = _record_payment_collection_for_bill(
        db,
        bill,
        PaymentCollectionCreateSchema(
            bill_number=bill.bill_number,
            patient_name=bill.patient_name,
            uhid=bill.uhid,
            service_type=bill.bill_type,
            total_bill=bill.net_amount,
            previously_paid=bill.paid_amount,
            current_payment=tx.amount,
            payment_mode=tx.payment_mode,
            transaction_ref=captured.get("id") or tx.provider_reference,
            **payer_details,
            collected_by=tx.created_by or "Billing",
            branch=bill.branch,
            notes="Razorpay QR payment captured",
        ),
    )
    tx.status = "Success"
    tx.provider_payment_id = captured.get("id")
    tx.receipt_number = receipt.receipt_number
    tx.raw_response = json.dumps(data)
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return {"transaction": tx, "receipt": receipt}


@router.post("/payments/transactions/{transaction_id}/confirm-test", response_model=PaymentTransactionConfirmResponseSchema)
def confirm_test_payment_transaction(
    transaction_id: str,
    payload: PaymentTransactionConfirmSchema,
    db: Session = Depends(get_db),
):
    tx = db.get(PaymentTransaction, transaction_id)
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment transaction not found")
    if tx.status == "Success":
        receipt = db.query(PaymentCollection).filter(PaymentCollection.receipt_number == tx.receipt_number).first()
        return {"transaction": tx, "receipt": receipt}

    bill = _bill_or_404(db, tx.bill_number)
    receipt = _record_payment_collection_for_bill(
        db,
        bill,
        PaymentCollectionCreateSchema(
            bill_number=bill.bill_number,
            patient_name=bill.patient_name,
            uhid=bill.uhid,
            service_type=bill.bill_type,
            total_bill=bill.net_amount,
            previously_paid=bill.paid_amount,
            current_payment=tx.amount,
            payment_mode=tx.payment_mode,
            transaction_ref=payload.provider_payment_id or tx.provider_reference or tx.id,
            payer_name=bill.patient_name,
            payer_identifier=payload.provider_payment_id or tx.provider_reference or tx.id,
            gateway_payment_id=payload.provider_payment_id or tx.provider_reference,
            gateway_order_id=tx.provider_reference,
            collected_by=payload.collected_by or tx.created_by or "Billing",
            branch=bill.branch,
            notes=payload.notes or "Razorpay QR test payment confirmed",
        ),
    )
    tx.status = "Success"
    tx.provider_payment_id = payload.provider_payment_id or tx.provider_reference
    tx.receipt_number = receipt.receipt_number
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return {"transaction": tx, "receipt": receipt}


@router.post("/payments/razorpay-order", response_model=RazorpayCheckoutOrderResponseSchema, status_code=status.HTTP_201_CREATED)
def create_razorpay_checkout_order(payload: RazorpayOrderCreateSchema, db: Session = Depends(get_db)):
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Razorpay keys are not configured in backend .env")

    bill = _bill_or_404(db, payload.bill_number)
    if bill.payment_status == "Cancelled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot collect payment for a cancelled bill")

    amount = _clean_amount(payload.amount)
    if amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment amount must be greater than zero")
    if amount > bill.pending_amount:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment amount cannot exceed pending amount")

    amount_paise = int(round(amount * 100))
    receipt_code = f"ORDER-{bill.bill_number}-{int(_now().timestamp())}"
    try:
        order = _razorpay_client().order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt_code,
            "notes": {
                "bill_number": bill.bill_number,
                "uhid": bill.uhid,
                "patient_name": bill.patient_name,
            },
        })
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Could not create Razorpay checkout order: {_razorpay_error_message(exc)}",
        )

    tx = PaymentTransaction(
        provider="Razorpay",
        provider_reference=order.get("id"),
        bill_id=bill.id,
        bill_number=bill.bill_number,
        patient_name=bill.patient_name,
        uhid=bill.uhid,
        amount=amount,
        payment_mode=payload.payment_mode or "Card",
        status="Pending",
        raw_response=json.dumps(order),
        created_by=payload.collected_by,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return {
        "transaction": tx,
        "key_id": settings.RAZORPAY_KEY_ID,
        "order_id": order.get("id"),
        "amount_paise": amount_paise,
        "currency": "INR",
        "name": "AegisCare HMS",
        "description": f"HMS bill payment {bill.bill_number}",
    }


@router.post("/payments/razorpay-order/verify", response_model=PaymentTransactionConfirmResponseSchema)
def verify_razorpay_checkout_payment(payload: RazorpayCheckoutVerifySchema, db: Session = Depends(get_db)):
    tx = db.get(PaymentTransaction, payload.transaction_id)
    if not tx:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment transaction not found")
    if tx.status == "Success":
        receipt = db.query(PaymentCollection).filter(PaymentCollection.receipt_number == tx.receipt_number).first()
        return {"transaction": tx, "receipt": receipt}
    if tx.provider_reference != payload.razorpay_order_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Razorpay order does not match this transaction")

    try:
        _razorpay_client().utility.verify_payment_signature({
            "razorpay_order_id": payload.razorpay_order_id,
            "razorpay_payment_id": payload.razorpay_payment_id,
            "razorpay_signature": payload.razorpay_signature,
        })
    except Exception as exc:
        tx.status = "Failed"
        tx.raw_response = json.dumps({"verification_error": _razorpay_error_message(exc)})
        db.add(tx)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Razorpay payment verification failed")

    try:
        payment_details = _razorpay_client().payment.fetch(payload.razorpay_payment_id)
    except Exception:
        payment_details = {
            "id": payload.razorpay_payment_id,
            "order_id": payload.razorpay_order_id,
        }

    bill = _bill_or_404(db, tx.bill_number)
    payer_details = _razorpay_payer_details(payment_details, bill.patient_name)
    receipt = _record_payment_collection_for_bill(
        db,
        bill,
        PaymentCollectionCreateSchema(
            bill_number=bill.bill_number,
            patient_name=bill.patient_name,
            uhid=bill.uhid,
            service_type=bill.bill_type,
            total_bill=bill.net_amount,
            previously_paid=bill.paid_amount,
            current_payment=tx.amount,
            payment_mode=tx.payment_mode,
            transaction_ref=payload.razorpay_payment_id,
            **payer_details,
            collected_by=payload.collected_by or tx.created_by or "Billing",
            branch=bill.branch,
            notes=payload.notes or "Razorpay Checkout payment verified",
        ),
    )
    tx.status = "Success"
    tx.provider_payment_id = payload.razorpay_payment_id
    tx.receipt_number = receipt.receipt_number
    tx.raw_response = json.dumps(payment_details)
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return {"transaction": tx, "receipt": receipt}


@router.get("/discounts", response_model=List[DiscountRequestSchema])
def get_discount_requests(db: Session = Depends(get_db)):
    return db.query(DiscountRequest).order_by(DiscountRequest.created_at.desc()).all()


@router.post("/discounts", response_model=DiscountRequestSchema, status_code=status.HTTP_201_CREATED)
def create_discount_request(payload: DiscountRequestSchema, db: Session = Depends(get_db)):
    bill = _bill_or_404(db, payload.bill_number)
    amount = _clean_amount(payload.discount_amount)
    if amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Discount amount must be greater than zero")
    if amount > bill.pending_amount:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Discount cannot exceed pending amount")

    disc = DiscountRequest(
        discount_code=payload.discount_code or _next_code(db, DiscountRequest, "discount_code", "DISC", 4),
        bill_number=bill.bill_number,
        patient_name=bill.patient_name,
        uhid=bill.uhid,
        original_amount=bill.net_amount,
        discount_type=payload.discount_type,
        discount_value=_clean_amount(payload.discount_value),
        discount_amount=amount,
        reason=payload.reason,
        requested_by=payload.requested_by or "Billing",
        approved_by=payload.approved_by,
        status=payload.status or "Pending",
        request_date=payload.request_date or _date_str(),
    )
    db.add(disc)
    _audit(
        db,
        entity_type="Discount",
        action="Requested",
        bill_number=bill.bill_number,
        new_value=f"Discount request {disc.discount_code} amount {amount}",
        user_name=disc.requested_by,
        user_role="Billing",
        reason=payload.reason,
    )
    db.commit()
    db.refresh(disc)
    return disc


@router.put("/discounts/{discount_id}/status", response_model=DiscountRequestSchema)
def update_discount_status(discount_id: str, payload: StatusUpdateSchema, db: Session = Depends(get_db)):
    disc = db.query(DiscountRequest).filter(
        or_(DiscountRequest.id == discount_id, DiscountRequest.discount_code == discount_id)
    ).first()
    if not disc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discount request not found")
    bill = _bill_or_404(db, disc.bill_number)
    old_status = disc.status
    next_status = payload.status
    if next_status not in ["Pending", "Approved", "Rejected", "Cancelled"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid discount status")

    if old_status != "Approved" and next_status == "Approved":
        if disc.discount_amount > bill.pending_amount:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Discount exceeds current pending amount")
        bill.discount_amount = _clean_amount(bill.discount_amount + disc.discount_amount)
        bill.net_amount = _clean_amount(bill.net_amount - disc.discount_amount)
        _recalculate_bill_status(bill)

    disc.status = next_status
    disc.approved_by = payload.approved_by or disc.approved_by
    _audit(
        db,
        entity_type="Discount",
        action=next_status,
        bill_number=disc.bill_number,
        previous_value=old_status,
        new_value=next_status,
        user_name=disc.approved_by or payload.approved_by or "Billing",
        user_role="Billing",
        reason=payload.reason or disc.reason,
    )
    db.commit()
    db.refresh(disc)
    return disc


@router.get("/refunds", response_model=List[RefundRequestSchema])
def get_refund_requests(db: Session = Depends(get_db)):
    return db.query(RefundRequest).order_by(RefundRequest.created_at.desc()).all()


@router.post("/refunds", response_model=RefundRequestSchema, status_code=status.HTTP_201_CREATED)
def create_refund_request(payload: RefundRequestSchema, db: Session = Depends(get_db)):
    bill = _bill_or_404(db, payload.bill_number)
    amount = _clean_amount(payload.refund_amount)
    if amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Refund amount must be greater than zero")
    if amount > bill.paid_amount:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Refund amount cannot exceed paid amount")

    ref = RefundRequest(
        refund_code=payload.refund_code or _next_code(db, RefundRequest, "refund_code", "REF", 4),
        bill_number=bill.bill_number,
        patient_name=bill.patient_name,
        uhid=bill.uhid,
        original_amount=bill.net_amount,
        paid_amount=bill.paid_amount,
        refund_amount=amount,
        refund_reason=payload.refund_reason,
        refund_mode=payload.refund_mode,
        requested_by=payload.requested_by or "Billing",
        approved_by=payload.approved_by,
        refund_date=payload.refund_date or _date_str(),
        status=payload.status or "Requested",
    )
    db.add(ref)
    _audit(
        db,
        entity_type="Refund",
        action="Requested",
        bill_number=bill.bill_number,
        new_value=f"Refund request {ref.refund_code} amount {amount}",
        user_name=ref.requested_by,
        user_role="Billing",
        reason=payload.refund_reason,
    )
    db.commit()
    db.refresh(ref)
    return ref


@router.put("/refunds/{refund_id}/status", response_model=RefundRequestSchema)
def update_refund_status(refund_id: str, payload: StatusUpdateSchema, db: Session = Depends(get_db)):
    ref = db.query(RefundRequest).filter(or_(RefundRequest.id == refund_id, RefundRequest.refund_code == refund_id)).first()
    if not ref:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Refund request not found")
    bill = _bill_or_404(db, ref.bill_number)
    old_status = ref.status
    next_status = payload.status
    if next_status not in ["Requested", "Approved", "Processed", "Rejected", "Cancelled"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid refund status")
    if old_status != "Processed" and next_status == "Processed":
        bill.payment_status = "Refunded" if ref.refund_amount >= bill.paid_amount else "Partially Paid"

    ref.status = next_status
    ref.approved_by = payload.approved_by or ref.approved_by
    _audit(
        db,
        entity_type="Refund",
        action=next_status,
        bill_number=ref.bill_number,
        previous_value=old_status,
        new_value=next_status,
        user_name=ref.approved_by or payload.approved_by or "Billing",
        user_role="Billing",
        reason=payload.reason or ref.refund_reason,
    )
    db.commit()
    db.refresh(ref)
    return ref


@router.get("/cancellations", response_model=List[BillCancellationSchema])
def get_cancellations(db: Session = Depends(get_db)):
    return db.query(BillCancellation).order_by(BillCancellation.created_at.desc()).all()


@router.post("/cancellations", response_model=BillCancellationSchema, status_code=status.HTTP_201_CREATED)
def create_cancellation(payload: BillCancellationSchema, db: Session = Depends(get_db)):
    bill = _bill_or_404(db, payload.bill_number)
    if bill.payment_status == "Cancelled":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Bill is already cancelled")

    bill.payment_status = "Cancelled"
    cancellation = BillCancellation(
        cancellation_code=payload.cancellation_code or _next_code(db, BillCancellation, "cancellation_code", "CAN", 4),
        bill_number=bill.bill_number,
        patient_name=bill.patient_name,
        uhid=bill.uhid,
        original_amount=bill.net_amount,
        cancellation_reason=payload.cancellation_reason,
        requested_by=payload.requested_by or "Billing",
        approved_by=payload.approved_by,
        cancellation_date=payload.cancellation_date or _date_str(),
        status=payload.status or "Cancelled",
    )
    db.add(cancellation)
    _audit(
        db,
        entity_type="Cancellation",
        action="Cancelled",
        bill_number=bill.bill_number,
        previous_value="Active",
        new_value="Cancelled",
        user_name=cancellation.requested_by,
        user_role="Billing",
        reason=payload.cancellation_reason,
    )
    db.commit()
    db.refresh(cancellation)
    return cancellation


@router.get("/supplier-payables", response_model=List[SupplierPayableSchema])
def get_supplier_payables(db: Session = Depends(get_db)):
    return db.query(SupplierPayable).order_by(SupplierPayable.created_at.desc()).all()


def _parse_any_date(value: Any, fallback: datetime | None = None) -> datetime:
    if isinstance(value, datetime):
        return value
    raw = str(value or "").strip()
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d", "%d/%m/%Y", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(raw[:19], fmt)
        except ValueError:
            pass
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except Exception:
        return fallback or _now()


def _period_bounds(period: str, date_value: str | None) -> tuple[datetime, datetime, str]:
    base = _parse_any_date(date_value, _now()) if date_value else _now()
    key = (period or "month").lower()
    if key == "day":
        start = datetime(base.year, base.month, base.day)
        end = datetime(base.year + (1 if base.month == 12 and base.day == 31 else 0), 1 if base.month == 12 and base.day == 31 else base.month, 1 if base.day == 31 and base.month == 12 else base.day)
        end = start.replace(hour=23, minute=59, second=59, microsecond=999999)
        label = start.strftime("%Y-%m-%d")
    elif key == "year":
        start = datetime(base.year, 1, 1)
        end = datetime(base.year, 12, 31, 23, 59, 59, 999999)
        label = str(base.year)
    else:
        start = datetime(base.year, base.month, 1)
        if base.month == 12:
            end = datetime(base.year, 12, 31, 23, 59, 59, 999999)
        else:
            end = datetime(base.year, base.month + 1, 1)
            end = end.replace() - timedelta(microseconds=1)
        key = "month"
        label = start.strftime("%Y-%m")
    return start, end, label


def _in_period(value: Any, start: datetime, end: datetime, fallback: datetime | None = None) -> bool:
    parsed = _parse_any_date(value, fallback)
    return start <= parsed <= end


def _branch_matches(row_branch: str | None, branch: str | None) -> bool:
    if not branch or branch.lower() == "all":
        return True
    rb = (row_branch or "Main Branch").strip().lower()
    br = branch.strip().lower()
    short = br.replace("branch", "").replace("hospital", "").replace("cauvery", "").replace("care", "").strip()
    return rb == br or (short and short in rb)


def _num(value: Any) -> float:
    try:
        return round(float(value or 0), 2)
    except Exception:
        return 0.0


def _item_name(item: Any) -> str:
    if not isinstance(item, dict):
        return str(item or "Medicine")
    return str(item.get("medicineName") or item.get("itemName") or item.get("medicine_name") or item.get("name") or item.get("item_name") or "Medicine")


def _item_qty(item: Any) -> int:
    if not isinstance(item, dict):
        return 1
    try:
        return int(item.get("quantity") or item.get("qty") or 1)
    except Exception:
        return 1


def _item_total(item: Any) -> float:
    if not isinstance(item, dict):
        return 0.0
    direct = item.get("total") or item.get("totalAmount") or item.get("price")
    if direct not in (None, ""):
        return _num(direct)
    return _num(_item_qty(item) * _num(item.get("unitPrice") or item.get("unit_price") or item.get("sellingPrice") or item.get("rate")))


@router.get("/supplier-payables/analytics")
def get_supplier_payable_analytics(
    period: str = "month",
    date: str | None = None,
    branch: str | None = None,
    db: Session = Depends(get_db),
):
    start, end, label = _period_bounds(period, date)

    payables = [p for p in db.query(SupplierPayable).all() if _branch_matches(p.branch, branch)]
    period_payables = [p for p in payables if _in_period(p.purchase_date, start, end, p.created_at)]

    pharmacy_purchases = [p for p in db.query(PharmacyPurchase).all() if _branch_matches(p.branch, branch) and _in_period(p.purchase_date, start, end, p.created_at)]
    purchase_orders = [p for p in db.query(PurchaseOrder).all() if _branch_matches(p.branch, branch) and _in_period(p.purchase_date, start, end, p.created_at)]
    goods_receipts = [g for g in db.query(GoodsReceipt).all() if _branch_matches(g.branch, branch) and _in_period(g.received_date, start, end, g.created_at)]

    medicine_lookup = {m.name.lower(): m.category for m in db.query(Medicine).all() if m.name}
    medicine_code_lookup = {m.code.lower(): m.category for m in db.query(Medicine).all() if m.code}

    purchase_details: list[dict[str, Any]] = []
    for pur in pharmacy_purchases:
        items = pur.items if isinstance(pur.items, list) else []
        purchase_details.append({
            "source": "Pharmacy Purchase",
            "reference": pur.purchase_number,
            "invoice_number": pur.invoice_number,
            "supplier_name": pur.supplier_name,
            "purchase_date": pur.purchase_date,
            "item_count": len(items),
            "items": ", ".join(_item_name(item) for item in items[:6]) or "Pharmacy medicines",
            "amount": _num(pur.total_amount),
            "branch": pur.branch or "Main Branch",
        })

    po_total_by_number = {po.po_number: _num(po.total_amount) for po in purchase_orders}
    for grn in goods_receipts:
        items = db.query(GRNItem).filter(GRNItem.goods_receipt_id == grn.id).all()
        fallback_total = sum((item.accepted_quantity or item.received_quantity or 0) for item in items)
        purchase_details.append({
            "source": "Store Goods Receipt",
            "reference": grn.grn_number,
            "invoice_number": grn.po_number or grn.grn_number,
            "supplier_name": grn.vendor_name,
            "purchase_date": grn.received_date,
            "item_count": len(items),
            "items": ", ".join(item.item_name for item in items[:6]) or "Store items",
            "amount": po_total_by_number.get(grn.po_number or "", float(fallback_total)),
            "branch": grn.branch or "Main Branch",
        })

    # Include approved purchase orders even if a GRN has not been entered yet.
    received_po_numbers = {g.po_number for g in goods_receipts if g.po_number}
    for po in purchase_orders:
        if po.po_number in received_po_numbers:
            continue
        purchase_details.append({
            "source": "Store Purchase Order",
            "reference": po.po_number,
            "invoice_number": po.po_number,
            "supplier_name": po.vendor_name,
            "purchase_date": po.purchase_date,
            "item_count": len(po.items or []),
            "items": ", ".join(item.item_name for item in (po.items or [])[:6]) or "Store order items",
            "amount": _num(po.total_amount),
            "branch": po.branch or "Main Branch",
        })

    category_map: dict[str, dict[str, Any]] = {}

    def add_category_revenue(category: str, item_name: str, qty: int, amount: float) -> None:
        cat = category or "General"
        row = category_map.setdefault(cat, {"category": cat, "item_count": 0, "quantity_sold": 0, "revenue": 0.0})
        row["item_count"] += 1 if item_name else 0
        row["quantity_sold"] += qty
        row["revenue"] = _num(row["revenue"] + amount)

    pharmacy_bills = db.query(Bill).options(selectinload(Bill.items)).filter(or_(Bill.bill_type == "Pharmacy", Bill.bill_type == "PHARMACY")).all()
    for bill in pharmacy_bills:
        if not _branch_matches(bill.branch, branch) or not _in_period(bill.bill_date, start, end, bill.created_at):
            continue
        for item in bill.items:
            name = item.service_name or "Medicine"
            cat = medicine_lookup.get(name.lower(), item.category or "Pharmacy")
            add_category_revenue(cat, name, int(item.quantity or 1), _num(item.net_amount or item.gross_amount))

    pos_invoices = [inv for inv in db.query(POSInvoice).all() if _branch_matches(inv.branch, branch) and _in_period(inv.date, start, end, inv.created_at)]
    for inv in pos_invoices:
        for item in (inv.items if isinstance(inv.items, list) else []):
            name = _item_name(item)
            cat = medicine_lookup.get(name.split(" (")[0].lower(), medicine_lookup.get(name.lower(), "General"))
            add_category_revenue(cat, name, _item_qty(item), _item_total(item))

    prescriptions = [rx for rx in db.query(Prescription).all() if _branch_matches(rx.branch, branch) and _in_period(rx.visit_date, start, end, rx.created_at)]
    for rx in prescriptions:
        for item in (rx.items if isinstance(rx.items, list) else []):
            name = _item_name(item)
            cat = medicine_lookup.get(name.lower(), medicine_code_lookup.get(str(item.get("medicineId", "")).lower() if isinstance(item, dict) else "", "General"))
            add_category_revenue(cat, name, _item_qty(item), _item_total(item))

    category_revenue = sorted(category_map.values(), key=lambda row: row["revenue"], reverse=True)
    total_category_revenue = _num(sum(row["revenue"] for row in category_revenue))
    total_purchase_value = _num(sum(row["amount"] for row in purchase_details))
    payable_invoice_total = _num(sum(p.invoice_amount or 0 for p in period_payables))
    paid_total = _num(sum(p.paid_amount or 0 for p in period_payables))
    outstanding_total = _num(sum(p.outstanding_amount or 0 for p in period_payables))

    daily_map: dict[str, dict[str, Any]] = {}
    for row in purchase_details:
        day = _parse_any_date(row["purchase_date"]).strftime("%Y-%m-%d")
        entry = daily_map.setdefault(day, {"date": day, "purchase_value": 0.0, "revenue": 0.0, "outstanding": 0.0})
        entry["purchase_value"] = _num(entry["purchase_value"] + row["amount"])
    for bill in pharmacy_bills:
        if _branch_matches(bill.branch, branch) and _in_period(bill.bill_date, start, end, bill.created_at):
            day = _parse_any_date(bill.bill_date, bill.created_at).strftime("%Y-%m-%d")
            entry = daily_map.setdefault(day, {"date": day, "purchase_value": 0.0, "revenue": 0.0, "outstanding": 0.0})
            entry["revenue"] = _num(entry["revenue"] + _num(bill.net_amount))
    for p in period_payables:
        day = _parse_any_date(p.purchase_date, p.created_at).strftime("%Y-%m-%d")
        entry = daily_map.setdefault(day, {"date": day, "purchase_value": 0.0, "revenue": 0.0, "outstanding": 0.0})
        entry["outstanding"] = _num(entry["outstanding"] + _num(p.outstanding_amount))

    return {
        "period": period,
        "period_label": label,
        "branch": branch or "All",
        "totals": {
            "purchase_value": total_purchase_value,
            "payable_invoice_total": payable_invoice_total,
            "paid_total": paid_total,
            "outstanding_total": outstanding_total,
            "category_revenue_total": total_category_revenue,
            "purchase_count": len(purchase_details),
            "payable_count": len(period_payables),
        },
        "category_revenue": category_revenue,
        "purchase_details": sorted(purchase_details, key=lambda row: row["purchase_date"], reverse=True),
        "payables": [
            {
                "supplier_name": p.supplier_name,
                "invoice_number": p.invoice_number,
                "purchase_date": p.purchase_date,
                "invoice_amount": _num(p.invoice_amount),
                "paid_amount": _num(p.paid_amount),
                "outstanding_amount": _num(p.outstanding_amount),
                "payment_status": p.payment_status,
                "module_source": p.module_source,
                "branch": p.branch,
            }
            for p in period_payables
        ],
        "daily_summary": sorted(daily_map.values(), key=lambda row: row["date"]),
    }


@router.post("/supplier-payables", response_model=SupplierPayableSchema, status_code=status.HTTP_201_CREATED)
def create_supplier_payable(payload: SupplierPayableSchema, db: Session = Depends(get_db)):
    payable = SupplierPayable(
        supplier_name=payload.supplier_name,
        invoice_number=payload.invoice_number,
        purchase_date=payload.purchase_date,
        invoice_amount=_clean_amount(payload.invoice_amount),
        paid_amount=_clean_amount(payload.paid_amount),
        outstanding_amount=max(0.0, _clean_amount(payload.outstanding_amount or (payload.invoice_amount - payload.paid_amount))),
        due_date=payload.due_date,
        payment_status=payload.payment_status,
        module_source=payload.module_source,
        branch=payload.branch,
    )
    if payable.outstanding_amount <= 0:
        payable.payment_status = "Paid"
    elif payable.paid_amount > 0:
        payable.payment_status = "Partially Paid"
    db.add(payable)
    _audit(
        db,
        entity_type="SupplierPayable",
        action="Created",
        new_value=f"Supplier payable {payable.invoice_number} amount {payable.invoice_amount}",
        user_name="Billing",
        user_role="Billing",
        reason="Supplier payable recorded",
    )
    db.commit()
    db.refresh(payable)
    return payable


@router.put("/supplier-payables/{invoice_number}/pay", response_model=SupplierPayableSchema)
def pay_supplier(invoice_number: str, payload: SupplierPaymentSchema, db: Session = Depends(get_db)):
    payable = db.query(SupplierPayable).filter(SupplierPayable.invoice_number == invoice_number).first()
    if not payable:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier payable not found")
    amount = _clean_amount(payload.amount)
    if amount <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment amount must be greater than zero")
    if amount > payable.outstanding_amount:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment amount cannot exceed outstanding amount")

    old_value = f"Paid {payable.paid_amount}, outstanding {payable.outstanding_amount}"
    payable.paid_amount = _clean_amount(payable.paid_amount + amount)
    payable.outstanding_amount = max(0.0, _clean_amount(payable.invoice_amount - payable.paid_amount))
    payable.payment_status = "Paid" if payable.outstanding_amount <= 0 else "Partially Paid"
    _audit(
        db,
        entity_type="SupplierPayable",
        action="Collected",
        bill_number=invoice_number,
        previous_value=old_value,
        new_value=f"Paid {payable.paid_amount}, outstanding {payable.outstanding_amount}",
        user_name=payload.paid_by or "Billing",
        user_role="Billing",
        reason=payload.remarks or f"Supplier payment via {payload.payment_mode} ref {payload.reference_no}",
    )
    db.commit()
    db.refresh(payable)
    return payable


@router.get("/audit-logs", response_model=List[BillingAuditLogSchema])
def get_billing_audit_logs(db: Session = Depends(get_db)):
    return db.query(BillingAuditLog).order_by(BillingAuditLog.created_at.desc()).all()

