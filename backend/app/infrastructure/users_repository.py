"""
Repositorio de usuarios para Luz & Memoria.

Gestiona las cuentas almacenadas en MySQL.
"""

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError


class UserRepository:
    def __init__(self, engine, users_table, clients_table):
        self.engine = engine
        self.users = users_table
        self.clients = clients_table

    def get_by_email(self, email: str):
        """Busca un usuario por correo electrónico."""
        with self.engine.connect() as connection:
            query = select(self.users).where(
                self.users.c.email == email.lower()
            )

            result = connection.execute(query).mappings().first()
            return dict(result) if result else None

    def get_by_id(self, user_id: int):
        """Busca un usuario por identificador."""
        with self.engine.connect() as connection:
            query = select(self.users).where(
                self.users.c.id == user_id
            )

            result = connection.execute(query).mappings().first()
            return dict(result) if result else None

    def register_client(self, body, password_hash: str):
        """
        Registra un cliente y su cuenta en una sola transacción.

        Si ocurre un error, se revierten ambas inserciones.
        """
        with self.engine.begin() as connection:
            client_result = connection.execute(
                self.clients.insert().values(
                    name=body.name,
                    phone=body.phone,
                    email=body.email,
                    address=body.address,
                )
            )

            client_id = client_result.inserted_primary_key[0]

            user_result = connection.execute(
                self.users.insert().values(
                    client_id=client_id,
                    email=body.email,
                    password_hash=password_hash,
                    role="Cliente",
                    is_active=1,
                )
            )

            user_id = user_result.inserted_primary_key[0]

            return {
                "id": user_id,
                "client_id": client_id,
                "email": body.email,
                "role": "Cliente",
                "is_active": True,
            }

    def update_client_profile(self, client_id: int, body):
        """
        Actualiza los datos del cliente y sincroniza el correo
        de su cuenta de usuario en una misma transacción.
        """

        with self.engine.begin() as connection:

            client = connection.execute(
                select(self.clients).where(
                    self.clients.c.id == client_id
                )
            ).mappings().first()

            if not client:
                return None

            connection.execute(
                update(self.clients)
                .where(self.clients.c.id == client_id)
                .values(
                    name=body.name,
                    phone=body.phone,
                    email=body.email,
                    address=body.address,
                )
            )

            connection.execute(
                update(self.users)
                .where(self.users.c.client_id == client_id)
                .values(
                    email=body.email
                )
            )

            updated_client = connection.execute(
                select(self.clients).where(
                    self.clients.c.id == client_id
                )
            ).mappings().first()

            return dict(updated_client)
