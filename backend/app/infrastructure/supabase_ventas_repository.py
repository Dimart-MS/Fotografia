"""Ventas y detalle: transacciones atómicas, sin borrados físicos."""
from fastapi import HTTPException
from sqlalchemy import select, insert, update, func
from sqlalchemy.exc import IntegrityError

class SupabaseVentasRepository:
    def __init__(self, engine, ventas, detalles, clientes, reservas, paquetes):
        self.engine = engine
        self.ventas = ventas
        self.detalles = detalles
        self.clientes = clientes
        self.reservas = reservas
        self.paquetes = paquetes

    def _detalles(self, conexion, ids):
        if not ids:
            return {}
        filas = conexion.execute(select(self.detalles).where(self.detalles.c.id_venta.in_(ids)).order_by(self.detalles.c.id_detalle)).mappings().all()
        resultado = {identificador: [] for identificador in ids}
        for fila in filas:
            resultado[fila['id_venta']].append({
                'id_detalle': fila['id_detalle'],
                'id_paquete': fila['id_paquete'],
                'id_servicio': fila['id_servicio'],
                'descripcion': fila['descripcion'],
                'cantidad': fila['cantidad'],
                'precio_unitario_centavos': fila['precio_unitario_centavos'],
                'subtotal_centavos': fila['cantidad'] * fila['precio_unitario_centavos'],
            })
        return resultado

    def catalogo_paquetes(self):
        with self.engine.connect() as conexion:
            filas = conexion.execute(select(self.paquetes.c.id_paquete, self.paquetes.c.clave, self.paquetes.c.nombre, self.paquetes.c.precio_centavos).where(self.paquetes.c.activo.is_(True)).order_by(self.paquetes.c.nombre)).mappings().all()
        return [dict(fila) for fila in filas]

    def listar(self):
        consulta = (select(self.ventas, self.clientes.c.nombre.label('nombre_cliente'))
                    .join(self.clientes, self.ventas.c.id_cliente == self.clientes.c.id_cliente)
                    .order_by(self.ventas.c.id_venta.desc()))
        with self.engine.connect() as conexion:
            filas = conexion.execute(consulta).mappings().all()
            detalles = self._detalles(conexion, [f['id_venta'] for f in filas])
        return [self._serializar(f, detalles.get(f['id_venta'], [])) for f in filas]

    @staticmethod
    def _serializar(fila, conceptos):
        return {
            'id_venta': fila['id_venta'], 'id_cliente': fila['id_cliente'],
            'nombre_cliente': fila['nombre_cliente'], 'id_reservacion': fila['id_reservacion'],
            'id_usuario_vendedor': fila['id_usuario_vendedor'],
            'total_centavos': fila['total_centavos'], 'estado': fila['estado'],
            'observaciones': fila['observaciones'],
            'creada_en': fila['creada_en'].isoformat() if fila['creada_en'] else None,
            'conceptos': conceptos,
        }

    def crear(self, datos, id_vendedor):
        try:
            with self.engine.begin() as conexion:
                cliente = conexion.execute(select(self.clientes).where(
                    self.clientes.c.id_cliente == datos.id_cliente,
                    self.clientes.c.activo.is_(True),
                )).mappings().first()
                if not cliente:
                    raise HTTPException(404, 'Cliente activo no encontrado')

                reserva = None
                if datos.id_reservacion is not None:
                    reserva = conexion.execute(select(self.reservas).where(
                        self.reservas.c.id_reservacion == datos.id_reservacion
                    ).with_for_update()).mappings().first()
                    if not reserva or reserva['id_cliente'] != datos.id_cliente:
                        raise HTTPException(400, 'La reservación no corresponde al cliente')
                    if reserva['estado'] == 'Cancelada':
                        raise HTTPException(409, 'No se puede vender una reservación cancelada')
                    existente = conexion.execute(select(self.ventas.c.id_venta).where(
                        self.ventas.c.id_reservacion == datos.id_reservacion,
                        self.ventas.c.estado != 'Cancelada',
                    )).first()
                    if existente:
                        raise HTTPException(409, 'Esta reservación ya tiene una venta vigente')

                conceptos = []
                if reserva:
                    paquete = conexion.execute(select(self.paquetes).where(
                        self.paquetes.c.id_paquete == reserva['id_paquete']
                    )).mappings().first()
                    if not paquete:
                        raise HTTPException(409, 'No se encontró el paquete de la reservación')
                    # El importe pactado en la reservación prevalece sobre cambios posteriores del catálogo.
                    conceptos.append(dict(id_paquete=paquete['id_paquete'], descripcion=paquete['nombre'],
                                          cantidad=1, precio_unitario_centavos=reserva['total_centavos']))

                for item in datos.conceptos:
                    if item.id_paquete is not None:
                        if reserva and item.id_paquete == reserva['id_paquete']:
                            raise HTTPException(400, 'El paquete de la reservación ya está incluido')
                        paquete = conexion.execute(select(self.paquetes).where(
                            self.paquetes.c.id_paquete == item.id_paquete,
                            self.paquetes.c.activo.is_(True),
                        )).mappings().first()
                        if not paquete:
                            raise HTTPException(404, 'Paquete activo no encontrado')
                        conceptos.append(dict(id_paquete=paquete['id_paquete'], descripcion=paquete['nombre'],
                                              cantidad=item.cantidad, precio_unitario_centavos=paquete['precio_centavos']))
                    else:
                        conceptos.append(dict(id_paquete=None, descripcion=item.descripcion.strip(),
                                              cantidad=item.cantidad, precio_unitario_centavos=item.precio_unitario_centavos))

                total = sum(i['cantidad'] * i['precio_unitario_centavos'] for i in conceptos)
                if total <= 0:
                    raise HTTPException(400, 'El total de la venta debe ser mayor que cero')
                id_venta = conexion.execute(insert(self.ventas).values(
                    id_cliente=datos.id_cliente, id_reservacion=datos.id_reservacion,
                    id_usuario_vendedor=id_vendedor, total_centavos=total,
                    estado='Pendiente', observaciones=datos.observaciones,
                ).returning(self.ventas.c.id_venta)).scalar_one()

                subtotal_col = self.detalles.c.get('subtotal_centavos')
                es_generada = bool(subtotal_col is not None and subtotal_col.computed is not None)
                for item in conceptos:
                    valores = dict(id_venta=id_venta, id_paquete=item['id_paquete'],
                                   id_servicio=None, descripcion=item['descripcion'], cantidad=item['cantidad'],
                                   precio_unitario_centavos=item['precio_unitario_centavos'])
                    if subtotal_col is not None and not es_generada:
                        valores['subtotal_centavos'] = item['cantidad'] * item['precio_unitario_centavos']
                    conexion.execute(insert(self.detalles).values(**valores))
            return self.obtener(id_venta)
        except IntegrityError as exc:
            raise HTTPException(409, 'No se pudo registrar la venta por una restricción de la base de datos') from exc

    def obtener(self, id_venta):
        with self.engine.connect() as conexion:
            fila = conexion.execute(select(self.ventas, self.clientes.c.nombre.label('nombre_cliente'))
                .join(self.clientes, self.ventas.c.id_cliente == self.clientes.c.id_cliente)
                .where(self.ventas.c.id_venta == id_venta)).mappings().first()
            if not fila:
                raise HTTPException(404, 'Venta no encontrada')
            conceptos = self._detalles(conexion, [id_venta])[id_venta]
        return self._serializar(fila, conceptos)

    def cambiar_estado(self, id_venta, nuevo):
        with self.engine.begin() as conexion:
            venta = conexion.execute(select(self.ventas).where(
                self.ventas.c.id_venta == id_venta
            ).with_for_update()).mappings().first()
            if not venta:
                raise HTTPException(404, 'Venta no encontrada')
            if venta['estado'] != 'Pendiente':
                raise HTTPException(409, 'Solo pueden modificarse ventas pendientes')
            conexion.execute(update(self.ventas).where(self.ventas.c.id_venta == id_venta).values(estado=nuevo))
        return self.obtener(id_venta)

def crear_venta_automatica(
    conexion,
    ventas,
    detalles,
    usuarios,
    *,
    id_reservacion,
    id_cliente,
    paquete,
    total_centavos,
):
    """
    Genera una venta automáticamente desde Reservaciones.

    No necesita VENTAS_USUARIO_SISTEMA_ID.
    Utiliza un administrador activo como responsable técnico.
    """

    # 1. Buscar un administrador activo en Supabase.
    administrador = conexion.execute(
        select(usuarios.c.id_usuario)
        .where(
            usuarios.c.rol == "Administrador",
            usuarios.c.activo.is_(True),
        )
        .order_by(usuarios.c.id_usuario.asc())
        .limit(1)
    ).first()

    if administrador is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "No existe un administrador activo para "
                "registrar la venta automática."
            ),
        )

    id_vendedor = administrador.id_usuario

    # 2. Validar que el paquete tenga un precio válido.
    if int(total_centavos) <= 0:
        raise HTTPException(
            status_code=409,
            detail=(
                "El paquete debe tener un precio positivo "
                "para generar una venta."
            ),
        )

    # 3. Evitar duplicar ventas para una misma reservación.
    existente = conexion.execute(
        select(ventas.c.id_venta)
        .where(
            ventas.c.id_reservacion == id_reservacion
        )
    ).first()

    if existente:
        raise HTTPException(
            status_code=409,
            detail="La reservación ya tiene una venta asociada.",
        )

    # 4. Registrar la venta pendiente.
    id_venta = conexion.execute(
        insert(ventas)
        .values(
            id_cliente=id_cliente,
            id_reservacion=id_reservacion,
            id_usuario_vendedor=id_vendedor,
            total_centavos=total_centavos,
            estado="Pendiente",
            observaciones=(
                "Generada automáticamente desde Reservaciones"
            ),
        )
        .returning(ventas.c.id_venta)
    ).scalar_one()

    # 5. Registrar el paquete contratado.
    valores = {
        "id_venta": id_venta,
        "id_paquete": paquete["id_paquete"],
        "id_servicio": None,
        "descripcion": paquete["nombre"],
        "cantidad": 1,
        "precio_unitario_centavos": total_centavos,
    }

    # Respetar si subtotal_centavos es una columna calculada.
    subtotal = detalles.c.get("subtotal_centavos")

    if subtotal is not None and subtotal.computed is None:
        valores["subtotal_centavos"] = total_centavos

    conexion.execute(
        insert(detalles).values(**valores)
    )

    return id_venta