from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr


class CustomerCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class CustomerResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    user_id: int

    model_config = ConfigDict(from_attributes=True)
