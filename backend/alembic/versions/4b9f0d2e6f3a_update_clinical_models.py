# update clinical models extra fields and create ward_transfers
# Revision ID: 4b9f0d2e6f3a
# Revises: 3a8f9c1d5e2b
# Create Date: 2026-08-02 23:15:00.000000

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateColumn


revision: str = '4b9f0d2e6f3a'
down_revision: Union[str, None] = '3a8f9c1d5e2b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _add_col(conn, table_name: str, column: sa.Column) -> None:
    ddl = CreateColumn(column).compile(dialect=postgresql.dialect())
    conn.execute(sa.text(f'ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {ddl}'))


def upgrade() -> None:
    # NOTE (Phase 18 fix): every optional/idempotent DDL statement below is
    # wrapped in a real Postgres SAVEPOINT (conn.begin_nested()), not just a
    # bare Python try/except. On Postgres, a single failed statement aborts
    # the ENTIRE outer transaction -- every subsequent statement then fails
    # with InFailedSqlTransaction even though it would otherwise have
    # succeeded. A SAVEPOINT scopes the rollback to just the failed
    # statement, so the rest of this migration (and the whole chain) can
    # keep going. This bug was only catchable once a real Postgres server
    # was available to test against (Phase 18) -- it never surfaced against
    # SQLite, which does not abort the transaction the same way.
    conn = op.get_bind()
    # 1. Create ward_transfers table if it doesn't exist
    try:
        with conn.begin_nested():
            op.create_table(
                'ward_transfers',
                sa.Column('id', sa.String(length=36), nullable=False),
                sa.Column('transfer_id', sa.String(length=50), nullable=False),
                sa.Column('patient_uhid', sa.String(length=50), nullable=False),
                sa.Column('patient_name', sa.String(length=150), nullable=False),
                sa.Column('current_ward', sa.String(length=150), nullable=False),
                sa.Column('current_bed', sa.String(length=50), nullable=False),
                sa.Column('new_ward', sa.String(length=150), nullable=False),
                sa.Column('new_bed', sa.String(length=50), nullable=False),
                sa.Column('transfer_reason', sa.Text(), nullable=False),
                sa.Column('transfer_date', sa.String(length=20), nullable=False),
                sa.Column('transfer_time', sa.String(length=20), nullable=False),
                sa.Column('doctor_approval', sa.String(length=50), nullable=True, server_default='Approved'),
                sa.Column('doctor_name', sa.String(length=150), nullable=True),
                sa.Column('remarks', sa.Text(), nullable=True),
                sa.Column('transferred_by', sa.String(length=150), nullable=False),
                sa.Column('status', sa.String(length=50), nullable=True, server_default='Completed'),
                sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
                sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
                sa.PrimaryKeyConstraint('id')
            )
            op.create_index(op.f('ix_ward_transfers_patient_uhid'), 'ward_transfers', ['patient_uhid'], unique=False)
    except Exception:
        pass

    # 2. Add extra fields to patient_vitals
    for col_name, col_type in [
            ('age', sa.Integer()),
            ('gender', sa.String(length=20)),
            ('doctor_id', sa.String(length=100)),
            ('doctor_name', sa.String(length=150)),
            ('department', sa.String(length=150)),
            ('height', sa.Float()),
            ('weight', sa.Float()),
            ('blood_pressure', sa.String(length=50)),
            ('pulse_rate', sa.Float()),
            ('respiratory_rate', sa.Float()),
            ('blood_sugar', sa.Float()),
            ('pain_scale', sa.Integer()),
            ('remarks', sa.Text()),
            ('date', sa.String(length=20)),
            ('time', sa.String(length=20)),
    ]:
        _add_col(conn, 'patient_vitals', sa.Column(col_name, col_type, nullable=True))

    # 3. Add extra fields to nursing_notes
    for col_name, col_type in [
            ('ward', sa.String(length=150)),
            ('diagnosis', sa.Text()),
            ('observation', sa.Text()),
            ('symptoms', sa.Text()),
            ('treatment_response', sa.Text()),
            ('doctor_instructions', sa.Text()),
            ('fluid_intake', sa.Float()),
            ('fluid_output', sa.Float()),
            ('patient_condition', sa.String(length=50)),
            ('notes', sa.Text()),
            ('recorded_by', sa.String(length=150)),
            ('date', sa.String(length=20)),
            ('time', sa.String(length=20)),
    ]:
        _add_col(conn, 'nursing_notes', sa.Column(col_name, col_type, nullable=True))

    # 4. Add extra fields to medication_logs
    for col_name, col_type in [
            ('ward', sa.String(length=150)),
            ('doctor_name', sa.String(length=150)),
            ('frequency', sa.String(length=100)),
            ('given_time', sa.String(length=50)),
            ('reason_if_missed', sa.Text()),
            ('remarks', sa.Text()),
    ]:
        _add_col(conn, 'medication_logs', sa.Column(col_name, col_type, nullable=True))


def downgrade() -> None:
    conn = op.get_bind()
    try:
        with conn.begin_nested():
            op.drop_table('ward_transfers')
    except Exception:
        pass
