from pydantic import BaseModel
from datetime import date


class RecurringExpenseCreate(BaseModel):
    title: str
    amount: float
    frequency: str
    next_date: date


class RecurringExpenseResponse(RecurringExpenseCreate):
    id: int

    class Config:
        from_attributes = True