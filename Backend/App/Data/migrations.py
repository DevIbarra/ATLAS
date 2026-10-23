from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine

from App.Core.missoes import MISSION_SITUATION_VALUES
from App.Models.missoes import Missao


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
