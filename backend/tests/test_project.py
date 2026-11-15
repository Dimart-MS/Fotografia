"""
Pruebas automatizadas de aceptación del incremento (HU 06 y HU 02).
Utiliza bases de datos temporales aisladas por caso de prueba.
"""
import os
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta

import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.engine import make_url

from app.bookings import create_app as bookings_app
from app.clients import create_app as clients_app
from app.common import today

KEY = "clave-solo-para-pruebas-2026"
HEADERS = {"Authorization": f"Bearer {KEY}"}
SAMPLE_CLIENT = {
    "name": "Ana Prueba",
    "email": "ana@example.test",
    "phone": "4771234567",
    "address": "Calle de prueba 123, León",
}


@pytest.fixture
def apps(tmp_path):
    """
    Inicializa instancias aisladas de los servicios de Clientes y Reservas
    conectadas a bases temporales SQLite (o PostgreSQL terminadas en _test).
    """
    clients_url = os.getenv(
        "TEST_CLIENTS_DATABASE_URL",
        f"sqlite:///{tmp_path}/clients.db",
    )
    bookings_url = os.getenv(
        "TEST_BOOKINGS_DATABASE_URL",
        f"sqlite:///{tmp_path}/bookings.db",
    )

    for url in (clients_url, bookings_url):
        if not url.startswith("sqlite") and not (make_url(url).database or "").endswith("_test"):
            raise ValueError(
                "Las bases de prueba externas deben terminar en _test; "
                "no se permite usar bases reales."
            )

    client_service = clients_app(clients_url, KEY)
    with TestClient(client_service, headers=HEADERS) as client_http:

        def lookup(client_id: int):
            response = client_http.get(f"/api/clientes/{client_id}")
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=response.json()["detail"],
                )
            return response.json()

        booking_service = bookings_app(bookings_url, KEY, lookup)
        with TestClient(booking_service, headers=HEADERS) as booking_http:
            if clients_url.startswith("postgresql"):
                with client_service.state.engine.begin() as conn:
                    conn.execute(text("TRUNCATE clients RESTART IDENTITY"))
                with booking_service.state.engine.begin() as conn:
                    conn.execute(text("TRUNCATE bookings RESTART IDENTITY"))

            if clients_url.startswith("mysql"):
                with client_service.state.engine.begin() as conn:
                    conn.execute(text("DELETE FROM clients"))
                with booking_service.state.engine.begin() as conn:
                    conn.execute(text("DELETE FROM bookings"))

            yield client_http, booking_http, clients_url


def create_sample_reservation(client_http, booking_http, days_ahead: int = 10):
    """Registra un cliente único y crea una solicitud de reserva para `days_ahead` días después."""
    unique_email = f"{uuid.uuid4().hex}@example.test"
    client_payload = {**SAMPLE_CLIENT, "email": unique_email}
    created_client_id = client_http.post("/api/clientes", json=client_payload).json()["id"]

    booking_payload = {
        "client_id": created_client_id,
        "event_date": str(today() + timedelta(days=days_ahead)),
        "event_type": "Boda",
        "package": "foto",
    }
    return booking_http.post("/api/reservas", json=booking_payload)


# ─── Pruebas de HU 06: Registro y Consulta de Clientes ───────────────────────


def test_HU06_register_and_list(apps):
    client_http, _, _ = apps
    response = client_http.post("/api/clientes", json=SAMPLE_CLIENT)
    assert response.status_code == 201

    listed = client_http.get("/api/clientes").json()
    assert listed[0]["name"] == "Ana Prueba"

    created_id = response.json()["id"]
    detail = client_http.get(f"/api/clientes/{created_id}").json()
    assert detail["email"] == SAMPLE_CLIENT["email"]


@pytest.mark.parametrize(
    "field,value",
    [
        ("name", "  "),
        ("email", "incorrecto"),
        ("phone", "123"),
        ("address", "a"),
    ],
)
def test_HU06_invalid_fields(apps, field, value):
    client_http, _, _ = apps
    invalid_payload = {**SAMPLE_CLIENT, field: value}
    assert client_http.post("/api/clientes", json=invalid_payload).status_code == 422
    assert client_http.get("/api/clientes").json() == []


def test_HU06_duplicate_email_case_insensitive(apps):
    client_http, _, _ = apps
    assert client_http.post("/api/clientes", json=SAMPLE_CLIENT).status_code == 201

    uppercase_payload = {**SAMPLE_CLIENT, "email": SAMPLE_CLIENT["email"].upper()}
    assert client_http.post("/api/clientes", json=uppercase_payload).status_code == 409
    assert len(client_http.get("/api/clientes").json()) == 1


def test_HU06_persistence_after_restart(apps):
    client_http, _, db_url = apps
    client_http.post("/api/clientes", json=SAMPLE_CLIENT)

    with TestClient(clients_app(db_url, KEY), headers=HEADERS) as restarted_client:
        assert restarted_client.get("/api/clientes").json()[0]["name"] == SAMPLE_CLIENT["name"]


# ─── Pruebas de HU 02: Gestión de Reservas, Disponibilidad y Anticipo ────────


def test_HU02_valid_reservation_server_price(apps):
    client_http, booking_http, _ = apps
    response = create_sample_reservation(client_http, booking_http)
    assert response.status_code == 201

    body = response.json()
    assert body["status"] == "Pendiente de anticipo"
    assert body["total_cents"] == 350000
    assert body["paid_cents"] == 0


def test_HU02_nonexistent_client(apps):
    _, booking_http, _ = apps
    payload = {
        "client_id": 999,
        "event_date": str(today() + timedelta(days=5)),
        "event_type": "Boda",
        "package": "foto",
    }
    assert booking_http.post("/api/reservas", json=payload).status_code == 404


def test_HU02_past_date(apps):
    client_http, booking_http, _ = apps
    assert create_sample_reservation(client_http, booking_http, days_ahead=-1).status_code == 422
    assert booking_http.get("/api/reservas").json() == []


def test_HU02_pending_does_not_block_date(apps):
    client_http, booking_http, _ = apps
    assert create_sample_reservation(client_http, booking_http).status_code == 201
    assert create_sample_reservation(client_http, booking_http).status_code == 201

    target_day = str(today() + timedelta(days=10))
    availability = booking_http.get(
        "/api/disponibilidad",
        params={"start": target_day, "end": target_day},
    ).json()
    assert availability["occupied"] == []


def test_HU02_confirm_blocks_date(apps):
    client_http, booking_http, _ = apps
    booking = create_sample_reservation(client_http, booking_http).json()

    confirm_res = booking_http.post(
        f"/api/reservas/{booking['id']}/confirmar",
        json={"amount": "1750.00"},
    )
    assert confirm_res.status_code == 200
    assert create_sample_reservation(client_http, booking_http).status_code == 409

    event_day = booking["event_date"]
    availability = booking_http.get(
        "/api/disponibilidad",
        params={"start": event_day, "end": event_day},
    ).json()
    assert availability["occupied"] == [event_day]


@pytest.mark.parametrize(
    "amount",
    ["0", "-1", "1749.99", "3500.01", "2000.001"],
)
def test_HU02_invalid_deposit(apps, amount):
    client_http, booking_http, _ = apps
    booking = create_sample_reservation(client_http, booking_http).json()

    confirm_res = booking_http.post(
        f"/api/reservas/{booking['id']}/confirmar",
        json={"amount": amount},
    )
    assert confirm_res.status_code == 422
    assert booking_http.get("/api/reservas").json()[0]["paid_cents"] == 0


def test_HU02_confirm_cannot_repeat(apps):
    client_http, booking_http, _ = apps
    booking = create_sample_reservation(client_http, booking_http).json()
    endpoint = f"/api/reservas/{booking['id']}/confirmar"

    assert booking_http.post(endpoint, json={"amount": "1750"}).status_code == 200
    assert booking_http.post(endpoint, json={"amount": "1750"}).status_code == 409


def test_HU02_concurrent_confirmation_only_one_wins(apps):
    client_http, booking_http, _ = apps
    booking_ids = [
        create_sample_reservation(client_http, booking_http).json()["id"]
        for _ in range(2)
    ]

    with ThreadPoolExecutor(max_workers=2) as executor:
        status_codes = list(
            executor.map(
                lambda bid: booking_http.post(
                    f"/api/reservas/{bid}/confirmar",
                    json={"amount": "1750"},
                ).status_code,
                booking_ids,
            )
        )

    assert sorted(status_codes) == [200, 409]
    rows = booking_http.get("/api/reservas").json()
    assert len([r for r in rows if r["status"] == "Confirmada"]) == 1
    assert sum(r["paid_cents"] for r in rows) == 175000


def test_HU02_cancel_pending_keeps_history(apps):
    client_http, booking_http, _ = apps
    booking = create_sample_reservation(client_http, booking_http).json()

    assert booking_http.post(f"/api/reservas/{booking['id']}/cancelar").status_code == 200
    assert booking_http.get("/api/reservas").json()[0]["status"] == "Cancelada"

    confirm_after_cancel = booking_http.post(
        f"/api/reservas/{booking['id']}/confirmar",
        json={"amount": "1750"},
    )
    assert confirm_after_cancel.status_code == 409


def test_HU02_cannot_cancel_paid_booking(apps):
    client_http, booking_http, _ = apps
    booking = create_sample_reservation(client_http, booking_http).json()

    booking_http.post(
        f"/api/reservas/{booking['id']}/confirmar",
        json={"amount": "1750"},
    )
    assert booking_http.post(f"/api/reservas/{booking['id']}/cancelar").status_code == 409


def test_HU02_cannot_inject_price(apps):
    client_http, booking_http, _ = apps
    created_client_id = client_http.post("/api/clientes", json=SAMPLE_CLIENT).json()["id"]

    tampered_payload = {
        "client_id": created_client_id,
        "event_date": str(today()),
        "event_type": "Boda",
        "package": "foto",
        "total_cents": 1,
    }
    assert booking_http.post("/api/reservas", json=tampered_payload).status_code == 422


# ─── Pruebas Transversales de Seguridad, Salud y Resiliencia ─────────────────


def test_security_no_key(apps):
    client_http, booking_http, _ = apps
    assert (
        client_http.get("/api/clientes", headers={"Authorization": ""}).status_code == 401
    )
    assert (
        booking_http.get(
            "/api/reservas",
            headers={"Authorization": "Bearer incorrecta"},
        ).status_code
        == 401
    )


def test_invalid_calendar_interval(apps):
    _, booking_http, _ = apps
    res = booking_http.get(
        "/api/disponibilidad",
        params={"start": "2027-12-01", "end": "2027-01-01"},
    )
    assert res.status_code == 422


def test_dependency_unavailable_is_503(tmp_path, monkeypatch):
    def fail_connection(*_args, **_kwargs):
        raise httpx.ConnectError("Servicio no disponible")

    monkeypatch.setattr(httpx, "get", fail_connection)

    failure_url = os.getenv("TEST_BOOKINGS_DATABASE_URL", f"sqlite:///{tmp_path}/failure.db")
    if not failure_url.startswith("sqlite") and not (make_url(failure_url).database or "").endswith("_test"):
        raise ValueError("La base de fallos debe terminar en _test")
    failure_app = bookings_app(failure_url, KEY)
    with TestClient(
        failure_app,
        headers=HEADERS,
    ) as booking_http:
        with failure_app.state.engine.begin() as conn:
            conn.execute(text("DELETE FROM bookings"))
        payload = {
            "client_id": 1,
            "event_date": str(today()),
            "event_type": "Boda",
            "package": "foto",
        }
        assert booking_http.post("/api/reservas", json=payload).status_code == 503
        assert booking_http.get("/api/reservas").json() == []


def test_health(apps):
    client_http, booking_http, _ = apps
    assert client_http.get("/health").json()["status"] == "ok"
    assert booking_http.get("/health").json()["status"] == "ok"
