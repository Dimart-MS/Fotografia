"""Endpoints del catálogo de paquetes."""

from fastapi import APIRouter, Depends, Request


def create_paquetes_router(usuario_autenticado):
    router = APIRouter(
        prefix="/api/paquetes",
        tags=["Paquetes"],
    )

    @router.get("")
    def listar_paquetes(
        request: Request,
        usuario=Depends(usuario_autenticado),
    ):
        return request.app.state.paquetes_repo.listar_paquetes()

    return router
