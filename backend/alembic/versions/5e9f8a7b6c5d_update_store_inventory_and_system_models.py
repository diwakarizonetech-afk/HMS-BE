# update store inventory and system models
# Revision ID: 5e9f8a7b6c5d
# Revises: 4b9f0d2e6f3a
# Create Date: 2026-08-04 10:25:00.000000

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '5e9f8a7b6c5d'
down_revision: Union[str, None] = '4b9f0d2e6f3a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update users role column and add missing columns
    try:
        op.execute("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50) USING role::text")
    except Exception:
        pass

    with op.batch_alter_table('users', schema=None) as batch_op:
        for col_name, col_type in [
            ('branch', sa.String(length=200)),
            ('last_login', sa.String(length=50)),
        ]:
            try:
                batch_op.add_column(sa.Column(col_name, col_type, nullable=True))
            except Exception:
                pass

    # 2. Add extra fields to item_master
    with op.batch_alter_table('item_master', schema=None) as batch_op:
        for col_name, col_type, server_def in [
            ('pack_quantity', sa.Integer(), '1'),
            ('issue_unit', sa.String(length=50), "'Piece'"),
            ('opening_stock', sa.Integer(), '0'),
        ]:
            try:
                batch_op.add_column(sa.Column(col_name, col_type, nullable=True, server_default=server_def))
            except Exception:
                pass

    # 3. Add extra fields to vendors
    with op.batch_alter_table('vendors', schema=None) as batch_op:
        for col_name, col_type, server_def in [
            ('category', sa.String(length=100), "'Pharmaceuticals'"),
            ('rating', sa.Integer(), '5'),
        ]:
            try:
                batch_op.add_column(sa.Column(col_name, col_type, nullable=True, server_default=server_def))
            except Exception:
                pass

    # 4. Add extra fields to batch_items
    with op.batch_alter_table('batch_items', schema=None) as batch_op:
        for col_name, col_type in [
            ('supplier_name', sa.String(length=200)),
            ('location', sa.String(length=150)),
            ('quantity', sa.Integer()),
            ('manufacturing_date', sa.String(length=20)),
        ]:
            try:
                batch_op.add_column(sa.Column(col_name, col_type, nullable=True))
            except Exception:
                pass

    # 5. Add extra fields to stock_inward
    with op.batch_alter_table('stock_inward', schema=None) as batch_op:
        for col_name, col_type in [
            ('inward_number', sa.String(length=50)),
            ('po_number', sa.String(length=50)),
            ('unit_price', sa.Float()),
            ('supplier_name', sa.String(length=200)),
        ]:
            try:
                batch_op.add_column(sa.Column(col_name, col_type, nullable=True))
            except Exception:
                pass

    # 6. Add extra fields to stock_outward
    with op.batch_alter_table('stock_outward', schema=None) as batch_op:
        for col_name, col_type in [
            ('outward_number', sa.String(length=50)),
            ('issued_to_department', sa.String(length=150)),
            ('issued_to_person', sa.String(length=150)),
            ('batch_number', sa.String(length=100)),
        ]:
            try:
                batch_op.add_column(sa.Column(col_name, col_type, nullable=True))
            except Exception:
                pass

    # 7. Add extra fields to beds
    try:
        op.execute("ALTER TABLE beds ALTER COLUMN ward TYPE VARCHAR(100) USING ward::text")
    except Exception:
        pass
    with op.batch_alter_table('beds', schema=None) as batch_op:
        for col_name, col_type in [
            ('branch', sa.String(length=200)),
            ('daily_rate', sa.Float()),
            ('doctor_assigned', sa.String(length=200)),
            ('nurse_in_charge', sa.String(length=200)),
        ]:
            try:
                batch_op.add_column(sa.Column(col_name, col_type, nullable=True))
            except Exception:
                pass

    # 8. Create store_activity table if missing
    try:
        op.create_table(
            'store_activity',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('date', sa.String(length=20), nullable=False),
            sa.Column('activity', sa.String(length=200), nullable=False),
            sa.Column('item', sa.String(length=200), nullable=True),
            sa.Column('quantity', sa.String(length=50), nullable=True),
            sa.Column('user', sa.String(length=150), nullable=True),
            sa.Column('status', sa.String(length=50), nullable=True, server_default='Completed'),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )
    except Exception:
        pass

    # 9. Add extra fields to stock_transfer
    with op.batch_alter_table('stock_transfer', schema=None) as batch_op:
        for col_name, col_type in [
            ('from_location', sa.String(length=150)),
            ('to_location', sa.String(length=150)),
            ('date', sa.String(length=20)),
        ]:
            try:
                batch_op.add_column(sa.Column(col_name, col_type, nullable=True))
            except Exception:
                pass


def downgrade() -> None:
    try:
        op.drop_table('store_activity')
    except Exception:
        pass
