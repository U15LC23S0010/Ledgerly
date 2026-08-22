from datetime import date
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# =========================================================
# INVOICE ITEM
# =========================================================

class InvoiceItemCreate(BaseModel):
    description: str
    quantity: float = Field(gt=0)
    unit_price: float = Field(ge=0)


class InvoiceItemResponse(BaseModel):
    id: int
    description: str
    quantity: float
    unit_price: float
    amount: float

    model_config = ConfigDict(from_attributes=True)


# =========================================================
# CREATE INVOICE
# =========================================================

class InvoiceCreate(BaseModel):
    customer_id: int

    issue_date: date
    due_date: date

    tax: float = Field(default=0.0, ge=0)
    discount: float = Field(default=0.0, ge=0)

    notes: Optional[str] = None

    items: List[InvoiceItemCreate]


# =========================================================
# UPDATE INVOICE STATUS
# =========================================================

class InvoiceStatusUpdate(BaseModel):
    status: str


# =========================================================
# INVOICE RESPONSE
# =========================================================

class InvoiceResponse(BaseModel):
    id: int
    invoice_number: str

    customer_id: int
    user_id: int

    issue_date: date
    due_date: date

    subtotal: float
    tax: float
    discount: float
    total: float

    status: str
    notes: Optional[str]

    items: List[InvoiceItemResponse]

    model_config = ConfigDict(from_attributes=True)
