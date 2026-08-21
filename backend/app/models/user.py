from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship

from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    full_name = Column(String, nullable=False)

    email = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    mobile_number = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    password = Column(String, nullable=False)

    company_name = Column(String, nullable=False)

    role = Column(
        String,
        default="user",
        nullable=False
    )

    is_active = Column(
        Boolean,
        default=True,
        nullable=False
    )

    refresh_tokens = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    customers = relationship(
        "Customer",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    vendors = relationship(
        "Vendor",
        back_populates="user",
        cascade="all, delete-orphan"
    )