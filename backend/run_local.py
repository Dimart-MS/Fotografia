"""
Script de arranque local del backend Luz & Memoria.
Conecta con MySQL, crea las bases de datos si no existen,
ejecuta las migraciones de Alembic e inicia los servicios
de clientes y reservaciones.
"""
import os
import secrets
import socket
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LARAGON_MYSQLD = Path(
    r"C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqld.exe"
)

if (ROOT / ".deps").exists():
    sys.path.insert(0, str(ROOT / ".deps"))
    os.environ["PYTHONPATH"] = (
        str(ROOT / ".deps") + os.pathsep + str(ROOT)
    )


def is_port_open(port: int) -> bool:
    with socket.socket() as sock:
        sock.settimeout(1.0)
        return sock.connect_ex(("127.0.0.1", port)) == 0


def ensure_laragon_mysql_running() -> None:
    """
    Comprueba que MySQL esté disponible.

    Si no está iniciado y existe una instalación compatible
    de Laragon, intenta iniciarla.
    """
    mysql_port = int(os.getenv("MYSQL_PORT", "3306"))

    if is_port_open(mysql_port):
        return

    if mysql_port != 3306:
        raise SystemExit(
            "MySQL no está disponible. Inicia MySQL en el "
            "puerto configurado mediante MYSQL_PORT."
        )

    if not LARAGON_MYSQLD.exists():
        raise RuntimeError(
            "MySQL no está disponible en 127.0.0.1:3306. "
            "Inicia tu servidor MySQL y vuelve a ejecutar "
            "python run_local.py."
        )

    print(
        "Iniciando MySQL de Laragon en 127.0.0.1:3306...",
        flush=True,
    )

    subprocess.Popen(
        [str(LARAGON_MYSQLD)],
        cwd=str(LARAGON_MYSQLD.parent),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=getattr(
            subprocess, "CREATE_NO_WINDOW", 0
        ),
    )

    for _ in range(25):
        if is_port_open(mysql_port):
            break
        time.sleep(0.5)
    else:
        raise RuntimeError(
            "No se pudo iniciar MySQL en el puerto 3306."
        )


def initialize_mysql_databases() -> tuple[str, str]:
    """
    Crea las bases de datos de clientes y reservaciones
    si no existen y ejecuta sus migraciones de Alembic.

    No elimina registros ni inserta datos de ejemplo.
    """
    import pymysql

    from sqlalchemy import URL
    from alembic import command
    from alembic.config import Config

    user = os.getenv("MYSQL_USER", "root")
    password = os.getenv("MYSQL_PASSWORD", "")

    def connect(username: str, secret: str):
        return pymysql.connect(
            host="127.0.0.1",
            port=int(os.getenv("MYSQL_PORT", "3306")),
            user=username,
            password=secret,
        )

    try:
        conn = connect(user, password)

    except pymysql.err.OperationalError as exc:
        if exc.args[0] != 1045 or not sys.stdin.isatty():
            raise

        from getpass import getpass

        print(
            "MySQL solicita los datos de acceso "
            "de esta computadora."
        )

        user = (
            input(
                f"Usuario de MySQL "
                f"(Enter para usar {user}): "
            ).strip()
            or user
        )

        password = getpass("Contraseña de MySQL: ")
        conn = connect(user, password)

    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "CREATE DATABASE IF NOT EXISTS "
                "fotografia_clientes "
                "CHARACTER SET utf8mb4 "
                "COLLATE utf8mb4_unicode_ci;"
            )

            cursor.execute(
                "CREATE DATABASE IF NOT EXISTS "
                "fotografia_reservas "
                "CHARACTER SET utf8mb4 "
                "COLLATE utf8mb4_unicode_ci;"
            )

        conn.commit()

    finally:
        conn.close()

    def database_url(name: str) -> str:
        return URL.create(
            "mysql+pymysql",
            username=user,
            password=password,
            host="127.0.0.1",
            port=int(os.getenv("MYSQL_PORT", "3306")),
            database=name,
        ).render_as_string(hide_password=False)

    clients_url = database_url("fotografia_clientes")
    bookings_url = database_url("fotografia_reservas")

    # Actualizar las bases de datos mediante Alembic.
    def ejecutar_migraciones(modulo: str, url: str) -> None:
        configuracion = Config(str(ROOT / "alembic.ini"))

        configuracion.attributes["database"] = modulo
        configuracion.attributes["database_url"] = url

        print(
            f"Verificando migraciones de {modulo}...",
            flush=True,
        )

        command.upgrade(configuracion, "head")

    ejecutar_migraciones("clientes", clients_url)
    ejecutar_migraciones("reservas", bookings_url)

    return clients_url, bookings_url


def main() -> None:
    os.chdir(ROOT)

    for port in (8011, 8012):
        if is_port_open(port):
            raise SystemExit(
                f"Puerto {port} ocupado. "
                "Detén primero la instancia anterior "
                "(Ctrl+C)."
            )

    ensure_laragon_mysql_running()

    clients_url, bookings_url = initialize_mysql_databases()

    api_key = (
        os.environ.get("FOTO_API_KEY")
        or secrets.token_urlsafe(24)
    )

    env = {
        **os.environ,
        "FOTO_API_KEY": api_key,
        "CLIENTS_DATABASE_URL": clients_url,
        "BOOKINGS_DATABASE_URL": bookings_url,
        "CLIENTS_URL": "http://127.0.0.1:8011",
    }

    print(
        "\n========================================================",
        flush=True,
    )
    print(
        "  BACKEND ACTIVO - Luz & Memoria (MySQL)",
        flush=True,
    )
    print(
        "  Base Clientes: fotografia_clientes",
        flush=True,
    )
    print(
        "  Base Reservas: fotografia_reservas",
        flush=True,
    )
    print(
        "  API Clientes:  http://127.0.0.1:8011/docs",
        flush=True,
    )
    print(
        "  API Reservas:  http://127.0.0.1:8012/docs",
        flush=True,
    )
    print(
        f"  Clave:         {api_key}",
        flush=True,
    )
    print(
        "========================================================\n",
        flush=True,
    )

    processes: list[subprocess.Popen] = []

    try:
        for module_name, port in [
            ("clients", 8011),
            ("bookings", 8012),
        ]:
            cmd = [
                sys.executable,
                "-m",
                "uvicorn",
                f"app.{module_name}:create_app",
                "--factory",
                "--host",
                "127.0.0.1",
                "--port",
                str(port),
            ]

            processes.append(
                subprocess.Popen(
                    cmd,
                    env=env,
                    cwd=ROOT,
                )
            )

        while all(
            proc.poll() is None
            for proc in processes
        ):
            time.sleep(1)

        raise RuntimeError(
            "Un servicio del backend se detuvo."
        )

    except KeyboardInterrupt:
        print("Deteniendo backend...")

    finally:
        for process in processes:
            if process.poll() is None:
                process.terminate()

                try:
                    process.wait(timeout=5)

                except subprocess.TimeoutExpired:
                    process.kill()


if __name__ == "__main__":
    main()
