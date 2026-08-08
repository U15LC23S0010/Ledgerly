from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.db.session import get_db

from app.models.user import User
from app.models.refresh_token import RefreshToken

from app.schemas.user import UserCreate

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    SECRET_KEY,
    ALGORITHM
)

from app.core.dependencies import get_current_user

router = APIRouter()


# =========================================================
# REGISTER
# =========================================================

@router.post("/register")
def register(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_user = User(
        full_name=user.full_name,
        email=user.email,
        password=hash_password(user.password),
        company_name=user.company_name,
        role="user"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User Registered Successfully",
        "id": new_user.id
    }


# =========================================================
# LOGIN
# =========================================================

@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    db_user = db.query(User).filter(
        User.email == form_data.username
    ).first()

    if not db_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(
        form_data.password,
        db_user.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    # Access token
    access_token = create_access_token(
        data={
            "sub": db_user.email
        }
    )

    # Refresh token
    refresh_token = create_refresh_token(
        data={
            "sub": db_user.email
        }
    )

    # Store refresh token
    refresh_token_record = RefreshToken(
        token=refresh_token,
        user_id=db_user.id,
        expires_at=datetime.utcnow() + timedelta(days=7),
        revoked=False
    )

    db.add(refresh_token_record)
    db.commit()

    return {
        "message": "Login Successful",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }


# =========================================================
# REFRESH ACCESS TOKEN
# =========================================================

@router.post("/refresh")
def refresh_access_token(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    stored_token = db.query(RefreshToken).filter(
        RefreshToken.token == refresh_token
    ).first()

    if not stored_token:
        raise HTTPException(
            status_code=401,
            detail="Invalid refresh token"
        )

    if stored_token.revoked:
        raise HTTPException(
            status_code=401,
            detail="Refresh token has been revoked"
        )

    if stored_token.expires_at < datetime.utcnow():
        stored_token.revoked = True
        db.commit()

        raise HTTPException(
            status_code=401,
            detail="Refresh token expired"
        )

    try:
        payload = jwt.decode(
            refresh_token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=401,
                detail="Invalid token type"
            )

        email = payload.get("sub")

        if not email:
            raise HTTPException(
                status_code=401,
                detail="Invalid refresh token"
            )

    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Invalid refresh token"
        )

    user = db.query(User).filter(
        User.email == email
    ).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    new_access_token = create_access_token(
        data={
            "sub": user.email
        }
    )

    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }


# =========================================================
# LOGOUT
# =========================================================

@router.post("/logout")
def logout(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    stored_token = db.query(RefreshToken).filter(
        RefreshToken.token == refresh_token
    ).first()

    if not stored_token:
        raise HTTPException(
            status_code=404,
            detail="Refresh token not found"
        )

    if stored_token.revoked:
        raise HTTPException(
            status_code=400,
            detail="Refresh token already revoked"
        )

    stored_token.revoked = True

    db.commit()

    return {
        "message": "Logout successful"
    }


# =========================================================
# CURRENT USER
# =========================================================

@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user)
):
    return {
        "message": "Welcome!",
        "user": {
            "id": current_user.id,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "company_name": current_user.company_name,
            "role": current_user.role
        }
    }