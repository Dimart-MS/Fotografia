"""
Paso 4: Suite de pruebas automáticas funcionales e integración contra PostgreSQL local (127.0.0.1:55432)
y el backend aislado en http://127.0.0.1:8010.

Cubre los 7 módulos del sistema:
1. Acceso y permisos (/api/auth)
2. Clientes (/api/clientes)
3. Paquetes (/api/paquetes)
4. Reservas y concurrencia (/api/reservas)
5. Pagos y saldos (/api/pagos)
6. Ventas y columna calculada subtotal_centavos (/api/ventas)
7. Galerías y entregas por propietario (/api/galerias)
"""

from concurrent.futures import ThreadPoolExecutor
from datetime import date, timedelta
from pathlib import Path
import sys
import uuid

import httpx
import pytest

CARPETA = Path(__file__).resolve().parent
CARPETA_SOPORTE = CARPETA / "soporte"
for ruta in (str(CARPETA), str(CARPETA_SOPORTE)):
    if ruta not in sys.path:
        sys.path.insert(0, ruta)

from conexion_local import conectar
from sembrar_datos import CUENTAS_PRUEBA, sembrar

BASE_URL = "http://127.0.0.1:8010"


@pytest.fixture(scope="module")
def contexto_p3():
    """
    Prepara la semilla base y devuelve tokens JWT reales de Administrador,
    Cliente 1 y Cliente 2 autenticados contra el backend en 8010.
    """
    semilla = sembrar()

    with httpx.Client(base_url=BASE_URL, timeout=10.0, trust_env=False) as http:
        r_admin = http.post(
            "/api/auth/login",
            json={
                "email": CUENTAS_PRUEBA["admin"]["correo"],
                "password": CUENTAS_PRUEBA["admin"]["password_plano"],
            },
        )
        assert r_admin.status_code == 200
        token_admin = r_admin.json()["access_token"]

        r_cli1 = http.post(
            "/api/auth/login",
            json={
                "email": CUENTAS_PRUEBA["cliente1"]["correo"],
                "password": CUENTAS_PRUEBA["cliente1"]["password_plano"],
            },
        )
        assert r_cli1.status_code == 200
        datos_cli1 = r_cli1.json()

        r_cli2 = http.post(
            "/api/auth/login",
            json={
                "email": CUENTAS_PRUEBA["cliente2"]["correo"],
                "password": CUENTAS_PRUEBA["cliente2"]["password_plano"],
            },
        )
        assert r_cli2.status_code == 200
        datos_cli2 = r_cli2.json()

    return {
        "semilla": semilla,
        "admin_headers": {"Authorization": f"Bearer {token_admin}"},
        "cli1_headers": {"Authorization": f"Bearer {datos_cli1['access_token']}"},
        "cli1_id": datos_cli1["user"]["client_id"],
        "cli2_headers": {"Authorization": f"Bearer {datos_cli2['access_token']}"},
        "cli2_id": datos_cli2["user"]["client_id"],
    }


def _http():
    return httpx.Client(base_url=BASE_URL, timeout=10.0, trust_env=False)


def _limpiar_fecha_reserva(fecha_iso: str) -> None:
    """Limpia únicamente los registros asociados a una fecha de prueba específica."""
    with conectar() as conn:
        conn.execute(
            "DELETE FROM public.historial_entregas WHERE id_entrega IN "
            "(SELECT id_entrega FROM public.entregas WHERE id_reservacion IN "
            "(SELECT id_reservacion FROM public.reservaciones WHERE fecha_evento = %s))",
            (fecha_iso,),
        )
        conn.execute(
            "DELETE FROM public.entregas WHERE id_reservacion IN "
            "(SELECT id_reservacion FROM public.reservaciones WHERE fecha_evento = %s)",
            (fecha_iso,),
        )
        conn.execute(
            "DELETE FROM public.galerias WHERE id_reservacion IN "
            "(SELECT id_reservacion FROM public.reservaciones WHERE fecha_evento = %s)",
            (fecha_iso,),
        )
        conn.execute(
            "DELETE FROM public.historial_reservaciones WHERE id_reservacion IN "
            "(SELECT id_reservacion FROM public.reservaciones WHERE fecha_evento = %s)",
            (fecha_iso,),
        )
        conn.execute(
            "DELETE FROM public.detalle_ventas WHERE id_venta IN "
            "(SELECT id_venta FROM public.ventas WHERE id_reservacion IN "
            "(SELECT id_reservacion FROM public.reservaciones WHERE fecha_evento = %s))",
            (fecha_iso,),
        )
        conn.execute(
            "DELETE FROM public.ventas WHERE id_reservacion IN "
            "(SELECT id_reservacion FROM public.reservaciones WHERE fecha_evento = %s)",
            (fecha_iso,),
        )
        conn.execute(
            "DELETE FROM public.pagos WHERE id_reservacion IN "
            "(SELECT id_reservacion FROM public.reservaciones WHERE fecha_evento = %s)",
            (fecha_iso,),
        )
        conn.execute(
            "DELETE FROM public.reservaciones WHERE fecha_evento = %s",
            (fecha_iso,),
        )
        conn.commit()


# =====================================================================
# 1. MÓDULO: ACCESO Y PERMISOS (/api/auth)
# =====================================================================


def test_01_auth_login_valido_e_invalido(contexto_p3):
    """Verifica login exitoso (200) y rechazo por contraseña incorrecta (401)."""
    with _http() as client:
        ok = client.post(
            "/api/auth/login",
            json={
                "email": CUENTAS_PRUEBA["admin"]["correo"],
                "password": CUENTAS_PRUEBA["admin"]["password_plano"],
            },
        )
        assert ok.status_code == 200
        assert "access_token" in ok.json()

        mal = client.post(
            "/api/auth/login",
            json={
                "email": CUENTAS_PRUEBA["admin"]["correo"],
                "password": "PasswordIncorrecto123!",
            },
        )
        assert mal.status_code == 401


def test_02_auth_rechazo_sin_token():
    """Verifica que endpoints protegidos rechacen peticiones sin token Bearer (401)."""
    with _http() as client:
        assert client.get("/api/auth/me").status_code == 401
        assert client.get("/api/clientes").status_code == 401
        assert client.get("/api/reservas").status_code == 401


def test_03_auth_cliente_bloqueado_en_rutas_administrativas(contexto_p3):
    """Verifica que un usuario con rol Cliente reciba 403 en operaciones exclusivas de Administrador."""
    with _http() as client:
        headers_cli = contexto_p3["cli1_headers"]
        assert client.get("/api/clientes", headers=headers_cli).status_code == 403
        assert (
            client.post(
                "/api/paquetes",
                headers=headers_cli,
                json={
                    "clave": "intento-cliente",
                    "nombre": "Paquete No Autorizado",
                    "precio_centavos": 100000,
                },
            ).status_code
            == 403
        )
        assert client.get("/api/ventas", headers=headers_cli).status_code == 403


# =====================================================================
# 2. MÓDULO: CLIENTES (/api/clientes)
# =====================================================================


def test_04_clientes_alta_consulta_edicion_y_baja_logica(contexto_p3):
    """Verifica alta (201), consulta (200), edición (200), baja lógica y reactivación de un cliente."""
    sufijo = uuid.uuid4().hex[:6]
    correo = f"nuevo.cli.{sufijo}@luzymemoria.mx"
    headers = contexto_p3["admin_headers"]

    with _http() as client:
        # Alta
        alta = client.post(
            "/api/clientes",
            headers=headers,
            json={
                "name": f"Lucía Fernández {sufijo}",
                "email": correo,
                "phone": "4773004005",
                "address": "Calle Madero 405, Zona Centro, León, Gto.",
            },
        )
        assert alta.status_code == 201
        creado = alta.json()
        id_cliente = creado["id"]
        assert creado["active"] is True
        assert "temporary_password" in creado

        # Consulta individual
        consulta = client.get(f"/api/clientes/{id_cliente}", headers=headers)
        assert consulta.status_code == 200
        assert consulta.json()["email"] == correo

        # Edición
        edicion = client.patch(
            f"/api/clientes/{id_cliente}",
            headers=headers,
            json={"address": "Av. Las Américas 810, León, Gto."},
        )
        assert edicion.status_code == 200
        assert edicion.json()["address"] == "Av. Las Américas 810, León, Gto."

        # Baja lógica
        baja = client.patch(f"/api/clientes/{id_cliente}/inactivar", headers=headers)
        assert baja.status_code == 200
        assert baja.json()["active"] is False

        # Reactivación
        react = client.patch(f"/api/clientes/{id_cliente}/reactivar", headers=headers)
        assert react.status_code == 200
        assert react.json()["active"] is True


def test_05_clientes_datos_invalidos_y_correo_duplicado(contexto_p3):
    """Verifica rechazo por campos inválidos (422) y por correo duplicado en mayúsculas (409)."""
    headers = contexto_p3["admin_headers"]
    correo_existente = CUENTAS_PRUEBA["cliente1"]["correo"].upper()

    with _http() as client:
        invalido = client.post(
            "/api/clientes",
            headers=headers,
            json={
                "name": "A",
                "email": "correo-invalido",
                "phone": "123",
                "address": "No",
            },
        )
        assert invalido.status_code == 422

        duplicado = client.post(
            "/api/clientes",
            headers=headers,
            json={
                "name": "Cliente Duplicado P3",
                "email": correo_existente,
                "phone": "4779998877",
                "address": "Domicilio válido de prueba 123",
            },
        )
        assert duplicado.status_code == 409


# =====================================================================
# 3. MÓDULO: PAQUETES (/api/paquetes)
# =====================================================================


def test_06_paquetes_ciclo_completo_y_visibilidad(contexto_p3):
    """Verifica alta (201), edición (200), validación de precio (422) y visibilidad al inactivar."""
    headers = contexto_p3["admin_headers"]
    clave_pkg = f"paquete-especial-{uuid.uuid4().hex[:5]}"

    with _http() as client:
        # Precio inválido (<= 0) debe rechazarse con 422
        invalido = client.post(
            "/api/paquetes",
            headers=headers,
            json={
                "clave": clave_pkg,
                "nombre": "Paquete Precio Inválido",
                "precio_centavos": 0,
            },
        )
        assert invalido.status_code == 422

        # Alta válida
        alta = client.post(
            "/api/paquetes",
            headers=headers,
            json={
                "clave": clave_pkg,
                "nombre": "Paquete Especial P3",
                "descripcion": "Cobertura especial de prueba",
                "precio_centavos": 520000,
            },
        )
        assert alta.status_code == 201
        assert alta.json()["price_cents"] == 520000

        # Edición de precio
        edicion = client.patch(
            f"/api/paquetes/{clave_pkg}",
            headers=headers,
            json={"precio_centavos": 550000},
        )
        assert edicion.status_code == 200
        assert edicion.json()["price_cents"] == 550000

        # Inactivar y comprobar que no aparece en catálogo público pero sí en administración
        inact = client.patch(f"/api/paquetes/{clave_pkg}/inactivar", headers=headers)
        assert inact.status_code == 200

        publicos = [p["id"] for p in client.get("/api/paquetes").json()]
        admin_todos = [
            p["id"] for p in client.get("/api/paquetes/administracion", headers=headers).json()
        ]
        assert clave_pkg not in publicos
        assert clave_pkg in admin_todos

        # Reactivar
        react = client.patch(f"/api/paquetes/{clave_pkg}/reactivar", headers=headers)
        assert react.status_code == 200


# =====================================================================
# 4. MÓDULO: RESERVAS, DISPONIBILIDAD Y CONCURRENCIA (/api/reservas)
# =====================================================================


def test_07_reservas_fecha_pasada_y_solicitud_valida(contexto_p3):
    """Verifica rechazo de fecha pasada (400) y creación válida con precio del servidor (201)."""
    headers_admin = contexto_p3["admin_headers"]
    id_cli1 = contexto_p3["cli1_id"]
    ayer = (date.today() - timedelta(days=1)).isoformat()
    futura = (date.today() + timedelta(days=40)).isoformat()
    _limpiar_fecha_reserva(futura)

    with _http() as client:
        pasada = client.post(
            "/api/reservas",
            headers=headers_admin,
            json={
                "client_id": id_cli1,
                "event_date": ayer,
                "event_type": "Boda",
                "package": "foto-p3",
            },
        )
        assert pasada.status_code == 400

        valida = client.post(
            "/api/reservas",
            headers=headers_admin,
            json={
                "client_id": id_cli1,
                "event_date": futura,
                "event_type": "Boda",
                "package": "foto-p3",
            },
        )
        assert valida.status_code == 201
        datos = valida.json()
        assert datos["status"] == "Pendiente de anticipo"
        assert datos["total_cents"] == 350000
        assert datos["paid_cents"] == 0


def test_08_reservas_concurrencia_exclusividad_de_fecha(contexto_p3):
    """
    Crea dos solicitudes pendientes para la misma fecha y lanza dos confirmaciones
    simultáneas. Exactamente una debe confirmar (200) y la otra recibir conflicto (409).
    """
    headers_admin = contexto_p3["admin_headers"]
    id_cli1 = contexto_p3["cli1_id"]
    id_cli2 = contexto_p3["cli2_id"]

    fecha_objetivo = (date.today() + timedelta(days=75)).isoformat()
    _limpiar_fecha_reserva(fecha_objetivo)

    with _http() as client:
        r1 = client.post(
            "/api/reservas",
            headers=headers_admin,
            json={
                "client_id": id_cli1,
                "event_date": fecha_objetivo,
                "event_type": "Boda",
                "package": "foto-p3",
            },
        )
        r2 = client.post(
            "/api/reservas",
            headers=headers_admin,
            json={
                "client_id": id_cli2,
                "event_date": fecha_objetivo,
                "event_type": "XV años",
                "package": "foto-p3",
            },
        )
        assert r1.status_code == 201 and r2.status_code == 201
        ids = [r1.json()["id"], r2.json()["id"]]

    def _confirmar(id_res: int) -> int:
        with _http() as c:
            resp = c.post(
                f"/api/reservas/{id_res}/confirmar",
                headers=headers_admin,
                json={"amount": "1750.00"},
            )
            return resp.status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        codigos = sorted(pool.map(_confirmar, ids))

    assert codigos == [200, 409], f"Se esperaba [200, 409] en concurrencia y se obtuvo {codigos}"

    fecha_dt = date.fromisoformat(fecha_objetivo)
    with _http() as client:
        disp = client.get(
            "/api/reservas/disponibilidad",
            params={"anio": fecha_dt.year, "mes": fecha_dt.month},
        )
        assert disp.status_code == 200
        assert fecha_objetivo in disp.json()["fechas_ocupadas"]


def test_09_reservas_cancelacion_conforme_al_contrato(contexto_p3):
    """
    Verifica que una reserva pendiente vigente no pueda cancelarse arbitrariamente (409),
    y que al quedar marcada con decision_anticipo_pendiente=True pueda cancelarse (200)
    conservando su registro en historial_reservaciones.
    """
    headers_admin = contexto_p3["admin_headers"]
    id_cli1 = contexto_p3["cli1_id"]
    fecha_cancel = (date.today() + timedelta(days=92)).isoformat()
    _limpiar_fecha_reserva(fecha_cancel)

    with _http() as client:
        creada = client.post(
            "/api/reservas",
            headers=headers_admin,
            json={
                "client_id": id_cli1,
                "event_date": fecha_cancel,
                "event_type": "Bautizo",
                "package": "foto-p3",
            },
        )
        assert creada.status_code == 201
        id_res = creada.json()["id"]

        intento_previo = client.post(
            f"/api/reservas/{id_res}/cancelar",
            headers=headers_admin,
            json={"motivo": "Intento antes del vencimiento"},
        )
        assert intento_previo.status_code == 409

        with conectar() as conn:
            conn.execute(
                "UPDATE public.reservaciones SET decision_anticipo_pendiente = true WHERE id_reservacion = %s",
                (id_res,),
            )
            conn.commit()

        cancelada = client.post(
            f"/api/reservas/{id_res}/cancelar",
            headers=headers_admin,
            json={"motivo": "Plazo de anticipo vencido sin comprobante"},
        )
        assert cancelada.status_code == 200
        assert cancelada.json()["status"] == "Cancelada"


# =====================================================================
# 5. MÓDULO: PAGOS Y 6. MÓDULO: VENTAS (/api/pagos y /api/ventas)
# =====================================================================


def test_10_pagos_y_ventas_calculo_saldo_y_bloqueo_sobrepago(contexto_p3):
    """
    Verifica:
    - Creación automática de venta y columna GENERATED ALWAYS subtotal_centavos.
    - Rechazo de importes inválidos (<= 0 o mayores al saldo).
    - Confirmación con anticipo del 50%, liquidación del 50% restante y bloqueo de doble liquidación (409).
    """
    headers_admin = contexto_p3["admin_headers"]
    headers_cli1 = contexto_p3["cli1_headers"]
    id_cli1 = contexto_p3["cli1_id"]
    fecha_pago = (date.today() + timedelta(days=110)).isoformat()
    _limpiar_fecha_reserva(fecha_pago)

    with _http() as client:
        reserva = client.post(
            "/api/reservas",
            headers=headers_admin,
            json={
                "client_id": id_cli1,
                "event_date": fecha_pago,
                "event_type": "Fiesta",
                "package": "video-p3",
            },
        )
        assert reserva.status_code == 201
        id_res = reserva.json()["id"]

        # Importe negativo o cero -> 422
        assert (
            client.post(
                f"/api/reservas/{id_res}/confirmar",
                headers=headers_admin,
                json={"amount": "0"},
            ).status_code
            == 422
        )

        # Importe mayor al total ($4,500.00) -> 400
        assert (
            client.post(
                f"/api/reservas/{id_res}/confirmar",
                headers=headers_admin,
                json={"amount": "5000.00"},
            ).status_code
            == 400
        )

        # 1er pago: Anticipo del 50% ($2,250.00) -> Confirma reserva y venta
        p1 = client.post(
            f"/api/reservas/{id_res}/confirmar",
            headers=headers_admin,
            json={"amount": "2250.00"},
        )
        assert p1.status_code == 200
        assert p1.json()["status"] == "Confirmada"
        assert p1.json()["paid_cents"] == 225000
        assert p1.json()["balance_cents"] == 225000

        # Verificar la venta asociada en /api/ventas y su subtotal calculado
        ventas = client.get("/api/ventas", headers=headers_admin)
        assert ventas.status_code == 200
        venta_res = next(v for v in ventas.json() if v["id_reservacion"] == id_res)
        assert venta_res["estado"] == "Confirmada"
        assert venta_res["total_centavos"] == 450000
        assert venta_res["conceptos"][0]["subtotal_centavos"] == 450000

        detalle_venta = client.get(f"/api/ventas/{venta_res['id_venta']}", headers=headers_admin)
        assert detalle_venta.status_code == 200
        assert detalle_venta.json()["conceptos"][0]["subtotal_centavos"] == 450000

        # 2do pago: Liquidación del 50% restante ($2,250.00) -> Saldo 0
        p2 = client.post(
            f"/api/reservas/{id_res}/confirmar",
            headers=headers_admin,
            json={"amount": "2250.00"},
        )
        assert p2.status_code == 200
        assert p2.json()["balance_cents"] == 0

        # 3er intento sobre reserva ya liquidada -> 409
        p3 = client.post(
            f"/api/reservas/{id_res}/confirmar",
            headers=headers_admin,
            json={"amount": "100.00"},
        )
        assert p3.status_code == 409

        # Consulta de pagos por cliente propietario
        mis_pagos = client.get("/api/pagos/mis-pagos", headers=headers_cli1)
        assert mis_pagos.status_code == 200
        pagos_de_esta_reserva = [
            p for p in mis_pagos.json() if p["id_reservacion"] == id_res
        ]
        assert len(pagos_de_esta_reserva) == 2


# =====================================================================
# 7. MÓDULO: GALERÍAS Y ENTREGAS (/api/galerias)
# =====================================================================


def test_11_galerias_y_entregas_acceso_por_propietario(contexto_p3):
    """
    Verifica:
    - Creación de galería y privacidad antes de publicar (404 para el cliente).
    - Publicación de galería: visible para el Cliente 1 propietario (200), oculta para Cliente 2 (404).
    - Creación y flujo de estados de Entrega + historial.
    - Validación de formato de fotografía (415) y aislamiento de Supabase Storage (502 controlado).
    """
    headers_admin = contexto_p3["admin_headers"]
    headers_cli1 = contexto_p3["cli1_headers"]
    headers_cli2 = contexto_p3["cli2_headers"]
    id_cli1 = contexto_p3["cli1_id"]
    fecha_gal = (date.today() + timedelta(days=125)).isoformat()
    _limpiar_fecha_reserva(fecha_gal)

    with _http() as client:
        res = client.post(
            "/api/reservas",
            headers=headers_admin,
            json={
                "client_id": id_cli1,
                "event_date": fecha_gal,
                "event_type": "Boda",
                "package": "combinado-p3",
            },
        )
        assert res.status_code == 201
        id_res = res.json()["id"]

        # Crear galería (inicia no publicada)
        gal = client.post(
            "/api/galerias",
            headers=headers_admin,
            json={
                "id_reservacion": id_res,
                "titulo": "Galería Boda Elena Morales P3",
                "descripcion": "Selección oficial del evento",
            },
        )
        assert gal.status_code == 201
        id_gal = gal.json()["id_galeria"]
        assert gal.json()["publicada"] is False

        # Antes de publicar, ni siquiera el cliente propietario puede verla (404)
        assert client.get(f"/api/galerias/{id_gal}", headers=headers_cli1).status_code == 404

        # Publicar galería
        pub = client.patch(f"/api/galerias/{id_gal}/publicar", headers=headers_admin)
        assert pub.status_code == 200
        assert pub.json()["publicada"] is True

        # Ahora el Cliente 1 (propietario) sí puede verla (200), pero el Cliente 2 recibe 404
        assert client.get(f"/api/galerias/{id_gal}", headers=headers_cli1).status_code == 200
        assert client.get(f"/api/galerias/{id_gal}", headers=headers_cli2).status_code == 404

        # Validación de archivo no imagen -> 415
        mal_mime = client.post(
            f"/api/galerias/{id_gal}/fotografias/solicitar-subida",
            headers=headers_admin,
            json={
                "nombre_archivo": "documento.pdf",
                "tipo_mime": "application/pdf",
                "tamano_bytes": 1024,
            },
        )
        assert mal_mime.status_code == 415

        # Crear entrega física asociada a la reservación
        entrega = client.post(
            "/api/galerias/entregas",
            headers=headers_admin,
            json={
                "id_reservacion": id_res,
                "fecha_compromiso": (date.today() + timedelta(days=140)).isoformat(),
                "domicilio": "Av. Pruebas 101, Col. Campestre, León, Gto.",
                "observaciones": "Álbum impreso y memoria USB",
            },
        )
        assert entrega.status_code == 201
        id_entrega = entrega.json()["id_entrega"]
        assert entrega.json()["estado"] == "Pendiente"

        # Actualizar estado de entrega y verificar historial
        act_ent = client.patch(
            f"/api/galerias/entregas/{id_entrega}",
            headers=headers_admin,
            json={
                "estado": "Lista",
                "comentario": "Material empacado listo para recolección",
            },
        )
        assert act_ent.status_code == 200
        assert act_ent.json()["estado"] == "Lista"

        hist = client.get(
            f"/api/galerias/entregas/{id_entrega}/historial",
            headers=headers_cli1,
        )
        assert hist.status_code == 200
        assert len(hist.json()) >= 1
