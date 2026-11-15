"""
Servicio / Módulo de Reservas y Agenda (FastAPI).
Arquitectura en capas basada en MicroserviciosSitic:
- core/config.py (configuración, zona horaria y seguridad Bearer)
- domain/models.py & schemas.py (tabla SQLAlchemy, índice parcial único y validación Pydantic)
- infrastructure/database.py, repositories.py & clients_gateway.py (persistencia y pasarela HTTP)
- application/handlers.py (Queries y Commands CQRS)
"""
import os
from contextlib import asynccontextmanager
from datetime import date
from typing import Any, Callable

from fastapi import Depends, FastAPI, Query
from sqlalchemy import MetaData

from app.application.handlers import (
    AddReservaCommand,
    CancelarReservaCommand,
    ConfirmarReservaCommand,
    GetDisponibilidadQuery,
    GetPaquetesQuery,
    GetReservasQuery,
)
from app.core.config import auth_dependency
from app.domain.models import PACKAGES, build_bookings_table
from app.domain.schemas import BookingInput, PaymentInput
from app.infrastructure.clients_gateway import build_remote_client_lookup
from app.infrastructure.database import check_database_health, database
from app.infrastructure.repositories import ReservaRepository

__all__ = ["PACKAGES", "BookingInput", "PaymentInput", "create_app"]


def create_app(
    db_url: str | None = None,
    api_key: str | None = None,
    client_lookup: Callable[[int], dict[str, Any]] | None = None,
) -> FastAPI:
    """Fábrica de la aplicación FastAPI para el servicio de reservas y agenda (HU 02)."""
    resolved_url = db_url or os.environ.get(
        "BOOKINGS_DATABASE_URL",
        "mysql+pymysql://root@127.0.0.1:3306/fotografia_reservas",
    )
    engine = database(resolved_url)
    metadata = MetaData()
    bookings_table = build_bookings_table(metadata, engine.dialect.name)
    repository = ReservaRepository(engine, bookings_table)
    auth = auth_dependency(api_key)
    lookup = client_lookup or build_remote_client_lookup(api_key)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        metadata.create_all(engine)
        yield
        engine.dispose()

    app = FastAPI(
        title="Fotografía - Servicio de reservas",
        version="1.0.0",
        lifespan=lifespan,
    )
    app.state.engine = engine
    app.state.repository = repository

    @app.get("/health", tags=["Salud"])
    def health():
        check_database_health(engine)
        return {"status": "ok", "service": "bookings"}

    @app.get("/api/paquetes", dependencies=[Depends(auth)], tags=["Catálogo"])
    def packages():
        query = GetPaquetesQuery()
        return query.execute()

    @app.get("/api/disponibilidad", dependencies=[Depends(auth)], tags=["Agenda"])
    def availability(start: date = Query(...), end: date = Query(...)):
        query = GetDisponibilidadQuery(repository)
        return query.execute(start=start, end=end)

    @app.get("/api/reservas", dependencies=[Depends(auth)], tags=["Reservas"])
    def list_bookings():
        query = GetReservasQuery(repository)
        return query.execute()

    @app.post(
        "/api/reservas",
        status_code=201,
        dependencies=[Depends(auth)],
        tags=["Reservas"],
    )
    def add_booking(body: BookingInput):
        command = AddReservaCommand(repository, lookup)
        return command.execute(body)

    @app.post(
        "/api/reservas/{booking_id}/confirmar",
        dependencies=[Depends(auth)],
        tags=["Reservas"],
    )
    def confirm(booking_id: int, body: PaymentInput):
        command = ConfirmarReservaCommand(repository)
        return command.execute(booking_id, body)

    @app.post(
        "/api/reservas/{booking_id}/cancelar",
        dependencies=[Depends(auth)],
        tags=["Reservas"],
    )
    def cancel(booking_id: int):
        command = CancelarReservaCommand(repository)
        return command.execute(booking_id)

    return app
