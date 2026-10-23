from pydantic import BaseModel, Field

class CreateOrcamentoRequest(BaseModel):
    nome: str
    valor: float = Field(gt=0)

class UpdateOrcamentoRequest(BaseModel):
    nome: str | None = None
    valor: float | None = Field(default=None, gt=0)
