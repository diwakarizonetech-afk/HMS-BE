# sync all remaining columns (hospital_profiles, notifications, users)
# Revision ID: 8b2d0e5f3a1c
# Revises: 7a1c9e4f2b6d
# Create Date: 2026-08-07 14:00:00.000000

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '8b2d0e5f3a1c'
down_revision: Union[str, None] = '7a1c9e4f2b6d'
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

    # 1. Update hospital_profiles table
    for col_name, col_type in [
        ('logo', 'TEXT'),
        ('hospital_logo_url', 'TEXT'),
        ('license_number', 'VARCHAR(100)'),
        ('timezone', 'VARCHAR(100)'),
        ('currency', 'VARCHAR(50)'),
        ('established_year', 'VARCHAR(20)'),
        ('accreditation', 'VARCHAR(200)'),
    ]:
        add_col_safe('hospital_profiles', col_name, col_type)

    # 2. Update notifications table
    for col_name, col_type in [
        ('module', 'VARCHAR(100)'),
        ('event_type', 'VARCHAR(100)'),
        ('sender_id', 'VARCHAR(100)'),
        ('sender_name', 'VARCHAR(150)'),
        ('recipient_role', 'VARCHAR(50)'),
        ('related_record_id', 'VARCHAR(100)'),
        ('priority', 'VARCHAR(20)'),
        ('status', 'VARCHAR(20)'),
    ]:
        add_col_safe('notifications', col_name, col_type)

    # 3. Update users table
    for col_name, col_type in [
        ('assigned_ward', 'VARCHAR(100)'),
        ('branch', 'VARCHAR(200)'),
        ('employee_id', 'VARCHAR(50)'),
        ('phone', 'VARCHAR(20)'),
        ('last_login', 'VARCHAR(50)'),
    ]:
        add_col_safe('users', col_name, col_type)


def downgrade() -> None:
    pass
