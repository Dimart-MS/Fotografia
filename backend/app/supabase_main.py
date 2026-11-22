"""
API principal de Luz & Memoria conectada a Supabase PostgreSQL.

Inicializa la conexión a la base de datos, los repositorios,
la autenticación JWT y los routers de la aplicación.

No crea ni modifica la estructura de la base de datos.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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

from app.api.routes.galerias import create_galerias_router
from app.infrastructure.supabase_galerias_repository import (
    SupabaseGaleriasRepository,
)
from app.infrastructure.supabase_storage import SupabaseStorage


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
        )

        app.state.galerias_repo = SupabaseGaleriasRepository(
            engine,
            tablas["galerias"],
            tablas["fotografias"],
            tablas["videos"],
            tablas["entregas"],
            tablas["historial_entregas"],
            tablas["reservaciones"],
        )

        app.state.storage = SupabaseStorage()

        yield

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


usuarios_proxy = UsuariosRepoProxy()
usuario_autenticado = require_user(usuarios_proxy)


# ==============================
# SEGURIDAD
# ==============================

solo_administrador = require_role(
    usuarios_proxy,
    "Administrador",
)


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
    create_galerias_router(
        usuario_autenticado,
        solo_administrador,
    )
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
