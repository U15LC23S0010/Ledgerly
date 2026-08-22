from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    mobile_number: str = Field(min_length=10, max_length=15)
    password: str
    company_name: str
    role: str = "user"
    admin_code: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str
