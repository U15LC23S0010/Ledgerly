from pydantic import BaseModel, Field


class AutoExpenseRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=1,
        description="Natural language expense description"
    )


class AutoExpenseResponse(BaseModel):
    message: str
    expense_id: int
    title: str
    category: str
    amount: float
    date: str
