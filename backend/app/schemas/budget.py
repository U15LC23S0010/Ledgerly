from pydantic import BaseModel, ConfigDict, Field

class BudgetCreate(BaseModel):

    monthly_budget: float = Field(
        ...,
        gt=0,
        description="Monthly budget amount"
    )

    month: int = Field(
        ...,
        ge=1,
        le=12,
        description="Budget month"
    )

    year: int = Field(
        ...,
        ge=2020,
        le=2100,
        description="Budget year"
    )


class BudgetResponse(BaseModel):

    id: int

    monthly_budget: float

    month: int

    year: int

    user_id: int

    model_config = ConfigDict(from_attributes=True)
