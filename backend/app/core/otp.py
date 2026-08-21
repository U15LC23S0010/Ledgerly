import random
from datetime import datetime, timedelta


OTP_EXPIRE_MINUTES = 10


def generate_otp() -> str:
    """Generate a secure 6-digit OTP."""
    return str(random.randint(100000, 999999))


def get_otp_expiry() -> datetime:
    """Return OTP expiry time."""
    return datetime.utcnow() + timedelta(
        minutes=OTP_EXPIRE_MINUTES
    )


def is_otp_expired(expires_at: datetime) -> bool:
    """Check whether an OTP has expired."""
    return datetime.utcnow() > expires_at