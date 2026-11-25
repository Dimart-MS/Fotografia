"""
Paso 3: Lanzador del backend de pruebas en el puerto 8010.
Configura variables de entorno exclusivas en memoria apuntando a PostgreSQL local (127.0.0.1:55432)
y bloquea cualquier herencia de credenciales de Supabase Storage desde backend/.env.
"""

import os
import socket
import sys
from pathlib import Path

CARPETA = Path(__file__).resolve().parent.parent
BACKEND_DIR = CARPETA.parent
PUERTO_PRUEBAS = 8010


def leer_password_local() -> str:
    """Lee únicamente P3_PASSWORD desde pruebas_p3/.env."""
    ruta_env = CARPETA / ".env"
    if not ruta_env.exists():
        raise RuntimeError("No existe pruebas_p3/.env. Ejecuta primero el paso 1.")

    texto = ruta_env.read_text(encoding="utf-8-sig")
    claves = [
        linea.partition("=")[2].strip()
        for linea in texto.splitlines()
        if linea.startswith("P3_PASSWORD=")
    ]
    if len(claves) != 1 or not claves[0]:
        raise RuntimeError("Falta P3_PASSWORD en pruebas_p3/.env.")
    return claves[0]


def construir_entorno_pruebas() -> dict[str, str]:
    """
    Construye un diccionario de entorno aislado para el subproceso del backend.
    Sobrescribe DATABASE_URL, JWT_SECRET_KEY y SUPABASE_* para que load_dotenv()
    en app/core/config.py no utilice ningún valor real de backend/.env.
    """
    password = leer_password_local()
    db_url = f"postgresql+psycopg://pruebas:{password}@127.0.0.1:55432/fotografia_p3_test"

    return {
        **os.environ,
        "DATABASE_URL": db_url,
        "JWT_SECRET_KEY": "clave_jwt_exclusiva_pruebas_p3_local_2026_segura",
        "SUPABASE_URL": "http://127.0.0.1:9/storage-deshabilitado-en-pruebas-p3",
        "SUPABASE_SERVICE_ROLE_KEY": "clave_storage_ficticia_sin_acceso_remoto_p3",
        "SUPABASE_BUCKET_COMPROBANTES": "bucket-pruebas-local",
        "SUPABASE_BUCKET_FOTOGRAFIAS": "bucket-pruebas-local",
    }


def puerto_ocupado(puerto: int = PUERTO_PRUEBAS) -> bool:
    with socket.socket() as sock:
        sock.settimeout(1.0)
        return sock.connect_ex(("127.0.0.1", puerto)) == 0


def main() -> None:
    if puerto_ocupado(PUERTO_PRUEBAS):
        raise SystemExit(
            f"El puerto {PUERTO_PRUEBAS} ya está en uso. Detén la instancia previa antes de iniciar otra."
        )

    entorno = construir_entorno_pruebas()
    os.environ.update(entorno)
    os.chdir(BACKEND_DIR)
    if str(BACKEND_DIR) not in sys.path:
        sys.path.insert(0, str(BACKEND_DIR))

    import uvicorn

    print(
        f"Iniciando backend de pruebas en http://127.0.0.1:{PUERTO_PRUEBAS} "
        "(Base: 127.0.0.1:55432/fotografia_p3_test)...",
        flush=True,
    )
    uvicorn.run(
        "app.main:app",
        host="127.0.0.1",
        port=PUERTO_PRUEBAS,
        log_level="info",
    )


if __name__ == "__main__":
    main()
