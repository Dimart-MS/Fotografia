"""
Paso 4: Lanzador de la suite de pruebas funcionales (`test_funcionales_p3.py`).
Inicia el backend de pruebas en el puerto 8010 si no está activo, ejecuta Pytest
generando JUnit XML y guarda la matriz Caso -> Acción -> Resultado esperado -> Evidencia
en `pruebas_p3/resultados/paso4_funcionales.json`.
"""

import json
import subprocess
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

CARPETA = Path(__file__).resolve().parent
CARPETA_SOPORTE = CARPETA / "soporte"
BACKEND_DIR = CARPETA.parent
for ruta in (str(CARPETA), str(CARPETA_SOPORTE), str(BACKEND_DIR)):
    if ruta not in sys.path:
        sys.path.insert(0, ruta)

from iniciar_backend_pruebas import construir_entorno_pruebas, puerto_ocupado
from sembrar_datos import sembrar
from verificar_paso3 import esperar_salud

MATRIZ_CASOS = {
    "test_01_auth_login_valido_e_invalido": {
        "modulo": "Acceso y permisos",
        "accion": "POST /api/auth/login con credenciales válidas e inválidas",
        "esperado": "HTTP 200 con JWT válido para credenciales correctas; HTTP 401 para contraseña errónea",
    },
    "test_02_auth_rechazo_sin_token": {
        "modulo": "Acceso y permisos",
        "accion": "GET /api/auth/me, /api/clientes y /api/reservas sin cabecera Authorization",
        "esperado": "HTTP 401 en todos los endpoints protegidos",
    },
    "test_03_auth_cliente_bloqueado_en_rutas_administrativas": {
        "modulo": "Acceso y permisos",
        "accion": "Usuario con rol Cliente invoca GET /api/clientes, POST /api/paquetes y GET /api/ventas",
        "esperado": "HTTP 403 Acceso exclusivo para administradores",
    },
    "test_04_clientes_alta_consulta_edicion_y_baja_logica": {
        "modulo": "Clientes",
        "accion": "POST, GET, PATCH de edición, inactivación y reactivación en /api/clientes",
        "esperado": "HTTP 201 en alta con contraseña temporal, HTTP 200 en consulta, edición, baja lógica y reactivación",
    },
    "test_05_clientes_datos_invalidos_y_correo_duplicado": {
        "modulo": "Clientes",
        "accion": "POST /api/clientes con campos inválidos y con correo existente en mayúsculas",
        "esperado": "HTTP 422 por validación de formato y HTTP 409 por unicidad de lower(correo)",
    },
    "test_06_paquetes_ciclo_completo_y_visibilidad": {
        "modulo": "Paquetes",
        "accion": "POST con precio 0, POST válido, PATCH de precio e inactivación/reactivación en /api/paquetes",
        "esperado": "HTTP 422 en precio 0; HTTP 201 en alta; paquete inactivo oculto en catálogo público y visible en /administracion",
    },
    "test_07_reservas_fecha_pasada_y_solicitud_valida": {
        "modulo": "Reservas",
        "accion": "POST /api/reservas con fecha de ayer y con fecha futura válida",
        "esperado": "HTTP 400 en fecha pasada; HTTP 201 en estado 'Pendiente de anticipo' con precio oficial del paquete",
    },
    "test_08_reservas_concurrencia_exclusividad_de_fecha": {
        "modulo": "Reservas",
        "accion": "Confirmación simultánea (2 hilos) de dos solicitudes pendientes para la misma fecha",
        "esperado": "Exactamente una responde HTTP 200 (Confirmada) y la otra HTTP 409; la fecha aparece en /disponibilidad",
    },
    "test_09_reservas_cancelacion_conforme_al_contrato": {
        "modulo": "Reservas",
        "accion": "POST /api/reservas/{id}/cancelar antes y después de marcar decision_anticipo_pendiente",
        "esperado": "HTTP 409 mientras el plazo está vigente; HTTP 200 ('Cancelada') cuando requiere decisión por vencimiento",
    },
    "test_10_pagos_y_ventas_calculo_saldo_y_bloqueo_sobrepago": {
        "modulo": "Pagos y Ventas",
        "accion": "Importes inválidos, anticipo 50%, verificación de venta/subtotal_centavos, liquidación 50% y pago extra",
        "esperado": "HTTP 422/400 en importes inválidos; HTTP 200 en anticipo y liquidación; venta Confirmada; HTTP 409 al intentar pagar sobre saldo 0",
    },
    "test_11_galerias_y_entregas_acceso_por_propietario": {
        "modulo": "Galerías y entregas",
        "accion": "Crear y publicar galería, acceso cruzado entre Cliente 1 y Cliente 2, validación MIME, Storage aislado y flujo de entrega",
        "esperado": "HTTP 404 antes de publicar y para cliente ajeno; HTTP 200 para propietario al publicar; HTTP 415 en MIME inválido; HTTP 201/200 en entrega e historial",
    },
}


def ejecutar() -> dict:
    sembrar()

    carpeta_res = CARPETA / "resultados"
    carpeta_res.mkdir(exist_ok=True)
    ruta_xml = carpeta_res / "paso4_junit.xml"
    ruta_json = carpeta_res / "paso4_funcionales.json"

    archivo_log = None
    proceso_backend = None
    if not puerto_ocupado(8010):
        archivo_log = open(carpeta_res / "backend_p3.log", "w", encoding="utf-8")
        proceso_backend = subprocess.Popen(
            [sys.executable, str(CARPETA_SOPORTE / "iniciar_backend_pruebas.py")],
            cwd=str(BACKEND_DIR),
            env=construir_entorno_pruebas(),
            stdout=archivo_log,
            stderr=subprocess.STDOUT,
            text=True,
        )

    try:
        esperar_salud()

        cmd_pytest = [
            sys.executable,
            "-m",
            "pytest",
            str(CARPETA / "test_funcionales_p3.py"),
            "-v",
            f"--junitxml={ruta_xml}",
        ]
        proc = subprocess.run(
            cmd_pytest,
            cwd=str(BACKEND_DIR),
            env=construir_entorno_pruebas(),
            capture_output=True,
            text=True,
        )
        if proc.stderr:
            print(proc.stderr, file=sys.stderr)

        suite = ET.parse(ruta_xml).getroot().find("testsuite")
        if suite is None:
            suite = ET.parse(ruta_xml).getroot()

        casos_detalle = []
        for tc in suite.findall("testcase"):
            nombre = tc.get("name", "")
            duracion_s = float(tc.get("time", "0"))
            fallo = tc.find("failure")
            error = tc.find("error")
            omitido = tc.find("skipped")

            if fallo is not None or error is not None:
                estado = "FALLIDO"
                detalle_evidencia = (
                    (fallo.get("message") if fallo is not None else error.get("message"))
                    or "Error en caso de prueba"
                )
            elif omitido is not None:
                estado = "OMITIDO"
                detalle_evidencia = omitido.get("message", "Caso omitido")
            else:
                estado = "APROBADO"
                detalle_evidencia = "Comportamiento y persistencia verificados en PostgreSQL local"

            meta = MATRIZ_CASOS.get(
                nombre,
                {
                    "modulo": "General",
                    "accion": nombre,
                    "esperado": "Aprobación del caso",
                },
            )
            casos_detalle.append(
                {
                    "caso": nombre,
                    "modulo": meta["modulo"],
                    "accion": meta["accion"],
                    "resultado_esperado": meta["esperado"],
                    "estado": estado,
                    "duracion_segundos": round(duracion_s, 4),
                    "evidencia": detalle_evidencia,
                }
            )

        total = int(suite.get("tests", len(casos_detalle)))
        fallos = int(suite.get("failures", 0))
        errores = int(suite.get("errors", 0))
        omitidos = int(suite.get("skipped", 0))
        aprobados = total - fallos - errores - omitidos

        resumen = {
            "fecha_utc": datetime.now(timezone.utc).isoformat(),
            "entorno": "PostgreSQL 17.12 local (127.0.0.1:55432/fotografia_p3_test) + Backend (127.0.0.1:8010)",
            "total_casos": total,
            "aprobados": aprobados,
            "fallidos": fallos + errores,
            "omitidos": omitidos,
            "duracion_total_segundos": round(float(suite.get("time", "0")), 3),
            "resultado": "APROBADO" if (proc.returncode == 0 and aprobados == total) else "CON_FALLOS",
            "matriz": casos_detalle,
        }

        ruta_json.write_text(
            json.dumps(resumen, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

        print(f"\n{'CASO DE PRUEBA':<60} | {'MÓDULO':<22} | {'ESTADO':<10} | {'TIEMPO':>7}")
        print("-" * 108)
        for c in casos_detalle:
            print(f"{c['caso']:<60} | {c['modulo']:<22} | {c['estado']:<10} | {c['duracion_segundos']:>6.2f}s")
        print("-" * 108)
        print(f"RESULTADO FINAL: {aprobados}/{total} APROBADOS ({resumen['resultado']}) en {resumen['duracion_total_segundos']:.2f}s\n")

        if proc.returncode != 0:
            raise SystemExit(proc.returncode)
        return resumen
    finally:
        if proceso_backend is not None and proceso_backend.poll() is None:
            proceso_backend.terminate()
            try:
                proceso_backend.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proceso_backend.kill()
        if archivo_log is not None:
            archivo_log.close()


if __name__ == "__main__":
    ejecutar()
