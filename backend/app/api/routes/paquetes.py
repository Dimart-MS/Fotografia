"""Endpoints administrativos y de consulta del catálogo de paquetes."""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import IntegrityError

from app.schemas.paquetes import PaqueteCrear, PaqueteActualizar


def create_paquetes_router(solo_administrador, usuario_autenticado):
    router = APIRouter(
        prefix="/api/paquetes",
        tags=["Paquetes"],
    )

    def obtener_repo(request: Request):
        return request.app.state.paquetes_repo

    @router.get("")
    def listar_paquetes(request: Request):
        return obtener_repo(request).listar_paquetes()
    
    @router.get("/administracion")
    def listar_todos(
        request: Request,
        administrador=Depends(solo_administrador),
    ):
        return obtener_repo(request).listar_paquetes(
            incluir_inactivos=True
        )

    @router.post("", status_code=201)
    def crear(
        datos: PaqueteCrear,
        request: Request,
        administrador=Depends(solo_administrador),
    ):
        try:
            return obtener_repo(request).crear_paquete(
                datos.model_dump(),
                administrador["id"],
            )
        except ValueError as error:
            raise HTTPException(409, str(error))
        except IntegrityError:
            raise HTTPException(409, "La clave del paquete ya existe")

    @router.patch("/{clave}")
    def actualizar(
        clave: str,
        datos: PaqueteActualizar,
        request: Request,
        administrador=Depends(solo_administrador),
    ):
        cambios = datos.model_dump(exclude_unset=True)

        if not cambios:
            raise HTTPException(
                400,
                "Debes proporcionar al menos un campo para actualizar",
            )

        try:
            paquete = obtener_repo(request).actualizar_paquete(
                clave,
                cambios,
                administrador["id"],
            )
        except ValueError as error:
            raise HTTPException(400, str(error))
        except IntegrityError:
            raise HTTPException(409, "No se pudo actualizar el paquete")

        if paquete is None:
            raise HTTPException(404, "Paquete no encontrado o inactivo")

        return paquete

    @router.patch("/{clave}/inactivar")
    def inactivar(
        clave: str,
        request: Request,
        administrador=Depends(solo_administrador),
    ):
        resultado = obtener_repo(request).cambiar_estado(
            clave,
            False,
            administrador["id"],
        )

        if not resultado:
            raise HTTPException(404, "Paquete no encontrado o ya inactivo")

        return {"message": "Paquete inactivado correctamente", "active": False}

    @router.patch("/{clave}/reactivar")
    def reactivar(
        clave: str,
        request: Request,
        administrador=Depends(solo_administrador),
    ):
        resultado = obtener_repo(request).cambiar_estado(
            clave,
            True,
            administrador["id"],
        )

        if not resultado:
            raise HTTPException(404, "Paquete no encontrado o ya activo")

        return {"message": "Paquete reactivado correctamente", "active": True}

    return router