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

from fastapi import Depends, FastAPI
from sqlalchemy import MetaData

from app.application.handlers import (
    AddClienteCommand,
    GetClienteByIdQuery,
    GetClientesQuery,
    UpdateClienteCommand,
)
from app.core.config import auth_dependency
from app.domain.models import build_clients_table
from app.domain.schemas import ClientInput, ClientUpdateInput
from app.infrastructure.database import check_database_health, database
from app.infrastructure.repositories import ClienteRepository


def create_app(db_url: str | None = None, api_key: str | None = None) -> FastAPI:
    """Fábrica de la aplicación FastAPI para el servicio de clientes (HU 06)."""
    resolved_url = db_url or os.environ.get(
        "CLIENTS_DATABASE_URL",
        "mysql+pymysql://root@127.0.0.1:3306/fotografia_clientes",
    )
    engine = database(resolved_url)
    metadata = MetaData()
    clients_table = build_clients_table(metadata)
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
    app.state.engine = engine
    app.state.repository = repository

    @app.get("/health", tags=["Salud"])
    def health():
        check_database_health(engine)
        return {"status": "ok", "service": "clients"}

    @app.get("/api/clientes", dependencies=[Depends(auth)], tags=["Clientes"])
    def list_clients():
        query = GetClientesQuery(repository)
        return query.execute()

    @app.get("/api/clientes/{client_id}", dependencies=[Depends(auth)], tags=["Clientes"])
    def get_client(client_id: int):
        query = GetClienteByIdQuery(repository)
        return query.execute(client_id)

    @app.post(
        "/api/clientes",
        status_code=201,
        dependencies=[Depends(auth)],
        tags=["Clientes"],
    )
    def add_client(body: ClientInput):
        command = AddClienteCommand(repository)
        return command.execute(body)

    @app.put(
        "/api/clientes/{client_id}",
        dependencies=[Depends(auth)],
        tags=["Clientes"],
    )
    def update_client(
        client_id: int,
        body: ClientUpdateInput,
    ):
        command = UpdateClienteCommand(repository)
        return command.execute(client_id, body)
    return app