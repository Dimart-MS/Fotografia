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

from fastapi import Depends, FastAPI, HTTPException, Query
from sqlalchemy import MetaData

from app.application.handlers import (
    AddReservaCommand,
    CancelarReservaCommand,
    ConfirmarReservaCommand,
    GetDisponibilidadQuery,
    GetPaquetesQuery,
    GetReservasQuery,
    GetReservaByIdQuery,
)
from app.core.config import auth_dependency
from app.domain.models import PACKAGES, build_bookings_table
from app.domain.schemas import BookingInput, PaymentInput
from app.infrastructure.clients_gateway import build_remote_client_lookup
from app.infrastructure.database import check_database_health, database
from app.infrastructure.repositories import ReservaRepository
from app.core.security import require_user, require_role
from app.domain.models import build_clients_table, build_users_table
from app.infrastructure.users_repository import UserRepository

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
    clients_url = os.environ.get(
        "CLIENTS_DATABASE_URL",
        "mysql+pymysql://root@127.0.0.1:3306/fotografia_clientes",
    )
    users_engine = database(clients_url)
    users_metadata = MetaData()
    clients_table = build_clients_table(users_metadata)
    users_table = build_users_table(users_metadata)
    users_repository = UserRepository(
        users_engine,
        users_table,
        clients_table,
    )
    current_user = require_user(users_repository)
    admin_only = require_role(users_repository, "Administrador")
    auth = auth_dependency(api_key)
    lookup = client_lookup or build_remote_client_lookup(api_key)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        metadata.create_all(engine)
        try:
            yield
        finally:
            engine.dispose()
            users_engine.dispose()

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

    @app.get("/api/paquetes", dependencies=[Depends(current_user)], tags=["Catálogo"])
    def packages():
        query = GetPaquetesQuery()
        return query.execute()

    @app.get("/api/disponibilidad", dependencies=[Depends(auth)], tags=["Agenda"])
    def availability(start: date = Query(...), end: date = Query(...)):
        query = GetDisponibilidadQuery(repository)
        return query.execute(start=start, end=end)

    @app.get("/api/reservas", tags=["Reservas"])
    def list_bookings(user=Depends(current_user)):
        bookings = GetReservasQuery(repository).execute()
        if user["role"] == "Administrador":
            return bookings
        return [
            booking
            for booking in bookings
            if booking["client_id"] == user["client_id"]
        ]

    @app.get("/api/reservas/{booking_id}", tags=["Reservas"])
    def get_booking(
        booking_id: int,
        user=Depends(current_user),
    ):
        booking = GetReservaByIdQuery(repository).execute(booking_id)

        if (
            user["role"] != "Administrador"
            and booking["client_id"] != user["client_id"]
        ):
            raise HTTPException(
                status_code=403,
                detail="No puedes consultar reservaciones de otros clientes",
            )
        return booking

    @app.post("/api/reservas", status_code=201, tags=["Reservas"])
    def add_booking(
        body: BookingInput,
        user=Depends(current_user),
    ):
        if (
            user["role"] != "Administrador"
            and body.client_id != user["client_id"]
        ):
            raise HTTPException(
                status_code=403,
                detail="Solo puedes registrar reservaciones a tu nombre",
            )
        return AddReservaCommand(repository, lookup).execute(body)

    @app.post(
        "/api/reservas/{booking_id}/confirmar",
        dependencies=[Depends(admin_only)],
        tags=["Reservas"],
    )
    def confirm(booking_id: int, body: PaymentInput):
        command = ConfirmarReservaCommand(repository)
        return command.execute(booking_id, body)

    @app.post(
        "/api/reservas/{booking_id}/cancelar",
        dependencies=[Depends(admin_only)],
        tags=["Reservas"],
    )
    def cancel(booking_id: int):
        command = CancelarReservaCommand(repository)
        return command.execute(booking_id)

    return app
