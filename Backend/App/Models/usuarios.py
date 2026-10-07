# importações
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, func, Integer
from sqlalchemy.orm import Mapped, mapped_column

# Pastas
from App.Data.connection import Base



class usuarios(Base):
    __tablename__ = "usuarios"

    id_user: Mapped[int] = mapped_column(Integer, primary_key = True, autoincrement=True)
    nome_completo: Mapped[str] = mapped_column(String(150), nullable = False)
    nome_guerra: Mapped[str] = mapped_column(String(50), nullable = False)
    posto: Mapped[str] = mapped_column(String(50), nullable = False)
    especialidade: Mapped[str] = mapped_column(String(50), nullable = True)
    unidade: Mapped[str] = mapped_column(String(100), nullable = False)
    cpf: Mapped[str] = mapped_column(String(11), unique = True)
    saram: Mapped[str] = mapped_column(String(10), unique = True)
    tipo_user: Mapped[str] = mapped_column(String(30), nullable = False)
    ativo: Mapped[bool | None] = mapped_column(Boolean, server_default="false")
    creation_dt: Mapped[datetime | None] = mapped_column(DateTime,server_default=func.now())
    update_at: Mapped[datetime | None] = mapped_column(DateTime,nullable=True)