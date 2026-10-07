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