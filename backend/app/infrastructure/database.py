"""
Configuración de motores de base de datos SQLAlchemy.
Basado en la capa de infraestructura de MicroserviciosSitic (app/infrastructure/database.py).
"""
from sqlalchemy import Engine, create_engine, text


def database(url: str) -> Engine:
    """
    Crea y configura el motor SQLAlchemy para SQLite (local/pruebas) o PostgreSQL (Docker).
    """
    connect_args = {"check_same_thread": False} if url.startswith("sqlite") else {}
    return create_engine(
        url,
        connect_args=connect_args,
        pool_pre_ping=True,
    )


def check_database_health(engine: Engine) -> bool:
    """Ejecuta una consulta ligera para verificar la conectividad de la base de datos."""
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return True
