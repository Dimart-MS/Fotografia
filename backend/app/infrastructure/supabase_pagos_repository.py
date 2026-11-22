"""Persistencia y transiciones de pagos/comprobantes de Luz & Memoria.

No elimina registros. El almacenamiento físico de archivos se realiza en otra capa.
"""
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP

from fastapi import HTTPException
from sqlalchemy import func, insert, select, update
from sqlalchemy.exc import IntegrityError

def fecha_limite_en_utc(fecha):
    if fecha is None:
        return None
    if fecha.tzinfo is None:
        raise ValueError(
            'La fecha límite debe incluir zona horaria.'
        )
    return fecha.astimezone(timezone.utc)

def es_conflicto_fecha_ocupada(error):
    """
    Identifica la violación del índice único
    de fechas ocupadas en PostgreSQL.
    """
    original = error.orig

    codigo = (
        getattr(original, 'pgcode', None)
        or getattr(original, 'sqlstate', None)
    )
    diagnostico = getattr(original, 'diag', None)
    nombre_restriccion = (
        getattr(diagnostico, 'constraint_name', None)
        if diagnostico is not None
        else None
    )
    return (
        codigo == '23505'
        and nombre_restriccion == 'uq_reservacion_fecha_ocupada'
    )

class SupabasePagosRepository:
    def __init__(
        self, engine, pagos, comprobantes_pago, historial_validaciones_pago,
        reservaciones, ventas, clientes, usuarios,
    ):
        self.engine = engine
        self.pagos = pagos
        self.comprobantes = comprobantes_pago
        self.historial = historial_validaciones_pago
        self.reservaciones = reservaciones
        self.ventas = ventas
        self.clientes = clientes
        self.usuarios = usuarios

    @staticmethod
    def _dict(fila):
        if fila is None:
            return None
        return {
            k: v.isoformat() if isinstance(v, datetime) else v
            for k, v in dict(fila).items()
        }

    @staticmethod
    def _centavos(monto):
        try:
            numero = Decimal(str(monto))

            if not numero.is_finite():
                raise ValueError()

            if numero.as_tuple().exponent < -2:
                raise ValueError()

            centavos = int(numero * 100)

        except (ValueError, TypeError, ArithmeticError) as exc:
            raise HTTPException(
                400,
                'El importe debe ser válido y tener máximo dos decimales.'
            ) from exc

        if centavos <= 0:
            raise HTTPException(
                400,
                'El importe debe ser mayor que cero.'
            )
        return centavos

    @staticmethod
    def _es_admin(usuario):
        return usuario.get('role') == 'Administrador'

    def _autorizar_reserva(self, reserva, usuario):
        if not self._es_admin(usuario) and (
            usuario.get('role') != 'Cliente'
            or usuario.get('client_id') is None
            or int(usuario['client_id']) != int(reserva['id_cliente'])
        ):
            raise HTTPException(403, 'No tienes acceso a esta reservación.')

    def listar_pagos(self, usuario):
        consulta = (
            select(self.pagos, self.clientes.c.nombre.label('nombre_cliente'))
            .join(self.reservaciones, self.pagos.c.id_reservacion == self.reservaciones.c.id_reservacion)
            .join(self.clientes, self.reservaciones.c.id_cliente == self.clientes.c.id_cliente)
            .order_by(self.pagos.c.creado_en.desc(), self.pagos.c.id_pago.desc())
        )
        if not self._es_admin(usuario):
            if usuario.get('role') != 'Cliente' or usuario.get('client_id') is None:
                raise HTTPException(403, 'No tienes acceso a pagos.')
            consulta = consulta.where(self.reservaciones.c.id_cliente == usuario['client_id'])
        with self.engine.connect() as conexion:
            filas = conexion.execute(consulta).mappings().all()
        return [self._dict(f) for f in filas]


    def listar_comprobantes_pendientes(self, usuario):
        if not self._es_admin(usuario):
            raise HTTPException(
                403,
                'Acceso exclusivo para administradores.'
            )

        consulta = (
            select(
                self.comprobantes,
                self.comprobantes.c.id_reservacion,
                self.pagos.c.monto_centavos,
                self.pagos.c.metodo_pago,
                self.clientes.c.nombre.label('nombre_cliente'),
            )
            .select_from(self.comprobantes)
            .outerjoin(
                self.pagos,
                self.comprobantes.c.id_pago == self.pagos.c.id_pago,
            )
            .join(
                self.reservaciones,
                self.comprobantes.c.id_reservacion
                == self.reservaciones.c.id_reservacion,
            )
            .join(
                self.clientes,
                self.reservaciones.c.id_cliente
                == self.clientes.c.id_cliente,
            )
            .where(self.comprobantes.c.estado == 'Pendiente')
            .order_by(
                self.comprobantes.c.enviado_en.asc(),
                self.comprobantes.c.id_comprobante.asc(),
            )
        )

        with self.engine.connect() as conexion:
            filas = conexion.execute(consulta).mappings().all()

        return [self._dict(fila) for fila in filas]


    def listar_mis_comprobantes(self, usuario):
        if (
            usuario.get('role') != 'Cliente'
            or usuario.get('client_id') is None
        ):
            raise HTTPException(
                403,
                'Acceso exclusivo para clientes.'
            )

        consulta = (
            select(
                self.comprobantes,
                self.pagos.c.monto_centavos,
                self.pagos.c.metodo_pago,
            )
            .select_from(self.comprobantes)
            .join(
                self.reservaciones,
                self.comprobantes.c.id_reservacion
                == self.reservaciones.c.id_reservacion,
            )
            .outerjoin(
                self.pagos,
                self.comprobantes.c.id_pago == self.pagos.c.id_pago,
            )
            .where(
                self.reservaciones.c.id_cliente
                == usuario['client_id']
            )
            .order_by(
                self.comprobantes.c.enviado_en.desc(),
                self.comprobantes.c.id_comprobante.desc(),
            )
        )

        with self.engine.connect() as conexion:
            filas = conexion.execute(consulta).mappings().all()

        return [self._dict(fila) for fila in filas]


    def registrar_comprobante(
        self, *, id_reservacion, usuario,
        ruta_storage, nombre_archivo, tipo_mime, tamano_bytes,
    ):
        """
        Registra el comprobante sin crear un pago.

        El importe será registrado exclusivamente por un administrador
        durante la aprobación.

        El archivo ya debe existir en Storage.
        """
        if (
            usuario.get('role') != 'Cliente'
            or usuario.get('client_id') is None
        ):
            raise HTTPException(
                403,
                'Solo el cliente puede presentar su comprobante.'
            )

        if tipo_mime not in ('image/jpeg', 'image/png'):
            raise HTTPException(
                400,
                'Solo se aceptan imágenes JPEG o PNG.'
            )

        if (
            not isinstance(tamano_bytes, int)
            or not 0 < tamano_bytes <= 10485760
        ):
            raise HTTPException(
                400,
                'El archivo debe tener entre 1 byte y 10 MB.'
            )

        if not ruta_storage or not nombre_archivo:
            raise HTTPException(400, 'Faltan datos del archivo.')

        ahora = datetime.now(timezone.utc)

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
                    404,
                    'Reservación no encontrada.'
                )

            self._autorizar_reserva(reserva, usuario)

            estado_actual = reserva['estado']

            if estado_actual not in (
                'Pendiente de anticipo',
                'Confirmada',
            ):
                raise HTTPException(
                    409,
                    'La reservación no admite nuevos comprobantes.'
                )

            pagos_aprobados = conexion.execute(
                select(
                    func.coalesce(
                        func.sum(self.pagos.c.monto_centavos),
                        0,
                    )
                )
                .where(
                    self.pagos.c.id_reservacion == id_reservacion,
                    self.pagos.c.estado == 'Aprobado',
                )
            ).scalar_one()

            total = int(reserva['total_centavos'])
            pagado = int(pagos_aprobados)

            if pagado >= total:
                raise HTTPException(
                    409,
                    'La reservación ya está liquidada.'
                )

            if estado_actual == 'Pendiente de anticipo':
                if reserva['decision_anticipo_pendiente']:
                    raise HTTPException(
                        409,
                        'La reservación requiere una decisión '
                        'administrativa antes de recibir otro comprobante.'
                    )

                limite = reserva['fecha_limite_anticipo']

                if limite is None:
                    raise HTTPException(
                        409,
                        'La reservación no tiene un plazo configurado.'
                    )

                if ahora > fecha_limite_en_utc(limite):
                    raise HTTPException(
                        409,
                        'El plazo para presentar el anticipo ha vencido.'
                    )

            pendiente = conexion.execute(
                select(self.comprobantes.c.id_comprobante)
                .where(
                    self.comprobantes.c.id_reservacion
                    == id_reservacion,
                    self.comprobantes.c.estado == 'Pendiente',
                )
                .limit(1)
            ).first()

            if pendiente is not None:
                raise HTTPException(
                    409,
                    'Ya existe un comprobante pendiente de revisión.'
                )

            id_comprobante = conexion.execute(
                insert(self.comprobantes)
                .values(
                    id_reservacion=id_reservacion,
                    id_pago=None,
                    id_usuario_remitente=usuario['id'],
                    ruta_storage=ruta_storage,
                    nombre_archivo=nombre_archivo,
                    tipo_mime=tipo_mime,
                    tamano_bytes=tamano_bytes,
                    estado='Pendiente',
                    enviado_en=ahora,
                )
                .returning(self.comprobantes.c.id_comprobante)
            ).scalar_one()

            if estado_actual == 'Pendiente de anticipo':
                conexion.execute(
                    update(self.reservaciones)
                    .where(
                        self.reservaciones.c.id_reservacion
                        == id_reservacion
                    )
                    .values(
                        estado='Comprobante enviado',
                        actualizada_en=func.now(),
                    )
                )

        return {
            'id_pago': None,
            'id_comprobante': id_comprobante,
            'id_reservacion': id_reservacion,
            'estado': 'Pendiente',
        }


    def revisar_comprobante(
        self, *, id_comprobante, usuario,
        aprobar, motivo=None, monto=None,
    ):
        if not self._es_admin(usuario):
            raise HTTPException(
                403,
                'Acceso exclusivo para administradores.'
            )

        if aprobar:
            if monto is None:
                raise HTTPException(
                    400,
                    'Debes indicar el importe verificado.'
                )
            centavos = self._centavos(monto)
        else:
            if not (motivo or '').strip():
                raise HTTPException(
                    400,
                    'Debes indicar el motivo del rechazo.'
                )
            centavos = None

        ahora = datetime.now(timezone.utc)

        try:
            with self.engine.begin() as conexion:
                relacion = conexion.execute(
                    select(self.comprobantes.c.id_reservacion)
                    .where(
                        self.comprobantes.c.id_comprobante
                        == id_comprobante
                    )
                ).first()

                if relacion is None:
                    raise HTTPException(
                        404,
                        'Comprobante no encontrado.'
                    )

                id_reservacion = relacion.id_reservacion

                # Mantener el orden de bloqueo:
                # reservación -> comprobante -> pago existente.
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
                        404,
                        'Reservación no encontrada.'
                    )

                comprobante = conexion.execute(
                    select(self.comprobantes)
                    .where(
                        self.comprobantes.c.id_comprobante
                        == id_comprobante
                    )
                    .with_for_update()
                ).mappings().first()

                if (
                    comprobante is None
                    or comprobante['estado'] != 'Pendiente'
                ):
                    raise HTTPException(
                        409,
                        'Este comprobante ya fue revisado.'
                    )

                pago = None

                if comprobante['id_pago'] is not None:
                    pago = conexion.execute(
                        select(self.pagos)
                        .where(
                            self.pagos.c.id_pago
                            == comprobante['id_pago']
                        )
                        .with_for_update()
                    ).mappings().first()

                    if pago is None or pago['estado'] != 'Pendiente':
                        raise HTTPException(
                            409,
                            'El pago asociado ya fue revisado.'
                        )

                estado_anterior = reserva['estado']

                if estado_anterior not in (
                    'Comprobante enviado',
                    'Confirmada',
                ):
                    raise HTTPException(
                        409,
                        'La reservación no admite esta revisión.'
                    )

                total = int(reserva['total_centavos'])

                pagado = int(
                    conexion.execute(
                        select(
                            func.coalesce(
                                func.sum(self.pagos.c.monto_centavos),
                                0,
                            )
                        )
                        .where(
                            self.pagos.c.id_reservacion
                            == id_reservacion,
                            self.pagos.c.estado == 'Aprobado',
                        )
                    ).scalar_one()
                )

                minimo = int(
                    (
                        Decimal(total)
                        * Decimal(
                            str(reserva['porcentaje_anticipo_minimo'])
                        )
                        / Decimal(100)
                    ).quantize(
                        Decimal('1'),
                        rounding=ROUND_HALF_UP,
                    )
                )

                id_pago = (
                    pago['id_pago']
                    if pago is not None
                    else None
                )

                confirmar_ahora = False

                if aprobar:
                    saldo = total - pagado

                    if centavos > saldo:
                        raise HTTPException(
                            409,
                            'El importe supera el saldo pendiente.'
                        )

                    nuevo_pagado = pagado + centavos

                    confirmar_ahora = (
                        estado_anterior == 'Comprobante enviado'
                        and nuevo_pagado >= minimo
                    )

                    if confirmar_ahora:
                        fecha_ocupada = conexion.execute(
                            select(
                                self.reservaciones.c.id_reservacion
                            )
                            .where(
                                self.reservaciones.c.fecha_evento
                                == reserva['fecha_evento'],
                                self.reservaciones.c.id_reservacion
                                != id_reservacion,
                                self.reservaciones.c.estado.in_(
                                    [
                                        'Confirmada',
                                        'Realizada',
                                        'Entregada',
                                    ]
                                ),
                            )
                            .limit(1)
                        ).first()

                        if fecha_ocupada is not None:
                            raise HTTPException(
                                409,
                                'No se puede confirmar la reservación '
                                'porque la fecha del evento está ocupada.'
                            )

                    if nuevo_pagado == total:
                        tipo_pago = 'Liquidacion'
                    elif pagado < minimo:
                        tipo_pago = 'Anticipo'
                    else:
                        tipo_pago = 'Abono'

                    if pago is None:
                        id_pago = conexion.execute(
                            insert(self.pagos)
                            .values(
                                id_reservacion=id_reservacion,
                                monto_centavos=centavos,
                                metodo_pago='Transferencia',
                                tipo_pago=tipo_pago,
                                estado='Aprobado',
                                fecha_pago=ahora,
                                fecha_validacion=ahora,
                                validado_por=usuario['id'],
                            )
                            .returning(self.pagos.c.id_pago)
                        ).scalar_one()
                    else:
                        # Compatibilidad con comprobantes antiguos
                        # que ya tenían un pago pendiente.
                        conexion.execute(
                            update(self.pagos)
                            .where(
                                self.pagos.c.id_pago == id_pago
                            )
                            .values(
                                monto_centavos=centavos,
                                tipo_pago=tipo_pago,
                                estado='Aprobado',
                                validado_por=usuario['id'],
                                fecha_validacion=ahora,
                            )
                        )

                    nuevo_estado = 'Aprobado'

                else:
                    nuevo_pagado = pagado
                    nuevo_estado = 'Rechazado'

                    if pago is not None:
                        conexion.execute(
                            update(self.pagos)
                            .where(
                                self.pagos.c.id_pago
                                == pago['id_pago']
                            )
                            .values(estado='Rechazado')
                        )

                conexion.execute(
                    update(self.comprobantes)
                    .where(
                        self.comprobantes.c.id_comprobante
                        == id_comprobante
                    )
                    .values(
                        id_pago=id_pago,
                        estado=nuevo_estado,
                        motivo_rechazo=(
                            None if aprobar else motivo.strip()
                        ),
                        revisado_por=usuario['id'],
                        revisado_en=ahora,
                    )
                )

                conexion.execute(
                    insert(self.historial)
                    .values(
                        id_comprobante=id_comprobante,
                        id_usuario=usuario['id'],
                        estado_anterior='Pendiente',
                        estado_nuevo=nuevo_estado,
                        motivo=(
                            None if aprobar else motivo.strip()
                        ),
                        registrado_en=ahora,
                    )
                )

                if estado_anterior == 'Confirmada':
                    # Un abono posterior nunca debe devolver
                    # la reservación a un estado anterior.
                    estado_reserva = 'Confirmada'
                    decision_pendiente = False

                elif confirmar_ahora:
                    estado_reserva = 'Confirmada'
                    decision_pendiente = False

                else:
                    estado_reserva = 'Pendiente de anticipo'
                    limite = reserva['fecha_limite_anticipo']

                    decision_pendiente = (
                        limite is not None
                        and ahora > fecha_limite_en_utc(limite)
                    )

                conexion.execute(
                    update(self.reservaciones)
                    .where(
                        self.reservaciones.c.id_reservacion
                        == id_reservacion
                    )
                    .values(
                        estado=estado_reserva,
                        decision_anticipo_pendiente=decision_pendiente,
                        actualizada_en=func.now(),
                    )
                )

                if confirmar_ahora:
                    actualizado = conexion.execute(
                        update(self.ventas)
                        .where(
                            self.ventas.c.id_reservacion
                            == id_reservacion,
                            self.ventas.c.estado == 'Pendiente',
                        )
                        .values(estado='Confirmada')
                    )

                    if actualizado.rowcount != 1:
                        raise HTTPException(
                            409,
                            'No se pudo confirmar la venta asociada.'
                        )

        except IntegrityError as error:
            if es_conflicto_fecha_ocupada(error):
                raise HTTPException(
                    409,
                    'No se puede aprobar el comprobante porque '
                    'la fecha del evento ya está ocupada.'
                ) from error

            raise

        return {
            'id_comprobante': id_comprobante,
            'id_pago': id_pago,
            'id_reservacion': id_reservacion,
            'estado': nuevo_estado,
            'estado_reservacion': estado_reserva,
            'total_centavos': total,
            'pagado_centavos': nuevo_pagado,
            'saldo_centavos': total - nuevo_pagado,
        }