"""Protecciones para las conexiones utilizadas por pruebas automatizadas."""
from sqlalchemy.engine import make_url

def validate_test_database_url(url: str) -> None:
    """Rechaza conexiones que no correspondan a bases de prueba autorizadas."""
    parsed = make_url(url)
    dialect = parsed.get_backend_name()

    if dialect == "sqlite":
        return

    if dialect not in {"mysql", "postgresql"}:
        raise ValueError(
            f"Motor de base de datos no autorizado para pruebas: {dialect}"
        )

    database_name = parsed.database or ""

    if not database_name.endswith("_test"):
        raise ValueError(
            "Conexión rechazada: las bases externas utilizadas por Pytest "
            "deben terminar en '_test'."
        )
