from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from app.core.config import settings


# =========================================================
# PASSWORD HASHING
# =========================================================

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


# =========================================================
# JWT SETTINGS
# =========================================================

SECRET_KEY = settings.SECRET_KEY

ALGORITHM = settings.ALGORITHM

ACCESS_TOKEN_EXPIRE_MINUTES = (
    settings.ACCESS_TOKEN_EXPIRE_MINUTES
)

REFRESH_TOKEN_EXPIRE_DAYS = 7


# =========================================================
# PASSWORD FUNCTIONS
# =========================================================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(
    plain_password: str,
    hashed_password: str
) -> bool:

    return pwd_context.verify(
        plain_password,
        hashed_password
    )


# =========================================================
# ACCESS TOKEN
# =========================================================

def create_access_token(data: dict) -> str:

    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({
        "exp": expire,
        "type": "access"
    })

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


# =========================================================
# REFRESH TOKEN
# =========================================================

def create_refresh_token(data: dict) -> str:

    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        days=REFRESH_TOKEN_EXPIRE_DAYS
    )

    to_encode.update({
        "exp": expire,
        "type": "refresh",
        "jti": str(uuid4())
    })

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )
