from pydantic import BaseModel, ConfigDict, Field


class AccountCreate(BaseModel):
    name: str = Field(
        ...,
        min_length=2,
        max_length=100
    )

    account_type: str = Field(
        ...,
        min_length=2,
        max_length=50
    )

    balance: float = Field(
        default=0.0
    )


class AccountUpdate(BaseModel):
    name: str = Field(
        ...,
        min_length=2,
        max_length=100
    )

    account_type: str = Field(
        ...,
        min_length=2,
        max_length=50
    )

    balance: float


class AccountResponse(BaseModel):
    id: int
    name: str
    account_type: str
    balance: float
    user_id: int

    model_config = ConfigDict(from_attributes=True)