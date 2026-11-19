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
