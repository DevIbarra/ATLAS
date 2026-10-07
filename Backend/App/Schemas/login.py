from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    gmail: EmailStr
    senha: str

class CreateLoginRequest(BaseModel):
    nome_guerra: str
    gmail: EmailStr
    senha: str