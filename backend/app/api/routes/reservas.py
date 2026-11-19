"""Endpoints de reservaciones del estudio."""

from fastapi import APIRouter, Depends, Request

from app.schemas.reservas import (
    ReservaCrear,
    AnticipoConfirmar,
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
            from fastapi import HTTPException

            raise HTTPException(
                status_code=403,
                detail="Acceso exclusivo para administradores.",
            )

        return usuario

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
                from fastapi import HTTPException

                raise HTTPException(
                    status_code=403,
                    detail=(
                        "Solo puedes crear reservaciones "
                        "para tu propia cuenta."
                    ),
                )

        elif usuario["role"] != "Administrador":
            from fastapi import HTTPException

            raise HTTPException(
                status_code=403,
                detail="No tienes permisos para crear reservaciones.",
            )

        return request.app.state.reservas_repo.crear_reservacion(
            datos
        )

    @router.post("/{id_reservacion}/confirmar")
    def confirmar_anticipo(
        id_reservacion: int,
        datos: AnticipoConfirmar,
        request: Request,
        usuario=Depends(solo_administrador),
    ):
        return request.app.state.reservas_repo.confirmar_anticipo(
            id_reservacion,
            datos.amount,
            usuario["id"],
        )

    @router.post("/{id_reservacion}/cancelar")
    def cancelar_reservacion(
        id_reservacion: int,
        request: Request,
        usuario=Depends(solo_administrador),
    ):
        return request.app.state.reservas_repo.cancelar_reservacion(
            id_reservacion
        )

    return router
