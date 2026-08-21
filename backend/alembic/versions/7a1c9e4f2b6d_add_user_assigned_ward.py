# add user assigned_ward (nurse ward-scoping key — see CHANGELOG.md Phase 13)
# Revision ID: 7a1c9e4f2b6d
# Revises: 6f0a1b2c3d4e
# Create Date: 2026-08-07 00:00:00.000000

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '7a1c9e4f2b6d'
down_revision: Union[str, None] = '6f0a1b2c3d4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name == 'sqlite':
        insp = sa.inspect(conn)
        columns = [c['name'] for c in insp.get_columns('users')]
        if 'assigned_ward' not in columns:
            op.execute("ALTER TABLE users ADD COLUMN assigned_ward VARCHAR(100)")
    else:
        try:
            with conn.begin_nested():
                op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_ward VARCHAR(100)")
        except Exception:
            pass


def downgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name != 'sqlite':
        op.drop_column('users', 'assigned_ward')


