import secrets
from datetime import datetime, timedelta, timezone


OTP_EXPIRE_MINUTES = 10


def generate_otp() -> str:
    """Generate a secure 6-digit OTP."""
    return f"{secrets.randbelow(1_000_000):06d}"


def get_otp_expiry() -> datetime:
    """Return OTP expiry time as naive UTC datetime."""
    return (
        datetime.now(timezone.utc)
        + timedelta(minutes=OTP_EXPIRE_MINUTES)
    ).replace(tzinfo=None)


def is_otp_expired(expires_at: datetime) -> bool:
    """Check whether an OTP has expired."""
    return datetime.now(timezone.utc).replace(tzinfo=None) > expires_at