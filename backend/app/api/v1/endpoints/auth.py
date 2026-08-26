from datetime import datetime, timedelta, timezone
import secrets

import resend

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
# OTP SETTINGS
# =========================================================

OTP_EXPIRE_MINUTES = 10


# =========================================================
# UTC TIME
# =========================================================

def utc_now() -> datetime:
    """
    Return current UTC time as a naive datetime.

    SQLAlchemy DateTime columns in this project are stored
    without timezone information, so we use naive UTC.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


# =========================================================
# RESEND CONFIGURATION
# =========================================================

def configure_resend():
    """
    Configure Resend from application settings.
    """

    api_key = getattr(settings, "RESEND_API_KEY", None)

    if not api_key:
        print("WARNING: RESEND_API_KEY is not configured.")
        return

    resend.api_key = api_key

    print("========================================")
    print("RESEND CONFIGURED")
    print("========================================")


configure_resend()


# =========================================================
# VALIDATE RESEND CONFIGURATION
# =========================================================

def validate_resend_configuration():
    """
    Validate email configuration before sending.
    """

    api_key = getattr(settings, "RESEND_API_KEY", None)
    from_email = getattr(settings, "RESEND_FROM_EMAIL", None)

    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Email service is not configured: RESEND_API_KEY is missing.",
        )

    if not from_email:
        raise HTTPException(
            status_code=500,
            detail="Email service is not configured: RESEND_FROM_EMAIL is missing.",
        )

    # Make sure the current API key is used.
    resend.api_key = api_key


# =========================================================
# REQUEST MODELS
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
# OTP GENERATOR
# =========================================================

def generate_otp() -> str:
    """
    Generate a cryptographically secure 6-digit OTP.
    """

    return f"{secrets.randbelow(1_000_000):06d}"


# =========================================================
# OTP EMAIL
# =========================================================

def send_otp(
    email: str,
    mobile_number: str | None,
    otp: str,
    purpose: str = "registration",
):
    """
    Send OTP through Resend.

    mobile_number is retained because the existing
    application stores it with the OTP record.

    OTP delivery is currently through email.
    """

    # Kept for compatibility with the existing system.
    _ = mobile_number

    validate_resend_configuration()

    from_email = settings.RESEND_FROM_EMAIL
    from_name = getattr(
        settings,
        "RESEND_FROM_NAME",
        "Ledgerly",
    )

    sender = f"{from_name} <{from_email}>"

    # =====================================================
    # REGISTRATION EMAIL
    # =====================================================

    if purpose == "registration":

        subject = "Welcome to Ledgerly — Verify Your Email"

        body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Verify Your Ledgerly Account</title>
</head>

<body style="
    margin:0;
    padding:0;
    background-color:#f6f8fb;
    font-family:Arial,Helvetica,sans-serif;
">

<div style="
    max-width:600px;
    margin:40px auto;
    background:#ffffff;
    border-radius:14px;
    padding:40px;
    box-sizing:border-box;
">

    <h2 style="
        margin-top:0;
        color:#172033;
    ">
        Welcome to Ledgerly!
    </h2>

    <p style="color:#4b5563;">
        Hello,
    </p>

    <p style="
        color:#4b5563;
        line-height:1.6;
    ">
        You're one step away from setting up your smarter
        bookkeeping workspace.
    </p>

    <p style="color:#4b5563;">
        Your verification code is:
    </p>

    <div style="
        margin:25px 0;
        padding:22px;
        background:#f1f4f9;
        border-radius:10px;
        text-align:center;
    ">

        <span style="
            font-size:34px;
            font-weight:bold;
            letter-spacing:9px;
            color:#172033;
        ">
            {otp}
        </span>

    </div>

    <p style="
        color:#4b5563;
        line-height:1.6;
    ">
        This code expires in
        <strong>{OTP_EXPIRE_MINUTES} minutes</strong>.
    </p>

    <p style="
        color:#4b5563;
        line-height:1.6;
    ">
        Enter this code in Ledgerly to complete your registration.
    </p>

    <h3 style="color:#172033;">
        What's waiting for you
    </h3>

    <ul style="
        color:#4b5563;
        line-height:1.8;
    ">
        <li>Track income and expenses</li>
        <li>Manage accounts and transactions</li>
        <li>Create budgets and invoices</li>
        <li>Analyze financial performance</li>
        <li>Discover intelligent insights</li>
    </ul>

    <p style="
        color:#4b5563;
        line-height:1.6;
    ">
        Your financial workspace is almost ready.
    </p>

    <br>

    <p style="color:#4b5563;">
        Best regards,<br>
        <strong>Ledgerly Team</strong><br>
        Smart Bookkeeping, Simplified.
    </p>

</div>

</body>
</html>
"""

    # =====================================================
    # PASSWORD RESET EMAIL
    # =====================================================

    elif purpose == "password_reset":

        subject = "Your Ledgerly Password Reset Code"

        body = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Ledgerly Password Reset</title>
</head>

<body style="
    margin:0;
    padding:0;
    background-color:#f6f8fb;
    font-family:Arial,Helvetica,sans-serif;
">

<div style="
    max-width:600px;
    margin:40px auto;
    background:#ffffff;
    border-radius:14px;
    padding:40px;
    box-sizing:border-box;
">

    <h2 style="
        margin-top:0;
        color:#172033;
    ">
        Ledgerly Password Reset
    </h2>

    <p style="color:#4b5563;">
        Hello,
    </p>

    <p style="
        color:#4b5563;
        line-height:1.6;
    ">
        We received a request to reset your Ledgerly password.
    </p>

    <p style="color:#4b5563;">
        Your password reset code is:
    </p>

    <div style="
        margin:25px 0;
        padding:22px;
        background:#f1f4f9;
        border-radius:10px;
        text-align:center;
    ">

        <span style="
            font-size:34px;
            font-weight:bold;
            letter-spacing:9px;
            color:#172033;
        ">
            {otp}
        </span>

    </div>

    <p style="
        color:#4b5563;
        line-height:1.6;
    ">
        This code expires in
        <strong>{OTP_EXPIRE_MINUTES} minutes</strong>.
    </p>

    <p style="
        color:#4b5563;
        line-height:1.6;
    ">
        For your security, do not share this code with anyone.
    </p>

    <p style="
        color:#4b5563;
        line-height:1.6;
    ">
        If you did not request a password reset, you can safely
        ignore this email.
    </p>

    <br>

    <p style="color:#4b5563;">
        Best regards,<br>
        <strong>Ledgerly Team</strong><br>
        Smart Bookkeeping, Simplified.
    </p>

</div>

</body>
</html>
"""

    else:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP purpose.",
        )

    # =====================================================
    # SEND THROUGH RESEND
    # =====================================================

    try:

        params = {
            "from": sender,
            "to": [email],
            "subject": subject,
            "html": body,
        }

        print("========================================")
        print("SENDING OTP EMAIL")
        print(f"TO: {email}")
        print(f"FROM: {sender}")
        print(f"PURPOSE: {purpose}")
        print("========================================")

        response = resend.Emails.send(params)

        print("========================================")
        print("OTP EMAIL SENT SUCCESSFULLY")
        print(f"TO: {email}")
        print(f"RESEND RESPONSE: {response}")
        print("========================================")

        return response

    except Exception as e:

        print("========================================")
        print("RESEND EMAIL ERROR")
        print(f"ERROR TYPE: {type(e).__name__}")
        print(f"ERROR: {repr(e)}")
        print(f"TO: {email}")
        print(f"FROM: {sender}")
        print("========================================")

        raise HTTPException(
            status_code=500,
            detail="Unable to send OTP email.",
        )


# =========================================================
# REGISTER
# =========================================================

@router.post("/register")
def register(
    user: UserCreate,
    db: Session = Depends(get_db),
):

    email = str(user.email).strip().lower()
    mobile_number = user.mobile_number.strip()
    role = user.role.strip().lower()

    # =====================================================
    # ROLE
    # =====================================================

    if role not in ["user", "admin"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid registration role.",
        )

    # =====================================================
    # MOBILE
    # =====================================================

    if len(mobile_number) < 10 or len(mobile_number) > 15:
        raise HTTPException(
            status_code=400,
            detail="Invalid mobile number.",
        )

    # =====================================================
    # EXISTING EMAIL
    # =====================================================

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

    # =====================================================
    # EXISTING MOBILE
    # =====================================================

    existing_mobile = (
        db.query(User)
        .filter(User.mobile_number == mobile_number)
        .first()
    )

    if existing_mobile:
        raise HTTPException(
            status_code=400,
            detail="Mobile number already registered.",
        )

    # =====================================================
    # ADMIN
    # =====================================================

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

    # =====================================================
    # GENERATE OTP
    # =====================================================

    otp = generate_otp()

    now = utc_now()

    expires_at = now + timedelta(
        minutes=OTP_EXPIRE_MINUTES
    )

    # =====================================================
    # INVALIDATE PREVIOUS OTPs
    # =====================================================

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

    # =====================================================
    # CREATE OTP
    # =====================================================

    otp_record = OTPVerification(
        email=email,
        mobile_number=mobile_number,
        otp=otp,
        expires_at=expires_at,
        is_verified=False,
        created_at=now,
    )

    db.add(otp_record)

    # =====================================================
    # SAVE OTP
    # =====================================================

    try:

        db.commit()
        db.refresh(otp_record)

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

    # =====================================================
    # SEND OTP
    # =====================================================

    try:

        send_otp(
            email=email,
            mobile_number=mobile_number,
            otp=otp,
            purpose="registration",
        )

    except HTTPException:

        try:
            otp_record.is_verified = True
            db.commit()
        except Exception:
            db.rollback()

        raise

    except Exception as e:

        print(
            "REGISTRATION EMAIL ERROR:",
            repr(e),
        )

        try:
            otp_record.is_verified = True
            db.commit()
        except Exception:
            db.rollback()

        raise HTTPException(
            status_code=500,
            detail="OTP email could not be sent.",
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

    email = str(data.email).strip().lower()
    mobile_number = data.mobile_number.strip()
    role = data.role.strip().lower()
    otp_value = data.otp.strip()

    # =====================================================
    # OTP FORMAT
    # =====================================================

    if not otp_value.isdigit() or len(otp_value) != 6:
        raise HTTPException(
            status_code=400,
            detail="OTP must be a valid 6-digit code.",
        )

    # =====================================================
    # ROLE
    # =====================================================

    if role not in ["user", "admin"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid registration role.",
        )

    # =====================================================
    # ADMIN
    # =====================================================

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

    # =====================================================
    # EXISTING EMAIL
    # =====================================================

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

    # =====================================================
    # EXISTING MOBILE
    # =====================================================

    existing_mobile = (
        db.query(User)
        .filter(User.mobile_number == mobile_number)
        .first()
    )

    if existing_mobile:
        raise HTTPException(
            status_code=400,
            detail="Mobile number already registered.",
        )

    # =====================================================
    # FIND OTP
    # =====================================================

    otp_record = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.email == email,
            OTPVerification.mobile_number == mobile_number,
            OTPVerification.is_verified == False,
        )
        .order_by(
            OTPVerification.created_at.desc()
        )
        .first()
    )

    if not otp_record:
        raise HTTPException(
            status_code=404,
            detail="OTP not found. Please request a new OTP.",
        )

    # =====================================================
    # EXPIRATION
    # =====================================================

    if otp_record.expires_at < utc_now():

        otp_record.is_verified = True
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="OTP has expired. Please request a new OTP.",
        )

    # =====================================================
    # OTP CHECK
    # =====================================================

    if otp_record.otp != otp_value:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP.",
        )

    # =====================================================
    # CREATE USER
    # =====================================================

    new_user = User(
        full_name=data.full_name.strip(),
        email=email,
        mobile_number=mobile_number,
        password=hash_password(data.password),
        company_name=data.company_name.strip(),
        role=role,
        is_active=True,
    )

    otp_record.is_verified = True

    db.add(new_user)

    # =====================================================
    # SAVE USER
    # =====================================================

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
        "message": "Account verified and created successfully.",
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

    email = str(data.email).strip().lower()
    mobile_number = data.mobile_number.strip()

    # =====================================================
    # EXISTING ACCOUNT
    # =====================================================

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

    # =====================================================
    # GENERATE
    # =====================================================

    otp = generate_otp()

    now = utc_now()

    expires_at = now + timedelta(
        minutes=OTP_EXPIRE_MINUTES
    )

    # =====================================================
    # INVALIDATE OLD OTP
    # =====================================================

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

    # =====================================================
    # CREATE NEW OTP
    # =====================================================

    otp_record = OTPVerification(
        email=email,
        mobile_number=mobile_number,
        otp=otp,
        expires_at=expires_at,
        is_verified=False,
        created_at=now,
    )

    db.add(otp_record)

    try:

        db.commit()
        db.refresh(otp_record)

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

    # =====================================================
    # SEND
    # =====================================================

    try:

        send_otp(
            email=email,
            mobile_number=mobile_number,
            otp=otp,
            purpose="registration",
        )

    except HTTPException:

        try:
            otp_record.is_verified = True
            db.commit()
        except Exception:
            db.rollback()

        raise

    return {
        "message": "New OTP sent successfully.",
        "email": email,
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

    email = str(data.email).strip().lower()

    # =====================================================
    # USER
    # =====================================================

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="No account found with this email address.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="This account is inactive.",
        )

    # =====================================================
    # OTP
    # =====================================================

    otp = generate_otp()

    now = utc_now()

    expires_at = now + timedelta(
        minutes=OTP_EXPIRE_MINUTES
    )

    # =====================================================
    # INVALIDATE OLD OTPs
    # =====================================================

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

    # =====================================================
    # CREATE
    # =====================================================

    otp_record = OTPVerification(
        email=email,
        mobile_number=user.mobile_number,
        otp=otp,
        expires_at=expires_at,
        is_verified=False,
        created_at=now,
    )

    db.add(otp_record)

    try:

        db.commit()
        db.refresh(otp_record)

    except Exception as e:

        db.rollback()

        print(
            "FORGOT PASSWORD OTP DATABASE ERROR:",
            repr(e),
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to create password reset request.",
        )

    # =====================================================
    # SEND
    # =====================================================

    try:

        send_otp(
            email=email,
            mobile_number=user.mobile_number,
            otp=otp,
            purpose="password_reset",
        )

    except HTTPException:

        try:
            otp_record.is_verified = True
            db.commit()
        except Exception:
            db.rollback()

        raise

    return {
        "message": "Password reset OTP sent successfully.",
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

    email = str(data.email).strip().lower()

    # =====================================================
    # USER
    # =====================================================

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=404,
            detail="No account found with this email address.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="This account is inactive.",
        )

    # =====================================================
    # OTP
    # =====================================================

    otp = generate_otp()

    now = utc_now()

    expires_at = now + timedelta(
        minutes=OTP_EXPIRE_MINUTES
    )

    # =====================================================
    # INVALIDATE OLD
    # =====================================================

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

    # =====================================================
    # CREATE NEW
    # =====================================================

    otp_record = OTPVerification(
        email=email,
        mobile_number=user.mobile_number,
        otp=otp,
        expires_at=expires_at,
        is_verified=False,
        created_at=now,
    )

    db.add(otp_record)

    try:

        db.commit()
        db.refresh(otp_record)

    except Exception as e:

        db.rollback()

        print(
            "RESEND PASSWORD OTP DATABASE ERROR:",
            repr(e),
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to create new password reset OTP.",
        )

    # =====================================================
    # SEND
    # =====================================================

    try:

        send_otp(
            email=email,
            mobile_number=user.mobile_number,
            otp=otp,
            purpose="password_reset",
        )

    except HTTPException:

        try:
            otp_record.is_verified = True
            db.commit()
        except Exception:
            db.rollback()

        raise

    return {
        "message": "New password reset OTP sent successfully.",
        "email": email,
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

    email = str(data.email).strip().lower()
    otp_value = data.otp.strip()

    # =====================================================
    # OTP FORMAT
    # =====================================================

    if not otp_value.isdigit() or len(otp_value) != 6:
        raise HTTPException(
            status_code=400,
            detail="OTP must be a valid 6-digit code.",
        )

    # =====================================================
    # USER
    # =====================================================

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

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="This account is inactive.",
        )

    # =====================================================
    # OTP
    # =====================================================

    otp_record = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.email == email,
            OTPVerification.mobile_number == user.mobile_number,
            OTPVerification.is_verified == False,
        )
        .order_by(
            OTPVerification.created_at.desc()
        )
        .first()
    )

    if not otp_record:
        raise HTTPException(
            status_code=404,
            detail="OTP not found. Please request a new OTP.",
        )

    # =====================================================
    # EXPIRY
    # =====================================================

    if otp_record.expires_at < utc_now():

        otp_record.is_verified = True
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="OTP has expired. Please request a new OTP.",
        )

    # =====================================================
    # VERIFY
    # =====================================================

    if otp_record.otp != otp_value:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP.",
        )

    return {
        "message": "OTP verified successfully.",
        "email": email,
        "verified": True,
    }


# =========================================================
# RESET PASSWORD
# =========================================================

@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db),
):

    email = str(data.email).strip().lower()
    otp_value = data.otp.strip()
    new_password = data.new_password

    # =====================================================
    # PASSWORD
    # =====================================================

    if len(new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must contain at least 6 characters.",
        )

    # =====================================================
    # OTP FORMAT
    # =====================================================

    if not otp_value.isdigit() or len(otp_value) != 6:
        raise HTTPException(
            status_code=400,
            detail="OTP must be a valid 6-digit code.",
        )

    # =====================================================
    # USER
    # =====================================================

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

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="This account is inactive.",
        )

    # =====================================================
    # OTP
    # =====================================================

    otp_record = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.email == email,
            OTPVerification.mobile_number == user.mobile_number,
            OTPVerification.is_verified == False,
        )
        .order_by(
            OTPVerification.created_at.desc()
        )
        .first()
    )

    if not otp_record:
        raise HTTPException(
            status_code=404,
            detail="OTP not found. Please request a new OTP.",
        )

    # =====================================================
    # EXPIRY
    # =====================================================

    if otp_record.expires_at < utc_now():

        otp_record.is_verified = True
        db.commit()

        raise HTTPException(
            status_code=400,
            detail="OTP has expired. Please request a new OTP.",
        )

    # =====================================================
    # VERIFY
    # =====================================================

    if otp_record.otp != otp_value:
        raise HTTPException(
            status_code=400,
            detail="Invalid OTP.",
        )

    # =====================================================
    # UPDATE PASSWORD
    # =====================================================

    user.password = hash_password(new_password)

    otp_record.is_verified = True

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
        "message": "Password reset successfully. You can now login."
    }


# =========================================================
# LOGIN
# =========================================================

@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):

    try:

        email = form_data.username.strip().lower()

        # =================================================
        # USER
        # =================================================

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

        # =================================================
        # ACTIVE
        # =================================================

        if not db_user.is_active:
            raise HTTPException(
                status_code=403,
                detail="Account is inactive.",
            )

        # =================================================
        # PASSWORD
        # =================================================

        if not verify_password(
            form_data.password,
            db_user.password,
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password",
            )

        # =================================================
        # ACCESS TOKEN
        # =================================================

        access_token = create_access_token(
            data={
                "sub": db_user.email,
                "role": db_user.role,
            }
        )

        # =================================================
        # REFRESH TOKEN
        # =================================================

        refresh_token = create_refresh_token(
            data={
                "sub": db_user.email,
                "role": db_user.role,
            }
        )

        # =================================================
        # STORE REFRESH TOKEN
        # =================================================

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

        # =================================================
        # RESPONSE
        # =================================================

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

    # =====================================================
    # STORED TOKEN
    # =====================================================

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

    # =====================================================
    # REVOKED
    # =====================================================

    if stored_token.revoked:
        raise HTTPException(
            status_code=401,
            detail="Refresh token has been revoked",
        )

    # =====================================================
    # EXPIRY
    # =====================================================

    if stored_token.expires_at < utc_now():

        stored_token.revoked = True
        db.commit()

        raise HTTPException(
            status_code=401,
            detail="Refresh token expired",
        )

    # =====================================================
    # DECODE JWT
    # =====================================================

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

    # =====================================================
    # USER
    # =====================================================

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

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Account is inactive.",
        )

    # =====================================================
    # NEW ACCESS TOKEN
    # =====================================================

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