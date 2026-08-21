# add shift leave extra fields
# Revision ID: 3a8f9c1d5e2b
# Revises: 297d312b4fdb
# Create Date: 2026-07-30 06:00:00.000000

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateColumn


revision: str = '3a8f9c1d5e2b'
down_revision: Union[str, None] = '297d312b4fdb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# NOTE (Phase 18 fix): this migration used to wrap each add_column call in a
# bare Python try/except inside `with op.batch_alter_table(...) as batch_op:`.
# That never actually worked against Postgres: batch_alter_table queues
# add_column calls and only executes them when the `with` block exits, so the
# try/except around each individual call never wrapped the real statement --
# a single duplicate-column failure at flush() time aborted the whole
# migration transaction, and everything after it failed with
# InFailedSqlTransaction. This was only catchable once a real Postgres server
# was available to test against (Phase 18); it never surfaced against SQLite.
# Fixed by issuing plain `ALTER TABLE ... ADD COLUMN IF NOT EXISTS ...`,
# which is natively idempotent on Postgres and needs no try/except at all.
def _add_col(conn, table_name: str, column: sa.Column) -> None:
    ddl = CreateColumn(column).compile(dialect=postgresql.dialect())
    conn.execute(sa.text(f'ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {ddl}'))


def upgrade() -> None:
    conn = op.get_bind()

    try:
        with conn.begin_nested():
            op.execute("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50) USING role::text")
    except Exception:
        pass

    # Add missing columns to users table
    _add_col(conn, 'users', sa.Column('username', sa.String(100), nullable=True))
    _add_col(conn, 'users', sa.Column('employee_id', sa.String(50), nullable=True))
    _add_col(conn, 'users', sa.Column('phone', sa.String(20), nullable=True))
    _add_col(conn, 'users', sa.Column('status', sa.String(20), nullable=True, server_default='Active'))

    # Add new columns to leave_requests
    _add_col(conn, 'leave_requests', sa.Column('role', sa.String(100), nullable=True))
    _add_col(conn, 'leave_requests', sa.Column('total_days', sa.Integer(), nullable=True, server_default='1'))

    # Add new columns to shift_rotations
    _add_col(conn, 'shift_rotations', sa.Column('branch', sa.String(200), nullable=True))
    _add_col(conn, 'shift_rotations', sa.Column('morning_shift', sa.String(50), nullable=True))
    _add_col(conn, 'shift_rotations', sa.Column('evening_shift', sa.String(50), nullable=True))
    _add_col(conn, 'shift_rotations', sa.Column('night_shift', sa.String(50), nullable=True))
    _add_col(conn, 'shift_rotations', sa.Column('effective_date', sa.String(20), nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    for table, col in [
        ('shift_rotations', 'effective_date'),
        ('shift_rotations', 'night_shift'),
        ('shift_rotations', 'evening_shift'),
        ('shift_rotations', 'morning_shift'),
        ('shift_rotations', 'branch'),
        ('leave_requests', 'total_days'),
        ('leave_requests', 'role'),
    ]:
        try:
            with conn.begin_nested():
                op.execute(f"ALTER TABLE {table} DROP COLUMN IF EXISTS {col}")
        except Exception:
            pass
