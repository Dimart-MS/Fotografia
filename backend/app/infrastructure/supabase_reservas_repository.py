"""Repositorio de reservaciones y anticipos en Supabase."""
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime, timedelta, time, timezone
from zoneinfo import ZoneInfo
from fastapi import HTTPException
from sqlalchemy import select, insert, update, func
from sqlalchemy.exc import IntegrityError

from app.core.config import today
from app.infrastructure.supabase_ventas_repository import crear_venta_automatica


ZONA_HORARIA = ZoneInfo("America/Mexico_City")
def calcular_fecha_limite_anticipo(fecha_creacion=None):
    if fecha_creacion is None:
        fecha_creacion = datetime.now(ZONA_HORARIA)

    fecha_local = fecha_creacion.astimezone(ZONA_HORARIA)
    dia = fecha_local.date()
    dias_habiles = 0

    while dias_habiles < 2:
        dia += timedelta(days=1)

        if dia.weekday() < 5:
            dias_habiles += 1

    return datetime.combine(
        dia,
        time(23, 59, 59),
        tzinfo=ZONA_HORARIA,
    )

class SupabaseReservasRepository:

    def __init__(
        self,
        engine,
        reservaciones,
        clientes,
        paquetes,
        pagos,
        ventas,
        detalles_ventas,
        usuarios,
        historial_prorrogas_anticipo,
        comprobantes_pago,
        historial_reservaciones,
    ):
        self.engine = engine
        self.reservaciones = reservaciones
        self.clientes = clientes
        self.paquetes = paquetes
        self.pagos = pagos
        self.ventas = ventas
        self.detalles_ventas = detalles_ventas
        self.usuarios = usuarios
        self.historial_prorrogas_anticipo = historial_prorrogas_anticipo
        self.comprobantes_pago = comprobantes_pago
        self.historial_reservaciones = historial_reservaciones

    def obtener_fechas_ocupadas(self, anio: int, mes: int):
        """
        Obtiene las fechas ocupadas de un mes.

        Solo considera reservaciones Confirmadas,
        Realizadas o Entregadas.

        No devuelve información personal de clientes.
        """
        if not 1 <= mes <= 12:
            raise HTTPException(
                status_code=422,
                detail="El mes debe estar entre 1 y 12.",
            )

        if not 1 <= anio <= 9999:
            raise HTTPException(
                status_code=422,
                detail="El año no es válido.",
            )

        from datetime import date

        fecha_inicio = date(anio, mes, 1)

        if mes == 12:
            fecha_fin = (
                date(anio + 1, 1, 1)
                if anio < 9999
                else None
            )
        else:
            fecha_fin = date(anio, mes + 1, 1)

        condiciones = [
            self.reservaciones.c.fecha_evento >= fecha_inicio,
            self.reservaciones.c.estado.in_(
                ["Confirmada", "Realizada", "Entregada"]
            ),
        ]

        if fecha_fin is not None:
            condiciones.append(
                self.reservaciones.c.fecha_evento < fecha_fin
            )

        consulta = (
            select(self.reservaciones.c.fecha_evento)
            .where(*condiciones)
            .distinct()
            .order_by(self.reservaciones.c.fecha_evento)
        )

        with self.engine.connect() as conexion:
            fechas = conexion.execute(consulta).scalars().all()

        return {
            "anio": anio,
            "mes": mes,
            "fechas_ocupadas": [
                fecha.isoformat() for fecha in fechas
            ],
        }

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
                "payment_deadline": (
                    fila["fecha_limite_anticipo"].isoformat()
                    if fila["fecha_limite_anticipo"]
                    else None
                ),
                "decision_anticipo_pendiente": bool(
                    fila["decision_anticipo_pendiente"]
                ),
                "numero_prorrogas": int(
                    fila["numero_prorrogas"] or 0
                ),
            }
            for fila in filas
        ]

    def crear_reservacion(self, datos):
        if datos.event_date < today():
            raise HTTPException(
                status_code=400,
                detail="No se permiten fechas anteriores a hoy.",
            )
        fecha_limite = calcular_fecha_limite_anticipo()
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
                    fecha_limite_anticipo=fecha_limite,
                    estado="Pendiente de anticipo",
                )
                .returning(self.reservaciones.c.id_reservacion)
            )

            id_reservacion = resultado.scalar_one()

            # Crear la venta automáticamente con la reservación.
            # # Ambas operaciones pertenecen a la misma transacción.
            crear_venta_automatica(
                conexion,
                self.ventas,
                self.detalles_ventas,
                self.usuarios,
                id_reservacion=id_reservacion,
                id_cliente=cliente["id_cliente"],
                paquete=paquete,
                total_centavos=paquete["precio_centavos"],
            )

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
            "payment_deadline": fecha_limite.isoformat(),
            "decision_anticipo_pendiente": False,
            "numero_prorrogas": 0,
        }

    def confirmar_anticipo(
        self,
        id_reservacion,
        monto,
        id_administrador,
    ):
        try:
            monto_decimal = Decimal(str(monto))
            if not monto_decimal.is_finite():
                raise ValueError()
            if monto_decimal.as_tuple().exponent < -2:
                raise ValueError()
            monto_centavos = int(
                (monto_decimal * Decimal("100")).quantize(
                    Decimal("1"),
                    rounding=ROUND_HALF_UP,
                )
            )
        except (ValueError, TypeError, ArithmeticError):
            raise HTTPException(
                status_code=400,
                detail="El importe debe ser válido y tener máximo dos decimales.",
            )

        if monto_centavos <= 0:
            raise HTTPException(
                status_code=400,
                detail="El abono debe ser mayor que cero.",
            )

        try:
            with self.engine.begin() as conexion:
                reserva = conexion.execute(
                    select(self.reservaciones)
                    .where(
                        self.reservaciones.c.id_reservacion == id_reservacion
                    )
                    .with_for_update()
                ).mappings().first()

                if reserva is None:
                    raise HTTPException(
                        status_code=404,
                        detail="Reservación no encontrada.",
                    )

                estado_anterior = reserva["estado"]

                if estado_anterior not in (
                    "Pendiente de anticipo",
                    "Confirmada",
                ):
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            "Solo se pueden registrar abonos en reservaciones "
                            "pendientes de anticipo o confirmadas."
                        ),
                    )

                # Las restricciones de plazo aplican únicamente
                # antes de confirmar la reservación.
                if estado_anterior == "Pendiente de anticipo":
                    if reserva["decision_anticipo_pendiente"]:
                        raise HTTPException(
                            status_code=409,
                            detail=(
                                "La reservación requiere una decisión administrativa. "
                                "Concede una prórroga o cancela la solicitud."
                            ),
                        )

                    fecha_limite = reserva["fecha_limite_anticipo"]

                    if fecha_limite is None:
                        raise HTTPException(
                            status_code=409,
                            detail="La reservación no tiene fecha límite de anticipo.",
                        )

                    if fecha_limite.tzinfo is None:
                        raise HTTPException(
                            status_code=500,
                            detail="La fecha límite no tiene zona horaria.",
                        )

                    if datetime.now(timezone.utc) > fecha_limite.astimezone(timezone.utc):
                        raise HTTPException(
                            status_code=409,
                            detail=(
                                "El plazo para registrar el anticipo ha vencido. "
                                "La solicitud requiere revisión administrativa."
                            ),
                        )

                # Impedir registrar efectivo mientras exista un comprobante
                # de transferencia pendiente de revisión.
                comprobante_pendiente = conexion.execute(
                    select(self.comprobantes_pago.c.id_comprobante)
                    .where(
                        self.comprobantes_pago.c.id_reservacion == id_reservacion,
                        self.comprobantes_pago.c.estado == "Pendiente",
                    )
                    .limit(1)
                ).first()

                if comprobante_pendiente is not None:
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            "Existe un comprobante de transferencia pendiente "
                            "de revisión. Primero debe aprobarse o rechazarse "
                            "antes de registrar un abono en efectivo."
                        ),
                    )

                # Conservar la protección contra pagos pendientes históricos.
                pago_pendiente = conexion.execute(
                    select(self.pagos.c.id_pago)
                    .where(
                        self.pagos.c.id_reservacion == id_reservacion,
                        self.pagos.c.estado == "Pendiente",
                    )
                    .limit(1)
                ).first()

                if pago_pendiente is not None:
                    raise HTTPException(
                        status_code=409,
                        detail=(
                            "Existe un pago pendiente de revisión. "
                            "Primero debe aprobarse o rechazarse."
                        ),
                    )

                # Sumar exclusivamente pagos aprobados.
                pagado = int(
                    conexion.execute(
                        select(
                            func.coalesce(
                                func.sum(self.pagos.c.monto_centavos),
                                0,
                            )
                        ).where(
                            self.pagos.c.id_reservacion == id_reservacion,
                            self.pagos.c.estado == "Aprobado",
                        )
                    ).scalar_one()
                )

                total = int(reserva["total_centavos"])
                saldo_anterior = total - pagado

                if saldo_anterior <= 0:
                    raise HTTPException(
                        status_code=409,
                        detail="La reservación ya está completamente liquidada.",
                    )

                if monto_centavos > saldo_anterior:
                    raise HTTPException(
                        status_code=400,
                        detail=(
                            "El abono no puede superar el saldo pendiente "
                            "de la reservación."
                        ),
                    )

                porcentaje = Decimal(
                    str(reserva["porcentaje_anticipo_minimo"])
                )

                minimo = int(
                    (
                        Decimal(total)
                        * porcentaje
                        / Decimal("100")
                    ).quantize(
                        Decimal("1"),
                        rounding=ROUND_HALF_UP,
                    )
                )

                nuevo_pagado = pagado + monto_centavos
                saldo_nuevo = total - nuevo_pagado

                # Solo se confirma cuando el acumulado alcanza
                # el anticipo mínimo.
                confirmar_ahora = (
                    estado_anterior == "Pendiente de anticipo"
                    and nuevo_pagado >= minimo
                )

                if confirmar_ahora:
                    fecha_ocupada = conexion.execute(
                        select(self.reservaciones.c.id_reservacion)
                        .where(
                            self.reservaciones.c.fecha_evento
                            == reserva["fecha_evento"],
                            self.reservaciones.c.id_reservacion
                            != id_reservacion,
                            self.reservaciones.c.estado.in_(
                                ["Confirmada", "Realizada", "Entregada"]
                            ),
                        )
                        .limit(1)
                    ).first()

                    if fecha_ocupada is not None:
                        raise HTTPException(
                            status_code=409,
                            detail=(
                                "No se puede confirmar esta reservación porque "
                                "la fecha ya está ocupada."
                            ),
                        )

                if saldo_nuevo == 0:
                    tipo_pago = "Liquidacion"
                elif pagado == 0:
                    tipo_pago = "Anticipo"
                else:
                    tipo_pago = "Abono"

                # Cada abono genera un pago independiente.
                # No se sobrescriben ni eliminan pagos anteriores.
                conexion.execute(
                    insert(self.pagos).values(
                        id_reservacion=id_reservacion,
                        monto_centavos=monto_centavos,
                        metodo_pago="Efectivo",
                        tipo_pago=tipo_pago,
                        estado="Aprobado",
                        fecha_validacion=func.now(),
                        validado_por=id_administrador,
                    )
                )

                nuevo_estado = estado_anterior

                if confirmar_ahora:
                    conexion.execute(
                        update(self.reservaciones)
                        .where(
                            self.reservaciones.c.id_reservacion
                            == id_reservacion
                        )
                        .values(
                            estado="Confirmada",
                            decision_anticipo_pendiente=False,
                            actualizada_en=func.now(),
                        )
                    )

                    resultado_venta = conexion.execute(
                        update(self.ventas)
                        .where(
                            self.ventas.c.id_reservacion == id_reservacion,
                            self.ventas.c.estado == "Pendiente",
                        )
                        .values(estado="Confirmada")
                    )

                    if resultado_venta.rowcount != 1:
                        raise HTTPException(
                            status_code=409,
                            detail=(
                                "No se pudo confirmar la venta asociada. "
                                "Verifica que exista y esté pendiente."
                            ),
                        )

                    nuevo_estado = "Confirmada"

                return {
                    "id": id_reservacion,
                    "status": nuevo_estado,
                    "payment_cents": monto_centavos,
                    "paid_cents": nuevo_pagado,
                    "balance_cents": saldo_nuevo,
                    "confirmed_now": confirmar_ahora,
                }

        except IntegrityError as error:
            codigo = (
                getattr(error.orig, "pgcode", None)
                or getattr(error.orig, "sqlstate", None)
            )
            diagnostico = getattr(error.orig, "diag", None)

            nombre_restriccion = (
                getattr(diagnostico, "constraint_name", None)
                if diagnostico is not None
                else None
            )

            if (
                codigo == "23505"
                and nombre_restriccion == "uq_reservacion_fecha_ocupada"
            ):
                raise HTTPException(
                    status_code=409,
                    detail="La fecha ya está ocupada.",
                ) from error

            raise


    def conceder_prorroga(
        self,
        id_reservacion,
        nueva_fecha_limite,
        motivo,
        id_administrador,
    ):
        if nueva_fecha_limite.tzinfo is None:
            raise HTTPException(
                status_code=422,
                detail="La nueva fecha límite debe incluir zona horaria.",
            )

        nueva_fecha_limite = nueva_fecha_limite.astimezone(timezone.utc)
        ahora = datetime.now(timezone.utc)
        motivo = motivo.strip()

        if not motivo:
            raise HTTPException(
                status_code=400,
                detail="Debes proporcionar un motivo para la prórroga.",
            )

        if nueva_fecha_limite <= ahora:
            raise HTTPException(
                status_code=400,
                detail="La nueva fecha límite debe ser futura.",
            )

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
                    detail="La reservación no está pendiente de anticipo.",
                )

            if not reserva["decision_anticipo_pendiente"]:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "La reservación no está esperando "
                        "una decisión administrativa."
                    ),
                )

            fecha_anterior = reserva["fecha_limite_anticipo"]

            if fecha_anterior is None:
                raise HTTPException(
                    status_code=409,
                    detail="La reservación no tiene fecha límite registrada.",
                )

            if nueva_fecha_limite <= fecha_anterior:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "La nueva fecha límite debe ser posterior "
                        "a la fecha límite anterior."
                    ),
                )

            venta = conexion.execute(
                select(self.ventas.c.id_venta)
                .where(
                    self.ventas.c.id_reservacion == id_reservacion,
                    self.ventas.c.estado == "Pendiente",
                )
                .with_for_update()
            ).first()

            if venta is None:
                raise HTTPException(
                    status_code=409,
                    detail="No existe una venta pendiente asociada.",
                )

            administrador = conexion.execute(
                select(self.usuarios.c.id_usuario)
                .where(
                    self.usuarios.c.id_usuario == id_administrador,
                    self.usuarios.c.rol == "Administrador",
                    self.usuarios.c.activo.is_(True),
                )
            ).first()

            if administrador is None:
                raise HTTPException(
                    status_code=403,
                    detail="Administrador activo no encontrado.",
                )

            conexion.execute(
                insert(self.historial_prorrogas_anticipo).values(
                    id_reservacion=id_reservacion,
                    id_usuario_administrador=id_administrador,
                    fecha_limite_anterior=fecha_anterior,
                    fecha_limite_nueva=nueva_fecha_limite,
                    motivo=motivo,
                )
            )

            conexion.execute(
                update(self.reservaciones)
                .where(
                    self.reservaciones.c.id_reservacion
                    == id_reservacion
                )
                .values(
                    fecha_limite_anticipo=nueva_fecha_limite,
                    decision_anticipo_pendiente=False,
                    numero_prorrogas=(
                        self.reservaciones.c.numero_prorrogas + 1
                    ),
                    actualizada_en=func.now(),
                )
            )

        return {
            "id": id_reservacion,
            "status": "Pendiente de anticipo",
            "payment_deadline": nueva_fecha_limite.isoformat(),
            "extension_granted": True,
        }

    def cancelar_reservacion(
        self,
        id_reservacion,
        motivo,
        id_administrador,
    ):
        motivo = (motivo or "").strip()
        if not motivo:
            raise HTTPException(
                status_code=422,
                detail="El motivo de cancelación es obligatorio.",
            )
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

            if reserva["decision_anticipo_pendiente"] is not True:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "La reservación no tiene una decisión "
                        "administrativa pendiente por vencimiento."
                    ),
                )

            administrador = conexion.execute(
                select(self.usuarios)
                .where(
                    self.usuarios.c.id_usuario == id_administrador
                )
            ).mappings().first()

            if administrador is None:
                raise HTTPException(
                    status_code=404,
                    detail="Administrador no encontrado.",
                )

            conexion.execute(
                update(self.reservaciones)
                .where(
                    self.reservaciones.c.id_reservacion
                    == id_reservacion
                )
                .values(
                    estado="Cancelada",
                    decision_anticipo_pendiente=False,
                    actualizada_en=func.now(),
                )
            )

            resultado_venta = conexion.execute(
                update(self.ventas)
                .where(
                    self.ventas.c.id_reservacion == id_reservacion,
                    self.ventas.c.estado == "Pendiente",
                )
                .values(estado="Cancelada")
            )

            if resultado_venta.rowcount != 1:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "No se pudo cancelar la venta asociada. "
                        "Verifica que exista y esté pendiente."
                    ),
                )

            conexion.execute(
                insert(self.historial_reservaciones).values(
                    id_reservacion=id_reservacion,
                    id_usuario=id_administrador,
                    estado_anterior=reserva["estado"],
                    estado_nuevo="Cancelada",
                    comentario=motivo,
                )
            )

        return {
            "id": id_reservacion,
            "status": "Cancelada",
        }
