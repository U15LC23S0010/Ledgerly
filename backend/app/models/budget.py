from sqlalchemy import Column, Integer, Float, ForeignKey
from app.db.database import Base

class Budget(Base):
    __tablename__ = "budgets"

    id = Column(Integer, primary_key=True, index=True)
    monthly_budget = Column(Float, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)