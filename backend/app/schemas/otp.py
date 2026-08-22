from pydantic import BaseModel, EmailStr, Field


class OTPVerifyRequest(BaseModel):
    email: EmailStr
    email_otp: str = Field(min_length=6, max_length=6)
    mobile_otp: str = Field(min_length=6, max_length=6)
