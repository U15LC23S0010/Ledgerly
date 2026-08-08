from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    company_name:str
    
class UserLogin(BaseModel):
    email: EmailStr
    password:str
    