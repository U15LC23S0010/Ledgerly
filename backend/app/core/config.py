from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    # =====================================================
    # DATABASE
    # =====================================================

    DATABASE_URL: str

    # =====================================================
    # JWT
    # =====================================================

    SECRET_KEY: str

    ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # =====================================================
    # ADMIN
    # =====================================================

    ADMIN_REGISTRATION_CODE: str

    # =====================================================
    # SMTP
    # =====================================================

    SMTP_HOST: str

    SMTP_PORT: int

    SMTP_USERNAME: str

    SMTP_PASSWORD: str

    SMTP_FROM_EMAIL: str

    SMTP_FROM_NAME: str = "Ledgerly"

    # =====================================================
    # CONFIG
    # =====================================================

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()