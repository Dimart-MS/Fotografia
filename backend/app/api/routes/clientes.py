"""Endpoints de clientes de Luz & Memoria."""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import IntegrityError

from app.schemas.clientes import ClienteCrear, ClienteActualizar


def create_clientes_router(solo_administrador, usuario_autenticado):
    router = APIRouter(
        prefix="/api/clientes",
        tags=["Clientes"],
    )

    def obtener_repo(request: Request):
        return request.app.state.clientes_repo


    def formatear_cliente(cliente):
        return {
            "id": cliente["id_cliente"],
            "name": cliente["nombre"],
            "email": cliente["correo"],
            "phone": cliente["telefono"],
            "address": cliente["domicilio"],
            "active": cliente["activo"],
        }

    def verificar_acceso_cliente(usuario, id_cliente):
        if usuario["role"] == "Administrador":
            return

        if (
            usuario["role"] != "Cliente"
            or usuario["client_id"] != id_cliente
        ):
            raise HTTPException(
                status_code=403,
                detail="No tienes permiso para acceder a este cliente.",
            )


    @router.get("")
    def listar(
        request: Request,
        administrador=Depends(solo_administrador),
    ):
        clientes = obtener_repo(request).listar_clientes()
        return [formatear_cliente(cliente) for cliente in clientes]


    @router.get("/{id_cliente}")
    def obtener(
        id_cliente: int,
        request: Request,
        usuario=Depends(usuario_autenticado),
    ):
        verificar_acceso_cliente(usuario, id_cliente)

        cliente = obtener_repo(request).obtener_cliente(id_cliente)

        if cliente is None:
            raise HTTPException(404, "Cliente no encontrado")

        return formatear_cliente(cliente)


    @router.post("", status_code=201)
    def crear(
        datos: ClienteCrear,
        request: Request,
        administrador=Depends(solo_administrador),
    ):
        try:
            cliente = obtener_repo(request).crear_cliente(
                datos.model_dump(),
                administrador["id"],
            )
        except ValueError as error:
            raise HTTPException(409, str(error))
        except IntegrityError:
            raise HTTPException(
                409,
                "El correo ya está registrado",
            )

        respuesta = formatear_cliente(cliente)
        respuesta["temporary_password"] = cliente["temporary_password"]
        return respuesta

    @router.patch("/{id_cliente}")
    def actualizar(
        id_cliente: int,
        datos: ClienteActualizar,
        request: Request,
        usuario=Depends(usuario_autenticado),
    ):
        verificar_acceso_cliente(usuario, id_cliente)
        cambios_frontend = datos.model_dump(exclude_unset=True)

        if not cambios_frontend:
            raise HTTPException(400, "Debes proporcionar al menos un campo")

        equivalencias = {
            "name": "nombre",
            "email": "correo",
            "phone": "telefono",
            "address": "domicilio",
        }

        cambios = {
            equivalencias[clave]: valor
            for clave, valor in cambios_frontend.items()
        }

        try:
            cliente = obtener_repo(request).actualizar_cliente(
                id_cliente,
                cambios,
                usuario["id"],
            )
        except ValueError as error:
            mensaje = str(error)
            codigo = 409 if "correo ya está registrado" in mensaje else 400
            raise HTTPException(codigo, mensaje)
        except IntegrityError:
            raise HTTPException(409, "Datos duplicados")

        if cliente is None:
            raise HTTPException(404, "Cliente no encontrado o inactivo")

        return formatear_cliente(cliente)

    @router.patch("/{id_cliente}/inactivar")
    def inactivar(
        id_cliente: int,
        request: Request,
        administrador=Depends(solo_administrador),
    ):
        resultado = obtener_repo(request).inactivar_cliente(
            id_cliente,
            administrador["id"],
        )

        if not resultado:
            raise HTTPException(404, "Cliente no encontrado o ya inactivo")

        return {
            "message": "Cliente inactivado correctamente",
            "id": id_cliente,
            "active": False,
        }

    @router.patch("/{id_cliente}/reactivar")
    def reactivar(
        id_cliente: int,
        request: Request,
        administrador=Depends(solo_administrador),
    ):
        resultado = obtener_repo(request).reactivar_cliente(
            id_cliente,
            administrador["id"],
        )

        if not resultado:
            raise HTTPException(404, "Cliente no encontrado o ya activo")

        return {
            "message": "Cliente reactivado correctamente",
            "id": id_cliente,
            "active": True,
            "users_reactivated": False,
        }

    return router
