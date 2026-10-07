# importações
from datetime import datetime
from sqlalchemy import String, DateTime, Integer, numeric
from sqlalchemy.orm import Mapped, mapped_column

# Pastas
from App.Data.connection import Base

class orcamento(Base):
    __tablename__ = "orcamento"

    id: Mapped[int] = mapped_column(Integer, primary_key = True, autoincrement=True)
    nome : Mapped[str] = mapped_column(String(255), nullable = False)
    valor: Mapped[float] = mapped_column(numeric(10, 2), nullable = False)
    data_alteracao: Mapped[datetime | None] = mapped_column(DateTime,nullable=True)