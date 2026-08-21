from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from app.core.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True, pool_recycle=300, connect_args=connect_args)

# Set search_path to the configured schema on every new connection so all
# DDL and DML targets the correct schema without requiring schema-prefixed names.
_schema = settings.POSTGRES_SCHEMA
if _schema and _schema != "public":
    @event.listens_for(engine, "connect")
    def set_search_path(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        # Quote the schema name to preserve case (e.g. "HMS" != hms in Postgres)
        cursor.execute(f'SET search_path TO "{_schema}", public')
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
