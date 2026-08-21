from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def normalize_database_url(value: str) -> str:
    """Render/Heroku often expose postgres:// URLs; SQLAlchemy 2 expects postgresql+psycopg2://."""
    if value.startswith("postgres://"):
        return value.replace("postgres://", "postgresql+psycopg2://", 1)
    if value.startswith("postgresql://"):
        return value.replace("postgresql://", "postgresql+psycopg2://", 1)
    return value


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Postgres connection. Override via .env / environment variables.
    DATABASE_URL: str = "postgresql+psycopg2://postgres:password@localhost:5432/hms_last"

    SECRET_KEY: str = "CHANGE_ME_SUPER_SECRET_KEY"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 hours

    PROJECT_NAME: str = "Hospital Management System API"
    API_V1_PREFIX: str = "/api/v1"

    # Comma separated list of allowed CORS origins, "*" for all
    CORS_ORIGINS: str = "*"

    # Razorpay test/live keys. Leave blank to use the local mock QR flow.
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_QR_CLOSE_BY_MINUTES: int = 15

    @field_validator("DATABASE_URL")
    @classmethod
    def normalize_db_url(cls, value: str) -> str:
        return normalize_database_url(value)

    @property
    def cors_origins_list(self) -> list[str]:
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
