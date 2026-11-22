"""
API principal de Luz & Memoria conectada a Supabase PostgreSQL.

Inicializa la conexión a la base de datos, los repositorios,
la autenticación JWT y los routers de la aplicación.

No crea ni modifica la estructura de la base de datos.
"""
import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends, HTTPException
from app.api.routes.clientes import create_clientes_router
from app.auth import create_auth_router
from app.core.config import settings
from app.core.security import require_role
from app.domain.supabase_models import cargar_modelos_supabase
from app.infrastructure.database import (
    check_database_health,
    supabase_database,
)
from app.infrastructure.supabase_clientes_repository import (
    SupabaseClientesRepository,
)
from app.infrastructure.supabase_users_repository import (
    SupabaseUserRepository,
)
from app.api.routes.paquetes import create_paquetes_router
from app.api.routes.reservas import create_reservas_router

from app.infrastructure.supabase_paquetes_repository import (
    SupabasePaquetesRepository,
)
from app.infrastructure.supabase_reservas_repository import (
    SupabaseReservasRepository,
)

from app.core.security import require_user
from app.api.routes.ventas import create_ventas_router
from app.api.routes.pagos import create_pagos_router
from app.infrastructure.supabase_ventas_repository import SupabaseVentasRepository
from app.infrastructure.supabase_pagos_repository import (
    SupabasePagosRepository,
)
from app.infrastructure.supabase_vencimientos_repository import (
    SupabaseVencimientosRepository,
)

logger = logging.getLogger(__name__)
async def revisar_vencimientos_periodicamente(app: FastAPI):
    """
    Revisa los anticipos vencidos cada 60 segundos.
    No cancela automáticamente reservaciones.
    Marca las solicitudes que requieren una
    decisión administrativa.
    """
    while True:
        try:
            resultado = await asyncio.to_thread(
                app.state.vencimientos_repo.cancelar_vencidas
            )
            if resultado["total_pendientes_decision"] > 0:
                logger.info(
                    "Reservaciones pendientes de decisión: %s",
                    resultado["reservaciones_pendientes_decision"],
                )
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception(
                "Error al revisar vencimientos de anticipos."
            )
        await asyncio.sleep(60)

# ==============================
# CICLO DE VIDA DE LA APLICACIÓN
# ==============================

@asynccontextmanager
async def lifespan(app: FastAPI):
    engine = supabase_database()

    try:
        _, tablas = cargar_modelos_supabase(engine)

        app.state.engine = engine

        app.state.clientes_repo = SupabaseClientesRepository(
            engine,
            tablas["clientes"],
            tablas["usuarios"],
            tablas["auditoria"],
        )

        app.state.usuarios_repo = SupabaseUserRepository(
            engine,
            tablas["usuarios"],
            tablas["clientes"],
        )

        app.state.paquetes_repo = SupabasePaquetesRepository(
            engine,
            tablas["paquetes"],
            tablas["auditoria"],
        )

        app.state.reservas_repo = SupabaseReservasRepository(
            engine,
            tablas["reservaciones"],
            tablas["clientes"],
            tablas["paquetes"],
            tablas["pagos"],
            tablas["ventas"],
            tablas["detalle_ventas"],
            tablas["usuarios"],
            tablas["historial_prorrogas_anticipo"],
            tablas["comprobantes_pago"],
            tablas["historial_reservaciones"],
        )

        app.state.ventas_repo = SupabaseVentasRepository(
            engine,
            tablas["ventas"],
            tablas["detalle_ventas"],
            tablas["clientes"],
            tablas["reservaciones"],
            tablas["paquetes"],
        )

        app.state.pagos_repo = SupabasePagosRepository(
            engine,
            tablas["pagos"],
            tablas["comprobantes_pago"],
            tablas["historial_validaciones_pago"],
            tablas["reservaciones"],
            tablas["ventas"],
            tablas["clientes"],
            tablas["usuarios"],
        )

        app.state.vencimientos_repo = SupabaseVencimientosRepository(
            engine,
            tablas["reservaciones"],
            tablas["ventas"],
            tablas["pagos"],
            tablas["comprobantes_pago"],
        )
        tarea_vencimientos = asyncio.create_task(
            revisar_vencimientos_periodicamente(app)
        )
        try:
            yield
        finally:
            tarea_vencimientos.cancel()
            try:
                await tarea_vencimientos
            except asyncio.CancelledError:
                pass
    finally:
        engine.dispose()


# ==============================
# APLICACIÓN FASTAPI
# ==============================

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
)


# ==============================
# CONFIGURACIÓN CORS
# ==============================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5175",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],
    allow_headers=[
        "Authorization",
        "Content-Type",
    ],
)


# ==============================
# REPOSITORIO DE USUARIOS
# ==============================

class UsuariosRepoProxy:
    """
    Permite que los routers accedan al repositorio
    inicializado durante el arranque de FastAPI.
    """

    def get_by_email(self, email):
        return app.state.usuarios_repo.get_by_email(email)

    def get_by_id(self, user_id):
        return app.state.usuarios_repo.get_by_id(user_id)

    def register_client(self, body, password_hash):
        return app.state.usuarios_repo.register_client(
            body,
            password_hash,
        )

    def change_password(self, user_id, current_password, new_password):
        return app.state.usuarios_repo.change_password(
            user_id,
            current_password,
            new_password,
        )


usuarios_proxy = UsuariosRepoProxy()

# Autenticación básica: permite cambiar la contraseña temporal.
usuario_autenticado_basico = require_user(usuarios_proxy)


def usuario_autenticado(
    usuario=Depends(usuario_autenticado_basico),
):
    """Impide utilizar el sistema con una contraseña temporal."""
    if usuario.get("must_change_password", False):
        raise HTTPException(
            status_code=403,
            detail="Debes cambiar tu contraseña temporal antes de continuar.",
        )

    return usuario


# ==============================
# SEGURIDAD
# ==============================

def solo_administrador(
    usuario=Depends(usuario_autenticado),
):
    if usuario["role"] != "Administrador":
        raise HTTPException(
            status_code=403,
            detail="Acceso exclusivo para administradores.",
        )

    return usuario


# ==============================
# REGISTRO DE ROUTERS
# ==============================

app.include_router(
    create_auth_router(usuarios_proxy)
)

app.include_router(
    create_clientes_router(
        solo_administrador,
        usuario_autenticado,
    )
)

app.include_router(
    create_paquetes_router(
        solo_administrador,
        usuario_autenticado,
    )
)

app.include_router(
    create_reservas_router(usuario_autenticado)
)

app.include_router(
    create_ventas_router(solo_administrador)
)

app.include_router(
    create_pagos_router(usuario_autenticado)
)

# ==============================
# SALUD DEL SERVICIO
# ==============================

@app.get("/health", tags=["Salud"])
def health():
    check_database_health(app.state.engine)

    return {
        "status": "ok",
        "database": "supabase",
        "service": "luz-memoria-api",
    }
