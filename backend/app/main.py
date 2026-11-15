"""
Punto de entrada monolítico modular (estilo MicroserviciosSitic).
Unifica los módulos de Clientes (HU 06) y Reservas/Agenda (HU 02) sobre la arquitectura
en capas (core, domain, infrastructure, application), permitiendo operar tanto en modo
monolito unificado como en servicios independientes (`app.clients` y `app.bookings`).
"""
import os
from contextlib import asynccontextmanager
from datetime import date

from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import MetaData

from app.application.handlers import (
    AddClienteCommand,
    AddReservaCommand,
    CancelarReservaCommand,
    ConfirmarReservaCommand,
    GetClienteByIdQuery,
    GetClientesQuery,
    GetDisponibilidadQuery,
    GetPaquetesQuery,
    GetReservasQuery,
)
from app.core.config import auth_dependency, settings
from app.domain.models import build_bookings_table, build_clients_table
from app.domain.schemas import BookingInput, ClientInput, PaymentInput
from app.infrastructure.database import check_database_health, database
from app.infrastructure.repositories import ClienteRepository, ReservaRepository


def create_monolith_app(
    clients_db_url: str | None = None,
    bookings_db_url: str | None = None,
    api_key: str | None = None,
) -> FastAPI:
    """
    Construye una instancia FastAPI monolítica modular que integra Clientes y Reservas
    utilizando los mismos repositorios y manejadores CQRS.
    """
    c_url = clients_db_url or os.environ.get(
        "CLIENTS_DATABASE_URL",
        "mysql+pymysql://root@127.0.0.1:3306/fotografia_clientes",
    )
    b_url = bookings_db_url or os.environ.get(
        "BOOKINGS_DATABASE_URL",
        "mysql+pymysql://root@127.0.0.1:3306/fotografia_reservas",
    )

    clients_engine = database(c_url)
    bookings_engine = database(b_url)

    clients_meta = MetaData()
    bookings_meta = MetaData()

    clients_table = build_clients_table(clients_meta)
    bookings_table = build_bookings_table(bookings_meta, bookings_engine.dialect.name)

    cliente_repo = ClienteRepository(clients_engine, clients_table)
    reserva_repo = ReservaRepository(bookings_engine, bookings_table)
    auth = auth_dependency(api_key)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        clients_meta.create_all(clients_engine)
        bookings_meta.create_all(bookings_engine)
        yield
        clients_engine.dispose()
        bookings_engine.dispose()

    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    def local_client_lookup(client_id: int):
        return GetClienteByIdQuery(cliente_repo).execute(client_id)

    @app.get("/health", tags=["Salud"])
    def health():
        check_database_health(clients_engine)
        check_database_health(bookings_engine)
        return {"status": "ok", "service": "fotografia-monolith"}

    # ─── Endpoints de Clientes (HU 06) ───────────────────────────────────────

    @app.get("/api/clientes", dependencies=[Depends(auth)], tags=["Clientes"])
    def list_clients():
        return GetClientesQuery(cliente_repo).execute()

    @app.get("/api/clientes/{client_id}", dependencies=[Depends(auth)], tags=["Clientes"])
    def get_client(client_id: int):
        return GetClienteByIdQuery(cliente_repo).execute(client_id)

    @app.post(
        "/api/clientes",
        status_code=201,
        dependencies=[Depends(auth)],
        tags=["Clientes"],
    )
    def add_client(body: ClientInput):
        return AddClienteCommand(cliente_repo).execute(body)

    # ─── Endpoints de Reservas y Agenda (HU 02) ──────────────────────────────

    @app.get("/api/paquetes", dependencies=[Depends(auth)], tags=["Catálogo"])
    def packages():
        return GetPaquetesQuery().execute()

    @app.get("/api/disponibilidad", dependencies=[Depends(auth)], tags=["Agenda"])
    def availability(start: date = Query(...), end: date = Query(...)):
        return GetDisponibilidadQuery(reserva_repo).execute(start=start, end=end)

    @app.get("/api/reservas", dependencies=[Depends(auth)], tags=["Reservas"])
    def list_bookings():
        return GetReservasQuery(reserva_repo).execute()

    @app.post(
        "/api/reservas",
        status_code=201,
        dependencies=[Depends(auth)],
        tags=["Reservas"],
    )
    def add_booking(body: BookingInput):
        return AddReservaCommand(reserva_repo, local_client_lookup).execute(body)

    @app.post(
        "/api/reservas/{booking_id}/confirmar",
        dependencies=[Depends(auth)],
        tags=["Reservas"],
    )
    def confirm(booking_id: int, body: PaymentInput):
        return ConfirmarReservaCommand(reserva_repo).execute(booking_id, body)

    @app.post(
        "/api/reservas/{booking_id}/cancelar",
        dependencies=[Depends(auth)],
        tags=["Reservas"],
    )
    def cancel(booking_id: int):
        return CancelarReservaCommand(reserva_repo).execute(booking_id)

    return app
