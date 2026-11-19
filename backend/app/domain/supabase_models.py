"""
Modelos de tablas existentes en Supabase PostgreSQL.

Utiliza reflexion de SQLAlchemy para cargar la estructura
real de las 22 tablas sin modificarlas.
"""

from sqlalchemy import MetaData, Table

from app.infrastructure.database import supabase_database


TABLAS_SUPABASE = (
    "auditoria",
    "bloqueos_agenda",
    "clientes",
    "comprobantes_pago",
    "configuracion_negocio",
    "detalle_ventas",
    "dispositivos_usuario",
    "entregas",
    "fotografias",
    "galerias",
    "historial_entregas",
    "historial_reservaciones",
    "historial_validaciones_pago",
    "notificaciones",
    "pagos",
    "paquete_servicios",
    "paquetes",
    "reservaciones",
    "servicios",
    "usuarios",
    "ventas",
    "videos",
)


def cargar_modelos_supabase(engine=None):
    """
    Obtiene las definiciones reales de las tablas.

    Si se proporciona un motor, utiliza esa conexión.
    Si no se proporciona, utiliza Supabase principal.

    No crea, modifica ni elimina tablas de PostgreSQL.
    """
    motor_propio = engine is None

    if motor_propio:
        engine = supabase_database()

    metadata = MetaData()

    try:
        metadata.reflect(
            bind=engine,
            schema="public",
            only=list(TABLAS_SUPABASE),
        )

        tablas = {
            nombre: Table(
                nombre,
                metadata,
                schema="public",
            )
            for nombre in TABLAS_SUPABASE
        }

        return metadata, tablas

    finally:
        if motor_propio:
            engine.dispose()
