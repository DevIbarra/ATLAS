from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from App.Data.connection import get_db
from App.Models.orcamento import orcamento as OrcamentoModel
from App.Schemas.orcamento import CreateOrcamentoRequest, UpdateOrcamentoRequest

router = APIRouter(
    prefix="/orcamento",
    tags=["Orçamento"]
)

# CADASTRAR ORÇAMENTO
@router.post("/criar", status_code=status.HTTP_201_CREATED)
def criar_orcamento(dados: CreateOrcamentoRequest, db: Session = Depends(get_db)):
    novo_orcamento = OrcamentoModel(
        nome=dados.nome.strip(),
        valor=dados.valor
    )
    db.add(novo_orcamento)
    db.commit()
    db.refresh(novo_orcamento)

    return {
        "mensagem": "Orçamento cadastrado com sucesso!",
        "orcamento": novo_orcamento
    }

# Atualizar orçamento
@router.put("/atualizar/{id_orcamento}")
def atualizar_orcamento(id_orcamento: int, dados: UpdateOrcamentoRequest, db: Session = Depends(get_db)):
    orcamento = db.query(OrcamentoModel).filter(OrcamentoModel.id == id_orcamento).first()

    if not orcamento:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Orçamento não encontrado.",
        )

    if dados.nome is not None:
        orcamento.nome = dados.nome
    if dados.valor is not None:
        orcamento.valor = dados.valor

    db.commit()
    db.refresh(orcamento)

    return {
        "mensagem": "Orçamento atualizado com sucesso!",
        "orcamento": orcamento
    }

# listar orçamentos
@router.get("/listar")
def listar_orcamentos(db: Session = Depends(get_db)):
    orcamentos = db.query(OrcamentoModel).all()
    return {"orcamentos": orcamentos}
