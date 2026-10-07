from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from App.Data.connection import get_db
from App.Models.usuarios import usuarios as UsuarioModel
from App.Schemas.usuarios import CreateUsuarioRequest
from App.Service.usuarios import cadastrar_usuario


router = APIRouter(
    prefix="/usuarios",
    tags=["Usuários"]
)


# CADASTRAR USUÁRIO
@router.post("/criar",status_code=status.HTTP_201_CREATED)
def criar_usuario(dados: CreateUsuarioRequest,db: Session = Depends(get_db)):

    usuario = cadastrar_usuario(dados=dados, db=db)

    return {
        "mensagem": "Usuário cadastrado com sucesso!",
    }

# LISTA TODOS OS USUÁRIOS
@router.get("/listar")
def listar_usuarios(db: Session = Depends(get_db)):
    lista_usuarios = db.query(UsuarioModel).order_by(UsuarioModel.nome_completo).all()

    return lista_usuarios
