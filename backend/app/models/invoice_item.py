from sqlalchemy import Column, Integer, Float, String, ForeignKey
from sqlalchemy.orm import relationship

from app.db.database import Base


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    invoice_id = Column(
        Integer,
        ForeignKey("invoices.id"),
        nullable=False
    )

    description = Column(
        String,
        nullable=False
    )

    quantity = Column(
        Float,
        nullable=False
    )

    unit_price = Column(
        Float,
        nullable=False
    )

    amount = Column(
        Float,
        nullable=False
    )

    invoice = relationship(
        "Invoice",
        back_populates="items"
    )
