from datetime import date
from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

from App.Core.missoes import MISSION_SITUATION_VALUES


class CreateMissaoRequest(BaseModel):
    numero_ordem_servico: str = Field(min_length=1, max_length=80)
    finalidade: str = Field(min_length=1)
    situacao: Literal["normal", "custo_zero", "cancelada"] = "normal"
    diarias: str | None = Field(default=None, max_length=30)
    militar_civil: str | None = Field(default=None, max_length=50)
    numero_pcdp: str | None = Field(default=None, max_length=80)
    atenas_tarjada: str | None = Field(default=None, max_length=10)
    valor: float | None = Field(default=None, ge=0)
    siloms: str | None = Field(default=None, max_length=100)
    zimbra: str | None = Field(default=None, max_length=100)
    facdp: str | None = Field(default=None, max_length=100)
    oficio_sigadaer: str | None = Field(default=None, max_length=100)
    ob: str | None = Field(default=None, max_length=80)
    data_ob: date | None = None
    numero_adt_bol_publicacao: str | None = Field(default=None, max_length=100)
    matricula: str | None = Field(default=None, max_length=80)
    data_missao: date

    @model_validator(mode="before")
    @classmethod
    def ajustar_campos_por_situacao(cls, data: Any):
        if isinstance(data, dict):
            situation = data.get("situacao")
            if isinstance(situation, str) and situation in MISSION_SITUATION_VALUES:
                return {**data, **MISSION_SITUATION_VALUES[situation]}
        return data


class UpdateMissaoRequest(CreateMissaoRequest):
    pass
