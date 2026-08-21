"""Link lab reports to ER encounters.

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "d3e4f5a6b7c8"
down_revision: Union[str, None] = "c2d3e4f5a6b7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "lab_reports" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("lab_reports")}
    if "er_encounter_id" not in columns:
        op.add_column("lab_reports", sa.Column("er_encounter_id", sa.String(100), nullable=True))
    indexes = {index["name"] for index in inspector.get_indexes("lab_reports")}
    if "ix_lab_reports_er_encounter_id" not in indexes:
        op.create_index("ix_lab_reports_er_encounter_id", "lab_reports", ["er_encounter_id"])


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "lab_reports" not in inspector.get_table_names():
        return
    indexes = {index["name"] for index in inspector.get_indexes("lab_reports")}
    if "ix_lab_reports_er_encounter_id" in indexes:
        op.drop_index("ix_lab_reports_er_encounter_id", table_name="lab_reports")
    columns = {column["name"] for column in inspector.get_columns("lab_reports")}
    if "er_encounter_id" in columns:
        op.drop_column("lab_reports", "er_encounter_id")
