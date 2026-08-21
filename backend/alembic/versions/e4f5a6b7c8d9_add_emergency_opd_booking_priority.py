"""Add emergency priority metadata to normal OPD bookings and queues.

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e4f5a6b7c8d9"
down_revision: Union[str, None] = "d3e4f5a6b7c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _add_columns(table: str, columns: list[sa.Column]) -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())
    if table in existing_tables:
        existing = {column["name"] for column in inspector.get_columns(table)}
        for column in columns:
            if column.name not in existing:
                op.add_column(table, column)


def upgrade() -> None:
    _add_columns("appointments", [
        sa.Column("is_emergency", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("booking_source", sa.String(50), nullable=True),
        sa.Column("token_number", sa.String(20), nullable=True),
    ])
    _add_columns("queue_items", [
        sa.Column("is_emergency", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("priority", sa.Integer(), nullable=False, server_default="0"),
    ])


def downgrade() -> None:
    for table, names in (("queue_items", ("priority", "is_emergency")), ("appointments", ("token_number", "booking_source", "priority", "is_emergency"))):
        existing = {column["name"] for column in sa.inspect(op.get_bind()).get_columns(table)}
        for name in names:
            if name in existing:
                op.drop_column(table, name)