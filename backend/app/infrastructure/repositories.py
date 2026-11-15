"""
Repositorios de persistencia para Clientes y Reservas.
Compatible con MySQL (Laragon), PostgreSQL y SQLite.
"""
from datetime import date
from typing import Any

from sqlalchemy import Engine, Table, insert, select, update


class ClienteRepository:
    """Repositorio para gestionar la persistencia de clientes del estudio fotográfico."""

    def __init__(self, engine: Engine, clients_table: Table):
        self.engine = engine
        self.clients = clients_table

    def list_all(self) -> list[dict[str, Any]]:
        """Obtiene todos los clientes ordenados del más reciente al más antiguo."""
        stmt = select(self.clients).order_by(self.clients.c.id.desc())
        with self.engine.connect() as conn:
            rows = conn.execute(stmt).mappings().all()
            return [dict(row) for row in rows]

    def get_by_id(self, client_id: int) -> dict[str, Any] | None:
        """Busca un cliente por su identificador único."""
        stmt = select(self.clients).where(self.clients.c.id == client_id)
        with self.engine.connect() as conn:
            row = conn.execute(stmt).mappings().first()
            return dict(row) if row else None

    def create(self, client_data: dict[str, Any]) -> dict[str, Any]:
        """Inserta un nuevo cliente en la base de datos dentro de una transacción."""
        stmt = insert(self.clients).values(**client_data)
        with self.engine.begin() as conn:
            result = conn.execute(stmt)
            inserted_id = result.inserted_primary_key[0]
            return {"id": inserted_id, **client_data}


class ReservaRepository:
    """Repositorio para gestionar la persistencia de reservas, disponibilidad y anticipos."""

    def __init__(self, engine: Engine, bookings_table: Table):
        self.engine = engine
        self.bookings = bookings_table
        self.active_condition = bookings_table.c.status == "Confirmada"

    def get_occupied_dates(self, start: date, end: date) -> list[date]:
        """Devuelve la lista de fechas con evento confirmado dentro del intervalo [start, end]."""
        stmt = select(self.bookings.c.event_date).where(
            self.active_condition,
            self.bookings.c.event_date.between(start, end),
        )
        with self.engine.connect() as conn:
            return list(conn.execute(stmt).scalars().all())

    def list_all(self) -> list[dict[str, Any]]:
        """Obtiene todas las reservas ordenadas cronológicamente por fecha del evento."""
        stmt = select(self.bookings).order_by(self.bookings.c.event_date)
        with self.engine.connect() as conn:
            rows = conn.execute(stmt).mappings().all()
            return [dict(row) for row in rows]

    def create_pending_booking(self, values: dict[str, Any]) -> dict[str, Any] | None:
        """
        Registra una nueva solicitud en estado 'Pendiente de anticipo' siempre que la fecha
        no tenga ya un evento confirmado. Devuelve None si la fecha ya está confirmada.
        """
        with self.engine.begin() as conn:
            conflict_stmt = select(self.bookings.c.id).where(
                self.active_condition,
                self.bookings.c.event_date == values["event_date"],
            )
            if conn.execute(conflict_stmt).first():
                return None

            insert_stmt = insert(self.bookings).values(**values)
            result = conn.execute(insert_stmt)
            inserted_id = result.inserted_primary_key[0]
            return {"id": inserted_id, **values}

    def get_by_id_and_confirm(
        self,
        booking_id: int,
        paid_cents: int,
        current_date: date,
    ) -> tuple[str, dict[str, Any] | None]:
        """
        Ejecuta la validación transaccional y confirmación de anticipo de una reserva.
        Retorna una tupla (estado_operacion, fila_actual).
        """
        is_mysql = self.engine.dialect.name == "mysql"
        with self.engine.begin() as conn:
            base_select = select(self.bookings).where(self.bookings.c.id == booking_id)
            if is_mysql:
                base_select = base_select.with_for_update()

            row = conn.execute(base_select).mappings().first()
            if not row:
                return ("NOT_FOUND", None)

            booking_dict = dict(row)
            if booking_dict["event_date"] < current_date:
                return ("PAST_DATE", booking_dict)

            min_deposit = booking_dict["total_cents"] // 2
            max_deposit = booking_dict["total_cents"]
            if paid_cents < min_deposit or paid_cents > max_deposit:
                return ("INVALID_AMOUNT", booking_dict)

            if is_mysql:
                conflict_stmt = (
                    select(self.bookings.c.id)
                    .where(
                        self.active_condition,
                        self.bookings.c.event_date == booking_dict["event_date"],
                        self.bookings.c.id != booking_id,
                    )
                    .with_for_update()
                )
                if conn.execute(conflict_stmt).first():
                    return ("DATE_CONFLICT", booking_dict)

            update_stmt = (
                update(self.bookings)
                .where(
                    self.bookings.c.id == booking_id,
                    self.bookings.c.status == "Pendiente de anticipo",
                )
                .values(status="Confirmada", paid_cents=paid_cents)
            )
            result = conn.execute(update_stmt)
            if result.rowcount != 1:
                return ("NOT_PENDING", booking_dict)

            return ("CONFIRMED", booking_dict)

    def cancel_pending_booking(self, booking_id: int) -> str:
        """
        Cancela una solicitud pendiente conservando su registro para historial.
        """
        with self.engine.begin() as conn:
            row = (
                conn.execute(
                    select(self.bookings).where(self.bookings.c.id == booking_id)
                )
                .mappings()
                .first()
            )
            if not row:
                return "NOT_FOUND"

            if row["paid_cents"] > 0:
                return "HAS_PAYMENT"

            update_stmt = (
                update(self.bookings)
                .where(
                    self.bookings.c.id == booking_id,
                    self.bookings.c.status == "Pendiente de anticipo",
                )
                .values(status="Cancelada")
            )
            result = conn.execute(update_stmt)
            if result.rowcount != 1:
                return "NOT_PENDING"

            return "CANCELLED"
