"""Conexion exclusiva al PostgreSQL de Docker; nunca lee backend/.env."""

from pathlib import Path
import psycopg


CARPETA = Path(__file__).resolve().parent.parent


def conectar():
    # El destino es fijo: no aceptamos una URL remota ni variables del equipo.
    configuracion = (CARPETA / ".env").read_text(encoding="utf-8-sig")
    claves = [linea.partition("=")[2].strip() for linea in configuracion.splitlines()
              if linea.startswith("P3_PASSWORD=")]
    if len(claves) != 1 or not claves[0]:
        raise ValueError("Falta P3_PASSWORD en pruebas_p3/.env. No se conectara a otra base.")

    conexion = psycopg.connect(
        host="127.0.0.1", port=55432, dbname="fotografia_p3_test",
        user="pruebas", password=claves[0], connect_timeout=5,
        options="-c statement_timeout=30000 -c lock_timeout=5000",
        application_name="fotografia_p3_estructura",
    )
    base, usuario = conexion.execute("SELECT current_database(), current_user").fetchone()
    if (base, usuario) != ("fotografia_p3_test", "pruebas"):
        conexion.close()
        raise ValueError("Destino inesperado. Operacion cancelada.")
    return conexion
