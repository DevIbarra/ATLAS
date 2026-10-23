from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from App.Core.missoes import MISSION_SITUATION_VALUES
from App.Data.connection import get_db
from App.Models.missoes import Missao
from App.Schemas.missoes import CreateMissaoRequest, UpdateMissaoRequest


router = APIRouter(prefix="/missoes", tags=["Missões"])


@router.post("/criar", status_code=status.HTTP_201_CREATED)
def criar_missao(dados: CreateMissaoRequest, db: Session = Depends(get_db)):
    missao = Missao(**dados.model_dump())
    db.add(missao)
    db.commit()
    db.refresh(missao)

    return {
        "mensagem": "Missão cadastrada com sucesso!",
        "missao": missao,
    }


@router.get("/listar")
def listar_missoes(db: Session = Depends(get_db)):
    return db.query(Missao).order_by(Missao.id_missao.desc()).all()


@router.put("/atualizar/{id_missao}")
def atualizar_missao(id_missao: int, dados: UpdateMissaoRequest, db: Session = Depends(get_db)):
    missao = db.get(Missao, id_missao)

    if not missao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Missão não encontrada.",
        )

    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(missao, campo, valor)

    for campo, valor in MISSION_SITUATION_VALUES.get(missao.situacao, {}).items():
        setattr(missao, campo, valor)

    db.commit()
    db.refresh(missao)

    return {
        "mensagem": "Missão atualizada com sucesso!",
        "missao": missao,
    }


@router.delete("/deletar/{id_missao}")
def deletar_missao(id_missao: int, db: Session = Depends(get_db)):
    missao = db.get(Missao, id_missao)

    if not missao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Missão não encontrada.",
        )

    db.delete(missao)
    db.commit()

    return {"mensagem": "Missão excluída com sucesso!"}
