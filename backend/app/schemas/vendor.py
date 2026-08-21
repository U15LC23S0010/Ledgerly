from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class VendorCreate(BaseModel):

    name: str = Field(
        ...,
        min_length=2,
        max_length=200
    )

    email: Optional[EmailStr] = None

    phone: Optional[str] = None

    address: Optional[str] = None

    notes: Optional[str] = None


class VendorUpdate(BaseModel):

    name: str = Field(
        ...,
        min_length=2,
        max_length=200
    )

    email: Optional[EmailStr] = None

    phone: Optional[str] = None

    address: Optional[str] = None

    notes: Optional[str] = None


class VendorResponse(BaseModel):

    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    user_id: int

    model_config = ConfigDict(from_attributes=True)