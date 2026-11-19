from contextlib import asynccontextmanager

import pytest
from fastapi.testclient import TestClient

from app.supabase_main import app, usuarios_proxy
from app.core.security import hash_password


PASSWORD = "PruebaSegura2026!"


class UsuariosRepoSimulado:
    def __init__(self):
        self.usuarios = {}
        self.siguiente_id = 1

    def get_by_email(self, email):
        return next(
            (
                usuario
                for usuario in self.usuarios.values()
                if usuario["email"] == email.strip().lower()
            ),
            None,
        )

    def get_by_id(self, user_id):
        return self.usuarios.get(user_id)

    def register_client(self, body, password_hash):
        user_id = self.siguiente_id
        self.siguiente_id += 1

        usuario = {
            "id": user_id,
            "client_id": user_id,
            "email": body.email,
            "password_hash": password_hash,
            "role": "Cliente",
            "is_active": True,
            "registro_pendiente": False,
        }

        self.usuarios[user_id] = usuario
        return usuario


@pytest.fixture
def entorno_auth(monkeypatch):
    repo = UsuariosRepoSimulado()

    @asynccontextmanager
    async def lifespan_simulado(app):
        yield

    monkeypatch.setattr(
        app.router,
        "lifespan_context",
        lifespan_simulado,
    )

    monkeypatch.setattr(
        usuarios_proxy,
        "get_by_email",
        repo.get_by_email,
    )

    monkeypatch.setattr(
        usuarios_proxy,
        "get_by_id",
        repo.get_by_id,
    )

    monkeypatch.setattr(
        usuarios_proxy,
        "register_client",
        repo.register_client,
    )

    with TestClient(app) as cliente:
        yield cliente, repo


def datos_registro():
    return {
        "name": "Cliente Automatizado",
        "phone": "4770000000",
        "email": "cliente.test@example.com",
        "address": "Domicilio de prueba 123",
        "password": PASSWORD,
    }


def registrar(cliente):
    return cliente.post(
        "/api/auth/register",
        json=datos_registro(),
    )


def iniciar_sesion(cliente, password=PASSWORD):
    return cliente.post(
        "/api/auth/login",
        json={
            "email": "cliente.test@example.com",
            "password": password,
        },
    )


def test_registro_exitoso(entorno_auth):
    cliente, repo = entorno_auth

    respuesta = registrar(cliente)

    assert respuesta.status_code == 201
    assert respuesta.json()["role"] == "Cliente"
    assert respuesta.json()["is_active"] is True
    assert len(repo.usuarios) == 1

    usuario = repo.usuarios[1]

    assert usuario["password_hash"] != PASSWORD
    assert "password_hash" not in respuesta.json()


def test_correo_duplicado(entorno_auth):
    cliente, repo = entorno_auth

    registrar(cliente)
    respuesta = registrar(cliente)

    assert respuesta.status_code == 409
    assert len(repo.usuarios) == 1


def test_login_exitoso(entorno_auth):
    cliente, repo = entorno_auth

    registrar(cliente)
    respuesta = iniciar_sesion(cliente)

    assert respuesta.status_code == 200
    assert respuesta.json()["token_type"] == "bearer"
    assert respuesta.json()["access_token"]


def test_contrasena_incorrecta(entorno_auth):
    cliente, repo = entorno_auth

    registrar(cliente)

    respuesta = iniciar_sesion(
        cliente,
        password="ContrasenaIncorrecta",
    )

    assert respuesta.status_code == 401


def test_me_sin_token(entorno_auth):
    cliente, repo = entorno_auth

    respuesta = cliente.get("/api/auth/me")

    assert respuesta.status_code == 401


def test_me_con_token_valido(entorno_auth):
    cliente, repo = entorno_auth

    registrar(cliente)
    login = iniciar_sesion(cliente)

    token = login.json()["access_token"]

    respuesta = cliente.get(
        "/api/auth/me",
        headers={
            "Authorization": f"Bearer {token}",
        },
    )

    assert respuesta.status_code == 200
    assert respuesta.json()["email"] == "cliente.test@example.com"


def test_usuario_inactivo_no_puede_iniciar_sesion(entorno_auth):
    cliente, repo = entorno_auth

    registrar(cliente)
    repo.usuarios[1]["is_active"] = False

    respuesta = iniciar_sesion(cliente)

    assert respuesta.status_code == 401


def test_registro_pendiente_no_puede_iniciar_sesion(entorno_auth):
    cliente, repo = entorno_auth

    registrar(cliente)
    repo.usuarios[1]["registro_pendiente"] = True

    respuesta = iniciar_sesion(cliente)

    assert respuesta.status_code == 401
