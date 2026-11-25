"""Conexion exclusiva al PostgreSQL de Docker (127.0.0.1:55432); nunca lee backend/.env."""

from pathlib import Path
import secrets
import subprocess
import psycopg


CARPETA_SOPORTE = Path(__file__).resolve().parent
CARPETA = CARPETA_SOPORTE.parent


def _asegurar_env_local() -> str:
    """Obtiene P3_PASSWORD de pruebas_p3/.env o lo genera automáticamente en una instalación nueva."""
    ruta_env = CARPETA / ".env"
    if not ruta_env.exists():
        ruta_env.write_text(f"P3_PASSWORD={secrets.token_urlsafe(18)}\n", encoding="utf-8")

    configuracion = ruta_env.read_text(encoding="utf-8-sig")
    claves = [
        linea.partition("=")[2].strip()
        for linea in configuracion.splitlines()
        if linea.startswith("P3_PASSWORD=")
    ]
    if len(claves) != 1 or not claves[0]:
        raise ValueError("Falta P3_PASSWORD en pruebas_p3/.env.")
    return claves[0]


def conectar():
    clave = _asegurar_env_local()
    parametros = dict(
        host="127.0.0.1",
        port=55432,
        dbname="fotografia_p3_test",
        user="pruebas",
        password=clave,
        connect_timeout=5,
        options="-c statement_timeout=30000 -c lock_timeout=5000",
        application_name="fotografia_p3_estructura",
    )

    try:
        conexion = psycopg.connect(**parametros)
    except psycopg.OperationalError:
        # En un equipo nuevo, levanta automáticamente el contenedor PostgreSQL 17 y espera a que esté saludable
        subprocess.run(
            [
                "docker",
                "compose",
                "--env-file",
                str(CARPETA / ".env"),
                "-f",
                str(CARPETA / "compose.yaml"),
                "up",
                "-d",
                "--wait",
            ],
            check=True,
        )
        conexion = psycopg.connect(**parametros)

    base, usuario = conexion.execute("SELECT current_database(), current_user").fetchone()
    if (base, usuario) != ("fotografia_p3_test", "pruebas"):
        conexion.close()
        raise ValueError("Destino inesperado. Operacion cancelada.")

    # Si es la primera vez en este equipo (0 tablas), importa automáticamente las 23 tablas en UTF-8
    total_tablas = conexion.execute(
        "SELECT count(*) FROM pg_tables WHERE schemaname = 'public'"
    ).fetchone()[0]
    if total_tablas == 0:
        sql = (CARPETA_SOPORTE / "esquema_pruebas.sql").read_text(encoding="utf-8")
        conexion.execute(sql)
        conexion.commit()

    return conexion
