"""
Configuración central y utilidades transversales del backend.
Basado en la estructura modular de MicroserviciosSitic (app/core/config.py).
"""
import os
import secrets
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo
from dotenv import load_dotenv

from fastapi import Header, HTTPException

# Cargar las variables desde backend/.env
ENV_PATH = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(dotenv_path=ENV_PATH)

class Settings:
    """Parámetros de configuración del sistema de gestión para estudio fotográfico."""

    PROJECT_NAME: str = "Luz & Memoria - Sistema Integral de Gestión para Fotografía"
    VERSION: str = "1.0.0"
    TIMEZONE: str = "America/Mexico_City"
        # Base de datos unificada PostgreSQL - Supabase
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "")

    # Configuracion de Supabase Storage
    SUPABASE_URL: str = os.environ.get("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.environ.get(
        "SUPABASE_SERVICE_ROLE_KEY", ""
    )
    SUPABASE_BUCKET_COMPROBANTES: str = os.environ.get(
        "SUPABASE_BUCKET_COMPROBANTES", "comprobantes-pago"
    )
    SUPABASE_BUCKET_FOTOGRAFIAS: str = os.environ.get(
        "SUPABASE_BUCKET_FOTOGRAFIAS", "fotografias-eventos"
    )

    # Autenticacion
    JWT_SECRET_KEY: str = os.environ.get("JWT_SECRET_KEY", "")

    CLIENTS_DATABASE_URL: str = os.environ.get(
        "CLIENTS_DATABASE_URL",
        "mysql+pymysql://root@127.0.0.1:3306/fotografia_clientes",
    )
    BOOKINGS_DATABASE_URL: str = os.environ.get(
        "BOOKINGS_DATABASE_URL",
        "mysql+pymysql://root@127.0.0.1:3306/fotografia_reservas",
    )
    CLIENTS_SERVICE_URL: str = os.environ.get(
        "CLIENTS_URL",
        "http://127.0.0.1:8011",
    )
    FOTO_API_KEY: str = os.environ.get("FOTO_API_KEY", "")


settings = Settings()


def today() -> date:
    """Devuelve la fecha local actual en la zona horaria del estudio (America/Mexico_City)."""
    return datetime.now(ZoneInfo(settings.TIMEZONE)).date()


def auth_dependency(api_key: str | None = None):
    """
    Crea una dependencia FastAPI que valida el encabezado Authorization: Bearer <clave>.
    Garantiza que la clave configurada tenga al menos 16 caracteres.
    """
    expected_key = api_key or os.environ.get("FOTO_API_KEY")
    if not expected_key or len(expected_key) < 16:
        raise RuntimeError("FOTO_API_KEY debe tener al menos 16 caracteres")

    def authorize(authorization: str = Header(default="")) -> None:
        expected_header = f"Bearer {expected_key}"
        if not secrets.compare_digest(authorization, expected_header):
            raise HTTPException(
                status_code=401,
                detail="Clave de acceso incorrecta",
                headers={"WWW-Authenticate": "Bearer"},
            )

    return authorize
