"""
Servicio / Módulo de Clientes (FastAPI).
Arquitectura en capas basada en MicroserviciosSitic:
- core/config.py (configuración y seguridad Bearer)
- domain/models.py & schemas.py (tabla SQLAlchemy y validación Pydantic)
- infrastructure/database.py & repositories.py (persistencia transaccional)
- application/handlers.py (Queries y Commands CQRS)
"""
import os
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from sqlalchemy import MetaData

from app.application.handlers import (
    AddClienteCommand,
    GetClienteByIdQuery,
    GetClientesQuery,
    UpdateClienteCommand,
    UpdateClientProfileCommand,
)
from app.core.config import auth_dependency
from app.domain.models import build_clients_table
from app.domain.schemas import ClientInput, ClientUpdateInput
from app.infrastructure.database import check_database_health, database
from app.infrastructure.repositories import ClienteRepository
from app.auth import create_auth_router
from app.domain.models import build_users_table
from app.infrastructure.users_repository import UserRepository
from app.core.security import require_user, require_role


def create_app(db_url: str | None = None, api_key: str | None = None) -> FastAPI:
    """Fábrica de la aplicación FastAPI para el servicio de clientes (HU 06)."""
    resolved_url = db_url or os.environ.get(
        "CLIENTS_DATABASE_URL",
        "mysql+pymysql://root@127.0.0.1:3306/fotografia_clientes",
    )
    engine = database(resolved_url)
    metadata = MetaData()
    clients_table = build_clients_table(metadata)
    users_table = build_users_table(metadata)
    users_repository = UserRepository(engine, users_table, clients_table)
    current_user = require_user(users_repository)
    admin_only = require_role(users_repository, "Administrador")
    repository = ClienteRepository(engine, clients_table)
    auth = auth_dependency(api_key)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        metadata.create_all(engine)
        yield
        engine.dispose()

    app = FastAPI(
        title="Fotografía - Servicio de clientes",
        version="1.0.0",
        lifespan=lifespan,
    )
    app.include_router(create_auth_router(users_repository))
    @app.get(
        "/api/internal/clientes/{client_id}",
        dependencies=[Depends(auth)],
        include_in_schema=False,
    )
    def internal_get_client(client_id: int):
        query = GetClienteByIdQuery(repository)
        return query.execute(client_id)
    app.state.engine = engine
    app.state.repository = repository


    @app.get("/health", tags=["Salud"])
    def health():
        check_database_health(engine)
        return {"status": "ok", "service": "clients"}

    @app.get("/api/clientes", dependencies=[Depends(admin_only)], tags=["Clientes"])
    def list_clients():
        query = GetClientesQuery(repository)
        return query.execute()

    @app.get("/api/clientes/{client_id}", tags=["Clientes"])
    def get_client(
        client_id: int,
        user=Depends(current_user),
    ):
        if (
            user["role"] != "Administrador"
            and user["client_id"] != client_id
        ):
            raise HTTPException(
                status_code=403,
                detail="No puedes consultar los datos de otro cliente",
            )
        query = GetClienteByIdQuery(repository)
        return query.execute(client_id)

    @app.post(
        "/api/clientes",
        status_code=201,
        dependencies=[Depends(admin_only)],
        tags=["Clientes"],
    )
    def add_client(body: ClientInput):
        command = AddClienteCommand(repository)
        return command.execute(body)

    @app.put(
        "/api/clientes/{client_id}",
        tags=["Clientes"],
    )
    def update_client(
        client_id: int,
        body: ClientUpdateInput,
        user=Depends(current_user),
    ):
        if (
            user["role"] != "Administrador"
            and user["client_id"] != client_id
        ):
            raise HTTPException(
                status_code=403,
                detail="No puedes modificar los datos de otro cliente",
            )
    return app