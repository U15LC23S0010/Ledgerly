from pydantic import BaseModel


class BudgetCreate(BaseModel):
    monthly_budget: float


class BudgetResponse(BaseModel):
    id: int
    monthly_budget: float

    class Config:
        from_attributes = True