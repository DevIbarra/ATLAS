from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from App.Data.connection import get_db
from App.Models.usuarios import usuarios as UsuarioModel
from App.Schemas.login import LoginRequest, CreateLoginRequest
from App.Service.login import autenticar_usuario, Cria_Login


router = APIRouter(
    prefix="/login",
    tags=["Login"]
)


@router.post("")
def realizar_login(dados: LoginRequest, db: Session = Depends(get_db)):

    login = autenticar_usuario(dados=dados, db=db)
    usuario = db.get(UsuarioModel, login.id_user)

    return {
        "mensagem": "Login realizado com sucesso",
        "usuario": {
            "id_user": usuario.id_user,
            "nome_completo": usuario.nome_completo,
            "nome_guerra": usuario.nome_guerra,
            "tipo_user": usuario.tipo_user,
        } if usuario else None,
    }

# CADASTRAR LOGIN
@router.post("/criar",status_code=status.HTTP_201_CREATED)
def criar_login(dados: CreateLoginRequest, db: Session = Depends(get_db)):

    login = Cria_Login(dados=dados,db=db)

    return {
        "mensagem": "Login cadastrado com sucesso!"
    }
