"""Repositorio de reservaciones y anticipos en Supabase."""

from datetime import date
from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException
from sqlalchemy import select, insert, update, func
from sqlalchemy.exc import IntegrityError


class SupabaseReservasRepository:

    def __init__(
        self,
        engine,
        reservaciones,
        clientes,
        paquetes,
        pagos,
    ):
        self.engine = engine
        self.reservaciones = reservaciones
        self.clientes = clientes
        self.paquetes = paquetes
        self.pagos = pagos

    def listar_reservaciones(self, usuario):
        pagos_aprobados = (
            select(
                self.pagos.c.id_reservacion,
                func.sum(self.pagos.c.monto_centavos).label("paid_cents"),
            )
            .where(self.pagos.c.estado == "Aprobado")
            .group_by(self.pagos.c.id_reservacion)
            .subquery()
        )

        consulta = (
            select(
                self.reservaciones,
                self.clientes.c.nombre.label("client_name"),
                self.paquetes.c.clave.label("package_key"),
                func.coalesce(
                    pagos_aprobados.c.paid_cents, 0
                ).label("paid_cents"),
            )
            .join(
                self.clientes,
                self.reservaciones.c.id_cliente
                == self.clientes.c.id_cliente,
            )
            .outerjoin(
                self.paquetes,
                self.reservaciones.c.id_paquete
                == self.paquetes.c.id_paquete,
            )
            .outerjoin(
                pagos_aprobados,
                self.reservaciones.c.id_reservacion
                == pagos_aprobados.c.id_reservacion,
            )
            .order_by(
                self.reservaciones.c.fecha_evento.desc()
            )
        )

        if usuario["role"] != "Administrador":
            if usuario["client_id"] is None:
                return []

            consulta = consulta.where(
                self.reservaciones.c.id_cliente
                == usuario["client_id"]
            )

        with self.engine.connect() as conexion:
            filas = conexion.execute(consulta).mappings().all()

        return [
            {
                "id": fila["id_reservacion"],
                "client_id": fila["id_cliente"],
                "client_name": fila["client_name"],
                "event_date": fila["fecha_evento"].isoformat(),
                "event_type": fila["tipo_evento"],
                "package": fila["package_key"],
                "total_cents": fila["total_centavos"],
                "paid_cents": int(fila["paid_cents"]),
                "status": fila["estado"],
            }
            for fila in filas
        ]

    def crear_reservacion(self, datos):
        if datos.event_date < date.today():
            raise HTTPException(
                status_code=400,
                detail="No se permiten fechas anteriores a hoy.",
            )

        with self.engine.begin() as conexion:
            cliente = conexion.execute(
                select(self.clientes).where(
                    self.clientes.c.id_cliente == datos.client_id,
                    self.clientes.c.activo.is_(True),
                )
            ).mappings().first()

            if cliente is None:
                raise HTTPException(
                    status_code=404,
                    detail="Cliente activo no encontrado.",
                )

            paquete = conexion.execute(
                select(self.paquetes).where(
                    self.paquetes.c.clave == datos.package,
                    self.paquetes.c.activo.is_(True),
                )
            ).mappings().first()

            if paquete is None:
                raise HTTPException(
                    status_code=404,
                    detail="Paquete activo no encontrado.",
                )

            fecha_ocupada = conexion.execute(
                select(self.reservaciones.c.id_reservacion).where(
                    self.reservaciones.c.fecha_evento
                    == datos.event_date,
                    self.reservaciones.c.estado.in_(
                        ["Confirmada", "Realizada", "Entregada"]
                    ),
                )
            ).first()

            if fecha_ocupada:
                raise HTTPException(
                    status_code=409,
                    detail="La fecha ya está ocupada.",
                )

            resultado = conexion.execute(
                insert(self.reservaciones)
                .values(
                    id_cliente=cliente["id_cliente"],
                    id_paquete=paquete["id_paquete"],
                    fecha_evento=datos.event_date,
                    tipo_evento=datos.event_type,
                    domicilio_entrega=cliente["domicilio"],
                    telefono_contacto=cliente["telefono"],
                    total_centavos=paquete["precio_centavos"],
                    porcentaje_anticipo_minimo=Decimal("50.00"),
                    estado="Pendiente de anticipo",
                )
                .returning(self.reservaciones.c.id_reservacion)
            )

            id_reservacion = resultado.scalar_one()

        return {
            "id": id_reservacion,
            "client_id": datos.client_id,
            "client_name": cliente["nombre"],
            "event_date": datos.event_date.isoformat(),
            "event_type": datos.event_type,
            "package": datos.package,
            "total_cents": paquete["precio_centavos"],
            "paid_cents": 0,
            "status": "Pendiente de anticipo",
        }

    def confirmar_anticipo(
        self,
        id_reservacion,
        monto,
        id_administrador,
    ):
        monto_centavos = int(
            (monto * Decimal("100")).quantize(
                Decimal("1"),
                rounding=ROUND_HALF_UP,
            )
        )

        try:
            with self.engine.begin() as conexion:
                reserva = conexion.execute(
                    select(self.reservaciones)
                    .where(
                        self.reservaciones.c.id_reservacion
                        == id_reservacion
                    )
                    .with_for_update()
                ).mappings().first()

                if reserva is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Reservación no encontrada.",
                    )

                if reserva["estado"] != "Pendiente de anticipo":
                    raise HTTPException(
                        status_code=409,
                        detail="La reservación no está pendiente.",
                    )

                total = reserva["total_centavos"]
                porcentaje = Decimal(
                    str(reserva["porcentaje_anticipo_minimo"])
                )

                minimo = (
                    Decimal(total) * porcentaje / Decimal("100")
                ).quantize(
                    Decimal("1"),
                    rounding=ROUND_HALF_UP,
                )

                if not minimo <= monto_centavos <= total:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "El anticipo debe estar entre "
                            "el mínimo requerido y el total."
                        ),
                    )

                conexion.execute(
                    insert(self.pagos).values(
                        id_reservacion=id_reservacion,
                        monto_centavos=monto_centavos,
                        metodo_pago="Efectivo",
                        tipo_pago="Anticipo",
                        estado="Aprobado",
                        fecha_validacion=func.now(),
                        validado_por=id_administrador,
                    )
                )

                conexion.execute(
                    update(self.reservaciones)
                    .where(
                        self.reservaciones.c.id_reservacion
                        == id_reservacion
                    )
                    .values(
                        estado="Confirmada",
                        actualizada_en=func.now(),
                    )
                )

        except IntegrityError as error:
            if getattr(error.orig, "pgcode", None) == "23505":
                raise HTTPException(
                    status_code=409,
                    detail="La fecha ya está ocupada.",
                ) from error
            raise

        return {
            "id": id_reservacion,
            "status": "Confirmada",
            "payment_cents": monto_centavos,
        }

    def cancelar_reservacion(self, id_reservacion):
        with self.engine.begin() as conexion:
            reserva = conexion.execute(
                select(self.reservaciones)
                .where(
                    self.reservaciones.c.id_reservacion
                    == id_reservacion
                )
                .with_for_update()
            ).mappings().first()

            if reserva is None:
                raise HTTPException(
                    status_code=404,
                    detail="Reservación no encontrada.",
                )

            if reserva["estado"] != "Pendiente de anticipo":
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Solo se pueden cancelar solicitudes "
                        "pendientes de anticipo."
                    ),
                )

            conexion.execute(
                update(self.reservaciones)
                .where(
                    self.reservaciones.c.id_reservacion
                    == id_reservacion
                )
                .values(
                    estado="Cancelada",
                    actualizada_en=func.now(),
                )
            )

        return {
            "id": id_reservacion,
            "status": "Cancelada",
        }
