"""Protección de fecha confirmada para MySQL.

Revision ID: d1bb3eaf372d
Revises: 7a614a18793e
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d1bb3eaf372d"
down_revision: Union[str, Sequence[str], None] = "7a614a18793e"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


COLUMN_NAME = "confirmed_event_date"
INDEX_NAME = "uq_confirmed_event_date"


def upgrade() -> None:
    """Agrega la protección únicamente cuando haga falta."""
    connection = op.get_bind()

    if connection.dialect.name != "mysql":
        raise RuntimeError(
            "Esta migración requiere MySQL."
        )

    database_name = connection.exec_driver_sql(
        "SELECT DATABASE()"
    ).scalar()

    if database_name == "fotografia_clientes":
        # Esta migración no modifica las tablas de clientes.
        return

    if database_name != "fotografia_reservas":
        raise RuntimeError(
            f"Base de datos no autorizada: {database_name}"
        )

    inspector = sa.inspect(connection)

    if not inspector.has_table("bookings"):
        raise RuntimeError(
            "No existe la tabla bookings. "
            "Primero debe crearse su estructura."
        )

    columns = {
        column["name"]
        for column in inspector.get_columns("bookings")
    }

    indexes = {
    index["name"]: index
    for index in inspector.get_indexes("bookings")
    }

    has_column = COLUMN_NAME in columns
    has_index = INDEX_NAME in indexes

    if has_column and has_index:
        index = indexes[INDEX_NAME]

        if not index.get("unique"):
            raise RuntimeError(
                "El índice uq_confirmed_event_date existe, "
                "pero no es único."
            )

        if index.get("column_names") != [COLUMN_NAME]:
            raise RuntimeError(
                "El índice uq_confirmed_event_date "
                "no corresponde a la columna esperada."
            )

        column_definition = connection.exec_driver_sql(
            """
            SELECT EXTRA, GENERATION_EXPRESSION
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'bookings'
              AND COLUMN_NAME = 'confirmed_event_date'
            """
        ).mappings().first()

        if not column_definition:
            raise RuntimeError(
                "No se encontró la definición de confirmed_event_date."
            )

        extra = (column_definition["EXTRA"] or "").upper()
        expression = (
            column_definition["GENERATION_EXPRESSION"] or ""
        ).lower()

        if (
            "STORED GENERATED" not in extra
            or "status" not in expression
            or "event_date" not in expression
            or "confirmada" not in expression
        ):
            raise RuntimeError(
                "La columna confirmed_event_date "
                "no tiene la definición calculada esperada."
            )

        print(
            "La protección de fechas ya existe "
            "y su estructura básica es correcta."
        )
        return

    if has_column != has_index:
        raise RuntimeError(
            "La estructura de bookings está incompleta: "
            "existe solamente la columna o el índice. "
            "Se requiere revisión manual."
        )

    duplicates = connection.exec_driver_sql(
        """
        SELECT event_date, COUNT(*) AS total
        FROM bookings
        WHERE status = 'Confirmada'
        GROUP BY event_date
        HAVING COUNT(*) > 1
        LIMIT 1
        """
    ).first()

    if duplicates:
        raise RuntimeError(
            "Existen reservas confirmadas duplicadas "
            f"para la fecha {duplicates[0]}. "
            "No se aplicará la migración."
        )

    op.execute(
        sa.text(
            """
            ALTER TABLE bookings
            ADD COLUMN confirmed_event_date DATE
            GENERATED ALWAYS AS (
                CASE
                    WHEN status = 'Confirmada'
                    THEN event_date
                    ELSE NULL
                END
            ) STORED,
            ADD UNIQUE INDEX uq_confirmed_event_date (
                confirmed_event_date
            )
            """
        )
    )


def downgrade() -> None:
    """No eliminar automáticamente restricciones ni columnas."""
    raise RuntimeError(
        "La reversión de esta migración requiere "
        "un procedimiento manual autorizado."
    )
