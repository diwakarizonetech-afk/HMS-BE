from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

    # Postgres connection
    DATABASE_URL: str = "postgresql+psycopg2://postgres:password@localhost:5432/hms"

    SECRET_KEY: str = "CHANGE_ME_SUPER_SECRET_KEY"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 hours

    PROJECT_NAME: str = "Hospital Management System API"
    API_V1_PREFIX: str = "/api/v1"

    # CORS - Production Frontend
    CORS_ORIGINS: str = "https://hms-be-nine.vercel.app"

    @property
    def cors_origins_list(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.CORS_ORIGINS.split(",")
            if origin.strip()
        ]


settings = Settings()
