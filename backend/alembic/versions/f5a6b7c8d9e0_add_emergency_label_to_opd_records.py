"""Add emergency labels to normal OPD lab and pharmacy records.

Revision ID: f5a6b7c8d9e0
Revises: e4f5a6b7c8d9
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f5a6b7c8d9e0"
down_revision: Union[str, None] = "e4f5a6b7c8d9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())
    for table in ("sample_collections", "lab_reports", "prescriptions"):
        if table in existing_tables:
            columns = {column["name"] for column in inspector.get_columns(table)}
            if "is_emergency" not in columns:
                op.add_column(table, sa.Column("is_emergency", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())
    for table in ("prescriptions", "lab_reports", "sample_collections"):
        if table in existing_tables:
            columns = {column["name"] for column in inspector.get_columns(table)}
            if "is_emergency" in columns:
                op.drop_column(table, "is_emergency")
