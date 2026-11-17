"""Estructura inicial de clientes y reservas.

Revision ID: 7a614a18793e
Revises:
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

from app.domain.models import build_bookings_table, build_clients_table


revision: str = "7a614a18793e"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Crea la tabla inicial correspondiente si no existe."""
    connection = op.get_bind()

    if connection.dialect.name != "mysql":
        raise RuntimeError("Esta migración inicial requiere MySQL.")

    database_name = connection.exec_driver_sql(
        "SELECT DATABASE()"
    ).scalar()

    allowed_databases = {
        "fotografia_clientes",
        "fotografia_reservas",
    }

    if database_name not in allowed_databases:
        raise RuntimeError(
            f"Base de datos no autorizada: {database_name}"
        )

    inspector = sa.inspect(connection)
    metadata = sa.MetaData()

    if database_name == "fotografia_clientes":
        table_name = "clients"
        build_clients_table(metadata)
    else:
        table_name = "bookings"
        build_bookings_table(metadata, "mysql")

    if inspector.has_table(table_name):
        print(
            f"La tabla {table_name} ya existe. "
            "No se modificará su estructura."
        )
        return

    metadata.create_all(connection, checkfirst=True)

    print(f"Tabla inicial {table_name} creada correctamente.")


def downgrade() -> None:
    """Impide eliminar tablas automáticamente."""
    raise RuntimeError(
        "La eliminación de tablas requiere autorización manual."
    )
