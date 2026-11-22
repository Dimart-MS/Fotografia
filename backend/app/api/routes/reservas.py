"""Endpoints de reservaciones del estudio."""

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request

from app.schemas.reservas import (
    ReservaCrear,
    AnticipoConfirmar,
    ProrrogaAnticipoCrear,
    CancelacionReservaCrear,
)


def create_reservas_router(usuario_autenticado):
    router = APIRouter(
        prefix="/api/reservas",
        tags=["Reservaciones"],
    )

    def solo_administrador(
        usuario=Depends(usuario_autenticado),
    ):
        if usuario["role"] != "Administrador":
            raise HTTPException(
                status_code=403,
                detail="Acceso exclusivo para administradores.",
            )

        return usuario

    @router.get("/disponibilidad")
    def consultar_disponibilidad(
        request: Request,
        anio: int = Query(..., ge=1, le=9999),
        mes: int = Query(..., ge=1, le=12),
    ):
        """
        Consulta pública de fechas ocupadas.

        No requiere autenticación porque únicamente
        devuelve fechas, sin información de clientes.
        """
        return request.app.state.reservas_repo.obtener_fechas_ocupadas(
            anio=anio,
            mes=mes,
        )

    @router.get("")
    def listar_reservaciones(
        request: Request,
        usuario=Depends(usuario_autenticado),
    ):
        return request.app.state.reservas_repo.listar_reservaciones(
            usuario
        )

    @router.post("", status_code=201)
    def crear_reservacion(
        datos: ReservaCrear,
        request: Request,
        usuario=Depends(usuario_autenticado),
    ):
        if usuario["role"] == "Cliente":
            if usuario["client_id"] != datos.client_id:
                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Solo puedes crear reservaciones "
                        "para tu propia cuenta."
                    ),
                )

        elif usuario["role"] != "Administrador":
            raise HTTPException(
                status_code=403,
                detail="No tienes permisos para crear reservaciones.",
            )

        return request.app.state.reservas_repo.crear_reservacion(
            datos
        )

    @router.post("/{id_reservacion}/confirmar")
    def confirmar_anticipo(
        datos: AnticipoConfirmar,
        request: Request,
        id_reservacion: int = Path(..., gt=0),
        usuario=Depends(solo_administrador),
    ):
        return request.app.state.reservas_repo.confirmar_anticipo(
            id_reservacion,
            datos.amount,
            usuario["id"],
        )

    @router.post("/{id_reservacion}/cancelar")
    def cancelar_reservacion(
        datos: CancelacionReservaCrear,
        request: Request,
        id_reservacion: int = Path(..., gt=0),
        usuario=Depends(solo_administrador),
    ):
        return request.app.state.reservas_repo.cancelar_reservacion(
            id_reservacion=id_reservacion,
            motivo=datos.motivo,
            id_administrador=usuario["id"],
        )

    @router.post("/{id_reservacion}/prorroga")
    def conceder_prorroga(
        datos: ProrrogaAnticipoCrear,
        request: Request,
        id_reservacion: int = Path(..., gt=0),
        usuario=Depends(solo_administrador),
    ):
        return request.app.state.reservas_repo.conceder_prorroga(
            id_reservacion=id_reservacion,
            nueva_fecha_limite=datos.nueva_fecha_limite,
            motivo=datos.motivo,
            id_administrador=usuario["id"],
        )
    return router
