# sync all models and frontend schema
# Revision ID: 6f0a1b2c3d4e
# Revises: 5e9f8a7b6c5d
# Create Date: 2026-08-05 16:52:00.000000

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateColumn


revision: str = '6f0a1b2c3d4e'
down_revision: Union[str, None] = '5e9f8a7b6c5d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _add_col(conn, table_name: str, column: sa.Column) -> None:
    ddl = CreateColumn(column).compile(dialect=postgresql.dialect())
    conn.execute(sa.text(f'ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {ddl}'))


def upgrade() -> None:
    # NOTE (Phase 18 fix): every optional/idempotent DDL statement below is
    # wrapped in a real Postgres SAVEPOINT (conn.begin_nested()), not just a
    # bare Python try/except. On Postgres, a single failed statement aborts
    # the ENTIRE outer transaction -- every subsequent statement then fails
    # with InFailedSqlTransaction even though it would otherwise have
    # succeeded. A SAVEPOINT scopes the rollback to just the failed
    # statement, so the rest of this migration (and the whole chain) can
    # keep going. This bug was only catchable once a real Postgres server
    # was available to test against (Phase 18) -- it never surfaced against
    # SQLite, which does not abort the transaction the same way.
    conn = op.get_bind()
    # 1. Update users table columns
    for col_name, col_type in [
            ('branch', sa.String(length=200)),
            ('last_login', sa.String(length=50)),
            ('phone', sa.String(length=50)),
    ]:
        _add_col(conn, 'users', sa.Column(col_name, col_type, nullable=True))

    # 2. Update patients table
    for col_name, col_type in [
            ('address', sa.String(length=255)),
            ('emergency_contact', sa.String(length=100)),
            ('allergies', sa.String(length=255)),
            ('marital_status', sa.String(length=50)),
            ('registered_date', sa.String(length=50)),
    ]:
        _add_col(conn, 'patients', sa.Column(col_name, col_type, nullable=True))

    # 3. Update doctors table
    for col_name, col_type in [
            ('consultation_fee', sa.Float()),
            ('experience_years', sa.Integer()),
            ('available_days', sa.String(length=200)),
            ('available_time', sa.String(length=100)),
            ('room_number', sa.String(length=50)),
    ]:
        _add_col(conn, 'doctors', sa.Column(col_name, col_type, nullable=True))

    # 4. Update beds table
    for col_name, col_type in [
            ('branch', sa.String(length=200)),
            ('daily_rate', sa.Float()),
            ('doctor_assigned', sa.String(length=200)),
            ('nurse_in_charge', sa.String(length=200)),
            ('patient_id', sa.String(length=100)),
            ('patient_name', sa.String(length=200)),
            ('admission_date', sa.String(length=50)),
    ]:
        _add_col(conn, 'beds', sa.Column(col_name, col_type, nullable=True))

    # 5. Update item_master table
    for col_name, col_type in [
            ('pack_quantity', sa.Integer()),
            ('issue_unit', sa.String(length=50)),
            ('opening_stock', sa.Integer()),
            ('reorder_level', sa.Integer()),
            ('unit_price', sa.Float()),
            ('gst_rate', sa.Float()),
            ('hsn_sac_code', sa.String(length=50)),
    ]:
        _add_col(conn, 'item_master', sa.Column(col_name, col_type, nullable=True))

    # 6. Update vendors table
    for col_name, col_type in [
            ('category', sa.String(length=100)),
            ('rating', sa.Integer()),
            ('address', sa.String(length=255)),
            ('gstin', sa.String(length=50)),
            ('payment_terms', sa.String(length=100)),
    ]:
        _add_col(conn, 'vendors', sa.Column(col_name, col_type, nullable=True))

    # 7. Update batch_items table
    for col_name, col_type in [
            ('supplier_name', sa.String(length=200)),
            ('location', sa.String(length=150)),
            ('quantity', sa.Integer()),
            ('manufacturing_date', sa.String(length=20)),
            ('expiry_date', sa.String(length=20)),
            ('unit_cost', sa.Float()),
            ('mrp', sa.Float()),
    ]:
        _add_col(conn, 'batch_items', sa.Column(col_name, col_type, nullable=True))

    # 8. Ensure store_activity table exists
    try:
        with conn.begin_nested():
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
