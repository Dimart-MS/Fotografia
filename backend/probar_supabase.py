import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# Cargar las variables desde backend/.env
load_dotenv(Path(__file__).resolve().parent / ".env")

database_url = os.getenv("DATABASE_URL")

if not database_url:
    raise RuntimeError(
        "No se encontro DATABASE_URL en backend/.env"
    )

# Crear conexion con PostgreSQL
engine = create_engine(
    database_url,
    pool_pre_ping=True,
    connect_args={"connect_timeout": 10},
)

try:
    with engine.connect() as conexion:
        # Verificar conexion
        resultado = conexion.execute(
            text("SELECT 1")
        ).scalar_one()

        print("Conexion con Supabase exitosa")
        print(f"Resultado SELECT 1: {resultado}")

        # Consultar las tablas existentes
        tablas = conexion.execute(
            text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """)
        ).scalars().all()

        print(f"\nTotal de tablas encontradas: {len(tablas)}")

        for tabla in tablas:
            print(f" - {tabla}")

finally:
    engine.dispose()
