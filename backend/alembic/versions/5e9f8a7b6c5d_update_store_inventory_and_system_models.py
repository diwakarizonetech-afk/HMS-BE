# update store inventory and system models
# Revision ID: 5e9f8a7b6c5d
# Revises: 4b9f0d2e6f3a
# Create Date: 2026-08-04 10:25:00.000000

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateColumn


revision: str = '5e9f8a7b6c5d'
down_revision: Union[str, None] = '4b9f0d2e6f3a'
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
    # 1. Update users role column and add missing columns
    try:
        with conn.begin_nested():
            op.execute("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50) USING role::text")
    except Exception:
        pass

    for col_name, col_type in [
            ('branch', sa.String(length=200)),
            ('last_login', sa.String(length=50)),
    ]:
        _add_col(conn, 'users', sa.Column(col_name, col_type, nullable=True))

    # 2. Add extra fields to item_master
    for col_name, col_type, server_def in [
        ('pack_quantity', sa.Integer(), '1'),
        ('issue_unit', sa.String(length=50), "'Piece'"),
        ('opening_stock', sa.Integer(), '0'),
    ]:
        _add_col(conn, 'item_master', sa.Column(col_name, col_type, nullable=True, server_default=server_def))

    # 3. Add extra fields to vendors
    for col_name, col_type, server_def in [
        ('category', sa.String(length=100), "'Pharmaceuticals'"),
        ('rating', sa.Integer(), '5'),
    ]:
        _add_col(conn, 'vendors', sa.Column(col_name, col_type, nullable=True, server_default=server_def))

    # 4. Add extra fields to batch_items
    for col_name, col_type in [
            ('supplier_name', sa.String(length=200)),
            ('location', sa.String(length=150)),
            ('quantity', sa.Integer()),
            ('manufacturing_date', sa.String(length=20)),
    ]:
        _add_col(conn, 'batch_items', sa.Column(col_name, col_type, nullable=True))

    # 5. Add extra fields to stock_inward
    for col_name, col_type in [
            ('inward_number', sa.String(length=50)),
            ('po_number', sa.String(length=50)),
            ('unit_price', sa.Float()),
            ('supplier_name', sa.String(length=200)),
    ]:
        _add_col(conn, 'stock_inward', sa.Column(col_name, col_type, nullable=True))

    # 6. Add extra fields to stock_outward
    for col_name, col_type in [
            ('outward_number', sa.String(length=50)),
            ('issued_to_department', sa.String(length=150)),
            ('issued_to_person', sa.String(length=150)),
            ('batch_number', sa.String(length=100)),
    ]:
        _add_col(conn, 'stock_outward', sa.Column(col_name, col_type, nullable=True))

    # 7. Add extra fields to beds
    try:
        with conn.begin_nested():
            op.execute("ALTER TABLE beds ALTER COLUMN ward TYPE VARCHAR(100) USING ward::text")
    except Exception:
        pass
    for col_name, col_type in [
            ('branch', sa.String(length=200)),
            ('daily_rate', sa.Float()),
            ('doctor_assigned', sa.String(length=200)),
            ('nurse_in_charge', sa.String(length=200)),
    ]:
        _add_col(conn, 'beds', sa.Column(col_name, col_type, nullable=True))

    # 8. Create store_activity table if missing
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

    # 9. Add extra fields to stock_transfer
    for col_name, col_type in [
            ('from_location', sa.String(length=150)),
            ('to_location', sa.String(length=150)),
            ('date', sa.String(length=20)),
    ]:
        _add_col(conn, 'stock_transfer', sa.Column(col_name, col_type, nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    try:
        with conn.begin_nested():
            op.drop_table('store_activity')
    except Exception:
        pass
