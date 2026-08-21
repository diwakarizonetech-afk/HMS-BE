"""Add billing system models and tables.

Revision ID: h7c8d9e0f1a2
Revises: g6b7c8d9e0f1
Create Date: 2026-08-20

Creates:
  - bills
  - bill_items
  - payment_collections
  - payment_transactions
  - discount_requests
  - refund_requests
  - bill_cancellations
  - supplier_payables
  - billing_audit_logs
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "h7c8d9e0f1a2"
down_revision: Union[str, None] = "g6b7c8d9e0f1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    # 1. bills
    if "bills" not in existing_tables:
        op.create_table(
            "bills",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("bill_number", sa.String(length=100), nullable=False),
            sa.Column("patient_id", sa.String(length=100), nullable=True),
            sa.Column("patient_name", sa.String(length=150), nullable=False),
            sa.Column("uhid", sa.String(length=100), nullable=False),
            sa.Column("appointment_id", sa.String(length=100), nullable=True),
            sa.Column("ipd_number", sa.String(length=100), nullable=True),
            sa.Column("bill_type", sa.String(length=50), nullable=False),
            sa.Column("department", sa.String(length=100), nullable=True),
            sa.Column("doctor_name", sa.String(length=150), nullable=True),
            sa.Column("gross_amount", sa.Float(), nullable=False, server_default="0"),
            sa.Column("discount_amount", sa.Float(), nullable=False, server_default="0"),
            sa.Column("tax_amount", sa.Float(), nullable=False, server_default="0"),
            sa.Column("net_amount", sa.Float(), nullable=False, server_default="0"),
            sa.Column("paid_amount", sa.Float(), nullable=False, server_default="0"),
            sa.Column("pending_amount", sa.Float(), nullable=False, server_default="0"),
            sa.Column("payment_mode", sa.String(length=50), nullable=False, server_default="Cash"),
            sa.Column("payment_status", sa.String(length=50), nullable=False, server_default="Pending"),
            sa.Column("discharge_status", sa.String(length=50), nullable=True),
            sa.Column("bill_date", sa.String(length=50), nullable=False),
            sa.Column("due_date", sa.String(length=50), nullable=True),
            sa.Column("billing_staff", sa.String(length=150), nullable=False, server_default="System Billing"),
            sa.Column("branch", sa.String(length=150), nullable=False, server_default="Main Branch"),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_bills_bill_number"), "bills", ["bill_number"], unique=True)
        op.create_index(op.f("ix_bills_uhid"), "bills", ["uhid"], unique=False)

    # 2. bill_items
    if "bill_items" not in existing_tables:
        op.create_table(
            "bill_items",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("bill_id", sa.String(length=100), sa.ForeignKey("bills.id", ondelete="CASCADE"), nullable=False),
            sa.Column("service_name", sa.String(length=200), nullable=False),
            sa.Column("category", sa.String(length=100), nullable=False, server_default="General"),
            sa.Column("description", sa.Text(), nullable=True),
            sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("unit_price", sa.Float(), nullable=False, server_default="0"),
            sa.Column("gross_amount", sa.Float(), nullable=False, server_default="0"),
            sa.Column("discount", sa.Float(), nullable=False, server_default="0"),
            sa.Column("tax", sa.Float(), nullable=False, server_default="0"),
            sa.Column("net_amount", sa.Float(), nullable=False, server_default="0"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_bill_items_bill_id"), "bill_items", ["bill_id"], unique=False)

    # 3. payment_collections
    if "payment_collections" not in existing_tables:
        op.create_table(
            "payment_collections",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("receipt_number", sa.String(length=100), nullable=False),
            sa.Column("bill_id", sa.String(length=100), nullable=True),
            sa.Column("bill_number", sa.String(length=100), nullable=False),
            sa.Column("patient_name", sa.String(length=150), nullable=False),
            sa.Column("uhid", sa.String(length=100), nullable=False),
            sa.Column("service_type", sa.String(length=50), nullable=False, server_default="OPD"),
            sa.Column("total_bill", sa.Float(), nullable=False, server_default="0"),
            sa.Column("previously_paid", sa.Float(), nullable=False, server_default="0"),
            sa.Column("current_payment", sa.Float(), nullable=False, server_default="0"),
            sa.Column("remaining_due", sa.Float(), nullable=False, server_default="0"),
            sa.Column("payment_mode", sa.String(length=50), nullable=False),
            sa.Column("transaction_ref", sa.String(length=100), nullable=True),
            sa.Column("payer_name", sa.String(length=150), nullable=True),
            sa.Column("payer_identifier", sa.String(length=200), nullable=True),
            sa.Column("payer_contact", sa.String(length=50), nullable=True),
            sa.Column("payer_email", sa.String(length=150), nullable=True),
            sa.Column("gateway_payment_id", sa.String(length=150), nullable=True),
            sa.Column("gateway_order_id", sa.String(length=150), nullable=True),
            sa.Column("payment_date", sa.String(length=50), nullable=False),
            sa.Column("collected_by", sa.String(length=150), nullable=False),
            sa.Column("branch", sa.String(length=150), nullable=False, server_default="Main Branch"),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_payment_collections_receipt_number"), "payment_collections", ["receipt_number"], unique=True)
        op.create_index(op.f("ix_payment_collections_bill_number"), "payment_collections", ["bill_number"], unique=False)
        op.create_index(op.f("ix_payment_collections_uhid"), "payment_collections", ["uhid"], unique=False)

    # 4. payment_transactions
    if "payment_transactions" not in existing_tables:
        op.create_table(
            "payment_transactions",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("provider", sa.String(length=50), nullable=False, server_default="Razorpay"),
            sa.Column("provider_reference", sa.String(length=150), nullable=True),
            sa.Column("bill_id", sa.String(length=100), nullable=True),
            sa.Column("bill_number", sa.String(length=100), nullable=False),
            sa.Column("patient_name", sa.String(length=150), nullable=False),
            sa.Column("uhid", sa.String(length=100), nullable=False),
            sa.Column("amount", sa.Float(), nullable=False, server_default="0"),
            sa.Column("payment_mode", sa.String(length=50), nullable=False, server_default="UPI"),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="Created"),
            sa.Column("qr_image_url", sa.Text(), nullable=True),
            sa.Column("qr_short_url", sa.Text(), nullable=True),
            sa.Column("upi_intent_url", sa.Text(), nullable=True),
            sa.Column("receipt_number", sa.String(length=100), nullable=True),
            sa.Column("provider_payment_id", sa.String(length=150), nullable=True),
            sa.Column("raw_response", sa.Text(), nullable=True),
            sa.Column("created_by", sa.String(length=150), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(op.f("ix_payment_transactions_provider_reference"), "payment_transactions", ["provider_reference"], unique=False)
        op.create_index(op.f("ix_payment_transactions_bill_number"), "payment_transactions", ["bill_number"], unique=False)

    # 5. discount_requests
    if "discount_requests" not in existing_tables:
        op.create_table(
            "discount_requests",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("discount_code", sa.String(length=100), nullable=False),
            sa.Column("bill_number", sa.String(length=100), nullable=False),
            sa.Column("patient_name", sa.String(length=150), nullable=False),
            sa.Column("uhid", sa.String(length=100), nullable=False),
            sa.Column("original_amount", sa.Float(), nullable=False, server_default="0"),
            sa.Column("discount_type", sa.String(length=20), nullable=False, server_default="Percentage"),
            sa.Column("discount_value", sa.Float(), nullable=False, server_default="0"),
            sa.Column("discount_amount", sa.Float(), nullable=False, server_default="0"),
            sa.Column("reason", sa.Text(), nullable=False),
            sa.Column("requested_by", sa.String(length=150), nullable=False),
            sa.Column("approved_by", sa.String(length=150), nullable=True),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="Pending"),
            sa.Column("request_date", sa.String(length=50), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("discount_code"),
        )

    # 6. refund_requests
    if "refund_requests" not in existing_tables:
        op.create_table(
            "refund_requests",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("refund_code", sa.String(length=100), nullable=False),
            sa.Column("bill_number", sa.String(length=100), nullable=False),
            sa.Column("patient_name", sa.String(length=150), nullable=False),
            sa.Column("uhid", sa.String(length=100), nullable=False),
            sa.Column("original_amount", sa.Float(), nullable=False, server_default="0"),
            sa.Column("paid_amount", sa.Float(), nullable=False, server_default="0"),
            sa.Column("refund_amount", sa.Float(), nullable=False, server_default="0"),
            sa.Column("refund_reason", sa.Text(), nullable=False),
            sa.Column("refund_mode", sa.String(length=50), nullable=False, server_default="Cash"),
            sa.Column("requested_by", sa.String(length=150), nullable=False),
            sa.Column("approved_by", sa.String(length=150), nullable=True),
            sa.Column("refund_date", sa.String(length=50), nullable=False),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="Requested"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("refund_code"),
        )

    # 7. bill_cancellations
    if "bill_cancellations" not in existing_tables:
        op.create_table(
            "bill_cancellations",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("cancellation_code", sa.String(length=100), nullable=False),
            sa.Column("bill_number", sa.String(length=100), nullable=False),
            sa.Column("patient_name", sa.String(length=150), nullable=False),
            sa.Column("uhid", sa.String(length=100), nullable=False),
            sa.Column("original_amount", sa.Float(), nullable=False, server_default="0"),
            sa.Column("cancellation_reason", sa.Text(), nullable=False),
            sa.Column("requested_by", sa.String(length=150), nullable=False),
            sa.Column("approved_by", sa.String(length=150), nullable=True),
            sa.Column("cancellation_date", sa.String(length=50), nullable=False),
            sa.Column("status", sa.String(length=30), nullable=False, server_default="Pending"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("cancellation_code"),
        )

    # 8. supplier_payables
    if "supplier_payables" not in existing_tables:
        op.create_table(
            "supplier_payables",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("supplier_name", sa.String(length=200), nullable=False),
            sa.Column("invoice_number", sa.String(length=100), nullable=False),
            sa.Column("purchase_date", sa.String(length=50), nullable=False),
            sa.Column("invoice_amount", sa.Float(), nullable=False, server_default="0"),
            sa.Column("paid_amount", sa.Float(), nullable=False, server_default="0"),
            sa.Column("outstanding_amount", sa.Float(), nullable=False, server_default="0"),
            sa.Column("due_date", sa.String(length=50), nullable=True),
            sa.Column("payment_status", sa.String(length=50), nullable=False, server_default="Pending"),
            sa.Column("module_source", sa.String(length=50), nullable=False, server_default="Pharmacy"),
            sa.Column("branch", sa.String(length=150), nullable=False, server_default="Main Branch"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )

    # 9. billing_audit_logs
    if "billing_audit_logs" not in existing_tables:
        op.create_table(
            "billing_audit_logs",
            sa.Column("id", sa.String(length=36), nullable=False),
            sa.Column("transaction_id", sa.String(length=100), nullable=False),
            sa.Column("bill_number", sa.String(length=100), nullable=True),
            sa.Column("entity_type", sa.String(length=50), nullable=False),
            sa.Column("action", sa.String(length=50), nullable=False),
            sa.Column("previous_value", sa.Text(), nullable=True),
            sa.Column("new_value", sa.Text(), nullable=True),
            sa.Column("user_name", sa.String(length=150), nullable=False),
            sa.Column("user_role", sa.String(length=100), nullable=False),
            sa.Column("timestamp", sa.String(length=50), nullable=False),
            sa.Column("reason", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )


def downgrade() -> None:
    tables = [
        "billing_audit_logs",
        "supplier_payables",
        "bill_cancellations",
        "refund_requests",
        "discount_requests",
        "payment_transactions",
        "payment_collections",
        "bill_items",
        "bills",
    ]
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    for table in tables:
        if table in existing_tables:
            op.drop_table(table)
