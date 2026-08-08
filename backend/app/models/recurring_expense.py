from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from app.db.database import Base


class RecurringExpense(Base):
    __tablename__ = "recurring_expenses"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, nullable=False)

    amount = Column(Float, nullable=False)

    frequency = Column(String, nullable=False)
    # daily / weekly / monthly

    next_date = Column(Date, nullable=False)

    user_id = Column(Integer, ForeignKey("users.id"))