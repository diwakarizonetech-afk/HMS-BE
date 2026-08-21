"""Add blood group and nurse assignment to OPD bookings and queues.

Revision ID: g6b7c8d9e0f1
Revises: f5a6b7c8d9e0
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "g6b7c8d9e0f1"
down_revision: Union[str, None] = "f5a6b7c8d9e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())
    for table, columns in {
        "appointments": [
            sa.Column("blood_group", sa.String(10), nullable=True),
            sa.Column("assigned_nurse", sa.String(150), nullable=True),
        ],
        "queue_items": [
            sa.Column("blood_group", sa.String(10), nullable=True),
            sa.Column("assigned_nurse", sa.String(150), nullable=True),
        ],
    }.items():
        if table in existing_tables:
            existing = {column["name"] for column in inspector.get_columns(table)}
            for column in columns:
                if column.name not in existing:
                    op.add_column(table, column)


def downgrade() -> None:
    for table in ("queue_items", "appointments"):
        existing = {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table)}
        for name in ("assigned_nurse", "blood_group"):
            if name in existing:
                op.drop_column(table, name)