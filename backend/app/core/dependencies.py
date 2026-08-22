from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.core.security import SECRET_KEY, ALGORITHM
from app.db.database import get_db
from app.models.user import User


# =========================================================
# OAUTH2
# =========================================================

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login"
)


# =========================================================
# CURRENT USER
# =========================================================

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={
            "WWW-Authenticate": "Bearer"
        },
    )

    try:

        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        # -------------------------------------------------
        # TOKEN TYPE
        # -------------------------------------------------

        if payload.get("type") != "access":
            raise credentials_exception

        # -------------------------------------------------
        # SUBJECT
        # -------------------------------------------------

        email = payload.get("sub")

        if email is None:
            raise credentials_exception

    except JWTError:

        raise credentials_exception

    # -----------------------------------------------------
    # USER
    # -----------------------------------------------------

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if user is None:
        raise credentials_exception

    # -----------------------------------------------------
    # ACTIVE
    # -----------------------------------------------------

    if not user.is_active:

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive."
        )

    return user


# =========================================================
# CURRENT ADMIN
# =========================================================

def get_current_admin(
    current_user: User = Depends(get_current_user)
):

    if current_user.role != "admin":

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return current_user
