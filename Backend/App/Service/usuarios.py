from fastapi import HTTPException, status

from sqlalchemy import select, or_
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from App.Models.usuarios import usuarios
from App.Schemas.usuarios import CreateUsuarioRequest


def cadastrar_usuario(dados: CreateUsuarioRequest, db: Session):

    # Verifica se CPF ou SARAM já estão cadastrados
    usuario_existente = db.scalar(select(usuarios).where(or_(usuarios.cpf == dados.cpf, usuarios.saram == dados.saram)))

    if usuario_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="CPF ou SARAM já cadastrado"
        )

    # Cria o objeto do usuário
    novo_usuario = usuarios(**dados.model_dump())

    # Salva no banco de dados
    try:
        db.add(novo_usuario)
        db.commit()
        db.refresh(novo_usuario)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="CPF ou SARAM já cadastrado"
        )

    return novo_usuario