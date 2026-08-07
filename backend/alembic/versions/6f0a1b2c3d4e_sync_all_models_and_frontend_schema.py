# sync all models and frontend schema
# Revision ID: 6f0a1b2c3d4e
# Revises: 5e9f8a7b6c5d
# Create Date: 2026-08-05 16:52:00.000000

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '6f0a1b2c3d4e'
down_revision: Union[str, None] = '5e9f8a7b6c5d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update users table columns
    with op.batch_alter_table('users', schema=None) as batch_op:
        for col_name, col_type in [
            ('branch', sa.String(length=200)),
            ('last_login', sa.String(length=50)),
            ('phone', sa.String(length=50)),
        ]:
            try:
                batch_op.add_column(sa.Column(col_name, col_type, nullable=True))
            except Exception:
                pass

    # 2. Update patients table
    with op.batch_alter_table('patients', schema=None) as batch_op:
        for col_name, col_type in [
            ('address', sa.String(length=255)),
            ('emergency_contact', sa.String(length=100)),
            ('allergies', sa.String(length=255)),
            ('marital_status', sa.String(length=50)),
            ('registered_date', sa.String(length=50)),
        ]:
            try:
                batch_op.add_column(sa.Column(col_name, col_type, nullable=True))
            except Exception:
                pass

    # 3. Update doctors table
    with op.batch_alter_table('doctors', schema=None) as batch_op:
        for col_name, col_type in [
            ('consultation_fee', sa.Float()),
            ('experience_years', sa.Integer()),
            ('available_days', sa.String(length=200)),
            ('available_time', sa.String(length=100)),
            ('room_number', sa.String(length=50)),
        ]:
            try:
                batch_op.add_column(sa.Column(col_name, col_type, nullable=True))
            except Exception:
                pass

    # 4. Update beds table
    with op.batch_alter_table('beds', schema=None) as batch_op:
        for col_name, col_type in [
            ('branch', sa.String(length=200)),
            ('daily_rate', sa.Float()),
            ('doctor_assigned', sa.String(length=200)),
            ('nurse_in_charge', sa.String(length=200)),
            ('patient_id', sa.String(length=100)),
            ('patient_name', sa.String(length=200)),
            ('admission_date', sa.String(length=50)),
        ]:
            try:
                batch_op.add_column(sa.Column(col_name, col_type, nullable=True))
            except Exception:
                pass

    # 5. Update item_master table
    with op.batch_alter_table('item_master', schema=None) as batch_op:
        for col_name, col_type in [
            ('pack_quantity', sa.Integer()),
            ('issue_unit', sa.String(length=50)),
            ('opening_stock', sa.Integer()),
            ('reorder_level', sa.Integer()),
            ('unit_price', sa.Float()),
            ('gst_rate', sa.Float()),
            ('hsn_sac_code', sa.String(length=50)),
        ]:
            try:
                batch_op.add_column(sa.Column(col_name, col_type, nullable=True))
            except Exception:
                pass

    # 6. Update vendors table
    with op.batch_alter_table('vendors', schema=None) as batch_op:
        for col_name, col_type in [
            ('category', sa.String(length=100)),
            ('rating', sa.Integer()),
            ('address', sa.String(length=255)),
            ('gstin', sa.String(length=50)),
            ('payment_terms', sa.String(length=100)),
        ]:
            try:
                batch_op.add_column(sa.Column(col_name, col_type, nullable=True))
            except Exception:
                pass

    # 7. Update batch_items table
    with op.batch_alter_table('batch_items', schema=None) as batch_op:
        for col_name, col_type in [
            ('supplier_name', sa.String(length=200)),
            ('location', sa.String(length=150)),
            ('quantity', sa.Integer()),
            ('manufacturing_date', sa.String(length=20)),
            ('expiry_date', sa.String(length=20)),
            ('unit_cost', sa.Float()),
            ('mrp', sa.Float()),
        ]:
            try:
                batch_op.add_column(sa.Column(col_name, col_type, nullable=True))
            except Exception:
                pass

    # 8. Ensure store_activity table exists
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


def downgrade() -> None:
    pass
