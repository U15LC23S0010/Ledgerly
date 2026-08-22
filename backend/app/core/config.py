from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    # =========================================================
    # APPLICATION
    # =========================================================

    APP_ENV: str = "development"

    # Comma-separated frontend URLs
    # Example:
    # CORS_ORIGINS=http://localhost:5174
    #
    # Production example:
    # CORS_ORIGINS=https://your-frontend-domain.com
    CORS_ORIGINS: str = "http://localhost:5174"

    # =========================================================
    # DATABASE
    # =========================================================

    DATABASE_URL: str

    # =========================================================
    # JWT
    # =========================================================

    SECRET_KEY: str

    ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # =========================================================
    # ADMIN
    # =========================================================

    ADMIN_REGISTRATION_CODE: str

    # =========================================================
    # SMTP
    # =========================================================

    SMTP_HOST: str

    SMTP_PORT: int = 587

    SMTP_USERNAME: str

    SMTP_PASSWORD: str

    SMTP_FROM_EMAIL: str

    SMTP_FROM_NAME: str = "Ledgerly"

    # =========================================================
    # PYDANTIC SETTINGS CONFIGURATION
    # =========================================================

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


# =============================================================
# SETTINGS INSTANCE
# =============================================================

settings = Settings()
