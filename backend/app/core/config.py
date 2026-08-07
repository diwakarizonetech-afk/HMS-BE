from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Postgres connection. Override via .env / environment variables.
    DATABASE_URL: str = "postgresql+psycopg2://postgres:password@localhost:5432/hms_db"

    SECRET_KEY: str = "CHANGE_ME_SUPER_SECRET_KEY"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 hours

    PROJECT_NAME: str = "Hospital Management System API"
    API_V1_PREFIX: str = "/api/v1"

    # Comma separated list of allowed CORS origins, "*" for all
    CORS_ORIGINS: str = "*"

    @property
    def cors_origins_list(self) -> list[str]:
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


settings = Settings()
