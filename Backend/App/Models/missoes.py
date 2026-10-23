from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Integer, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from App.Data.connection import Base


class Missao(Base):
    __tablename__ = "missoes"

    id_missao: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    numero_ordem_servico: Mapped[str] = mapped_column(String(80), nullable=False)
    finalidade: Mapped[str] = mapped_column(Text, nullable=False)
    situacao: Mapped[str] = mapped_column(String(20), nullable=False, default="normal", server_default="normal")
    diarias: Mapped[str | None] = mapped_column(String(30), nullable=True)
    militar_civil: Mapped[str | None] = mapped_column(String(50), nullable=True)
    numero_pcdp: Mapped[str | None] = mapped_column(String(80), nullable=True)
    atenas_tarjada: Mapped[str | None] = mapped_column(String(10), nullable=True)
    valor: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    siloms: Mapped[str | None] = mapped_column(String(100), nullable=True)
    zimbra: Mapped[str | None] = mapped_column(String(100), nullable=True)
    facdp: Mapped[str | None] = mapped_column(String(100), nullable=True)
    oficio_sigadaer: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ob: Mapped[str | None] = mapped_column(String(80), nullable=True)
    data_ob: Mapped[date | None] = mapped_column(Date, nullable=True)
    numero_adt_bol_publicacao: Mapped[str | None] = mapped_column(String(100), nullable=True)
    matricula: Mapped[str | None] = mapped_column(String(80), nullable=True)
    data_missao: Mapped[date] = mapped_column(Date, nullable=False)
    criado_em: Mapped[datetime | None] = mapped_column(DateTime, server_default=func.now())
    atualizado_em: Mapped[datetime | None] = mapped_column(DateTime, onupdate=func.now())
