# importações
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

# Pastas
from App.Data.connection import Base

class Login(Base):
    __tablename__ = "login"

    id_user: Mapped[int] = mapped_column(ForeignKey("usuarios.id_user"), primary_key=True)
    gmail: Mapped[str] = mapped_column(String(150), nullable = False)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable = False)
    logado: Mapped[bool | None] = mapped_column(Boolean, server_default="false")
    last_login: Mapped[datetime | None] = mapped_column(DateTime, nullable = True)