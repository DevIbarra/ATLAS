from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from App.Core.missoes import MISSION_SITUATION_VALUES
from App.Models.missoes import Missao


def ensure_users_schema(engine: Engine):
    with engine.begin() as connection:
        inspector = inspect(connection)
        if not inspector.has_table("usuarios"):
            return
        columns = {column["name"]: column for column in inspector.get_columns("usuarios")}
        if "diarias_possuidas" not in columns:
            if_not_exists = "IF NOT EXISTS " if connection.dialect.name == "postgresql" else ""
            connection.execute(text(
                f"ALTER TABLE usuarios ADD COLUMN {if_not_exists}"
                "diarias_possuidas INTEGER NOT NULL DEFAULT 0"
            ))
        elif columns["diarias_possuidas"]["nullable"] and connection.dialect.name == "postgresql":
            connection.execute(text("UPDATE usuarios SET diarias_possuidas = 0 WHERE diarias_possuidas IS NULL"))
            connection.execute(text("ALTER TABLE usuarios ALTER COLUMN diarias_possuidas SET NOT NULL"))


def ensure_missions_schema(engine: Engine):
    with engine.begin() as connection:
        Missao.__table__.create(bind=connection, checkfirst=True)
        columns = {column["name"] for column in inspect(connection).get_columns("missoes")}
        if "situacao" not in columns:
            if_not_exists = "IF NOT EXISTS " if connection.dialect.name == "postgresql" else ""
            connection.execute(text(
                f"ALTER TABLE missoes ADD COLUMN {if_not_exists}"
                "situacao VARCHAR(20) NOT NULL DEFAULT 'normal'"
            ))

        for situation, defaults in MISSION_SITUATION_VALUES.items():
            cleared_values = {field: value for field, value in defaults.items() if field in columns}
            if not cleared_values:
                continue
            assignments = ", ".join(f"{field} = :{field}" for field in cleared_values)
            conditions = " OR ".join(
                f"{field} IS NOT NULL" if value is None else f"({field} IS NULL OR {field} <> :{field})"
                for field, value in cleared_values.items()
            )
            connection.execute(text(
                f"UPDATE missoes SET {assignments} "
                f"WHERE situacao = :situacao AND ({conditions})"
            ), {**cleared_values, "situacao": situation})
