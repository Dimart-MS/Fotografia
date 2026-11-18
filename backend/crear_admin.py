"""
Script para crear un usuario Administrador en Luz & Memoria.

Utiliza la conexión MySQL configurada en run_local.py.
No elimina ni modifica usuarios existentes.
"""

import getpass

from sqlalchemy import MetaData
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.core.security import hash_password
from app.domain.models import build_users_table
from app.infrastructure.database import database

from run_local import (
    ensure_laragon_mysql_running,
    initialize_mysql_databases,
)


def main():
    print("\n========================================")
    print("   LUZ & MEMORIA - CREAR ADMINISTRADOR")
    print("========================================\n")

    # 1. Verificar que MySQL esté disponible.
    try:
        ensure_laragon_mysql_running()

        # Obtiene la conexión a fotografia_clientes.
        # Reutiliza la configuración de run_local.py.
        clients_url, _ = initialize_mysql_databases()

    except Exception as error:
        print(f"\nERROR al conectar con MySQL: {error}")
        return

    # 2. Solicitar correo electrónico.
    email = input(
        "\nCorreo electrónico del administrador: "
    ).strip().lower()

    if not email or "@" not in email:
        print("\nERROR: Introduce un correo válido.")
        return

    # 3. Solicitar contraseña sin mostrarla.
    password = getpass.getpass(
        "Contraseña del administrador: "
    )

    confirm_password = getpass.getpass(
        "Confirmar contraseña: "
    )

    if len(password) < 12:
        print(
            "\nERROR: La contraseña debe tener "
            "al menos 12 caracteres."
        )
        return

    if password != confirm_password:
        print("\nERROR: Las contraseñas no coinciden.")
        return

    # 4. Conectar con la base de datos de clientes.
    engine = database(clients_url)

    metadata = MetaData()
    users_table = build_users_table(metadata)

    try:
        # 5. Verificar si el correo ya está registrado.
        with engine.connect() as connection:
            existing_user = connection.execute(
                users_table.select().where(
                    users_table.c.email == email
                )
            ).mappings().first()

        if existing_user:
            print(
                "\nERROR: Ya existe un usuario "
                "registrado con ese correo."
            )
            return

        # 6. Generar el hash seguro de la contraseña.
        password_hash = hash_password(password)

        # 7. Crear la cuenta de Administrador.
        with engine.begin() as connection:
            result = connection.execute(
                users_table.insert().values(
                    client_id=None,
                    email=email,
                    password_hash=password_hash,
                    role="Administrador",
                    is_active=1,
                )
            )

            admin_id = result.inserted_primary_key[0]

        print("\n========================================")
        print("   ADMINISTRADOR CREADO CORRECTAMENTE")
        print("========================================")
        print(f"ID: {admin_id}")
        print(f"Correo: {email}")
        print("Rol: Administrador")
        print("Estado: Activo")
        print("========================================\n")

    except IntegrityError:
        print(
            "\nERROR: El correo ya está registrado "
            "o existe un conflicto de integridad."
        )

    except SQLAlchemyError as error:
        print(f"\nERROR de base de datos: {error}")

    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
