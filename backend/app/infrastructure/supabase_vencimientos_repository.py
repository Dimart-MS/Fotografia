"""Detección de reservaciones con anticipo vencido.
No cancela reservaciones automáticamente ni elimina registros.
Marca las solicitudes que requieren una decisión administrativa.
"""

from sqlalchemy import select, update, func

class SupabaseVencimientosRepository:

    def __init__(
        self,
        engine,
        reservaciones,
        ventas,
        pagos,
        comprobantes_pago,
    ):
        self.engine = engine
        self.reservaciones = reservaciones
        self.ventas = ventas
        self.pagos = pagos
        self.comprobantes_pago = comprobantes_pago


    def cancelar_vencidas(self):
        """
        Detecta reservaciones cuyo plazo de anticipo venció.

        No cancela automáticamente las reservaciones.
        Las marca para que el administrador decida si
        concede una prórroga o cancela la solicitud.

        Conserva las ventas y todos los registros.
        """
        pendientes_decision = []

        with self.engine.begin() as conexion:
            consulta = (
                select(self.reservaciones)
                .where(
                    self.reservaciones.c.estado == "Pendiente de anticipo",
                    self.reservaciones.c.decision_anticipo_pendiente.is_(False),
                    self.reservaciones.c.fecha_limite_anticipo.is_not(None),
                    self.reservaciones.c.fecha_limite_anticipo < func.now(),
                )
                .with_for_update(skip_locked=True)
            )

            reservas = conexion.execute(
                consulta
            ).mappings().all()

            for reserva in reservas:
                id_reservacion = reserva["id_reservacion"]

                # No intervenir si existe un comprobante
                # presentado dentro del plazo y pendiente de revisión.
                comprobante_vigente = (
                    select(self.comprobantes_pago.c.id_comprobante)
                    .where(
                        self.comprobantes_pago.c.id_reservacion == id_reservacion,
                        self.comprobantes_pago.c.estado == "Pendiente",
                        self.comprobantes_pago.c.enviado_en
                        <= reserva["fecha_limite_anticipo"],
                    )
                    .limit(1)
                )

                pendiente = conexion.execute(
                    comprobante_vigente
                ).first()

                if pendiente is not None:
                    continue

                # La venta debe permanecer pendiente.
                venta = conexion.execute(
                    select(self.ventas.c.id_venta)
                    .where(
                        self.ventas.c.id_reservacion == id_reservacion,
                        self.ventas.c.estado == "Pendiente",
                    )
                    .with_for_update()
                ).first()

                if venta is None:
                    continue

                resultado = conexion.execute(
                    update(self.reservaciones)
                    .where(
                        self.reservaciones.c.id_reservacion == id_reservacion,
                        self.reservaciones.c.estado == "Pendiente de anticipo",
                        self.reservaciones.c.decision_anticipo_pendiente.is_(False),
                    )
                    .values(
                        decision_anticipo_pendiente=True,
                        actualizada_en=func.now(),
                    )
                )

                if resultado.rowcount == 1:
                    pendientes_decision.append(id_reservacion)

        return {
            "total_pendientes_decision": len(pendientes_decision),
            "reservaciones_pendientes_decision": pendientes_decision,
        }
