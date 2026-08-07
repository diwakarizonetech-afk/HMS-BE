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
    # Nullable by design: an unassigned nurse is treated as "don't scope" by
    # get_own_nurse_ward() (see deps.py), so existing rows don't need a
    # backfill value to remain correct — this is the key difference from a
    # hypothetical Bed.department column, which had no defensible backfill
    # source at all (see CHANGELOG.md Phase 12/13).
    #
    # Using a raw ALTER TABLE with IF NOT EXISTS so the migration is idempotent
    # (safe to re-run against a database that somehow already has the column,
    # e.g. from a manual patch). This is more reliable than the batch_alter_table
    # SQLite workaround used in earlier migrations in this project.
    op.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_ward VARCHAR(100)")


def downgrade() -> None:
    op.drop_column('users', 'assigned_ward')

