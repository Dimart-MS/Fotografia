"""
Crear un usuario administrador en Luz & Memoria.

Utiliza Supabase PostgreSQL y el mismo sistema de
contraseñas que la autenticación de FastAPI.

No modifica ni elimina usuarios existentes.
"""

import getpass
import re

from sqlalchemy import MetaData, Table, insert, select, func
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.core.security import hash_password
from app.infrastructure.database import supabase_database


def main():
    print("\n========================================")
    print("   LUZ & MEMORIA - CREAR ADMINISTRADOR")
    print("========================================\n")

    email = input(
        "Correo electrónico del administrador: "
    ).strip().lower()

    if not re.fullmatch(
        r"[^\s@]+@[^\s@]+\.[^\s@]+",
        email,
    ):
        print("\nERROR: Introduce un correo válido.")
        return

    if len(email) > 160:
        print("\nERROR: El correo es demasiado largo.")
        return

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

    engine = None

    try:
        engine = supabase_database()

        metadata = MetaData()

        usuarios = Table(
            "usuarios",
            metadata,
            schema="public",
            autoload_with=engine,
        )

        with engine.begin() as conexion:
            existente = conexion.execute(
                select(usuarios.c.id_usuario).where(
                    func.lower(usuarios.c.correo) == email
                )
            ).first()

            if existente:
                print(
                    "\nERROR: Ya existe un usuario "
                    "registrado con ese correo."
                )
                return

            password_hash = hash_password(password)

            resultado = conexion.execute(
                insert(usuarios)
                .values(
                    id_cliente=None,
                    correo=email,
                    contrasena_hash=password_hash,
                    rol="Administrador",
                    activo=True,
                    registro_pendiente=False,
                )
                .returning(usuarios.c.id_usuario)
            )

            admin_id = resultado.scalar_one()

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
        if engine is not None:
            engine.dispose()


if __name__ == "__main__":
    main()
