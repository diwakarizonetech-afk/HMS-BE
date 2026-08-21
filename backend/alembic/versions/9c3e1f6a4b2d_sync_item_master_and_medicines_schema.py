# Sync item_master and medicines schema for doctor prescription dropdown items
# Revision ID: 9c3e1f6a4b2d
# Revises: 8b2d0e5f3a1c
# Create Date: 2026-08-13 15:55:00.000000

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


revision: str = '9c3e1f6a4b2d'
down_revision: Union[str, None] = '8b2d0e5f3a1c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    is_sqlite = conn.dialect.name == 'sqlite'

    def add_col_safe(table_name: str, col_name: str, col_type: str) -> None:
        if is_sqlite:
            insp = sa.inspect(conn)
            columns = [c['name'] for c in insp.get_columns(table_name)]
            if col_name not in columns:
                op.execute(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}")
        else:
            try:
                with conn.begin_nested():
                    op.execute(f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {col_name} {col_type}")
            except Exception:
                pass

    # 1. Update item_master table columns
    item_master_cols = [
        ('sub_category', 'VARCHAR(150)'),
        ('generic_composition', 'VARCHAR(250)'),
        ('strength', 'VARCHAR(100)'),
        ('dosage_form', 'VARCHAR(100)'),
        ('pack_quantity', 'INTEGER DEFAULT 1'),
        ('issue_unit', "VARCHAR(50) DEFAULT 'Piece'"),
        ('opening_stock', 'INTEGER DEFAULT 0'),
        ('brand', 'VARCHAR(150)'),
        ('hsn_code', 'VARCHAR(50)'),
        ('gst_percentage', 'FLOAT DEFAULT 12.0'),
        ('min_stock', 'INTEGER DEFAULT 0'),
        ('max_stock', 'INTEGER DEFAULT 0'),
        ('reorder_level', 'INTEGER DEFAULT 0'),
        ('storage_location', 'VARCHAR(150)'),
        ('description', 'TEXT'),
        ('current_stock', 'INTEGER DEFAULT 0'),
        ('unit_price', 'FLOAT DEFAULT 0.0'),
        ('branch', 'VARCHAR(200)'),
    ]
    for col_name, col_type in item_master_cols:
        add_col_safe('item_master', col_name, col_type)

    # 2. Update medicines table columns
    medicines_cols = [
        ('code', 'VARCHAR(50)'),
        ('name', 'VARCHAR(200)'),
        ('generic_name', 'VARCHAR(200)'),
        ('brand', 'VARCHAR(200)'),
        ('category', 'VARCHAR(100)'),
        ('manufacturer', 'VARCHAR(200)'),
        ('dosage_form', 'VARCHAR(100)'),
        ('strength', 'VARCHAR(100)'),
        ('unit', 'VARCHAR(100)'),
        ('purchase_price', 'FLOAT DEFAULT 0.0'),
        ('selling_price', 'FLOAT DEFAULT 0.0'),
        ('gst', 'FLOAT DEFAULT 12.0'),
        ('storage_condition', 'VARCHAR(200)'),
        ('rack_location', 'VARCHAR(100)'),
        ('status', "VARCHAR(20) DEFAULT 'Active'"),
        ('current_stock', 'INTEGER DEFAULT 0'),
        ('min_stock', 'INTEGER DEFAULT 0'),
        ('max_stock', 'INTEGER DEFAULT 0'),
        ('reorder_level', 'INTEGER DEFAULT 0'),
        ('branch', 'VARCHAR(200)'),
    ]
    for col_name, col_type in medicines_cols:
        add_col_safe('medicines', col_name, col_type)


def downgrade() -> None:
    pass
