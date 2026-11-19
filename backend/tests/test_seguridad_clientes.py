from contextlib import asynccontextmanager

import pytest
from fastapi.testclient import TestClient

from app.supabase_main import app, usuarios_proxy
from app.core.security import create_access_token


class ClientesRepoSimulado:
    def __init__(self):
        self.operaciones = []

    def inactivar_cliente(self, id_cliente, id_administrador):
        self.operaciones.append(
            ("INACTIVAR", id_cliente, id_administrador)
        )
        return True

    def reactivar_cliente(self, id_cliente, id_administrador):
        self.operaciones.append(
            ("REACTIVAR", id_cliente, id_administrador)
        )
        return True


USUARIOS = {
    1: {
        "id": 1,
        "email": "admin@example.com",
        "role": "Administrador",
        "is_active": True,
        "registro_pendiente": False,
    },
    2: {
        "id": 2,
        "email": "cliente@example.com",
        "role": "Cliente",
        "is_active": True,
        "registro_pendiente": False,
    },
    3: {
        "id": 3,
        "email": "inactivo@example.com",
        "role": "Administrador",
        "is_active": False,
        "registro_pendiente": False,
    },
}


@pytest.fixture
def cliente_http(monkeypatch):
    repo = ClientesRepoSimulado()

    # Evitamos ejecutar el lifespan real, que conecta a Supabase.
    @asynccontextmanager
    async def lifespan_simulado(app):
        app.state.clientes_repo = repo
        yield

    monkeypatch.setattr(
        app.router,
        "lifespan_context",
        lifespan_simulado,
    )

    # Simulamos la consulta de usuarios.
    monkeypatch.setattr(
        usuarios_proxy,
        "get_by_id",
        lambda user_id: USUARIOS.get(user_id),
    )

    with TestClient(app) as cliente:
        yield cliente, repo


def token_usuario(user_id, role):
    return {
        "Authorization": (
            "Bearer " + create_access_token(user_id, role)
        )
    }


@pytest.mark.parametrize(
    "operacion",
    ["inactivar", "reactivar"],
)
def test_sin_token_devuelve_401(cliente_http, operacion):
    cliente, repo = cliente_http

    respuesta = cliente.patch(
        f"/api/supabase/clientes/10/{operacion}"
    )

    assert respuesta.status_code == 401
    assert repo.operaciones == []


@pytest.mark.parametrize(
    "operacion",
    ["inactivar", "reactivar"],
)
def test_cliente_no_tiene_permisos(cliente_http, operacion):
    cliente, repo = cliente_http

    respuesta = cliente.patch(
        f"/api/supabase/clientes/10/{operacion}",
        headers=token_usuario(2, "Cliente"),
    )

    assert respuesta.status_code == 403
    assert repo.operaciones == []


@pytest.mark.parametrize(
    "operacion",
    ["inactivar", "reactivar"],
)
def test_administrador_autorizado(cliente_http, operacion):
    cliente, repo = cliente_http

    respuesta = cliente.patch(
        f"/api/supabase/clientes/10/{operacion}",
        headers=token_usuario(1, "Administrador"),
    )

    assert respuesta.status_code == 200
    assert len(repo.operaciones) == 1
    assert repo.operaciones[0][1:] == (10, 1)


@pytest.mark.parametrize(
    "operacion",
    ["inactivar", "reactivar"],
)
def test_usuario_inactivo_devuelve_401(cliente_http, operacion):
    cliente, repo = cliente_http

    respuesta = cliente.patch(
        f"/api/supabase/clientes/10/{operacion}",
        headers=token_usuario(3, "Administrador"),
    )

    assert respuesta.status_code == 401
    assert repo.operaciones == []


@pytest.mark.parametrize(
    "operacion",
    ["inactivar", "reactivar"],
)
def test_token_invalido_devuelve_401(cliente_http, operacion):
    cliente, repo = cliente_http

    respuesta = cliente.patch(
        f"/api/supabase/clientes/10/{operacion}",
        headers={"Authorization": "Bearer token-invalido"},
    )

    assert respuesta.status_code == 401
    assert repo.operaciones == []
