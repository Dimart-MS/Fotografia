"""
Paso 3: Lanzador del backend de pruebas en el puerto 8010.
Configura variables de entorno exclusivas en memoria apuntando a PostgreSQL local (127.0.0.1:55432)
y bloquea cualquier herencia de credenciales de Supabase Storage desde backend/.env.
"""

import os
import socket
import sys
from pathlib import Path

CARPETA_SOPORTE = Path(__file__).resolve().parent
CARPETA = CARPETA_SOPORTE.parent
BACKEND_DIR = CARPETA.parent
if str(CARPETA_SOPORTE) not in sys.path:
    sys.path.insert(0, str(CARPETA_SOPORTE))
PUERTO_PRUEBAS = 8010


from conexion_local import _asegurar_env_local


def leer_password_local() -> str:
    """Lee o inicializa P3_PASSWORD desde pruebas_p3/.env."""
    return _asegurar_env_local()


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
