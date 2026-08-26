from datetime import datetime, timedelta, timezone
import secrets
import smtplib

from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_user
from app.core.security import (
    ALGORITHM,
    SECRET_KEY,
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.db.database import get_db
from app.models.otp import OTPVerification
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.user import UserCreate


router = APIRouter()


# =========================================================
# CONSTANTS
# =========================================================

OTP_EXPIRE_MINUTES = 10
OTP_LENGTH = 6
MIN_PASSWORD_LENGTH = 6
MAX_PASSWORD_LENGTH = 128


# =========================================================
# UTC TIME
# =========================================================

def utc_now() -> datetime:
    """
    Return current UTC time as a naive datetime.

    The project database uses SQLAlchemy DateTime columns
    without timezone information, so UTC timezone information
    is removed before storing/comparing values.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


# =========================================================
# NORMALIZATION
# =========================================================

def normalize_email(email: str) -> str:
    return str(email).strip().lower()


def normalize_mobile(mobile_number: str) -> str:
    return str(mobile_number).strip()


def normalize_role(role: str | None) -> str:
    return str(role or "user").strip().lower()


# =========================================================
# VALIDATION
# =========================================================

def validate_password(password: str) -> None:
    if not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password is required.",
        )

    if len(password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Password must contain at least "
                f"{MIN_PASSWORD_LENGTH} characters."
            ),
        )

    if len(password) > MAX_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Password must not exceed "
                f"{MAX_PASSWORD_LENGTH} characters."
            ),
        )


def validate_otp_format(otp: str) -> str:
    otp = str(otp).strip()

    if not otp.isdigit() or len(otp) != OTP_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP must be a valid 6-digit code.",
        )

    return otp


def validate_mobile_number(mobile_number: str) -> str:
    mobile_number = normalize_mobile(mobile_number)

    if not mobile_number.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number must contain digits only.",
        )

    if not 10 <= len(mobile_number) <= 15:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number must contain 10 to 15 digits.",
        )

    return mobile_number


# =========================================================
# EMAIL CONFIGURATION
# =========================================================

def validate_email_configuration() -> None:
    required_settings = {
        "GMAIL_SMTP_HOST": settings.GMAIL_SMTP_HOST,
        "GMAIL_SMTP_PORT": settings.GMAIL_SMTP_PORT,
        "GMAIL_SMTP_USERNAME": settings.GMAIL_SMTP_USERNAME,
        "GMAIL_SMTP_PASSWORD": settings.GMAIL_SMTP_PASSWORD,
    }

    missing = [
        name
        for name, value in required_settings.items()
        if value is None or str(value).strip() == ""
    ]

    if missing:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Email service is not configured correctly. "
                f"Missing: {', '.join(missing)}"
            ),
        )


# =========================================================
# REQUEST MODELS
# =========================================================

class VerifyRegistrationRequest(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    mobile_number: str = Field(min_length=10, max_length=15)
    password: str
    company_name: str = Field(min_length=1, max_length=255)
    role: str = "user"
    admin_code: str | None = None
    otp: str


class ResendOTPRequest(BaseModel):
    email: EmailStr
    mobile_number: str = Field(min_length=10, max_length=15)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyForgotPasswordOTPRequest(BaseModel):
    email: EmailStr
    otp: str


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


# =========================================================
# OTP GENERATOR
# =========================================================

def generate_otp() -> str:
    """
    Generate a cryptographically secure six-digit OTP.
    """
    return f"{secrets.randbelow(1_000_000):06d}"


# =========================================================
# EMAIL TEMPLATE
# =========================================================

def build_otp_email(
    otp: str,
    purpose: str,
) -> tuple[str, str]:

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

    <h2 style="margin-top:0;color:#172033;">
        Welcome to Ledgerly!
    </h2>

    <p style="color:#4b5563;">
        Hello,
    </p>

    <p style="color:#4b5563;line-height:1.6;">
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

    <p style="color:#4b5563;line-height:1.6;">
        This code expires in
        <strong>{OTP_EXPIRE_MINUTES} minutes</strong>.
    </p>

    <p style="color:#4b5563;line-height:1.6;">
        Enter this code in Ledgerly to complete your registration.
    </p>

    <h3 style="color:#172033;">
        What's waiting for you
    </h3>

    <ul style="color:#4b5563;line-height:1.8;">
        <li>Track income and expenses</li>
        <li>Manage accounts and transactions</li>
        <li>Create budgets and invoices</li>
        <li>Analyze financial performance</li>
        <li>Discover intelligent insights</li>
    </ul>

    <p style="color:#4b5563;line-height:1.6;">
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

        return subject, body

    if purpose == "password_reset":

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

    <h2 style="margin-top:0;color:#172033;">
        Ledgerly Password Reset
    </h2>

    <p style="color:#4b5563;">
        Hello,
    </p>

    <p style="color:#4b5563;line-height:1.6;">
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

    <p style="color:#4b5563;line-height:1.6;">
        This code expires in
        <strong>{OTP_EXPIRE_MINUTES} minutes</strong>.
    </p>

    <p style="color:#4b5563;line-height:1.6;">
        For your security, do not share this code with anyone.
    </p>

    <p style="color:#4b5563;line-height:1.6;">
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

        return subject, body

    raise ValueError("Invalid OTP purpose.")


# =========================================================
# SEND OTP
# =========================================================

def send_otp(
    email: str,
    otp: str,
    purpose: str,
) -> None:

    validate_email_configuration()

    subject, body = build_otp_email(
        otp=otp,
        purpose=purpose,
    )

    sender = (
        f"{settings.GMAIL_FROM_NAME} "
        f"<{settings.GMAIL_SMTP_USERNAME}>"
    )

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = email

    message.attach(
        MIMEText(
            body,
            "html",
            "utf-8",
        )
    )

    print("=" * 60)
    print("LEDGERLY OTP EMAIL")
    print(f"TO: {email}")
    print(f"PURPOSE: {purpose}")
    print(f"SMTP: {settings.GMAIL_SMTP_HOST}:{settings.GMAIL_SMTP_PORT}")
    print("=" * 60)

    try:
        with smtplib.SMTP(
            settings.GMAIL_SMTP_HOST,
            settings.GMAIL_SMTP_PORT,
            timeout=30,
        ) as server:

            server.ehlo()

            server.starttls()

            server.ehlo()

            server.login(
                settings.GMAIL_SMTP_USERNAME,
                settings.GMAIL_SMTP_PASSWORD,
            )

            server.sendmail(
                settings.GMAIL_SMTP_USERNAME,
                [email],
                message.as_string(),
            )

    except smtplib.SMTPAuthenticationError as exc:
        print("SMTP AUTHENTICATION ERROR:", repr(exc))

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email service authentication failed.",
        )

    except smtplib.SMTPException as exc:
        print("SMTP ERROR:", repr(exc))

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to send OTP email.",
        )

    except OSError as exc:
        print("SMTP CONNECTION ERROR:", repr(exc))

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to connect to email service.",
        )

    except Exception as exc:
        print("UNEXPECTED EMAIL ERROR:", repr(exc))

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to send OTP email.",
        )

    print("OTP EMAIL SENT SUCCESSFULLY")
    print("=" * 60)


# =========================================================
# INVALIDATE OTPs
# =========================================================

def invalidate_pending_otps(
    db: Session,
    email: str,
) -> None:

    pending_otps = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.email == email,
            OTPVerification.is_verified.is_(False),
        )
        .all()
    )

    for otp_record in pending_otps:
        otp_record.is_verified = True


# =========================================================
# CREATE OTP RECORD
# =========================================================

def create_otp_record(
    db: Session,
    email: str,
    mobile_number: str | None,
    otp: str,
) -> OTPVerification:

    now = utc_now()

    invalidate_pending_otps(
        db=db,
        email=email,
    )

    otp_record = OTPVerification(
        email=email,
        mobile_number=mobile_number,
        otp=otp,
        expires_at=now + timedelta(
            minutes=OTP_EXPIRE_MINUTES
        ),
        is_verified=False,
        created_at=now,
    )

    db.add(otp_record)

    return otp_record


# =========================================================
# FIND LATEST VALID OTP
# =========================================================

def get_latest_pending_otp(
    db: Session,
    email: str,
    mobile_number: str | None = None,
) -> OTPVerification | None:

    query = (
        db.query(OTPVerification)
        .filter(
            OTPVerification.email == email,
            OTPVerification.is_verified.is_(False),
        )
    )

    if mobile_number is not None:
        query = query.filter(
            OTPVerification.mobile_number == mobile_number
        )

    return (
        query
        .order_by(
            OTPVerification.created_at.desc(),
            OTPVerification.id.desc(),
        )
        .first()
    )


# =========================================================
# VERIFY OTP RECORD
# =========================================================

def verify_otp_record(
    db: Session,
    otp_record: OTPVerification,
    submitted_otp: str,
) -> None:

    if otp_record.expires_at < utc_now():

        otp_record.is_verified = True

        try:
            db.commit()
        except Exception:
            db.rollback()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new OTP.",
        )

    if not secrets.compare_digest(
        str(otp_record.otp),
        submitted_otp,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP.",
        )


# =========================================================
# MARK OTP USED
# =========================================================

def consume_otp(
    db: Session,
    otp_record: OTPVerification,
) -> None:

    otp_record.is_verified = True


# =========================================================
# REGISTER
# =========================================================

@router.post("/register")
def register(
    user: UserCreate,
    db: Session = Depends(get_db),
):

    email = normalize_email(user.email)

    mobile_number = validate_mobile_number(
        user.mobile_number
    )

    role = normalize_role(user.role)

    full_name = user.full_name.strip()
    company_name = user.company_name.strip()

    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name is required.",
        )

    if not company_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company name is required.",
        )

    validate_password(user.password)

    if role not in {"user", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid registration role.",
        )

    if role == "admin":

        if not user.admin_code:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access code is required.",
            )

        if not secrets.compare_digest(
            str(user.admin_code),
            str(settings.ADMIN_REGISTRATION_CODE),
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid admin access code.",
            )

    existing_email = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered.",
        )

    existing_mobile = (
        db.query(User)
        .filter(User.mobile_number == mobile_number)
        .first()
    )

    if existing_mobile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number already registered.",
        )

    otp = generate_otp()

    otp_record = create_otp_record(
        db=db,
        email=email,
        mobile_number=mobile_number,
        otp=otp,
    )

    try:
        db.commit()
        db.refresh(otp_record)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unable to create verification request.",
        )

    except Exception as exc:
        db.rollback()

        print(
            "REGISTRATION OTP DATABASE ERROR:",
            repr(exc),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create verification request.",
        )

    try:
        send_otp(
            email=email,
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

    email = normalize_email(data.email)

    mobile_number = validate_mobile_number(
        data.mobile_number
    )

    role = normalize_role(data.role)

    otp_value = validate_otp_format(data.otp)

    full_name = data.full_name.strip()
    company_name = data.company_name.strip()

    if not full_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name is required.",
        )

    if not company_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Company name is required.",
        )

    validate_password(data.password)

    if role not in {"user", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid registration role.",
        )

    if role == "admin":

        if not data.admin_code:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access code is required.",
            )

        if not secrets.compare_digest(
            str(data.admin_code),
            str(settings.ADMIN_REGISTRATION_CODE),
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid admin access code.",
            )

    existing_email = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered.",
        )

    existing_mobile = (
        db.query(User)
        .filter(User.mobile_number == mobile_number)
        .first()
    )

    if existing_mobile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mobile number already registered.",
        )

    otp_record = get_latest_pending_otp(
        db=db,
        email=email,
        mobile_number=mobile_number,
    )

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="OTP not found. Please request a new OTP.",
        )

    verify_otp_record(
        db=db,
        otp_record=otp_record,
        submitted_otp=otp_value,
    )

    new_user = User(
        full_name=full_name,
        email=email,
        mobile_number=mobile_number,
        password=hash_password(data.password),
        company_name=company_name,
        role=role,
        is_active=True,
    )

    consume_otp(
        db=db,
        otp_record=otp_record,
    )

    db.add(new_user)

    try:
        db.commit()
        db.refresh(new_user)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Email or mobile number is already registered."
            ),
        )

    except Exception as exc:
        db.rollback()

        print(
            "REGISTRATION ERROR:",
            repr(exc),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
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

    email = normalize_email(data.email)

    mobile_number = validate_mobile_number(
        data.mobile_number
    )

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account already exists.",
        )

    otp = generate_otp()

    otp_record = create_otp_record(
        db=db,
        email=email,
        mobile_number=mobile_number,
        otp=otp,
    )

    try:
        db.commit()
        db.refresh(otp_record)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unable to create new OTP.",
        )

    except Exception as exc:
        db.rollback()

        print(
            "RESEND OTP DATABASE ERROR:",
            repr(exc),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create new OTP.",
        )

    try:
        send_otp(
            email=email,
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

    email = normalize_email(data.email)

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive.",
        )

    otp = generate_otp()

    otp_record = create_otp_record(
        db=db,
        email=email,
        mobile_number=user.mobile_number,
        otp=otp,
    )

    try:
        db.commit()
        db.refresh(otp_record)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unable to create password reset request.",
        )

    except Exception as exc:
        db.rollback()

        print(
            "FORGOT PASSWORD OTP DATABASE ERROR:",
            repr(exc),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create password reset request.",
        )

    try:
        send_otp(
            email=email,
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

    email = normalize_email(data.email)

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive.",
        )

    otp = generate_otp()

    otp_record = create_otp_record(
        db=db,
        email=email,
        mobile_number=user.mobile_number,
        otp=otp,
    )

    try:
        db.commit()
        db.refresh(otp_record)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Unable to create new password reset OTP.",
        )

    except Exception as exc:
        db.rollback()

        print(
            "RESEND PASSWORD OTP DATABASE ERROR:",
            repr(exc),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to create new password reset OTP.",
        )

    try:
        send_otp(
            email=email,
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

    email = normalize_email(data.email)

    otp_value = validate_otp_format(data.otp)

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive.",
        )

    otp_record = get_latest_pending_otp(
        db=db,
        email=email,
        mobile_number=user.mobile_number,
    )

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="OTP not found. Please request a new OTP.",
        )

    verify_otp_record(
        db=db,
        otp_record=otp_record,
        submitted_otp=otp_value,
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

    email = normalize_email(data.email)

    otp_value = validate_otp_format(data.otp)

    validate_password(data.new_password)

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive.",
        )

    otp_record = get_latest_pending_otp(
        db=db,
        email=email,
        mobile_number=user.mobile_number,
    )

    if not otp_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="OTP not found. Please request a new OTP.",
        )

    verify_otp_record(
        db=db,
        otp_record=otp_record,
        submitted_otp=otp_value,
    )

    user.password = hash_password(
        data.new_password
    )

    consume_otp(
        db=db,
        otp_record=otp_record,
    )

    # -----------------------------------------------------
    # Revoke every existing refresh token
    # -----------------------------------------------------

    existing_refresh_tokens = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.user_id == user.id,
            RefreshToken.revoked.is_(False),
        )
        .all()
    )

    for token in existing_refresh_tokens:
        token.revoked = True

    try:
        db.commit()

    except Exception as exc:
        db.rollback()

        print(
            "PASSWORD RESET ERROR:",
            repr(exc),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
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

    email = normalize_email(form_data.username)

    db_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    if not db_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive.",
        )

    try:
        password_valid = verify_password(
            form_data.password,
            db_user.password,
        )
    except Exception as exc:
        print(
            "PASSWORD VERIFICATION ERROR:",
            repr(exc),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to verify credentials.",
        )

    if not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    access_token = create_access_token(
        data={
            "sub": db_user.email,
            "role": db_user.role,
        }
    )

    refresh_token = create_refresh_token(
        data={
            "sub": db_user.email,
            "role": db_user.role,
        }
    )

    refresh_expires_at = (
        utc_now()
        + timedelta(
            days=settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
    )

    refresh_token_record = RefreshToken(
        token=refresh_token,
        user_id=db_user.id,
        expires_at=refresh_expires_at,
        revoked=False,
    )

    db.add(refresh_token_record)

    try:
        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to complete login.",
        )

    except Exception as exc:
        db.rollback()

        print(
            "LOGIN REFRESH TOKEN DATABASE ERROR:",
            repr(exc),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to complete login.",
        )

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


# =========================================================
# REFRESH ACCESS TOKEN
# =========================================================

@router.post("/refresh")
def refresh_access_token(
    data: RefreshTokenRequest,
    db: Session = Depends(get_db),
):

    refresh_token = data.refresh_token.strip()

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is required.",
        )

    # -----------------------------------------------------
    # Decode and validate JWT first
    # -----------------------------------------------------

    try:
        payload = jwt.decode(
            refresh_token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token.",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type.",
        )

    email = payload.get("sub")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token.",
        )

    email = normalize_email(email)

    # -----------------------------------------------------
    # Database token
    # -----------------------------------------------------

    stored_token = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token == refresh_token,
        )
        .first()
    )

    if not stored_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token.",
        )

    if stored_token.revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has been revoked.",
        )

    if stored_token.expires_at < utc_now():

        stored_token.revoked = True

        try:
            db.commit()
        except Exception:
            db.rollback()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expired.",
        )

    # -----------------------------------------------------
    # User
    # -----------------------------------------------------

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User associated with token was not found.",
        )

    if stored_token.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive.",
        )

    # -----------------------------------------------------
    # Issue new access token
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
    data: RefreshTokenRequest,
    db: Session = Depends(get_db),
):

    refresh_token = data.refresh_token.strip()

    stored_token = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.token == refresh_token,
        )
        .first()
    )

    if not stored_token:
        return {
            "message": "Logout successful"
        }

    if stored_token.revoked:
        return {
            "message": "Logout successful"
        }

    stored_token.revoked = True

    try:
        db.commit()

    except Exception as exc:
        db.rollback()

        print(
            "LOGOUT DATABASE ERROR:",
            repr(exc),
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to logout.",
        )

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
