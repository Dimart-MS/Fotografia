"""
Paso 3: Verificador automático de semilla, /health y autenticación JWT en el backend de pruebas (8010).
Si el backend en 8010 no está corriendo, lo inicia temporalmente, ejecuta las comprobaciones
y lo detiene al terminar (o conserva el existente si ya estaba levantado).
"""

import json
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx

CARPETA = Path(__file__).resolve().parent
CARPETA_SOPORTE = CARPETA / "soporte"
BACKEND_DIR = CARPETA.parent
for ruta in (str(CARPETA), str(CARPETA_SOPORTE), str(BACKEND_DIR)):
    if ruta not in sys.path:
        sys.path.insert(0, ruta)
BASE_URL = "http://127.0.0.1:8010"

from sembrar_datos import CUENTAS_PRUEBA, sembrar
from iniciar_backend_pruebas import construir_entorno_pruebas, puerto_ocupado


def esperar_salud(timeout_s: float = 15.0) -> dict:
    """Espera hasta que /health responda HTTP 200."""
    limite = time.monotonic() + timeout_s
    ultimo_error = None
    while time.monotonic() < limite:
        try:
            resp = httpx.get(f"{BASE_URL}/health", timeout=2.0, trust_env=False)
            if resp.status_code == 200:
                return resp.json()
        except httpx.RequestError as exc:
            ultimo_error = str(exc)
        time.sleep(0.4)
    raise RuntimeError(f"El backend en {BASE_URL}/health no respondió a tiempo: {ultimo_error}")


def verificar() -> dict:
    # 1. Asegurar datos ficticios sembrados en 127.0.0.1:55432/fotografia_p3_test
    resumen_semilla = sembrar()

    proceso_temporal = None
    ya_estaba_activo = puerto_ocupado(8010)

    if not ya_estaba_activo:
        proceso_temporal = subprocess.Popen(
            [sys.executable, str(CARPETA_SOPORTE / "iniciar_backend_pruebas.py")],
            cwd=str(BACKEND_DIR),
            env=construir_entorno_pruebas(),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )

    try:
        salud = esperar_salud()

        with httpx.Client(base_url=BASE_URL, timeout=10.0, trust_env=False) as client:
            # 2. Probar login y /me del Administrador ficticio
            resp_admin = client.post(
                "/api/auth/login",
                json={
                    "email": CUENTAS_PRUEBA["admin"]["correo"],
                    "password": CUENTAS_PRUEBA["admin"]["password_plano"],
                },
            )
            assert resp_admin.status_code == 200, f"Login admin falló: {resp_admin.text}"
            datos_admin = resp_admin.json()
            token_admin = datos_admin["access_token"]

            me_admin = client.get(
                "/api/auth/me",
                headers={"Authorization": f"Bearer {token_admin}"},
            )
            assert me_admin.status_code == 200
            assert me_admin.json()["role"] == "Administrador"

            # 3. Probar login y /me del Cliente ficticio
            resp_cli = client.post(
                "/api/auth/login",
                json={
                    "email": CUENTAS_PRUEBA["cliente1"]["correo"],
                    "password": CUENTAS_PRUEBA["cliente1"]["password_plano"],
                },
            )
            assert resp_cli.status_code == 200, f"Login cliente falló: {resp_cli.text}"
            datos_cli = resp_cli.json()
            token_cli = datos_cli["access_token"]

            me_cli = client.get(
                "/api/auth/me",
                headers={"Authorization": f"Bearer {token_cli}"},
            )
            assert me_cli.status_code == 200
            assert me_cli.json()["role"] == "Cliente"
            assert me_cli.json()["client_id"] is not None

            # 4. Consultar clientes y paquetes usando el token de Administrador
            resp_clientes = client.get(
                "/api/clientes",
                headers={"Authorization": f"Bearer {token_admin}"},
            )
            assert resp_clientes.status_code == 200
            lista_clientes = resp_clientes.json()

            resp_paquetes = client.get(
                "/api/paquetes",
                headers={"Authorization": f"Bearer {token_admin}"},
            )
            assert resp_paquetes.status_code == 200
            lista_paquetes = resp_paquetes.json()

        evidencia = {
            "fecha_utc": datetime.now(timezone.utc).isoformat(),
            "entorno": "PostgreSQL local Docker (127.0.0.1:55432/fotografia_p3_test)",
            "backend_url": BASE_URL,
            "health": salud,
            "login_administrador": {
                "correo": CUENTAS_PRUEBA["admin"]["correo"],
                "http_status": resp_admin.status_code,
                "rol_verificado": me_admin.json()["role"],
            },
            "login_cliente": {
                "correo": CUENTAS_PRUEBA["cliente1"]["correo"],
                "http_status": resp_cli.status_code,
                "rol_verificado": me_cli.json()["role"],
                "id_cliente_vinculado": me_cli.json()["client_id"],
            },
            "consulta_clientes": {
                "http_status": resp_clientes.status_code,
                "total_clientes": len(lista_clientes),
            },
            "consulta_paquetes": {
                "http_status": resp_paquetes.status_code,
                "total_paquetes": len(lista_paquetes),
            },
            "semilla": resumen_semilla,
            "resultado": "APROBADO",
        }

        carpeta_res = CARPETA / "resultados"
        carpeta_res.mkdir(exist_ok=True)
        (carpeta_res / "paso3_verificacion.json").write_text(
            json.dumps(evidencia, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        return evidencia
    finally:
        if proceso_temporal is not None and proceso_temporal.poll() is None:
            proceso_temporal.terminate()
            try:
                proceso_temporal.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proceso_temporal.kill()


if __name__ == "__main__":
    resultado = verificar()
    print(json.dumps(resultado, indent=2, ensure_ascii=False))
