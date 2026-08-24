from sqlalchemy import Column, Integer, Float, String, Date, ForeignKey
from sqlalchemy.orm import relationship

from app.db.database import Base


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)

    invoice_number = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )

    customer_id = Column(
        Integer,
        ForeignKey("customers.id"),
        nullable=False
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    issue_date = Column(
        Date,
        nullable=False
    )

    due_date = Column(
        Date,
        nullable=False
    )

    subtotal = Column(
        Float,
        nullable=False,
        default=0.0
    )

    tax = Column(
        Float,
        nullable=False,
        default=0.0
    )

    discount = Column(
        Float,
        nullable=False,
        default=0.0
    )

    total = Column(
        Float,
        nullable=False,
        default=0.0
    )

    status = Column(
        String,
        nullable=False,
        default="draft"
    )

    notes = Column(
        String,
        nullable=True
    )

    customer = relationship("Customer")

    user = relationship("User")

    items = relationship(
        "InvoiceItem",
        back_populates="invoice",
        cascade="all, delete-orphan"
    )
