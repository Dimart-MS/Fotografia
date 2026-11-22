"""Rutas de pagos y comprobantes; autenticación y permisos en el servidor."""
from uuid import uuid4
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from app.infrastructure.supabase_comprobantes_storage import SupabaseComprobantesStorage
from app.infrastructure.supabase_pagos_repository import fecha_limite_en_utc
from decimal import Decimal

MAX_BYTES = 10 * 1024 * 1024

class RevisionComprobante(BaseModel):
    motivo: str | None = Field(default=None, max_length=2000)

class AprobacionComprobante(BaseModel):
    monto: Decimal = Field(gt=0, decimal_places=2)

def create_pagos_router(usuario_autenticado):
    router = APIRouter(prefix='/api/pagos', tags=['Pagos'])

    def administrador(usuario=Depends(usuario_autenticado)):
        if usuario['role'] != 'Administrador':
            raise HTTPException(403, 'Acceso exclusivo para administradores.')
        return usuario

    @router.get('')
    def listar(request: Request, usuario=Depends(administrador)):
        return request.app.state.pagos_repo.listar_pagos(usuario)

    @router.get('/mis-pagos')
    def mis_pagos(request: Request, usuario=Depends(usuario_autenticado)):
        if usuario['role'] != 'Cliente':
            raise HTTPException(403, 'Acceso exclusivo para clientes.')
        return request.app.state.pagos_repo.listar_pagos(usuario)

    @router.get('/comprobantes/pendientes')
    def pendientes(request: Request, usuario=Depends(administrador)):
        return request.app.state.pagos_repo.listar_comprobantes_pendientes(usuario)

    @router.get('/mis-comprobantes')
    def mis_comprobantes(
        request: Request,
        usuario=Depends(usuario_autenticado),
    ):
        if usuario['role'] != 'Cliente':
            raise HTTPException(
                403,
                'Acceso exclusivo para clientes.'
            )

        return request.app.state.pagos_repo.listar_mis_comprobantes(
            usuario
        )

    @router.post('/comprobantes', status_code=201)
    async def presentar(
        request: Request,
        id_reservacion: int = Form(..., gt=0),
        archivo: UploadFile = File(...),
        usuario=Depends(usuario_autenticado),
    ):
        if usuario['role'] != 'Cliente':
            raise HTTPException(
                403,
                'Solo los clientes pueden presentar comprobantes.'
            )

        repo = request.app.state.pagos_repo

        # Verificación preliminar antes de subir el archivo.
        # La validación definitiva se realiza en el repositorio,
        # dentro de una transacción.
        with repo.engine.connect() as conexion:
            reserva = conexion.execute(
                select(repo.reservaciones)
                .where(
                    repo.reservaciones.c.id_reservacion
                    == id_reservacion
                )
            ).mappings().first()

        if reserva is None:
            raise HTTPException(
                404,
                'Reservación no encontrada.'
            )

        repo._autorizar_reserva(reserva, usuario)

        estado = reserva['estado']

        if estado not in (
            'Pendiente de anticipo',
            'Confirmada',
        ):
            raise HTTPException(
                409,
                'La reservación no admite un comprobante nuevo.'
            )

        if estado == 'Pendiente de anticipo':
            if reserva['decision_anticipo_pendiente']:
                raise HTTPException(
                    409,
                    'La reservación requiere una decisión '
                    'administrativa. Debes esperar una prórroga.'
                )

            limite = reserva['fecha_limite_anticipo']

            if (
                limite is None
                or datetime.now(timezone.utc)
                > fecha_limite_en_utc(limite)
            ):
                raise HTTPException(
                    409,
                    'La reservación no tiene un plazo vigente.'
                )

        # Comprobar el saldo antes de subir el archivo.
        with repo.engine.connect() as conexion:
            pagado = conexion.execute(
                select(
                    func.coalesce(
                        func.sum(repo.pagos.c.monto_centavos),
                        0,
                    )
                )
                .where(
                    repo.pagos.c.id_reservacion == id_reservacion,
                    repo.pagos.c.estado == 'Aprobado',
                )
            ).scalar_one()

        if int(pagado) >= int(reserva['total_centavos']):
            raise HTTPException(
                409,
                'La reservación ya está liquidada.'
            )

        # Leer como máximo 10 MB más un byte para detectar exceso.
        contenido = await archivo.read(MAX_BYTES + 1)

        if not 0 < len(contenido) <= MAX_BYTES:
            raise HTTPException(
                400,
                'El comprobante debe pesar como máximo 10 MB.'
            )

        # Validar la firma real de la imagen.
        if contenido.startswith(b'\xff\xd8\xff'):
            mime, extension = 'image/jpeg', 'jpg'

        elif contenido.startswith(b'\x89PNG\r\n\x1a\n'):
            mime, extension = 'image/png', 'png'

        else:
            raise HTTPException(
                400,
                'Solo se aceptan imágenes JPG o PNG.'
            )

        ruta = (
            f'reservaciones/{id_reservacion}/'
            f'{uuid4().hex}.{extension}'
        )

        storage = SupabaseComprobantesStorage()
        storage.subir(ruta, contenido, mime)

        try:
            return repo.registrar_comprobante(
                id_reservacion=id_reservacion,
                usuario=usuario,
                ruta_storage=ruta,
                nombre_archivo=(
                    archivo.filename
                    or f'comprobante.{extension}'
                )[:255],
                tipo_mime=mime,
                tamano_bytes=len(contenido),
            )

        except Exception:
            # Limpiar exclusivamente el archivo recién subido
            # si no pudo registrarse en la base de datos.
            try:
                storage.eliminar_objeto_fallido(ruta)

            except Exception:
                import logging

                logging.getLogger(__name__).exception(
                    'No se pudo limpiar el archivo temporal: %s',
                    ruta,
                )

            raise

    @router.get('/comprobantes/{id_comprobante}/archivo')
    def archivo_firmado(id_comprobante: int, request: Request, usuario=Depends(administrador)):
        repo = request.app.state.pagos_repo
        with repo.engine.connect() as conexion:
            fila = conexion.execute(
                select(repo.comprobantes.c.ruta_storage).where(
                    repo.comprobantes.c.id_comprobante == id_comprobante
                )
            ).first()
        if fila is None:
            raise HTTPException(404, 'Comprobante no encontrado.')
        return {'url': SupabaseComprobantesStorage().url_firmada(fila.ruta_storage)}

    @router.post('/comprobantes/{id_comprobante}/aprobar')
    def aprobar(
        id_comprobante: int,
        datos: AprobacionComprobante,
        request: Request,
        usuario=Depends(administrador),
    ):
        return request.app.state.pagos_repo.revisar_comprobante(
            id_comprobante=id_comprobante,
            usuario=usuario,
            aprobar=True,
            monto=datos.monto,
        )

    @router.post('/comprobantes/{id_comprobante}/rechazar')
    def rechazar(id_comprobante: int, datos: RevisionComprobante, request: Request, usuario=Depends(administrador)):
        return request.app.state.pagos_repo.revisar_comprobante(
            id_comprobante=id_comprobante, usuario=usuario, aprobar=False, motivo=datos.motivo,
        )

    return router
