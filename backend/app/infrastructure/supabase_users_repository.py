"""
Repositorio de autenticación para Supabase PostgreSQL.

Utiliza las tablas existentes:
- public.usuarios
- public.clientes
"""

from sqlalchemy import select, func
from sqlalchemy.engine import Engine


class SupabaseUserRepository:

    def __init__(self, engine: Engine, users_table, clients_table):
        self.engine = engine
        self.users = users_table
        self.clients = clients_table

    @staticmethod
    def _adapt_user(row):
        if row is None:
            return None

        return {
            "id": row["id_usuario"],
            "client_id": row["id_cliente"],
            "email": row["correo"],
            "password_hash": row["contrasena_hash"],
            "role": row["rol"],
            "is_active": row["activo"],
            "registro_pendiente": row["registro_pendiente"],
            "must_change_password": row["debe_cambiar_contrasena"],
        }

    def get_by_email(self, email: str):
        email = email.strip().lower()

        query = select(self.users).where(
            func.lower(self.users.c.correo) == email
        )

        with self.engine.connect() as connection:
            row = connection.execute(query).mappings().first()

        return self._adapt_user(row)

    def get_by_id(self, user_id: int):
        query = select(self.users).where(
            self.users.c.id_usuario == user_id
        )

        with self.engine.connect() as connection:
            row = connection.execute(query).mappings().first()

        return self._adapt_user(row)

    def register_client(self, body, password_hash: str):
        email = body.email.strip().lower()

        with self.engine.begin() as connection:

            client_result = connection.execute(
                self.clients.insert()
                .values(
                    nombre=body.name,
                    telefono=body.phone,
                    correo=email,
                    domicilio=body.address,
                )
                .returning(self.clients.c.id_cliente)
            )

            client_id = client_result.scalar_one()

            user_result = connection.execute(
                self.users.insert()
                .values(
                    id_cliente=client_id,
                    correo=email,
                    contrasena_hash=password_hash,
                    rol="Cliente",
                    activo=True,
                    registro_pendiente=False,
                )
                .returning(self.users.c.id_usuario)
            )

            user_id = user_result.scalar_one()

            return {
                "id": user_id,
                "client_id": client_id,
                "email": email,
                "role": "Cliente",
                "is_active": True,
            }

    def change_password(self, user_id: int, current_password: str, new_password: str):
        from sqlalchemy import update
        from app.core.security import hash_password, verify_password
        from fastapi import HTTPException

        with self.engine.begin() as conexion:
            usuario = conexion.execute(
                select(self.users)
                .where(self.users.c.id_usuario == user_id)
                .with_for_update()
            ).mappings().first()

            if usuario is None or not usuario["activo"]:
                raise HTTPException(404, "Usuario no encontrado o inactivo")

            if not verify_password(
                current_password,
                usuario["contrasena_hash"],
            ):
                raise HTTPException(400, "La contraseña actual es incorrecta")

            if verify_password(new_password, usuario["contrasena_hash"]):
                raise HTTPException(
                    400,
                    "La nueva contraseña debe ser diferente de la anterior",
                )

            conexion.execute(
                update(self.users)
                .where(self.users.c.id_usuario == user_id)
                .values(
                    contrasena_hash=hash_password(new_password),
                    debe_cambiar_contrasena=False,
                )
            )

        return {"message": "Contraseña actualizada correctamente"}