from datetime import date

from pydantic import BaseModel, ConfigDict, Field


# =========================================================
# TRANSACTION CREATE
# =========================================================

class TransactionCreate(BaseModel):
    description: str = Field(
        ...,
        min_length=2,
        max_length=200,
    )

    amount: float

    transaction_type: str

    date: date

    account_id: int = Field(
        ...,
        gt=0,
    )

    destination_account_id: int | None = None

    category_id: int | None = Field(
        default=None,
        gt=0,
    )


# =========================================================
# TRANSACTION RESPONSE
# =========================================================

class TransactionResponse(BaseModel):
    id: int
    description: str
    amount: float
    transaction_type: str
    date: date
    account_id: int
    user_id: int

    category_id: int | None = None
    category_name: str | None = None

    model_config = ConfigDict(
        from_attributes=True,
    )