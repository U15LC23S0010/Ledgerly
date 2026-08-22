from sqlalchemy import Column, Integer, String, Boolean, DateTime
from datetime import datetime

from app.db.database import Base


class OTPVerification(Base):
    __tablename__ = "otp_verifications"

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String, nullable=False, index=True)

    mobile_number = Column(String, nullable=True, index=True)

    otp = Column(String, nullable=False)

    expires_at = Column(DateTime, nullable=False)

    is_verified = Column(Boolean, default=False, nullable=False)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
