"""
Script de arranque local del Backend conectado a MySQL de Laragon (127.0.0.1:3306).
Crea automáticamente las bases `fotografia_clientes` y `fotografia_reservas` en Laragon
y carga los registros iniciales si están vacías.
"""
import os
import secrets
import socket
import subprocess
import sys
import time
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent
LARAGON_MYSQLD = Path(r"C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysqld.exe")

if (ROOT / ".deps").exists():
    sys.path.insert(0, str(ROOT / ".deps"))
    os.environ["PYTHONPATH"] = str(ROOT / ".deps") + os.pathsep + str(ROOT)


def is_port_open(port: int) -> bool:
    with socket.socket() as sock:
        sock.settimeout(1.0)
        return sock.connect_ex(("127.0.0.1", port)) == 0


def ensure_laragon_mysql_running() -> None:
    """Inicia MySQL de Laragon si aún no está corriendo en el puerto 3306."""
    if is_port_open(int(os.getenv("MYSQL_PORT", "3306"))):
        return

    if os.getenv("MYSQL_PORT", "3306") != "3306":
        raise SystemExit("Inicia MySQL en el puerto configurado mediante MYSQL_PORT.")
    if not LARAGON_MYSQLD.exists():
        raise RuntimeError(
            "No se encontró MySQL en C:\\laragon. Abre Laragon y dale en 'Iniciar todo'."
        )

    print("Iniciando MySQL de Laragon en 127.0.0.1:3306...", flush=True)
    subprocess.Popen(
        [str(LARAGON_MYSQLD)],
        cwd=str(LARAGON_MYSQLD.parent),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    )
    for _ in range(25):
        if is_port_open(int(os.getenv("MYSQL_PORT", "3306"))):
            break
        time.sleep(0.5)
    else:
        raise RuntimeError("No se pudo iniciar MySQL de Laragon en el puerto 3306.")


def initialize_mysql_databases() -> tuple[str, str]:
    """
    Crea las bases de datos `fotografia_clientes` y `fotografia_reservas` en MySQL de Laragon,
    crea sus tablas y carga datos de ejemplo si están vacías.
    """
    import pymysql
    from sqlalchemy import MetaData, func, insert, select

    from app.domain.models import build_bookings_table, build_clients_table
    from app.infrastructure.database import database

    from sqlalchemy import URL
    user = os.getenv("MYSQL_USER", "root")
    password = os.getenv("MYSQL_PASSWORD", "")
    def connect(username: str, secret: str):
        return pymysql.connect(host="127.0.0.1", port=int(os.getenv("MYSQL_PORT", "3306")),
                               user=username, password=secret)

    try:
        conn = connect(user, password)
    except pymysql.err.OperationalError as exc:
        if exc.args[0] != 1045 or not sys.stdin.isatty():
            raise
        from getpass import getpass
        print("MySQL solicita los datos de acceso de esta computadora.")
        user = input(f"Usuario de MySQL (Enter para usar {user}): ").strip() or user
        password = getpass("Contraseña de MySQL: ")
        conn = connect(user, password)
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "CREATE DATABASE IF NOT EXISTS fotografia_clientes "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
            )
            cursor.execute(
                "CREATE DATABASE IF NOT EXISTS fotografia_reservas "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
            )
        conn.commit()
    finally:
        conn.close()

    def database_url(name: str) -> str:
        return URL.create("mysql+pymysql", username=user, password=password,
                          host="127.0.0.1", port=int(os.getenv("MYSQL_PORT", "3306")), database=name).render_as_string(hide_password=False)

    clients_url = database_url("fotografia_clientes")
    bookings_url = database_url("fotografia_reservas")

    c_engine = database(clients_url)
    b_engine = database(bookings_url)

    c_meta = MetaData()
    b_meta = MetaData()
    clients_table = build_clients_table(c_meta)
    bookings_table = build_bookings_table(b_meta, "mysql")

    c_meta.create_all(c_engine)
    b_meta.create_all(b_engine)

    with c_engine.begin() as c_conn:
        count = c_conn.execute(select(func.count()).select_from(clients_table)).scalar()
        if not count:
            c_conn.execute(
                insert(clients_table),
                [
                    {
                        "id": 1,
                        "name": "Valeria Mendoza Ríos",
                        "phone": "0000000001",
                        "email": "valeria.mendoza@example.test",
                        "address": "Calle de ejemplo 1, León",
                    },
                    {
                        "id": 2,
                        "name": "Alejandro Navarro Garza",
                        "phone": "0000000002",
                        "email": "alejandro.navarro@example.test",
                        "address": "Calle de ejemplo 2, León",
                    },
                    {
                        "id": 3,
                        "name": "Sofía Castellanos Vega",
                        "phone": "0000000003",
                        "email": "sofia.castellanos@example.test",
                        "address": "Calle de ejemplo 3, León",
                    },
                    {
                        "id": 4,
                        "name": "Rodrigo Ibarra Montes",
                        "phone": "0000000004",
                        "email": "rodrigo.ibarra@example.test",
                        "address": "Calle de ejemplo 4, León",
                    },
                ],
            )

    with b_engine.begin() as b_conn:
        count = b_conn.execute(select(func.count()).select_from(bookings_table)).scalar()
        if not count:
            b_conn.execute(
                insert(bookings_table),
                [
                    {
                        "id": 1,
                        "client_id": 1,
                        "client_name": "Valeria Mendoza Ríos",
                        "event_date": date(2026, 11, 21),
                        "event_type": "Boda",
                        "package": "combinado",
                        "total_cents": 700000,
                        "paid_cents": 450000,
                        "status": "Confirmada",
                    },
                    {
                        "id": 2,
                        "client_id": 2,
                        "client_name": "Alejandro Navarro Garza",
                        "event_date": date(2026, 11, 28),
                        "event_type": "XV años",
                        "package": "foto",
                        "total_cents": 350000,
                        "paid_cents": 175000,
                        "status": "Confirmada",
                    },
                    {
                        "id": 3,
                        "client_id": 3,
                        "client_name": "Sofía Castellanos Vega",
                        "event_date": date(2026, 12, 5),
                        "event_type": "Bautizo",
                        "package": "video",
                        "total_cents": 450000,
                        "paid_cents": 0,
                        "status": "Pendiente de anticipo",
                    },
                    {
                        "id": 4,
                        "client_id": 4,
                        "client_name": "Rodrigo Ibarra Montes",
                        "event_date": date(2026, 12, 12),
                        "event_type": "Boda",
                        "package": "combinado",
                        "total_cents": 700000,
                        "paid_cents": 0,
                        "status": "Pendiente de anticipo",
                    },
                ],
            )

    c_engine.dispose()
    b_engine.dispose()
    return clients_url, bookings_url


def main() -> None:
    os.chdir(ROOT)
    for port in (8011, 8012):
        if is_port_open(port):
            raise SystemExit(
                f"Puerto {port} ocupado. Detén primero la instancia anterior (Ctrl+C)."
            )

    ensure_laragon_mysql_running()
    clients_url, bookings_url = initialize_mysql_databases()

    api_key = os.environ.get("FOTO_API_KEY") or secrets.token_urlsafe(24)
    env = {
        **os.environ,
        "FOTO_API_KEY": api_key,
        "CLIENTS_DATABASE_URL": clients_url,
        "BOOKINGS_DATABASE_URL": bookings_url,
        "CLIENTS_URL": "http://127.0.0.1:8011",
    }

    print("\n========================================================", flush=True)
    print("  BACKEND ACTIVO - Luz & Memoria (MySQL Laragon)", flush=True)
    print("  Base Clientes: fotografia_clientes", flush=True)
    print("  Base Reservas: fotografia_reservas", flush=True)
    print("  API Clientes:  http://127.0.0.1:8011/docs", flush=True)
    print("  API Reservas:  http://127.0.0.1:8012/docs", flush=True)
    print(f"  Clave:         {api_key}", flush=True)
    print("========================================================\n", flush=True)

    processes: list[subprocess.Popen] = []
    try:
        for module_name, port in [("clients", 8011), ("bookings", 8012)]:
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
            processes.append(subprocess.Popen(cmd, env=env, cwd=ROOT))

        while all(proc.poll() is None for proc in processes):
            time.sleep(1)

        raise RuntimeError("Un servicio del backend se detuvo.")
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
