# add missing department columns
# Revision ID: a1b2c3d4e5f6
# Revises: 9c3e1f6a4b2d
# Create Date: 2026-08-13 16:37:00.000000

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '9c3e1f6a4b2d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    is_sqlite = conn.dialect.name == 'sqlite'

    def add_col_safe(table_name: str, col_name: str, col_type: str) -> None:
        if is_sqlite:
            insp = sa.inspect(conn)
            columns = [c['name'] for c in insp.get_columns(table_name)]
            if col_name not in columns:
                op.execute(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}")
        else:
            try:
                with conn.begin_nested():
                    op.execute(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {col_name} {col_type}")
            except Exception:
                pass

    # 1. Add missing columns to departments table
    department_cols = [
        ('head_of_department', 'VARCHAR(150)'),
        ('email', 'VARCHAR(150)'),
        ('phone', 'VARCHAR(50)'),
        ('floor_location', 'VARCHAR(100)'),
        ('bed_count', 'INTEGER DEFAULT 0'),
        ('status', "VARCHAR(20) DEFAULT 'Active'"),
        ('branch', 'VARCHAR(200)'),
    ]
    for col_name, col_type in department_cols:
        add_col_safe('departments', col_name, col_type)

    # 2. Add missing columns to branches table
    branch_cols = [
        ('total_staff', 'INTEGER DEFAULT 0'),
        ('bed_capacity', 'INTEGER DEFAULT 0'),
        ('email', 'VARCHAR(150)'),
        ('phone', 'VARCHAR(50)'),
        ('status', "VARCHAR(20) DEFAULT 'Active'"),
        ('is_main_branch', 'BOOLEAN DEFAULT FALSE'),
    ]
    for col_name, col_type in branch_cols:
        add_col_safe('branches', col_name, col_type)

    # 3. Add missing columns to doctors table
    doctor_cols = [
        ('branch', 'VARCHAR(200)'),
    ]
    for col_name, col_type in doctor_cols:
        add_col_safe('doctors', col_name, col_type)

    # 4. Add missing columns to goods_receipts table (GRN master)
    grn_cols = [
        ('grn_number', 'VARCHAR(50)'),
        ('po_number', 'VARCHAR(50)'),
        ('purchase_order_id', 'VARCHAR(36)'),
        ('vendor_name', 'VARCHAR(200)'),
        ('received_date', 'VARCHAR(20)'),
        ('remarks', 'TEXT'),
        ('status', "VARCHAR(30) DEFAULT 'Received'"),
        ('branch', 'VARCHAR(200)'),
    ]
    for col_name, col_type in grn_cols:
        add_col_safe('goods_receipts', col_name, col_type)

    # 5. Add missing columns to grn_items table (GRN line items)
    grn_item_cols = [
        ('goods_receipt_id', 'VARCHAR(36)'),
        ('item_id', 'VARCHAR(36)'),
        ('item_code', 'VARCHAR(50)'),
        ('item_name', 'VARCHAR(200)'),
        ('received_quantity', 'INTEGER DEFAULT 0'),
        ('accepted_quantity', 'INTEGER DEFAULT 0'),
        ('rejected_quantity', 'INTEGER DEFAULT 0'),
    ]
    for col_name, col_type in grn_item_cols:
        add_col_safe('grn_items', col_name, col_type)

    # 6. Add missing columns to stock_inward table (GRN inventory logging)
    stock_inw_cols = [
        ('inward_number', 'VARCHAR(50)'),
        ('po_number', 'VARCHAR(50)'),
        ('item_id', 'VARCHAR(36)'),
        ('item_code', 'VARCHAR(50)'),
        ('item_name', 'VARCHAR(200)'),
        ('quantity', 'INTEGER DEFAULT 0'),
        ('unit_price', 'FLOAT DEFAULT 0.0'),
        ('batch_number', 'VARCHAR(100)'),
        ('expiry_date', 'VARCHAR(20)'),
        ('supplier', 'VARCHAR(200)'),
        ('supplier_name', 'VARCHAR(200)'),
        ('warehouse', 'VARCHAR(150)'),
        ('received_by', 'VARCHAR(150)'),
        ('date', 'VARCHAR(20)'),
        ('branch', 'VARCHAR(200)'),
    ]
    for col_name, col_type in stock_inw_cols:
        add_col_safe('stock_inward', col_name, col_type)

    # 7. Add missing columns to stock_outward table
    stock_out_cols = [
        ('outward_number', 'VARCHAR(50)'),
        ('department', 'VARCHAR(150)'),
        ('issued_to_department', 'VARCHAR(150)'),
        ('ward', 'VARCHAR(150)'),
        ('lab', 'VARCHAR(150)'),
        ('pharmacy', 'VARCHAR(150)'),
        ('operation_theatre', 'VARCHAR(150)'),
        ('doctor', 'VARCHAR(150)'),
        ('issued_to_person', 'VARCHAR(150)'),
        ('reason', 'TEXT'),
        ('item_id', 'VARCHAR(36)'),
        ('item_code', 'VARCHAR(50)'),
        ('item_name', 'VARCHAR(200)'),
        ('batch_number', 'VARCHAR(100)'),
        ('quantity', 'INTEGER DEFAULT 0'),
        ('issued_by', 'VARCHAR(150)'),
        ('date', 'VARCHAR(20)'),
        ('status', "VARCHAR(50) DEFAULT 'Pending Approval'"),
        ('branch', 'VARCHAR(200)'),
    ]
    for col_name, col_type in stock_out_cols:
        add_col_safe('stock_outward', col_name, col_type)

    # 8. Add missing columns to stock_transfer table
    stock_trf_cols = [
        ('transfer_number', 'VARCHAR(50)'),
        ('item_id', 'VARCHAR(36)'),
        ('source', 'VARCHAR(150)'),
        ('destination', 'VARCHAR(150)'),
        ('from_location', 'VARCHAR(150)'),
        ('to_location', 'VARCHAR(150)'),
        ('item_code', 'VARCHAR(50)'),
        ('item_name', 'VARCHAR(200)'),
        ('batch_number', 'VARCHAR(100)'),
        ('quantity', 'INTEGER DEFAULT 0'),
        ('transfer_date', 'VARCHAR(20)'),
        ('date', 'VARCHAR(20)'),
        ('status', "VARCHAR(50) DEFAULT 'Pending'"),
        ('requested_by', 'VARCHAR(150)'),
        ('branch', 'VARCHAR(200)'),
    ]
    for col_name, col_type in stock_trf_cols:
        add_col_safe('stock_transfer', col_name, col_type)

    # 9. Add missing columns to stock_adjustment table
    stock_adj_cols = [
        ('adjustment_number', 'VARCHAR(50)'),
        ('item_id', 'VARCHAR(36)'),
        ('type', "VARCHAR(50) DEFAULT 'Damage'"),
        ('item_code', 'VARCHAR(50)'),
        ('item_name', 'VARCHAR(200)'),
        ('current_quantity', 'INTEGER DEFAULT 0'),
        ('adjusted_quantity', 'INTEGER DEFAULT 0'),
        ('reason', 'TEXT'),
        ('approved_by', 'VARCHAR(150)'),
        ('date', 'VARCHAR(20)'),
        ('branch', 'VARCHAR(200)'),
    ]
    for col_name, col_type in stock_adj_cols:
        add_col_safe('stock_adjustment', col_name, col_type)


def downgrade() -> None:
    pass
