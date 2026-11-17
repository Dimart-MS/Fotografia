"""
Configuración de Alembic para Luz & Memoria.

Cada base de datos utiliza su propio historial de migraciones.
Las conexiones se proporcionan desde Python, sin guardar credenciales
en alembic.ini.
"""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import MetaData, create_engine, pool
from sqlalchemy.engine import make_url

from app.domain.models import build_bookings_table, build_clients_table


config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)


DATABASES = {
    "clientes": {
        "schema": "fotografia_clientes",
        "version_table": "alembic_version_clientes",
    },
    "reservas": {
        "schema": "fotografia_reservas",
        "version_table": "alembic_version_reservas",
    },
}


def get_database_name():
    """Obtiene la base seleccionada desde la configuración de Alembic."""
    name = config.attributes.get("database")

    if name not in DATABASES:
        raise RuntimeError(
            "Debes seleccionar una base de datos válida: "
            "'clientes' o 'reservas'."
        )

    return name


def get_target_metadata(name):
    """Construye los modelos correspondientes a cada base de datos."""
    metadata = MetaData()

    if name == "clientes":
        build_clients_table(metadata)
    else:
        build_bookings_table(metadata, "mysql")

    return metadata


def run_migrations_online():
    """Ejecuta migraciones únicamente sobre bases de prueba autorizadas."""
    name = get_database_name()
    url = config.attributes.get("database_url")

    if not url:
        raise RuntimeError(
            "No se proporcionó la conexión de base de datos."
        )

    # Verificar que la conexión corresponde a la base autorizada.
    database_name = make_url(url).database

    if database_name not in {
        "fotografia_clientes",
        "fotografia_reservas",
    }:
        raise RuntimeError(
            f"Base de datos no autorizada para migraciones: {database_name}"
        )

    database_name = make_url(url).database

    allowed_databases = {
        "clientes": {"fotografia_clientes"},
        "reservas": {"fotografia_reservas"},
    }

    if database_name not in allowed_databases[name]:
        raise RuntimeError(
            f"Conexión rechazada. La base '{database_name}' "
            f"no está autorizada para migraciones de '{name}'."
        )

    engine = create_engine(
        url,
        poolclass=pool.NullPool,
        pool_pre_ping=True,
    )

    try:
        with engine.connect() as connection:
            # Comprobar también la base realmente seleccionada por MySQL.
            actual_database = connection.exec_driver_sql(
                "SELECT DATABASE()"
            ).scalar()

            if actual_database != database_name:
                raise RuntimeError(
                    "La base de datos conectada no coincide "
                    "con la base autorizada."
                )
            connection.rollback()
            context.configure(
                connection=connection,
                target_metadata=get_target_metadata(name),
                version_table=DATABASES[name]["version_table"],
                compare_type=True,
            )

            with context.begin_transaction():
                context.run_migrations()
    finally:
        engine.dispose()


def run_migrations_offline():
    """Deshabilita migraciones sin conexión."""
    raise RuntimeError(
        "Las migraciones de Luz & Memoria requieren una conexión activa."
    )


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
