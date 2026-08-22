from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    Numeric,
    ForeignKey,
    DateTime,
    UniqueConstraint,
    Index,
)

from app.db.database import Base


class Budget(Base):
    __tablename__ = "budgets"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    monthly_budget = Column(
        Numeric(12, 2),
        nullable=False
    )

    month = Column(
        Integer,
        nullable=False
    )

    year = Column(
        Integer,
        nullable=False
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    created_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow
    )

    updated_at = Column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "month",
            "year",
            name="uq_user_budget_month_year"
        ),

        Index(
            "ix_budgets_user_id",
            "user_id"
        ),
    )
