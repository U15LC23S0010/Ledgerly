from pydantic import BaseModel, EmailStr, Field


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    otp: str = Field(
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$"
    )