from sqlalchemy import Column, Integer, Float, String, Date, ForeignKey
from sqlalchemy.orm import relationship

from app.db.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    description = Column(
        String,
        nullable=False
    )

    amount = Column(
        Float,
        nullable=False
    )

    transaction_type = Column(
        String,
        nullable=False
    )
    # income, expense, transfer

    date = Column(
        Date,
        nullable=False
    )

    # =========================================================
    # SOURCE ACCOUNT
    # =========================================================

    account_id = Column(
        Integer,
        ForeignKey("accounts.id"),
        nullable=False
    )

    # =========================================================
    # DESTINATION ACCOUNT
    # Used for transfers
    # =========================================================

    destination_account_id = Column(
        Integer,
        ForeignKey("accounts.id"),
        nullable=True
    )

    # =========================================================
    # USER
    # =========================================================

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    # =========================================================
    # CATEGORY
    # =========================================================

    category_id = Column(
        Integer,
        ForeignKey("categories.id"),
        nullable=True
    )

    # =========================================================
    # RELATIONSHIPS
    # =========================================================

    account = relationship(
        "Account",
        foreign_keys=[account_id]
    )

    destination_account = relationship(
        "Account",
        foreign_keys=[destination_account_id]
    )

    user = relationship(
        "User"
    )

    category = relationship(
        "Category",
        back_populates="transactions" ,
        foreign_keys=[category_id]
    )
