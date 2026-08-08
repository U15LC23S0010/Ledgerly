from pydantic import BaseModel, Field
from datetime import date


class ExpenseCreate(BaseModel):
    title: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Expense title"
    )

    amount: float = Field(
        ...,
        gt=0,
        description="Amount must be greater than 0"
    )

    category_id: int = Field(
        ...,
        gt=0,
        description="Valid category ID"
    )

    date: date


class ExpenseResponse(BaseModel):
    id: int
    title: str
    amount: float
    category_id: int
    date: date
    user_id: int

    class Config:
        from_attributes = True