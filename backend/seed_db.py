# Manual/optional database bootstrap script.
#
# Historically (Phases 1-18) this script seeded a large amount of demo data:
# a doctor, nurse, lab tech, pharmacist, store manager, reception, and patient
# user; sample departments, doctors, patients, lab tests, medicines/batches,
# store items/vendors, IPD beds, and leave requests.
#
# Phase 19: that demo data has been removed. This script now does exactly
# the same thing as the real startup seed path (`app/seed/super_admin.py`,
# which runs automatically on every app startup) -- it creates/repairs
# exactly ONE record: the Super Admin account. Everything else (staff
# accounts, departments, doctors, patients, lab test masters, medicines,
# store items, vendors, beds, leave requests, etc.) is created by the Super
# Admin through the UI after logging in, not seeded.
#
# This script is kept around only as a convenience for manually
# (re)initializing a database's schema + admin account from the command
# line (e.g. `python seed_db.py`), including the optional Postgres
# auto-create-database step. It is NOT invoked automatically anywhere in
# the app -- the automatic path is `app/seed/super_admin.py` via
# `app/main.py`'s startup event.
#
# Credentials created:
#   Email:    admin@hms.com
#   Password: admin123
#
# IMPORTANT: change this password after first login in a real deployment.

import os
import sys

# Add backend root to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Auto-create the database if it does not exist (Postgres only; no-op for SQLite).
try:
    import psycopg2
    from app.core.config import settings

    db_url = settings.DATABASE_URL
    if "postgresql" in db_url:
        cleaned = db_url.split("://")[1]
        auth, rest = cleaned.split("@")
        user, password = auth.split(":")
        host_port, dbname = rest.split("/")
        host = host_port.split(":")[0]
        port = host_port.split(":")[1] if ":" in host_port else "5432"

        conn = psycopg2.connect(dbname="postgres", user=user, password=password, host=host, port=port)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(f"SELECT 1 FROM pg_database WHERE datname='{dbname}'")
        if not cur.fetchone():
            cur.execute(f'CREATE DATABASE "{dbname}"')
            print(f"Database '{dbname}' created successfully.")
        cur.close()
        conn.close()
except Exception as e:
    print(f"Database creation check notice (might already exist or run on diff credentials): {e}")

from app.seed.super_admin import seed_super_admin


def seed_database() -> None:
    """Kept as the entry point name manual tooling/docs may reference.
    Delegates entirely to the real seed path -- Super Admin only."""
    seed_super_admin()


if __name__ == "__main__":
    seed_database()
