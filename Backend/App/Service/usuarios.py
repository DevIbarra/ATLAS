from fastapi import HTTPException, status

from sqlalchemy import select, or_
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from App.Models.usuarios import usuarios
from App.Schemas.usuarios import CreateUsuarioRequest, UpdateUsuarioRequest


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


def atualizar_usuario(id_usuario: int, dados: UpdateUsuarioRequest, db: Session):
    usuario_db = db.get(usuarios, id_usuario)

    if not usuario_db:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado",
        )

    dados_atualizados = dados.model_dump(exclude_unset=True)
    cpf = dados_atualizados.get("cpf")
    saram = dados_atualizados.get("saram")

    if cpf or saram:
        filtros = []
        if cpf:
            filtros.append(usuarios.cpf == cpf)
        if saram:
            filtros.append(usuarios.saram == saram)

        duplicado = db.scalar(
            select(usuarios).where(
                usuarios.id_user != id_usuario,
                or_(*filtros),
            )
        )

        if duplicado:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="CPF ou SARAM já cadastrado",
            )

    for campo, valor in dados_atualizados.items():
        setattr(usuario_db, campo, valor)

    try:
        db.commit()
        db.refresh(usuario_db)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="CPF ou SARAM já cadastrado",
        )

    return usuario_db
