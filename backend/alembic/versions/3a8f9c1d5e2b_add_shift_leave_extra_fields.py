# add shift leave extra fields
# Revision ID: 3a8f9c1d5e2b
# Revises: 297d312b4fdb
# Create Date: 2026-07-30 06:00:00.000000

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '3a8f9c1d5e2b'
down_revision: Union[str, None] = '297d312b4fdb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    try:
        op.execute("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50) USING role::text")
    except Exception:
        pass

    # Add missing columns to users table
    with op.batch_alter_table('users', schema=None) as batch_op:
        try:
            batch_op.add_column(sa.Column('username', sa.String(100), nullable=True))
        except Exception:
            pass
        try:
            batch_op.add_column(sa.Column('employee_id', sa.String(50), nullable=True))
        except Exception:
            pass
        try:
            batch_op.add_column(sa.Column('phone', sa.String(20), nullable=True))
        except Exception:
            pass
        try:
            batch_op.add_column(sa.Column('status', sa.String(20), nullable=True, server_default='Active'))
        except Exception:
            pass

    # Add new columns to leave_requests
    with op.batch_alter_table('leave_requests', schema=None) as batch_op:
        try:
            batch_op.add_column(sa.Column('role', sa.String(100), nullable=True))
        except Exception:
            pass
        try:
            batch_op.add_column(sa.Column('total_days', sa.Integer(), nullable=True, server_default='1'))
        except Exception:
            pass

    # Add new columns to shift_rotations
    with op.batch_alter_table('shift_rotations', schema=None) as batch_op:
        try:
            batch_op.add_column(sa.Column('branch', sa.String(200), nullable=True))
        except Exception:
            pass
        try:
            batch_op.add_column(sa.Column('morning_shift', sa.String(50), nullable=True))
        except Exception:
            pass
        try:
            batch_op.add_column(sa.Column('evening_shift', sa.String(50), nullable=True))
        except Exception:
            pass
        try:
            batch_op.add_column(sa.Column('night_shift', sa.String(50), nullable=True))
        except Exception:
            pass
        try:
            batch_op.add_column(sa.Column('effective_date', sa.String(20), nullable=True))
        except Exception:
            pass


def downgrade() -> None:
    with op.batch_alter_table('shift_rotations', schema=None) as batch_op:
        try:
            batch_op.drop_column('effective_date')
        except Exception:
            pass
        try:
            batch_op.drop_column('night_shift')
        except Exception:
            pass
        try:
            batch_op.drop_column('evening_shift')
        except Exception:
            pass
        try:
            batch_op.drop_column('morning_shift')
        except Exception:
            pass
        try:
            batch_op.drop_column('branch')
        except Exception:
            pass

    with op.batch_alter_table('leave_requests', schema=None) as batch_op:
        try:
            batch_op.drop_column('total_days')
        except Exception:
            pass
        try:
            batch_op.drop_column('role')
        except Exception:
            pass
