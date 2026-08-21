# superadmin and clinical tables
# Revision ID: 297d312b4fdb
# Revises: 186c211a3eca
# Create Date: 2026-07-30 11:15:00.000000

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '297d312b4fdb'
down_revision: Union[str, None] = '186c211a3eca'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    if 'hospital_profiles' not in existing_tables:
        op.create_table(
            'hospital_profiles',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('hospital_name', sa.String(length=200), nullable=False),
            sa.Column('hospital_code', sa.String(length=50), nullable=False),
            sa.Column('tagline', sa.String(length=255), nullable=True),
            sa.Column('logo', sa.Text(), nullable=True),
            sa.Column('hospital_logo_url', sa.Text(), nullable=True),
            sa.Column('registration_number', sa.String(length=100), nullable=True),
            sa.Column('license_number', sa.String(length=100), nullable=True),
            sa.Column('tax_id', sa.String(length=100), nullable=True),
            sa.Column('phone', sa.String(length=50), nullable=True),
            sa.Column('email', sa.String(length=150), nullable=True),
            sa.Column('website', sa.String(length=255), nullable=True),
            sa.Column('address', sa.Text(), nullable=True),
            sa.Column('city', sa.String(length=100), nullable=True),
            sa.Column('state', sa.String(length=100), nullable=True),
            sa.Column('country', sa.String(length=100), nullable=True),
            sa.Column('pincode', sa.String(length=20), nullable=True),
            sa.Column('timezone', sa.String(length=100), nullable=True),
            sa.Column('currency', sa.String(length=50), nullable=True),
            sa.Column('establishment_year', sa.String(length=20), nullable=True),
            sa.Column('established_year', sa.String(length=20), nullable=True),
            sa.Column('accreditation', sa.String(length=200), nullable=True),
            sa.Column('total_bed_capacity', sa.Integer(), nullable=True),
            sa.Column('emergency_contact_number', sa.String(length=50), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )

    if 'branches' not in existing_tables:
        op.create_table(
            'branches',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('branch_name', sa.String(length=150), nullable=False),
            sa.Column('branch_code', sa.String(length=50), nullable=False),
            sa.Column('address', sa.Text(), nullable=False),
            sa.Column('city', sa.String(length=100), nullable=False),
            sa.Column('state', sa.String(length=100), nullable=False),
            sa.Column('country', sa.String(length=100), nullable=True),
            sa.Column('pincode', sa.String(length=20), nullable=False),
            sa.Column('phone', sa.String(length=50), nullable=False),
            sa.Column('email', sa.String(length=150), nullable=False),
            sa.Column('status', sa.String(length=20), nullable=True),
            sa.Column('is_main_branch', sa.Boolean(), nullable=True),
            sa.Column('bed_capacity', sa.Integer(), nullable=True),
            sa.Column('total_staff', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('branch_code')
        )

    if 'specializations' not in existing_tables:
        op.create_table(
            'specializations',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('specialization_name', sa.String(length=150), nullable=False),
            sa.Column('code', sa.String(length=50), nullable=False),
            sa.Column('department_name', sa.String(length=150), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('status', sa.String(length=20), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('code')
        )

    if 'consultation_charges' not in existing_tables:
        op.create_table(
            'consultation_charges',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('doctor_id', sa.String(length=100), nullable=True),
            sa.Column('doctor_name', sa.String(length=150), nullable=False),
            sa.Column('department', sa.String(length=150), nullable=False),
            sa.Column('consultation_fee', sa.Float(), nullable=False),
            sa.Column('follow_up_fee', sa.Float(), nullable=True),
            sa.Column('emergency_fee', sa.Float(), nullable=True),
            sa.Column('validity_days', sa.Integer(), nullable=True),
            sa.Column('status', sa.String(length=20), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )

    if 'working_hours' not in existing_tables:
        op.create_table(
            'working_hours',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('department', sa.String(length=150), nullable=False),
            sa.Column('day_of_week', sa.String(length=200), nullable=False),
            sa.Column('start_time', sa.String(length=20), nullable=False),
            sa.Column('end_time', sa.String(length=20), nullable=False),
            sa.Column('slot_duration_minutes', sa.Integer(), nullable=True),
            sa.Column('max_patients_per_slot', sa.Integer(), nullable=True),
            sa.Column('is_working_day', sa.Boolean(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )

    if 'leave_requests' not in existing_tables:
        op.create_table(
            'leave_requests',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('employee_id', sa.String(length=50), nullable=False),
            sa.Column('employee_name', sa.String(length=150), nullable=False),
            sa.Column('role', sa.String(length=100), nullable=True),
            sa.Column('department', sa.String(length=150), nullable=False),
            sa.Column('leave_type', sa.String(length=50), nullable=False),
            sa.Column('start_date', sa.String(length=20), nullable=False),
            sa.Column('end_date', sa.String(length=20), nullable=False),
            sa.Column('total_days', sa.Integer(), nullable=True),
            sa.Column('reason', sa.Text(), nullable=False),
            sa.Column('approval_status', sa.String(length=20), nullable=True),
            sa.Column('applied_date', sa.String(length=20), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )

    if 'shift_rotations' not in existing_tables:
        op.create_table(
            'shift_rotations',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('employee_id', sa.String(length=50), nullable=False),
            sa.Column('employee_name', sa.String(length=150), nullable=False),
            sa.Column('department', sa.String(length=150), nullable=False),
            sa.Column('branch', sa.String(length=200), nullable=True),
            sa.Column('morning_shift', sa.String(length=50), nullable=True),
            sa.Column('evening_shift', sa.String(length=50), nullable=True),
            sa.Column('night_shift', sa.String(length=50), nullable=True),
            sa.Column('assigned_shift', sa.String(length=50), nullable=False),
            sa.Column('effective_date', sa.String(length=20), nullable=True),
            sa.Column('start_date', sa.String(length=20), nullable=False),
            sa.Column('end_date', sa.String(length=20), nullable=False),
            sa.Column('status', sa.String(length=20), nullable=True),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )

    if 'roles' not in existing_tables:
        op.create_table(
            'roles',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('role_name', sa.String(length=100), nullable=False),
            sa.Column('role_code', sa.String(length=50), nullable=False),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('is_system_default', sa.Boolean(), nullable=True),
            sa.Column('assigned_user_count', sa.Integer(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('role_code')
        )

    if 'permissions' not in existing_tables:
        op.create_table(
            'permissions',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('role_id', sa.String(length=100), nullable=False),
            sa.Column('module_name', sa.String(length=100), nullable=False),
            sa.Column('action', sa.String(length=50), nullable=False),
            sa.Column('is_granted', sa.Boolean(), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )

    if 'department_assignments' not in existing_tables:
        op.create_table(
            'department_assignments',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('employee_id', sa.String(length=50), nullable=False),
            sa.Column('employee_name', sa.String(length=150), nullable=False),
            sa.Column('role', sa.String(length=100), nullable=False),
            sa.Column('primary_department', sa.String(length=150), nullable=False),
            sa.Column('secondary_department', sa.String(length=150), nullable=True),
            sa.Column('shift_type', sa.String(length=50), nullable=True),
            sa.Column('assigned_date', sa.String(length=20), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )

    if 'login_history' not in existing_tables:
        op.create_table(
            'login_history',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('user_name', sa.String(length=150), nullable=False),
            sa.Column('email', sa.String(length=150), nullable=False),
            sa.Column('role', sa.String(length=50), nullable=False),
            sa.Column('ip_address', sa.String(length=50), nullable=True),
            sa.Column('browser', sa.String(length=100), nullable=True),
            sa.Column('login_time', sa.String(length=50), nullable=False),
            sa.Column('status', sa.String(length=20), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )

    if 'patient_vitals' not in existing_tables:
        op.create_table(
            'patient_vitals',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('patient_uhid', sa.String(length=50), nullable=False),
            sa.Column('patient_name', sa.String(length=150), nullable=True),
            sa.Column('age', sa.Integer(), nullable=True),
            sa.Column('gender', sa.String(length=20), nullable=True),
            sa.Column('doctor_id', sa.String(length=100), nullable=True),
            sa.Column('doctor_name', sa.String(length=150), nullable=True),
            sa.Column('department', sa.String(length=150), nullable=True),
            sa.Column('height', sa.Float(), nullable=True),
            sa.Column('weight', sa.Float(), nullable=True),
            sa.Column('temperature', sa.Float(), nullable=False),
            sa.Column('blood_pressure', sa.String(length=50), nullable=True),
            sa.Column('bp_sys', sa.Float(), nullable=False),
            sa.Column('bp_dia', sa.Float(), nullable=False),
            sa.Column('pulse_rate', sa.Float(), nullable=True),
            sa.Column('pulse', sa.Float(), nullable=False),
            sa.Column('respiratory_rate', sa.Float(), nullable=True),
            sa.Column('resp_rate', sa.Float(), nullable=False),
            sa.Column('spo2', sa.Float(), nullable=False),
            sa.Column('blood_sugar', sa.Float(), nullable=True),
            sa.Column('pain_scale', sa.Integer(), nullable=True),
            sa.Column('remarks', sa.Text(), nullable=True),
            sa.Column('recorded_by', sa.String(length=150), nullable=False),
            sa.Column('recorded_at', sa.String(length=50), nullable=True),
            sa.Column('date', sa.String(length=20), nullable=True),
            sa.Column('time', sa.String(length=20), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )

    if 'nursing_notes' not in existing_tables:
        op.create_table(
            'nursing_notes',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('patient_uhid', sa.String(length=50), nullable=False),
            sa.Column('patient_name', sa.String(length=150), nullable=True),
            sa.Column('admission_id', sa.String(length=100), nullable=True),
            sa.Column('ward', sa.String(length=150), nullable=True),
            sa.Column('diagnosis', sa.Text(), nullable=True),
            sa.Column('observation', sa.Text(), nullable=True),
            sa.Column('symptoms', sa.Text(), nullable=True),
            sa.Column('treatment_response', sa.Text(), nullable=True),
            sa.Column('doctor_instructions', sa.Text(), nullable=True),
            sa.Column('fluid_intake', sa.Float(), nullable=True),
            sa.Column('fluid_output', sa.Float(), nullable=True),
            sa.Column('patient_condition', sa.String(length=50), nullable=True),
            sa.Column('category', sa.String(length=50), nullable=True),
            sa.Column('note', sa.Text(), nullable=False),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('nurse_name', sa.String(length=150), nullable=False),
            sa.Column('recorded_by', sa.String(length=150), nullable=True),
            sa.Column('created_at_time', sa.String(length=50), nullable=True),
            sa.Column('date', sa.String(length=20), nullable=True),
            sa.Column('time', sa.String(length=20), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )

    if 'medication_logs' not in existing_tables:
        op.create_table(
            'medication_logs',
            sa.Column('id', sa.String(length=36), nullable=False),
            sa.Column('patient_uhid', sa.String(length=50), nullable=False),
            sa.Column('patient_name', sa.String(length=150), nullable=True),
            sa.Column('admission_id', sa.String(length=100), nullable=True),
            sa.Column('medicine_name', sa.String(length=150), nullable=False),
            sa.Column('dosage', sa.String(length=100), nullable=False),
            sa.Column('route', sa.String(length=50), nullable=True),
            sa.Column('frequency', sa.String(length=50), nullable=True),
            sa.Column('instructions', sa.Text(), nullable=True),
            sa.Column('scheduled_time', sa.String(length=50), nullable=False),
            sa.Column('administered_at', sa.String(length=50), nullable=True),
            sa.Column('status', sa.String(length=30), nullable=True),
            sa.Column('nurse_name', sa.String(length=150), nullable=False),
            sa.Column('remarks', sa.Text(), nullable=True),
            sa.Column('date', sa.String(length=20), nullable=True),
            sa.Column('time', sa.String(length=20), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
            sa.PrimaryKeyConstraint('id')
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = set(inspector.get_table_names())

    tables_to_drop = [
        'medication_logs', 'nursing_notes', 'patient_vitals', 'login_history',
        'department_assignments', 'permissions', 'roles', 'shift_rotations',
        'leave_requests', 'working_hours', 'consultation_charges',
        'specializations', 'branches', 'hospital_profiles'
    ]

    for table in tables_to_drop:
        if table in existing_tables:
            op.drop_table(table)

