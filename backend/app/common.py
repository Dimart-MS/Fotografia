"""
Infraestructura compartida re-exportada desde las capas core e infrastructure.
Mantiene compatibilidad con los scripts y pruebas del proyecto.
"""
from app.core.config import auth_dependency, today
from app.infrastructure.database import database

__all__ = ["today", "database", "auth_dependency"]
