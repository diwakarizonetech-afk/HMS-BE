import sys
from logging.config import fileConfig
from pathlib import Path

from sqlalchemy import engine_from_config, text
from sqlalchemy import pool

from alembic import context

# Make the app package importable when alembic is run from the backend/ dir
sys.path.append(str(Path(__file__).resolve().parents[1]))

from app.core.config import normalize_database_url, settings  # noqa: E402
from app.core.database import Base  # noqa: E402
import app.models  # noqa: E402,F401 - register all models on Base.metadata

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Override sqlalchemy.url with our runtime settings (env var / .env driven).
# configparser treats % as an interpolation char; escape them so the URL passes through unchanged.
_db_url = normalize_database_url(settings.DATABASE_URL).replace("%", "%%")
config.set_main_option("sqlalchemy.url", _db_url)

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Schema to run all migrations in (from POSTGRES_SCHEMA env var, default "public")
_schema = settings.POSTGRES_SCHEMA or "public"

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (no live DB connection required)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # Pin all migrations and the version table to the target schema
        include_schemas=True,
        version_table_schema=_schema,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        # Ensure the schema exists and set search_path for this connection
        if _schema != "public":
            connection.execute(text(f'CREATE SCHEMA IF NOT EXISTS "{_schema}"'))
            connection.execute(text(f'SET search_path TO "{_schema}", public'))
            connection.commit()

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_schemas=True,
            version_table_schema=_schema,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
