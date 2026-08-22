from datetime import datetime, timedelta, timezone
import secrets
import smtplib

from email.message import EmailMessage

from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm

from jose import jwt, JWTError

from pydantic import BaseModel, EmailStr

from sqlalchemy.orm import Session

from app.db.database import get_db

from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.models.otp import OTPVerification

from app.schemas.user import UserCreate

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    SECRET_KEY,
    ALGORITHM,
    REFRESH_TOKEN_EXPIRE_DAYS,
)

from app.core.config import settings
from app.core.dependencies import get_current_user


router = APIRouter()


# =========================================================
# SETTINGS
# =========================================================

OTP_EXPIRE_MINUTES = 5


# =========================================================
# UTC HELPER
# =========================================================

def utc_now() -> datetime:
    """
    Return the current UTC time as a naive datetime.

    Database DateTime columns are stored without timezone
    information, so comparisons use naive UTC datetimes.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


# =========================================================
# OTP SCHEMAS
# =========================================================

class VerifyRegistrationRequest(BaseModel):
    full_name: str
    email: EmailStr
    mobile_number: str
    password: str
    company_name: str
    role: str = "user"
    admin_code: str | None = None
    otp: str


class ResendOTPRequest(BaseModel):
    email: EmailStr
    mobile_number: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyForgotPasswordOTPRequest(BaseModel):
    email: EmailStr
    otp: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str


# =========================================================
# GENERATE OTP
# =========================================================

def generate_otp() -> str:
    """
    Generate a secure 6-digit OTP.
    """

    return f"{secrets.randbelow(1_000_000):06d}"


# =========================================================
# SEND OTP EMAIL
# =========================================================

def send_otp(
    email: str,
    mobile_number: str,
    otp: str,
    purpose: str = "registration",
):
    """
    Send OTP through Gmail SMTP.

    mobile_number is retained because the
    OTPVerification table requires it.

    OTP is sent only through email.
    """

    # mobile_number is intentionally retained for compatibility
    # with the OTPVerification model.
    _ = mobile_number

    if purpose == "password_reset":

        subject = "Ledgerly - Password Reset OTP"

        body = f"""
Hello,

We received a request to reset your Ledgerly password.

Your password reset verification code is:

{otp}

This code will expire in {OTP_EXPIRE_MINUTES} minutes.

If you did not request a password reset, please ignore this email.

Regards,
Ledgerly
Smart Bookkeeping
"""

    else:

        subject = "Ledgerly - Your Verification Code"

        body = f"""
Hello,

Welcome to Ledgerly.

Your verification code is:

{otp}

This code will expire in {OTP_EXPIRE_MINUTES} minutes.

If you did not create a Ledgerly account, please ignore this email.

Regards,
Ledgerly
Smart Bookkeeping
"""

    message = EmailMessage()

    message["Subject"] = subject

    message["From"] = (
        f"{settings.SMTP_FROM_NAME} "
        f"<{settings.SMTP_FROM_EMAIL}>"
    )

    message["To"] = email

    message.set_content(body)

    try:

        with smtplib.SMTP(
            settings.SMTP_HOST,
            settings.SMTP_PORT,
        ) as server:

            server.starttls()

            server.login(
                settings.SMTP_USERNAME,
                settings.SMTP_PASSWORD,
            )

            server.send_message(message)

        print(
            f"OTP email successfully sent to {email}"
        )

    except Exception as e:

        print(
            "OTP EMAIL ERROR:",
            repr(e),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to send verification email. "
                "Please try again."
            ),
        )


# =========================================================
# REGISTER
# =========================================================

@router.post("/register")
def register(
    user: UserCreate,
    db: Session = Depends(get_db),
):
    """
    Step 1 of registration.

    1. Validate registration data.
    2. Check email/mobile.
    3. Check admin code.
    4. Generate OTP.
    5. Store OTP.
    6. Send OTP.
    """

    # -----------------------------------------------------
    # NORMALIZE
    # -----------------------------------------------------

    email = user.email.strip().lower()

    mobile_number = user.mobile_number.strip()

    role = user.role.strip().lower()

    # -----------------------------------------------------
    # ROLE
    # -----------------------------------------------------

    if role not in ["user", "admin"]:

        raise HTTPException(
            status_code=400,
            detail="Invalid registration role.",
        )

    # -----------------------------------------------------
    # PASSWORD
    # -----------------------------------------------------

    if len(user.password) < 6:

        raise HTTPException(
            status_code=400,
            detail=(
                "Password must contain at least 6 characters."
            ),
        )

    # -----------------------------------------------------
    # MOBILE
    # -----------------------------------------------------

    if len(mobile_number) < 10 or len(mobile_number) > 15:

        raise HTTPException(
            status_code=400,
            detail="Invalid mobile number.",
        )

    # -----------------------------------------------------
    # EMAIL
    # -----------------------------------------------------

    existing_email = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_email:

        raise HTTPException(
            status_code=400,
            detail="Email already registered.",
        )

    # -----------------------------------------------------
    # MOBILE
    # -----------------------------------------------------

    existing_mobile = (
        db.query(User)
        .filter(
            User.mobile_number == mobile_number
        )
        .first()
    )

    if existing_mobile:

        raise HTTPException(
            status_code=400,
            detail="Mobile number already registered.",
        )

    # -----------------------------------------------------
    # ADMIN VERIFICATION
    # -----------------------------------------------------

    if role == "admin":

        if not user.admin_code:

            raise HTTPException(
                status_code=403,
                detail="Admin access code is required.",
            )

        if user.admin_code != settings.ADMIN_REGISTRATION_CODE:

            raise HTTPException(
                status_code=403,
                detail="Invalid admin access code.",
            )

    # -----------------------------------------------------
    # GENERATE OTP
    # -----------------------------------------------------

    otp = generate_otp()

    expires_at = (
        utc_now()
        + timedelta(minutes=OTP_EXPIRE_MINUTES)
    )

    created_at = utc_now()

    # -----------------------------------------------------
    # INVALIDATE OLD OTPs
    # -----------------------------------------------------

    old_otps = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.email == email,
            OTPVerification.is_verified == False,
        )
        .all()
    )

    for old_otp in old_otps:

        old_otp.is_verified = True

    # -----------------------------------------------------
    # CREATE OTP
    # -----------------------------------------------------

    otp_record = OTPVerification(
        email=email,
        mobile_number=mobile_number,
        otp=otp,
        expires_at=expires_at,
        is_verified=False,
        created_at=created_at,
    )

    db.add(otp_record)

    try:

        db.commit()

    except Exception as e:

        db.rollback()

        print(
            "REGISTRATION OTP DATABASE ERROR:",
            repr(e),
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to create verification request.",
        )

    # -----------------------------------------------------
    # SEND OTP
    # -----------------------------------------------------

    send_otp(
        email=email,
        mobile_number=mobile_number,
        otp=otp,
        purpose="registration",
    )

    return {
        "message": "OTP sent successfully.",
        "email": email,
        "mobile_number": mobile_number,
        "expires_in_minutes": OTP_EXPIRE_MINUTES,
    }


# =========================================================
# VERIFY REGISTRATION OTP
# =========================================================

@router.post("/verify-registration")
def verify_registration(
    data: VerifyRegistrationRequest,
    db: Session = Depends(get_db),
):
    """
    Verify registration OTP and create the user.
    """

    # -----------------------------------------------------
    # NORMALIZE
    # -----------------------------------------------------

    email = data.email.strip().lower()

    mobile_number = data.mobile_number.strip()

    role = data.role.strip().lower()

    # -----------------------------------------------------
    # ROLE
    # -----------------------------------------------------

    if role not in ["user", "admin"]:

        raise HTTPException(
            status_code=400,
            detail="Invalid registration role.",
        )

    # -----------------------------------------------------
    # ADMIN
    # -----------------------------------------------------

    if role == "admin":

        if not data.admin_code:

            raise HTTPException(
                status_code=403,
                detail="Admin access code is required.",
            )

        if data.admin_code != settings.ADMIN_REGISTRATION_CODE:

            raise HTTPException(
                status_code=403,
                detail="Invalid admin access code.",
            )

    # -----------------------------------------------------
    # EMAIL CHECK
    # -----------------------------------------------------

    existing_email = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_email:

        raise HTTPException(
            status_code=400,
            detail="Email already registered.",
        )

    # -----------------------------------------------------
    # MOBILE CHECK
    # -----------------------------------------------------

    existing_mobile = (
        db.query(User)
        .filter(
            User.mobile_number == mobile_number
        )
        .first()
    )

    if existing_mobile:

        raise HTTPException(
            status_code=400,
            detail="Mobile number already registered.",
        )

    # -----------------------------------------------------
    # FIND LATEST OTP
    # -----------------------------------------------------

    otp_record = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.email == email,
            OTPVerification.mobile_number == mobile_number,
        )
        .order_by(
            OTPVerification.created_at.desc()
        )
        .first()
    )

    if not otp_record:

        raise HTTPException(
            status_code=404,
            detail=(
                "OTP not found. "
                "Please request a new OTP."
            ),
        )

    # -----------------------------------------------------
    # ALREADY USED
    # -----------------------------------------------------

    if otp_record.is_verified:

        raise HTTPException(
            status_code=400,
            detail="OTP has already been used.",
        )

    # -----------------------------------------------------
    # EXPIRATION
    # -----------------------------------------------------

    if otp_record.expires_at < utc_now():

        otp_record.is_verified = True

        db.commit()

        raise HTTPException(
            status_code=400,
            detail=(
                "OTP has expired. "
                "Please request a new OTP."
            ),
        )

    # -----------------------------------------------------
    # OTP VALUE
    # -----------------------------------------------------

    if otp_record.otp != data.otp.strip():

        raise HTTPException(
            status_code=400,
            detail="Invalid OTP.",
        )

    # -----------------------------------------------------
    # MARK VERIFIED
    # -----------------------------------------------------

    otp_record.is_verified = True

    # -----------------------------------------------------
    # CREATE USER
    # -----------------------------------------------------

    new_user = User(
        full_name=data.full_name.strip(),
        email=email,
        mobile_number=mobile_number,
        password=hash_password(data.password),
        company_name=data.company_name.strip(),
        role=role,
        is_active=True,
    )

    db.add(new_user)

    try:

        db.commit()

        db.refresh(new_user)

    except Exception as e:

        db.rollback()

        print(
            "REGISTRATION ERROR:",
            repr(e),
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to create account.",
        )

    return {
        "message": (
            "Account verified and created successfully."
        ),
        "id": new_user.id,
        "full_name": new_user.full_name,
        "email": new_user.email,
        "mobile_number": new_user.mobile_number,
        "company_name": new_user.company_name,
        "role": new_user.role,
    }


# =========================================================
# RESEND REGISTRATION OTP
# =========================================================

@router.post("/resend-otp")
def resend_otp(
    data: ResendOTPRequest,
    db: Session = Depends(get_db),
):
    """
    Resend registration OTP.
    """

    email = data.email.strip().lower()

    mobile_number = data.mobile_number.strip()

    # -----------------------------------------------------
    # CHECK EXISTING USER
    # -----------------------------------------------------

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:

        raise HTTPException(
            status_code=400,
            detail="Account already exists.",
        )

    # -----------------------------------------------------
    # GENERATE OTP
    # -----------------------------------------------------

    otp = generate_otp()

    expires_at = (
        utc_now()
        + timedelta(minutes=OTP_EXPIRE_MINUTES)
    )

    created_at = utc_now()

    # -----------------------------------------------------
    # INVALIDATE OLD OTPs
    # -----------------------------------------------------

    old_otps = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.email == email,
            OTPVerification.is_verified == False,
        )
        .all()
    )

    for old_otp in old_otps:

        old_otp.is_verified = True

    # -----------------------------------------------------
    # NEW OTP
    # -----------------------------------------------------

    otp_record = OTPVerification(
        email=email,
        mobile_number=mobile_number,
        otp=otp,
        expires_at=expires_at,
        is_verified=False,
        created_at=created_at,
    )

    db.add(otp_record)

    try:

        db.commit()

    except Exception as e:

        db.rollback()

        print(
            "RESEND OTP DATABASE ERROR:",
            repr(e),
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to create new OTP.",
        )

    # -----------------------------------------------------
    # SEND
    # -----------------------------------------------------

    send_otp(
        email=email,
        mobile_number=mobile_number,
        otp=otp,
        purpose="registration",
    )

    return {
        "message": "New OTP sent successfully.",
        "expires_in_minutes": OTP_EXPIRE_MINUTES,
    }


# =========================================================
# FORGOT PASSWORD
# =========================================================

@router.post("/forgot-password")
def forgot_password(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Request a password reset OTP.
    """

    email = data.email.strip().lower()

    # -----------------------------------------------------
    # FIND USER
    # -----------------------------------------------------

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail=(
                "No account found with this email address."
            ),
        )

    # -----------------------------------------------------
    # CHECK ACTIVE
    # -----------------------------------------------------

    if not user.is_active:

        raise HTTPException(
            status_code=403,
            detail="This account is inactive.",
        )

    # -----------------------------------------------------
    # GENERATE OTP
    # -----------------------------------------------------

    otp = generate_otp()

    expires_at = (
        utc_now()
        + timedelta(minutes=OTP_EXPIRE_MINUTES)
    )

    created_at = utc_now()

    # -----------------------------------------------------
    # INVALIDATE OLD OTPs
    # -----------------------------------------------------

    old_otps = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.email == email,
            OTPVerification.is_verified == False,
        )
        .all()
    )

    for old_otp in old_otps:

        old_otp.is_verified = True

    # -----------------------------------------------------
    # CREATE PASSWORD RESET OTP
    # -----------------------------------------------------

    otp_record = OTPVerification(
        email=email,
        mobile_number=user.mobile_number,
        otp=otp,
        expires_at=expires_at,
        is_verified=False,
        created_at=created_at,
    )

    db.add(otp_record)

    try:

        db.commit()

    except Exception as e:

        db.rollback()

        print(
            "FORGOT PASSWORD OTP DATABASE ERROR:",
            repr(e),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to create password "
                "reset request."
            ),
        )

    # -----------------------------------------------------
    # SEND PASSWORD RESET OTP
    # -----------------------------------------------------

    send_otp(
        email=email,
        mobile_number=user.mobile_number,
        otp=otp,
        purpose="password_reset",
    )

    return {
        "message": (
            "Password reset OTP sent successfully."
        ),
        "email": email,
        "expires_in_minutes": OTP_EXPIRE_MINUTES,
    }


# =========================================================
# RESEND FORGOT PASSWORD OTP
# =========================================================

@router.post("/forgot-password/resend")
def resend_forgot_password_otp(
    data: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Resend password reset OTP.
    """

    email = data.email.strip().lower()

    # -----------------------------------------------------
    # FIND USER
    # -----------------------------------------------------

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail=(
                "No account found with this email address."
            ),
        )

    # -----------------------------------------------------
    # CHECK ACTIVE
    # -----------------------------------------------------

    if not user.is_active:

        raise HTTPException(
            status_code=403,
            detail="This account is inactive.",
        )

    # -----------------------------------------------------
    # GENERATE OTP
    # -----------------------------------------------------

    otp = generate_otp()

    expires_at = (
        utc_now()
        + timedelta(minutes=OTP_EXPIRE_MINUTES)
    )

    created_at = utc_now()

    # -----------------------------------------------------
    # INVALIDATE OLD OTPs
    # -----------------------------------------------------

    old_otps = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.email == email,
            OTPVerification.is_verified == False,
        )
        .all()
    )

    for old_otp in old_otps:

        old_otp.is_verified = True

    # -----------------------------------------------------
    # CREATE NEW OTP
    # -----------------------------------------------------

    otp_record = OTPVerification(
        email=email,
        mobile_number=user.mobile_number,
        otp=otp,
        expires_at=expires_at,
        is_verified=False,
        created_at=created_at,
    )

    db.add(otp_record)

    try:

        db.commit()

    except Exception as e:

        db.rollback()

        print(
            "RESEND PASSWORD OTP DATABASE ERROR:",
            repr(e),
        )

        raise HTTPException(
            status_code=500,
            detail=(
                "Unable to resend password reset OTP."
            ),
        )

    # -----------------------------------------------------
    # SEND
    # -----------------------------------------------------

    send_otp(
        email=email,
        mobile_number=user.mobile_number,
        otp=otp,
        purpose="password_reset",
    )

    return {
        "message": (
            "New password reset OTP sent successfully."
        ),
        "expires_in_minutes": OTP_EXPIRE_MINUTES,
    }


# =========================================================
# VERIFY FORGOT PASSWORD OTP
# =========================================================

@router.post("/verify-forgot-password-otp")
def verify_forgot_password_otp(
    data: VerifyForgotPasswordOTPRequest,
    db: Session = Depends(get_db),
):
    """
    Verify password reset OTP.

    This does not change the password.
    """

    email = data.email.strip().lower()

    otp_value = data.otp.strip()

    # -----------------------------------------------------
    # FIND USER
    # -----------------------------------------------------

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    # -----------------------------------------------------
    # FIND LATEST OTP
    # -----------------------------------------------------

    otp_record = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.email == email,
            OTPVerification.mobile_number == user.mobile_number,
        )
        .order_by(
            OTPVerification.created_at.desc()
        )
        .first()
    )

    if not otp_record:

        raise HTTPException(
            status_code=404,
            detail=(
                "OTP not found. "
                "Please request a new OTP."
            ),
        )

    # -----------------------------------------------------
    # USED
    # -----------------------------------------------------

    if otp_record.is_verified:

        raise HTTPException(
            status_code=400,
            detail="OTP has already been used.",
        )

    # -----------------------------------------------------
    # EXPIRED
    # -----------------------------------------------------

    if otp_record.expires_at < utc_now():

        otp_record.is_verified = True

        db.commit()

        raise HTTPException(
            status_code=400,
            detail=(
                "OTP has expired. "
                "Please request a new OTP."
            ),
        )

    # -----------------------------------------------------
    # VALUE
    # -----------------------------------------------------

    if otp_record.otp != otp_value:

        raise HTTPException(
            status_code=400,
            detail="Invalid OTP.",
        )

    # -----------------------------------------------------
    # SUCCESS
    # -----------------------------------------------------

    return {
        "message": "OTP verified successfully.",
        "email": email,
    }


# =========================================================
# RESET PASSWORD
# =========================================================

@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Verify OTP and reset password.

    OTP is consumed only after the password is
    successfully stored.
    """

    email = data.email.strip().lower()

    otp_value = data.otp.strip()

    new_password = data.new_password

    # -----------------------------------------------------
    # PASSWORD VALIDATION
    # -----------------------------------------------------

    if len(new_password) < 6:

        raise HTTPException(
            status_code=400,
            detail=(
                "Password must contain at least 6 characters."
            ),
        )

    # -----------------------------------------------------
    # FIND USER
    # -----------------------------------------------------

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    # -----------------------------------------------------
    # CHECK ACTIVE
    # -----------------------------------------------------

    if not user.is_active:

        raise HTTPException(
            status_code=403,
            detail="This account is inactive.",
        )

    # -----------------------------------------------------
    # FIND LATEST OTP
    # -----------------------------------------------------

    otp_record = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.email == email,
            OTPVerification.mobile_number == user.mobile_number,
        )
        .order_by(
            OTPVerification.created_at.desc()
        )
        .first()
    )

    if not otp_record:

        raise HTTPException(
            status_code=404,
            detail=(
                "OTP not found. "
                "Please request a new OTP."
            ),
        )

    # -----------------------------------------------------
    # ALREADY USED
    # -----------------------------------------------------

    if otp_record.is_verified:

        raise HTTPException(
            status_code=400,
            detail="OTP has already been used.",
        )

    # -----------------------------------------------------
    # EXPIRED
    # -----------------------------------------------------

    if otp_record.expires_at < utc_now():

        otp_record.is_verified = True

        db.commit()

        raise HTTPException(
            status_code=400,
            detail=(
                "OTP has expired. "
                "Please request a new OTP."
            ),
        )

    # -----------------------------------------------------
    # VERIFY OTP
    # -----------------------------------------------------

    if otp_record.otp != otp_value:

        raise HTTPException(
            status_code=400,
            detail="Invalid OTP.",
        )

    # -----------------------------------------------------
    # UPDATE PASSWORD
    # -----------------------------------------------------

    user.password = hash_password(new_password)

    # -----------------------------------------------------
    # CONSUME OTP
    # -----------------------------------------------------

    otp_record.is_verified = True

    # -----------------------------------------------------
    # SAVE
    # -----------------------------------------------------

    try:

        db.commit()

    except Exception as e:

        db.rollback()

        print(
            "PASSWORD RESET ERROR:",
            repr(e),
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to reset password.",
        )

    return {
        "message": (
            "Password reset successfully. "
            "You can now login."
        )
    }


# =========================================================
# LOGIN
# =========================================================

@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Normal login.

    Creates:
    - Access token
    - Refresh token
    - Refresh token database record
    """

    try:

        email = form_data.username.strip().lower()

        # -------------------------------------------------
        # FIND USER
        # -------------------------------------------------

        db_user = (
            db.query(User)
            .filter(User.email == email)
            .first()
        )

        if not db_user:

            raise HTTPException(
                status_code=401,
                detail="Invalid email or password",
            )

        # -------------------------------------------------
        # ACTIVE
        # -------------------------------------------------

        if not db_user.is_active:

            raise HTTPException(
                status_code=403,
                detail="Account is inactive.",
            )

        # -------------------------------------------------
        # PASSWORD
        # -------------------------------------------------

        if not verify_password(
            form_data.password,
            db_user.password,
        ):

            raise HTTPException(
                status_code=401,
                detail="Invalid email or password",
            )

        # -------------------------------------------------
        # ACCESS TOKEN
        # -------------------------------------------------

        access_token = create_access_token(
            data={
                "sub": db_user.email,
                "role": db_user.role,
            }
        )

        # -------------------------------------------------
        # REFRESH TOKEN
        # -------------------------------------------------

        refresh_token = create_refresh_token(
            data={
                "sub": db_user.email,
                "role": db_user.role,
            }
        )

        # -------------------------------------------------
        # STORE REFRESH TOKEN
        # -------------------------------------------------

        refresh_token_record = RefreshToken(
            token=refresh_token,
            user_id=db_user.id,
            expires_at=(
                utc_now()
                + timedelta(
                    days=REFRESH_TOKEN_EXPIRE_DAYS
                )
            ),
            revoked=False,
        )

        db.add(refresh_token_record)

        db.commit()

        # -------------------------------------------------
        # RESPONSE
        # -------------------------------------------------

        return {
            "message": "Login Successful",

            "access_token": access_token,

            "refresh_token": refresh_token,

            "token_type": "bearer",

            "user": {
                "id": db_user.id,
                "full_name": db_user.full_name,
                "email": db_user.email,
                "mobile_number": db_user.mobile_number,
                "company_name": db_user.company_name,
                "role": db_user.role,
            },
        }

    except HTTPException:
        raise

    except Exception as e:
            db.rollback()

            print(
                "LOGIN INTERNAL ERROR:",
                repr(e),
            )

            raise HTTPException(
                status_code=500,
                detail="Internal server error",
            )

# =========================================================
# REFRESH ACCESS TOKEN
# =========================================================

@router.post("/refresh")
def refresh_access_token(
    refresh_token: str,
    db: Session = Depends(get_db),
):
    """
    Generate a new access token using a valid
    refresh token.
    """

    # -----------------------------------------------------
    # FIND TOKEN
    # -----------------------------------------------------

    stored_token = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token == refresh_token
        )
        .first()
    )

    if not stored_token:

        raise HTTPException(
            status_code=401,
            detail="Invalid refresh token",
        )

    # -----------------------------------------------------
    # REVOKED
    # -----------------------------------------------------

    if stored_token.revoked:

        raise HTTPException(
            status_code=401,
            detail="Refresh token has been revoked",
        )

    # -----------------------------------------------------
    # DATABASE EXPIRATION
    # -----------------------------------------------------

    if stored_token.expires_at < utc_now():

        stored_token.revoked = True

        db.commit()

        raise HTTPException(
            status_code=401,
            detail="Refresh token expired",
        )

    # -----------------------------------------------------
    # JWT VALIDATION
    # -----------------------------------------------------

    try:

        payload = jwt.decode(
            refresh_token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        if payload.get("type") != "refresh":

            raise HTTPException(
                status_code=401,
                detail="Invalid token type",
            )

        email = payload.get("sub")

        if not email:

            raise HTTPException(
                status_code=401,
                detail="Invalid refresh token",
            )

    except JWTError:

        raise HTTPException(
            status_code=401,
            detail="Invalid refresh token",
        )

    # -----------------------------------------------------
    # USER
    # -----------------------------------------------------

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found",
        )

    # -----------------------------------------------------
    # ACTIVE USER
    # -----------------------------------------------------

    if not user.is_active:

        raise HTTPException(
            status_code=403,
            detail="Account is inactive.",
        )

    # -----------------------------------------------------
    # NEW ACCESS TOKEN
    # -----------------------------------------------------

    new_access_token = create_access_token(
        data={
            "sub": user.email,
            "role": user.role,
        }
    )

    return {
        "access_token": new_access_token,
        "token_type": "bearer",
    }


# =========================================================
# LOGOUT
# =========================================================

@router.post("/logout")
def logout(
    refresh_token: str,
    db: Session = Depends(get_db),
):
    """
    Revoke refresh token.
    """

    stored_token = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token == refresh_token
        )
        .first()
    )

    if not stored_token:

        raise HTTPException(
            status_code=404,
            detail="Refresh token not found",
        )

    if stored_token.revoked:

        raise HTTPException(
            status_code=400,
            detail="Refresh token already revoked",
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
    current_user: User = Depends(get_current_user),
):
    """
    Return currently authenticated user.
    """

    return {
        "message": "Welcome!",

        "user": {
            "id": current_user.id,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "mobile_number": current_user.mobile_number,
            "company_name": current_user.company_name,
            "role": current_user.role,
        },
    }
