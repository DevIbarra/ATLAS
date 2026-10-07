from sqlalchemy import select
from sqlalchemy.orm import Session

from fastapi import HTTPException, status
from pwdlib import PasswordHash


from App.Models.usuarios import usuarios
from App.Models.login import Login
from App.Schemas.login import LoginRequest, CreateLoginRequest
from App.Core.security import gerar_hash


password_hash = PasswordHash.recommended()


def autenticar_usuario(dados: LoginRequest,db: Session):

    login = db.scalar(select(Login).where(Login.gmail == dados.gmail))

    if not login:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos"
        )

    if not password_hash.verify(
        dados.senha,
        login.senha_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-mail ou senha incorretos"
        )
    
    return login


def Cria_Login(dados: CreateLoginRequest, db: Session):

    id_user_db = db.scalar(select(usuarios.id_user).where(usuarios.nome_guerra == dados.nome_guerra))

    if not id_user_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="id_user não encontrado | inexistente"
        )

    senha_hash = gerar_hash(dados.senha)

    novo_login = Login(id_user=id_user_db, gmail=dados.gmail,senha_hash=senha_hash)

    db.add(novo_login)
    db.commit()
    db.refresh(novo_login)

    return novo_login

    
