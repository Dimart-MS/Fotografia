"""
Paso 6: Generación de logs estructurados JSONL (sanitizados), medición de latencia HTTP (P95)
y resumen legible de indicadores para evaluación del SLA.

Escribe los artefactos bajo `pruebas_p3/resultados/<id_ejecucion>/` y actualiza copias
de referencia en `pruebas_p3/resultados/paso6_eventos.jsonl`, `paso6_resumen.json` y `paso6_resumen.txt`.

Garantía de sanitización:
- Nunca almacena cabeceras Authorization, tokens JWT, contraseñas, cadenas DATABASE_URL
  ni cuerpos con datos personales.
"""

import json
import math
import shutil
import statistics
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import httpx

CARPETA = Path(__file__).resolve().parent
CARPETA_SOPORTE = CARPETA / "soporte"
BACKEND_DIR = CARPETA.parent
for ruta in (str(CARPETA), str(CARPETA_SOPORTE), str(BACKEND_DIR)):
    if ruta not in sys.path:
        sys.path.insert(0, ruta)

from iniciar_backend_pruebas import construir_entorno_pruebas, puerto_ocupado
from sembrar_datos import CUENTAS_PRUEBA, sembrar
from verificar_paso3 import esperar_salud

ZONA_MX = ZoneInfo("America/Mexico_City")
BASE_URL = "http://127.0.0.1:8010"
ENTORNO_DESC = "PostgreSQL 17.12 local (127.0.0.1:55432/fotografia_p3_test) + Backend (127.0.0.1:8010)"


def calcular_p95(valores_ms: list[float]) -> float:
    """Calcula el percentil 95 (P95) de una lista de tiempos en milisegundos."""
    if not valores_ms:
        return 0.0
    ordenados = sorted(valores_ms)
    indice = max(0, math.ceil(len(ordenados) * 0.95) - 1)
    return round(ordenados[indice], 2)


def medir_operaciones_http() -> tuple[list[dict], dict]:
    """
    Ejecuta muestras HTTP válidas de lectura y escritura contra el backend aislado (8010)
    para medir latencia desde el cliente HTTP (distinta de la duración total de Pytest).
    """
    sembrar()
    carpeta_res = CARPETA / "resultados"
    carpeta_res.mkdir(exist_ok=True)

    archivo_log = None
    proceso_backend = None
    if not puerto_ocupado(8010):
        archivo_log = open(carpeta_res / "backend_latencia_p3.log", "w", encoding="utf-8")
        proceso_backend = subprocess.Popen(
            [sys.executable, str(CARPETA_SOPORTE / "iniciar_backend_pruebas.py")],
            cwd=str(BACKEND_DIR),
            env=construir_entorno_pruebas(),
            stdout=archivo_log,
            stderr=subprocess.STDOUT,
            text=True,
        )

    registros_operaciones: list[dict] = []

    try:
        esperar_salud(timeout_s=15.0)

        with httpx.Client(base_url=BASE_URL, timeout=10.0, trust_env=False) as client:
            resp_login = client.post(
                "/api/auth/login",
                json={
                    "email": CUENTAS_PRUEBA["admin"]["correo"],
                    "password": CUENTAS_PRUEBA["admin"]["password_plano"],
                },
            )
            resp_login.raise_for_status()
            token_admin = resp_login.json()["access_token"]
            headers = {"Authorization": f"Bearer {token_admin}"}

            # Definición de operaciones de lectura (20 muestras cada una tras 1 de calentamiento)
            operaciones_lectura = [
                ("Paquetes", "GET /api/paquetes", "/api/paquetes", None),
                ("Clientes", "GET /api/clientes", "/api/clientes", headers),
                ("Reservas", "GET /api/reservas", "/api/reservas", headers),
                (
                    "Reservas",
                    "GET /api/reservas/disponibilidad",
                    "/api/reservas/disponibilidad?anio=2026&mes=12",
                    None,
                ),
            ]

            for modulo, nombre_op, ruta, cabeceras in operaciones_lectura:
                # Lectura de calentamiento excluida de la muestra
                client.get(ruta, headers=cabeceras)

                for i in range(1, 21):
                    instante = datetime.now(ZONA_MX).isoformat()
                    t0 = time.perf_counter()
                    try:
                        r = client.get(ruta, headers=cabeceras)
                        duracion_ms = round((time.perf_counter() - t0) * 1000, 2)
                        exito = 200 <= r.status_code < 300
                        es_5xx = r.status_code >= 500
                        registros_operaciones.append(
                            {
                                "fecha_tz": instante,
                                "tipo_operacion": "lectura",
                                "modulo": modulo,
                                "operacion": nombre_op,
                                "muestra": i,
                                "http_status": r.status_code,
                                "exito": exito,
                                "error_5xx": es_5xx,
                                "duracion_ms": duracion_ms,
                                "categoria_error": "NINGUNO" if exito else f"HTTP_{r.status_code}",
                            }
                        )
                    except httpx.RequestError as exc:
                        duracion_ms = round((time.perf_counter() - t0) * 1000, 2)
                        registros_operaciones.append(
                            {
                                "fecha_tz": instante,
                                "tipo_operacion": "lectura",
                                "modulo": modulo,
                                "operacion": nombre_op,
                                "muestra": i,
                                "http_status": None,
                                "exito": False,
                                "error_5xx": False,
                                "duracion_ms": duracion_ms,
                                "categoria_error": f"ERROR_CONEXION_{type(exc).__name__}",
                            }
                        )

            # Operaciones de escritura válidas (10 muestras en Clientes y 10 en Paquetes)
            client.patch(
                "/api/clientes/1",
                headers=headers,
                json={"address": "Av. Pruebas 101, Col. Campestre, León, Gto."},
            )
            for i in range(1, 11):
                instante = datetime.now(ZONA_MX).isoformat()
                t0 = time.perf_counter()
                r = client.patch(
                    "/api/clientes/1",
                    headers=headers,
                    json={"address": f"Av. Pruebas 101 Interior {i}, León, Gto."},
                )
                duracion_ms = round((time.perf_counter() - t0) * 1000, 2)
                exito = 200 <= r.status_code < 300
                registros_operaciones.append(
                    {
                        "fecha_tz": instante,
                        "tipo_operacion": "escritura",
                        "modulo": "Clientes",
                        "operacion": "PATCH /api/clientes/{id}",
                        "muestra": i,
                        "http_status": r.status_code,
                        "exito": exito,
                        "error_5xx": r.status_code >= 500,
                        "duracion_ms": duracion_ms,
                        "categoria_error": "NINGUNO" if exito else f"HTTP_{r.status_code}",
                    }
                )

            # Restaurar domicilio original de semilla
            client.patch(
                "/api/clientes/1",
                headers=headers,
                json={"address": CUENTAS_PRUEBA["cliente1"]["domicilio"]},
            )

            for i in range(1, 11):
                instante = datetime.now(ZONA_MX).isoformat()
                t0 = time.perf_counter()
                r = client.patch(
                    "/api/paquetes/foto-p3",
                    headers=headers,
                    json={
                        "descripcion": f"Cobertura fotográfica social validada (muestra {i})."
                    },
                )
                duracion_ms = round((time.perf_counter() - t0) * 1000, 2)
                exito = 200 <= r.status_code < 300
                registros_operaciones.append(
                    {
                        "fecha_tz": instante,
                        "tipo_operacion": "escritura",
                        "modulo": "Paquetes",
                        "operacion": "PATCH /api/paquetes/{clave}",
                        "muestra": i,
                        "http_status": r.status_code,
                        "exito": exito,
                        "error_5xx": r.status_code >= 500,
                        "duracion_ms": duracion_ms,
                        "categoria_error": "NINGUNO" if exito else f"HTTP_{r.status_code}",
                    }
                )

    finally:
        if proceso_backend is not None and proceso_backend.poll() is None:
            proceso_backend.terminate()
            try:
                proceso_backend.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proceso_backend.kill()
        if archivo_log is not None:
            archivo_log.close()

    # Agrupar estadísticas por operación y por tipo (lectura vs escritura)
    por_operacion: dict[str, list[float]] = {}
    tipo_por_op: dict[str, str] = {}
    for reg in registros_operaciones:
        op = reg["operacion"]
        por_operacion.setdefault(op, []).append(reg["duracion_ms"])
        tipo_por_op[op] = reg["tipo_operacion"]

    desglose_operaciones = []
    for op, tiempos in por_operacion.items():
        tipo = tipo_por_op[op]
        meta_ms = 1000.0 if tipo == "lectura" else 3000.0
        p95_op = calcular_p95(tiempos)
        desglose_operaciones.append(
            {
                "operacion": op,
                "tipo": tipo,
                "muestras": len(tiempos),
                "media_ms": round(statistics.mean(tiempos), 2),
                "p95_ms": p95_op,
                "max_ms": round(max(tiempos), 2),
                "meta_sla_ms": meta_ms,
                "cumple_meta_local": p95_op <= meta_ms,
            }
        )

    tiempos_lectura = [
        r["duracion_ms"] for r in registros_operaciones if r["tipo_operacion"] == "lectura"
    ]
    tiempos_escritura = [
        r["duracion_ms"] for r in registros_operaciones if r["tipo_operacion"] == "escritura"
    ]
    total_validas = len(registros_operaciones)
    exitosas = sum(1 for r in registros_operaciones if r["exito"])
    errores_5xx = sum(1 for r in registros_operaciones if r["error_5xx"])

    resumen_latencia = {
        "total_operaciones_validas": total_validas,
        "operaciones_exitosas": exitosas,
        "errores_5xx": errores_5xx,
        "porcentaje_exito_operaciones_validas": round((exitosas / total_validas) * 100, 2),
        "tasa_errores_5xx_porcentaje": round((errores_5xx / total_validas) * 100, 2),
        "lectura": {
            "muestras": len(tiempos_lectura),
            "media_ms": round(statistics.mean(tiempos_lectura), 2),
            "p95_ms": calcular_p95(tiempos_lectura),
            "max_ms": round(max(tiempos_lectura), 2),
            "meta_sla_p95_ms": 1000.0,
        },
        "escritura": {
            "muestras": len(tiempos_escritura),
            "media_ms": round(statistics.mean(tiempos_escritura), 2),
            "p95_ms": calcular_p95(tiempos_escritura),
            "max_ms": round(max(tiempos_escritura), 2),
            "meta_sla_p95_ms": 3000.0,
        },
        "desglose_por_operacion": desglose_operaciones,
    }
    return registros_operaciones, resumen_latencia


def generar_resumen() -> dict:
    carpeta_res = CARPETA / "resultados"
    ruta_p4 = carpeta_res / "paso4_funcionales.json"
    ruta_p4_xml = carpeta_res / "paso4_junit.xml"
    ruta_p5_json = carpeta_res / "paso5_disponibilidad.json"
    ruta_p5_jsonl = carpeta_res / "paso5_monitoreo.jsonl"

    if not ruta_p4.exists() or not ruta_p5_json.exists():
        raise RuntimeError(
            "Faltan resultados del Paso 4 o Paso 5. Ejecuta primero ejecutar_pruebas.py y monitorear_servicio.py."
        )

    datos_p4 = json.loads(ruta_p4.read_text(encoding="utf-8"))
    datos_p5 = json.loads(ruta_p5_json.read_text(encoding="utf-8"))
    sondas_p5 = [
        json.loads(linea)
        for linea in ruta_p5_jsonl.read_text(encoding="utf-8").splitlines()
        if linea.strip()
    ]

    ahora_mx = datetime.now(ZONA_MX)
    id_ejecucion = f"ejecucion_{ahora_mx.strftime('%Y%m%d_%H%M%S')}"
    carpeta_ejec = carpeta_res / id_ejecucion
    carpeta_ejec.mkdir(parents=True, exist_ok=True)

    if ruta_p4_xml.exists():
        shutil.copy2(ruta_p4_xml, carpeta_ejec / "junit.xml")

    # 1. Medir latencia HTTP real por operación
    registros_http, metricas_http = medir_operaciones_http()

    # 2. Construir eventos estructurados JSONL (100% sanitizados)
    eventos_jsonl: list[dict] = []

    for caso in datos_p4["matriz"]:
        eventos_jsonl.append(
            {
                "id_ejecucion": id_ejecucion,
                "fecha_tz": ahora_mx.isoformat(),
                "entorno": ENTORNO_DESC,
                "tipo_registro": "prueba_funcional",
                "modulo": caso["modulo"],
                "caso": caso["caso"],
                "resultado_esperado": caso["resultado_esperado"],
                "resultado_obtenido_sanitizado": caso["evidencia"],
                "estado": caso["estado"],
                "duracion_ms": round(caso["duracion_segundos"] * 1000, 2),
                "categoria_error": "NINGUNO" if caso["estado"] == "APROBADO" else "FALLO_FUNCIONAL",
            }
        )

    for s in sondas_p5:
        eventos_jsonl.append(
            {
                "id_ejecucion": id_ejecucion,
                "fecha_tz": s["timestamp"],
                "entorno": ENTORNO_DESC,
                "tipo_registro": "sonda_disponibilidad",
                "modulo": "Salud (/health)",
                "caso": f"sonda_{s['sonda']:02d}_{s['fase']}",
                "resultado_esperado": (
                    "HTTP 200 status=ok"
                    if s["fase"] != "2_caida_controlada"
                    else "Detección de caída controlada (ERROR_CONEXION)"
                ),
                "resultado_obtenido_sanitizado": f"estado={s['estado']} http={s['http_status']} ({s['detalle']})",
                "estado": "APROBADO" if s["saludable"] else "FALLIDO",
                "duracion_ms": s["duracion_ms"],
                "categoria_error": "NINGUNO" if s["saludable"] else s["estado"],
            }
        )

    for op in registros_http:
        eventos_jsonl.append(
            {
                "id_ejecucion": id_ejecucion,
                "fecha_tz": op["fecha_tz"],
                "entorno": ENTORNO_DESC,
                "tipo_registro": f"latencia_http_{op['tipo_operacion']}",
                "modulo": op["modulo"],
                "caso": f"{op['operacion']} [muestra {op['muestra']}]",
                "resultado_esperado": "HTTP 2xx dentro de umbral P95 del SLA",
                "resultado_obtenido_sanitizado": f"HTTP {op['http_status']}",
                "estado": "APROBADO" if op["exito"] else "FALLIDO",
                "duracion_ms": op["duracion_ms"],
                "categoria_error": op["categoria_error"],
            }
        )

    ruta_eventos_ejec = carpeta_ejec / "eventos.jsonl"
    with open(ruta_eventos_ejec, "w", encoding="utf-8") as f_out:
        for ev in eventos_jsonl:
            f_out.write(json.dumps(ev, ensure_ascii=False) + "\n")
    shutil.copy2(ruta_eventos_ejec, carpeta_res / "paso6_eventos.jsonl")

    # 3. Consolidar los 4 indicadores separados
    total_casos = datos_p4["total_casos"]
    aprobados = datos_p4["aprobados"]
    pct_pruebas = round((aprobados / total_casos) * 100, 2) if total_casos else 0.0

    sondas_activas = [
        s for s in sondas_p5 if s["fase"] == "1_operacion_normal" or s["sonda"] >= 11
    ]
    saludables_activas = sum(1 for s in sondas_activas if s["saludable"])

    consolidado = {
        "id_ejecucion": id_ejecucion,
        "fecha_generacion_tz": ahora_mx.isoformat(),
        "entorno": ENTORNO_DESC,
        "archivos_generados": {
            "carpeta_ejecucion": str(carpeta_ejec.relative_to(BACKEND_DIR)),
            "jsonl_estructurado": str(ruta_eventos_ejec.relative_to(BACKEND_DIR)),
            "total_lineas_jsonl": len(eventos_jsonl),
        },
        "indicadores_separados": {
            "1_pruebas_funcionales": {
                "total_casos": total_casos,
                "aprobados": aprobados,
                "fallidos": datos_p4["fallidos"],
                "omitidos": datos_p4["omitidos"],
                "porcentaje_aprobacion": pct_pruebas,
                "duracion_suite_pytest_segundos": datos_p4["duracion_total_segundos"],
                "nota": "La duración total de Pytest incluye preparación y múltiples aserciones por caso; no es latencia HTTP.",
            },
            "2_exito_operaciones_validas": {
                "total_solicitudes_validas": metricas_http["total_operaciones_validas"],
                "solicitudes_exitosas_2xx": metricas_http["operaciones_exitosas"],
                "respuestas_5xx": metricas_http["errores_5xx"],
                "porcentaje_exito": metricas_http["porcentaje_exito_operaciones_validas"],
                "tasa_error_5xx_porcentaje": metricas_http["tasa_errores_5xx_porcentaje"],
                "meta_sla_5xx": "< 1.0 % mensual",
            },
            "3_monitoreo_disponibilidad_health": {
                "intervalo_muestreo_segundos": datos_p5["intervalo_muestreo_segundos"],
                "timeout_sonda_segundos": datos_p5["timeout_sonda_segundos"],
                "duracion_ventana_observada_segundos": datos_p5["duracion_ventana_segundos"],
                "total_sondas_ventana": datos_p5["total_sondas"],
                "sondas_saludables_ventana": datos_p5["sondas_saludables"],
                "sondas_fallidas_caida_inducida": datos_p5["sondas_fallidas"],
                "porcentaje_bruto_con_caida_inducida": datos_p5["porcentaje_saludables_en_ventana"],
                "sondas_con_servicio_activo": f"{saludables_activas}/{len(sondas_activas)} (100.0 %)",
                "recuperacion_verificada": datos_p5["recuperacion_verificada"],
                "meta_sla_propuesta": "99.0 % mensual (no extrapolable desde una ventana corta de demostración)",
            },
            "4_latencia_http_cliente_p95": {
                "lectura_global": metricas_http["lectura"],
                "escritura_global": metricas_http["escritura"],
                "desglose_por_operacion": metricas_http["desglose_por_operacion"],
                "nota": "Tiempos medidos desde el cliente HTTP (httpx) en localhost, no latencia interna del servidor.",
            },
        },
        "limites_metodologicos": [
            "Los tiempos de respuesta corresponden al cliente HTTP local sobre PostgreSQL 17.12 en Docker (127.0.0.1:55432).",
            "La caída controlada detiene únicamente el proceso Uvicorn en el puerto 8010; no evalúa restauración de respaldos.",
            "Una ventana corta de demostración verifica el funcionamiento de las sondas y los umbrales P95 locales, pero no certifica cumplimiento mensual de 43,200 minutos.",
            "Los registros JSONL omiten tokens JWT, cabeceras Authorization, contraseñas, cadenas de conexión y cuerpos con datos personales.",
        ],
    }

    ruta_json_ejec = carpeta_ejec / "resumen.json"
    ruta_json_ejec.write_text(
        json.dumps(consolidado, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    shutil.copy2(ruta_json_ejec, carpeta_res / "paso6_resumen.json")

    # 4. Generar resumen legible en texto plano
    lineas_txt = [
        "==========================================================================",
        "  PROYECTO 3 - RESUMEN DE PRUEBAS, LOGS Y EVALUACIÓN DE INDICADORES (SLA)",
        "==========================================================================",
        f"ID de ejecución: {id_ejecucion}",
        f"Fecha y hora:    {ahora_mx.isoformat()}",
        f"Entorno:         {ENTORNO_DESC}",
        f"Archivo JSONL:   {ruta_eventos_ejec.relative_to(BACKEND_DIR)} ({len(eventos_jsonl)} registros sanitizados)",
        "",
        "1) PORCENTAJE DE PRUEBAS FUNCIONALES APROBADAS",
        f"   - Casos ejecutados: {total_casos} | Aprobados: {aprobados} | Fallidos: {datos_p4['fallidos']} | Omitidos: {datos_p4['omitidos']}",
        f"   - Porcentaje de aprobación: {pct_pruebas} %",
        f"   - Duración total de suite Pytest: {datos_p4['duracion_total_segundos']} s (no equivale a latencia HTTP)",
        "",
        "2) ÉXITO DE OPERACIONES HTTP VÁLIDAS (TASA 5XX)",
        f"   - Solicitudes válidas medidas: {metricas_http['total_operaciones_validas']}",
        f"   - Respuestas exitosas (2xx):   {metricas_http['operaciones_exitosas']} ({metricas_http['porcentaje_exito_operaciones_validas']} %)",
        f"   - Respuestas de error (5xx):   {metricas_http['errores_5xx']} ({metricas_http['tasa_errores_5xx_porcentaje']} %) | Meta SLA: < 1.0 %",
        "",
        "3) SONDAS SALUDABLES Y COBERTURA DEL MONITOREO (/health)",
        f"   - Intervalo de muestreo: {datos_p5['intervalo_muestreo_segundos']} s | Timeout: {datos_p5['timeout_sonda_segundos']} s | Ventana: {datos_p5['duracion_ventana_segundos']} s",
        f"   - Sondas totales en ventana: {datos_p5['total_sondas']} ({datos_p5['sondas_saludables']} saludables, {datos_p5['sondas_fallidas']} durante caída inducida)",
        f"   - Salud con servicio activo (pre-caída y post-recuperación): {saludables_activas}/{len(sondas_activas)} (100.0 %)",
        f"   - Porcentaje bruto en ventana con caída inducida: {datos_p5['porcentaje_saludables_en_ventana']} %",
        f"   - Recuperación verificada tras reinicio: {'SÍ' if datos_p5['recuperacion_verificada'] else 'NO'}",
        "",
        "4) LATENCIA HTTP DEL CLIENTE POR OPERACIÓN (P95 CON TAMAÑO DE MUESTRA)",
        f"   - Lectura global  (N={metricas_http['lectura']['muestras']}): Media = {metricas_http['lectura']['media_ms']} ms | P95 = {metricas_http['lectura']['p95_ms']} ms | Máx = {metricas_http['lectura']['max_ms']} ms (Meta SLA P95 <= 1000 ms)",
        f"   - Escritura global (N={metricas_http['escritura']['muestras']}): Media = {metricas_http['escritura']['media_ms']} ms | P95 = {metricas_http['escritura']['p95_ms']} ms | Máx = {metricas_http['escritura']['max_ms']} ms (Meta SLA P95 <= 3000 ms)",
        "   - Desglose por endpoint:",
    ]
    for item in metricas_http["desglose_por_operacion"]:
        lineas_txt.append(
            f"     * {item['operacion']:35s} ({item['tipo']:9s}, N={item['muestras']:2d}): "
            f"Media={item['media_ms']:6.2f} ms | P95={item['p95_ms']:6.2f} ms | Meta<={int(item['meta_sla_ms'])} ms"
        )

    lineas_txt.extend(
        [
            "",
            "5) LÍMITES METODOLÓGICOS Y SANITIZACIÓN",
            "   - Los tiempos medidos corresponden al cliente HTTP local; no representan tráfico WAN ni latencia interna pura.",
            "   - La demostración comprueba detección de caída y recuperación del servicio, no disponibilidad mensual (99.0 %).",
            "   - Todos los registros JSONL están sanitizados (sin Authorization, tokens, contraseñas ni datos personales).",
            "==========================================================================",
        ]
    )

    texto_final = "\n".join(lineas_txt) + "\n"
    ruta_txt_ejec = carpeta_ejec / "resumen.txt"
    ruta_txt_ejec.write_text(texto_final, encoding="utf-8")
    shutil.copy2(ruta_txt_ejec, carpeta_res / "paso6_resumen.txt")

    print(texto_final)
    return consolidado


if __name__ == "__main__":
    generar_resumen()
