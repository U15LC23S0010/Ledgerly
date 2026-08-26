from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    # =========================================================
    # APPLICATION
    # =========================================================

    APP_ENV: str = "development"

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

    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # =========================================================
    # ADMIN
    # =========================================================

    ADMIN_REGISTRATION_CODE: str

    # =========================================================
    # CORS
    # =========================================================

    CORS_ORIGINS: str = (
        "http://localhost:5173,"
        "http://127.0.0.1:5173"
    )

    # =========================================================
    # GMAIL SMTP
    # =========================================================

    GMAIL_SMTP_HOST: str = "smtp.gmail.com"

    GMAIL_SMTP_PORT: int = 587

    GMAIL_SMTP_USERNAME: str

    GMAIL_SMTP_PASSWORD: str

    GMAIL_FROM_NAME: str = "Ledgerly"

    # =========================================================
    # CONFIGURATION
    # =========================================================

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()