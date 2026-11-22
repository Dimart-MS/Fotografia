"""Consulta administrativa de ventas generadas desde reservaciones."""
from fastapi import APIRouter, Depends, Request

def create_ventas_router(solo_administrador):
    router = APIRouter(prefix="/api/ventas", tags=["Ventas"], dependencies=[Depends(solo_administrador)])

    @router.get("")
    def listar(request: Request):
        return request.app.state.ventas_repo.listar()

    @router.get("/{id_venta}")
    def obtener(id_venta: int, request: Request):
        return request.app.state.ventas_repo.obtener(id_venta)

    return router
