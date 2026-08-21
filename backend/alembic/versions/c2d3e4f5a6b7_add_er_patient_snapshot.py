"""Add patient details captured at ER arrival.

Revision ID: c2d3e4f5a6b7
Revises: b1c2d3e4f5a6
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c2d3e4f5a6b7"
down_revision: Union[str, None] = "b1c2d3e4f5a6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SNAPSHOT_COLUMNS = [
    ("patient_age", sa.Integer()),
    ("patient_gender", sa.String(20)),
    ("patient_blood_group", sa.String(10)),
    ("patient_phone", sa.String(20)),
    ("patient_allergies", sa.Text()),
    ("patient_existing_diseases", sa.Text()),
    ("patient_emergency_contact_name", sa.String(150)),
    ("patient_emergency_contact_phone", sa.String(20)),
    ("patient_emergency_relationship", sa.String(100)),
]


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing = {column["name"] for column in inspector.get_columns("emergency_encounters")}

    for name, column_type in SNAPSHOT_COLUMNS:
        if name not in existing:
            op.add_column("emergency_encounters", sa.Column(name, column_type, nullable=True))

    inspector = sa.inspect(conn)
    indexes = {index["name"] for index in inspector.get_indexes("emergency_encounters")}
    if "ix_emergency_encounters_patient_id" not in indexes:
        op.create_index(
            "ix_emergency_encounters_patient_id",
            "emergency_encounters",
            ["patient_id"],
        )


def downgrade() -> None:
    op.drop_index("ix_emergency_encounters_patient_id", table_name="emergency_encounters")
    for name, _ in reversed(SNAPSHOT_COLUMNS):
        op.drop_column("emergency_encounters", name)
