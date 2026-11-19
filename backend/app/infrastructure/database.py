
"""
Configuración de motores de base de datos SQLAlchemy.
Compatible con SQLite, MySQL y PostgreSQL (Supabase).
"""

from sqlalchemy import Engine, create_engine, text


def database(url: str) -> Engine:
    """
    Crea un motor SQLAlchemy utilizando la URL indicada.
    """
    if not url:
        raise ValueError(
            "No se proporcionó una URL de conexión a la base de datos."
        )

    connect_args = (
        {"check_same_thread": False}
        if url.startswith("sqlite")
        else {}
    )

    return create_engine(
        url,
        connect_args=connect_args,
        pool_pre_ping=True,
    )


def supabase_database() -> Engine:
    """
    Crea el motor de conexión a Supabase PostgreSQL.
    """
    from app.core.config import settings

    if not settings.DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL no está configurada en backend/.env"
        )

    return database(settings.DATABASE_URL)


def check_database_health(engine: Engine) -> bool:
    """
    Comprueba que la base de datos responde correctamente.
    """
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))

    return True
