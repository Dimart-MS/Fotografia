"""
Manejadores de casos de uso (Queries y Commands) para Clientes y Reservas.
Sigue el patrón CQRS de MicroserviciosSitic (app/application/handlers.py).
"""
from datetime import date
from typing import Any, Callable

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError

from app.core.config import today
from app.domain.models import PACKAGES
from app.domain.schemas import BookingInput, ClientInput, PaymentInput
from app.infrastructure.repositories import ClienteRepository, ReservaRepository


# ─── Queries y Commands: Módulo de Clientes (HU 06) ──────────────────────────


class GetClientesQuery:
    """Caso de uso de lectura para listar el directorio de clientes."""

    def __init__(self, repository: ClienteRepository):
        self.repository = repository

    def execute(self) -> list[dict[str, Any]]:
        return self.repository.list_all()


class GetClienteByIdQuery:
    """Caso de uso de lectura para obtener el detalle de un cliente por ID."""

    def __init__(self, repository: ClienteRepository):
        self.repository = repository

    def execute(self, client_id: int) -> dict[str, Any]:
        client = self.repository.get_by_id(client_id)
        if not client:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        return client


class AddClienteCommand:
    """Caso de uso de escritura para dar de alta un nuevo cliente (HU 06)."""

    def __init__(self, repository: ClienteRepository):
        self.repository = repository

    def execute(self, body: ClientInput) -> dict[str, Any]:
        try:
            return self.repository.create(body.model_dump())
        except IntegrityError:
            raise HTTPException(
                status_code=409,
                detail="Ya existe un cliente con ese correo",
            )


# ─── Queries y Commands: Módulo de Reservas y Agenda (HU 02) ─────────────────


class GetPaquetesQuery:
    """Caso de uso para consultar el catálogo de paquetes fotográficos."""

    def execute(self) -> list[dict[str, Any]]:
        return [{"id": key, **value} for key, value in PACKAGES.items()]


class GetDisponibilidadQuery:
    """Caso de uso para consultar fechas ocupadas en el calendario del estudio."""

    def __init__(self, repository: ReservaRepository):
        self.repository = repository

    def execute(self, start: date, end: date) -> dict[str, list[date]]:
        if end < start or (end - start).days > 366:
            raise HTTPException(
                status_code=422,
                detail="El intervalo debe ser de 0 a 366 días",
            )
        occupied = self.repository.get_occupied_dates(start, end)
        return {"occupied": occupied}


class GetReservasQuery:
    """Caso de uso para consultar todas las reservas registradas en el estudio."""

    def __init__(self, repository: ReservaRepository):
        self.repository = repository

    def execute(self) -> list[dict[str, Any]]:
        return self.repository.list_all()


class AddReservaCommand:
    """Caso de uso para registrar una nueva solicitud de reserva (HU 02)."""

    def __init__(
        self,
        repository: ReservaRepository,
        client_lookup: Callable[[int], dict[str, Any]],
    ):
        self.repository = repository
        self.client_lookup = client_lookup

    def execute(self, body: BookingInput) -> dict[str, Any]:
        if body.event_date < today():
            raise HTTPException(
                status_code=422,
                detail="La fecha no puede estar en el pasado",
            )

        client = self.client_lookup(body.client_id)
        values = {
            **body.model_dump(),
            "client_name": client["name"],
            "total_cents": PACKAGES[body.package]["price_cents"],
            "paid_cents": 0,
            "status": "Pendiente de anticipo",
        }

        try:
            created = self.repository.create_pending_booking(values)
            if created is None:
                raise HTTPException(
                    status_code=409,
                    detail="La fecha ya tiene un evento confirmado",
                )
            return created
        except IntegrityError:
            raise HTTPException(
                status_code=409,
                detail="La fecha ya está ocupada",
            )


class ConfirmarReservaCommand:
    """Caso de uso para registrar el anticipo verificado y apartar la fecha."""

    def __init__(self, repository: ReservaRepository):
        self.repository = repository

    def execute(self, booking_id: int, body: PaymentInput) -> dict[str, Any]:
        cents = int(body.amount * 100)
        try:
            status_code, _ = self.repository.get_by_id_and_confirm(
                booking_id=booking_id,
                paid_cents=cents,
                current_date=today(),
            )
        except IntegrityError:
            raise HTTPException(
                status_code=409,
                detail="Otro evento ya confirmó esta fecha; no se registró el anticipo",
            )

        if status_code == "DATE_CONFLICT":
            raise HTTPException(
                status_code=409,
                detail="Otro evento ya confirmó esta fecha; no se registró el anticipo",
            )
        if status_code == "NOT_FOUND":
            raise HTTPException(status_code=404, detail="Reserva no encontrada")
        if status_code == "PAST_DATE":
            raise HTTPException(
                status_code=422,
                detail="No se puede confirmar una fecha pasada",
            )
        if status_code == "INVALID_AMOUNT":
            raise HTTPException(
                status_code=422,
                detail="El anticipo debe cubrir del 50 % al 100 % del total",
            )
        if status_code == "NOT_PENDING":
            raise HTTPException(
                status_code=409,
                detail="Solo se puede confirmar una reserva pendiente",
            )

        return {"status": "Confirmada", "paid_cents": cents}


class CancelarReservaCommand:
    """Caso de uso para cancelar una solicitud pendiente conservando historial."""

    def __init__(self, repository: ReservaRepository):
        self.repository = repository

    def execute(self, booking_id: int) -> dict[str, str]:
        result = self.repository.cancel_pending_booking(booking_id)

        if result == "NOT_FOUND":
            raise HTTPException(status_code=404, detail="Reserva no encontrada")
        if result == "HAS_PAYMENT":
            raise HTTPException(
                status_code=409,
                detail="Una reserva con anticipo requiere gestionar el reembolso fuera de este incremento",
            )
        if result == "NOT_PENDING":
            raise HTTPException(
                status_code=409,
                detail="Solo se puede cancelar una reserva pendiente",
            )

        return {"status": "Cancelada"}
