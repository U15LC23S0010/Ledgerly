from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship

from app.db.database import Base


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)

    email = Column(String, nullable=True)

    phone = Column(String, nullable=True)

    address = Column(Text, nullable=True)

    tax_id = Column(String, nullable=True)

    notes = Column(Text, nullable=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    user = relationship(
        "User",
        back_populates="customers"
    )

    invoices = relationship(
        "Invoice",
        back_populates="customer",
        cascade="all, delete-orphan"
    )
