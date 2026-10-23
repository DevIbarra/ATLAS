from pydantic import BaseModel, Field


class CreateUsuarioRequest(BaseModel):
    nome_completo: str
    nome_guerra: str
    posto: str
    especialidade: str | None = None
    unidade: str
    cpf: str = Field(min_length=11, max_length=11)
    saram: str = Field(max_length=10)
    tipo_user: str
    ativo: bool = False

class UpdateUsuarioRequest(BaseModel):
    nome_completo: str | None = None
    nome_guerra: str | None = None
    posto: str | None = None
    especialidade: str | None = None
    unidade: str | None = None
    cpf: str | None = Field(default=None, min_length=11, max_length=11)
    saram: str | None = Field(default=None, max_length=10)
    tipo_user: str | None = None
    ativo: bool | None = None
