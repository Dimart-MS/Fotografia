"""Agregar tabla de usuarios y roles.

Revision ID: e3a7c92f104b
Revises: d1bb3eaf372d
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e3a7c92f104b"
down_revision: Union[str, Sequence[str], None] = "d1bb3eaf372d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    connection = op.get_bind()

    if connection.dialect.name != "mysql":
        raise RuntimeError("Esta migración requiere MySQL.")

    database_name = connection.exec_driver_sql(
        "SELECT DATABASE()"
    ).scalar()

    # Los usuarios pertenecen a la base de clientes.
    if database_name == "fotografia_reservas":
        return

    if database_name != "fotografia_clientes":
        raise RuntimeError(
            f"Base de datos no autorizada: {database_name}"
        )

    inspector = sa.inspect(connection)

    if inspector.has_table("users"):
        raise RuntimeError(
            "La tabla users ya existe. "
            "Revisa su estructura antes de aplicar la migración."
        )

    op.create_table(
        "users",
        sa.Column(
            "id",
            sa.Integer(),
            primary_key=True,
            autoincrement=True,
        ),
        sa.Column(
            "client_id",
            sa.Integer(),
            nullable=True,
        ),
        sa.Column(
            "email",
            sa.String(160),
            nullable=False,
        ),
        sa.Column(
            "password_hash",
            sa.String(255),
            nullable=False,
        ),
        sa.Column(
            "role",
            sa.String(20),
            nullable=False,
            server_default="Cliente",
        ),
        sa.Column(
            "is_active",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
        sa.UniqueConstraint(
            "email",
            name="uq_users_email",
        ),
        sa.ForeignKeyConstraint(
            ["client_id"],
            ["clients.id"],
            name="fk_users_client_id",
            ondelete="RESTRICT",
        ),
    )

    print("Tabla users creada correctamente.")


def downgrade() -> None:
    raise RuntimeError(
        "No se eliminará automáticamente la tabla users "
        "para proteger los datos de las cuentas."
    )
