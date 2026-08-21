"""add_emergency_er_management

Revision ID: b1c2d3e4f5a6
Revises: a1b2c3d4e5f6
Create Date: 2026-08-19

Creates:
  - emergency_encounters  (core ER encounter entity)
  - er_assessments        (doctor's clinical assessment)
  - er_procedures         (procedures performed in ER)

Adds er_encounter_id VARCHAR(100) column to:
  - patient_vitals
  - nursing_notes
  - medication_logs
  - sample_collections
  - prescriptions
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = 'b1c2d3e4f5a6'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Some environments provisioned the ER schema before Alembic tracking
    # was enabled. Treat that schema as already migrated.
    if sa.inspect(op.get_bind()).has_table('emergency_encounters'):
        return

    # ------------------------------------------------------------------
    # 1. Create enum types (Postgres requires named enum types)
    # ------------------------------------------------------------------
    op.execute(
        "CREATE TYPE er_arrival_mode AS ENUM ('Walk-in', 'Ambulance')"
    )
    op.execute(
        "CREATE TYPE er_emergency_type AS ENUM ("
        "'Trauma', 'Cardiac', 'Respiratory', 'Neurological', 'Obstetric', "
        "'Pediatric', 'Poisoning', 'Burns', 'Orthopedic', 'General Emergency', 'Other')"
    )
    op.execute(
        "CREATE TYPE er_triage_status AS ENUM ("
        "'Pending Triage', 'Priority 1 (Red - Critical)', "
        "'Priority 2 (Yellow - Urgent)', 'Priority 3 (Green - Non-Urgent)')"
    )
    op.execute(
        "CREATE TYPE er_status AS ENUM ("
        "'Registered', 'Waiting for Triage', 'Triaged', 'Waiting for Doctor', "
        "'Under Doctor Assessment', 'Observation', 'IPD Admission Pending', "
        "'Admitted', 'Discharged', 'LAMA', 'Referred', 'Transferred', 'Completed')"
    )
    op.execute(
        "CREATE TYPE er_disposition AS ENUM ("
        "'Pending', 'Discharge', 'Observation', 'IPD', 'Transferred')"
    )

    # ------------------------------------------------------------------
    # 2. emergency_encounters
    # ------------------------------------------------------------------
    op.create_table(
        'emergency_encounters',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('encounter_number', sa.String(50), unique=True, nullable=False),
        sa.Column('patient_id', sa.String(36), sa.ForeignKey('patients.id', ondelete='SET NULL'), nullable=True),
        sa.Column('patient_uhid', sa.String(50), nullable=False),
        sa.Column('patient_name', sa.String(200), nullable=False),
        sa.Column('arrival_date', sa.String(20), nullable=False),
        sa.Column('arrival_time', sa.String(20), nullable=False),
        sa.Column('arrival_mode', sa.Text, nullable=False, server_default='Walk-in'),
        sa.Column('ambulance_number', sa.String(50), nullable=True),
        sa.Column('referral_hospital', sa.String(200), nullable=True),
        sa.Column('paramedic_name', sa.String(150), nullable=True),
        sa.Column('emergency_type', sa.Text, nullable=False, server_default='General Emergency'),
        sa.Column('chief_complaint', sa.Text, nullable=False),
        sa.Column('accompanied_by', sa.String(200), nullable=True),
        sa.Column('emergency_contact', sa.String(300), nullable=True),
        sa.Column('assigned_doctor', sa.String(150), nullable=True),
        sa.Column('assigned_nurse', sa.String(150), nullable=True),
        sa.Column('triage_status', sa.Text, nullable=False, server_default='Pending Triage'),
        sa.Column('triage_time', sa.String(20), nullable=True),
        sa.Column('triaged_by', sa.String(150), nullable=True),
        sa.Column('triage_notes', sa.Text, nullable=True),
        sa.Column('er_status', sa.Text, nullable=False, server_default='Registered'),
        sa.Column('er_disposition', sa.Text, nullable=False, server_default='Pending'),
        sa.Column('disposition_notes', sa.Text, nullable=True),
        sa.Column('required_ward', sa.String(100), nullable=True),
        sa.Column('current_location', sa.String(200), nullable=True),
        sa.Column('observation_bed_id', sa.String(36), sa.ForeignKey('beds.id', ondelete='SET NULL'), nullable=True),
        sa.Column('ipd_admission_id', sa.String(36), sa.ForeignKey('ipd_admissions.id', ondelete='SET NULL'), nullable=True),
        sa.Column('discharge_time', sa.String(20), nullable=True),
        sa.Column('discharge_notes', sa.Text, nullable=True),
        sa.Column('registered_by', sa.String(150), nullable=True),
        sa.Column('created_by', sa.String(150), nullable=True),
        sa.Column('updated_by', sa.String(150), nullable=True),
        sa.Column('branch', sa.String(200), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_emergency_encounters_encounter_number', 'emergency_encounters', ['encounter_number'])
    op.create_index('ix_emergency_encounters_patient_uhid', 'emergency_encounters', ['patient_uhid'])
    op.create_index('ix_emergency_encounters_er_status', 'emergency_encounters', ['er_status'])

    # ------------------------------------------------------------------
    # 3. er_assessments
    # ------------------------------------------------------------------
    op.create_table(
        'er_assessments',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('encounter_id', sa.String(36), sa.ForeignKey('emergency_encounters.id', ondelete='CASCADE'), nullable=False),
        sa.Column('presenting_complaint', sa.Text, nullable=True),
        sa.Column('history', sa.Text, nullable=True),
        sa.Column('clinical_examination', sa.Text, nullable=True),
        sa.Column('assessment', sa.Text, nullable=False),
        sa.Column('severity', sa.String(50), nullable=True),
        sa.Column('provisional_diagnosis', sa.Text, nullable=True),
        sa.Column('final_diagnosis', sa.Text, nullable=True),
        sa.Column('diagnosis_notes', sa.Text, nullable=True),
        sa.Column('doctor_name', sa.String(150), nullable=False),
        sa.Column('doctor_id', sa.String(100), nullable=True),
        sa.Column('assessment_time', sa.String(20), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_er_assessments_encounter_id', 'er_assessments', ['encounter_id'])

    # ------------------------------------------------------------------
    # 4. er_procedures
    # ------------------------------------------------------------------
    op.create_table(
        'er_procedures',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('encounter_id', sa.String(36), sa.ForeignKey('emergency_encounters.id', ondelete='CASCADE'), nullable=False),
        sa.Column('procedure_name', sa.String(200), nullable=False),
        sa.Column('indication', sa.Text, nullable=True),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('outcome', sa.String(100), nullable=True),
        sa.Column('performed_by', sa.String(150), nullable=False),
        sa.Column('procedure_time', sa.String(20), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index('ix_er_procedures_encounter_id', 'er_procedures', ['encounter_id'])

    # ------------------------------------------------------------------
    # 5. Add er_encounter_id to existing clinical / lab / pharmacy tables
    # ------------------------------------------------------------------
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())
    for table_name in [
        'patient_vitals',
        'nursing_notes',
        'medication_logs',
        'sample_collections',
        'prescriptions',
    ]:
        if table_name not in existing_tables:
            continue
        columns = {column['name'] for column in inspector.get_columns(table_name)}
        if 'er_encounter_id' not in columns:
            op.add_column(
                table_name,
                sa.Column('er_encounter_id', sa.String(100), nullable=True)
            )


def downgrade() -> None:
    # Remove er_encounter_id from existing tables
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = set(inspector.get_table_names())
    for table_name in [
        'patient_vitals',
        'nursing_notes',
        'medication_logs',
        'sample_collections',
        'prescriptions',
    ]:
        if table_name not in existing_tables:
            continue
        columns = {column['name'] for column in inspector.get_columns(table_name)}
        if 'er_encounter_id' in columns:
            op.drop_column(table_name, 'er_encounter_id')

    # Drop new tables
    op.drop_index('ix_er_procedures_encounter_id', table_name='er_procedures')
    op.drop_table('er_procedures')

    op.drop_index('ix_er_assessments_encounter_id', table_name='er_assessments')
    op.drop_table('er_assessments')

    op.drop_index('ix_emergency_encounters_er_status', table_name='emergency_encounters')
    op.drop_index('ix_emergency_encounters_patient_uhid', table_name='emergency_encounters')
    op.drop_index('ix_emergency_encounters_encounter_number', table_name='emergency_encounters')
    op.drop_table('emergency_encounters')

    # Drop enums
    op.execute('DROP TYPE IF EXISTS er_disposition')
    op.execute('DROP TYPE IF EXISTS er_status')
    op.execute('DROP TYPE IF EXISTS er_triage_status')
    op.execute('DROP TYPE IF EXISTS er_emergency_type')
    op.execute('DROP TYPE IF EXISTS er_arrival_mode')
