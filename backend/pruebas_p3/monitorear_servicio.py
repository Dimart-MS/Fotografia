"""
Paso 5: Monitoreo de disponibilidad, caída controlada y recuperación (`/health`).
Consulta http://127.0.0.1:8010/health a intervalo conocido, con timeout estricto,
validando código HTTP 200 y cuerpo JSON esperado (`status == "ok"`).

Distingue cuatro resultados por sonda:
- SALUDABLE: HTTP 200 y JSON válido con status="ok".
- ERROR_HTTP: El servidor respondió con un código distinto de 200 (ej. 500, 503).
- RESPUESTA_INVALIDA: HTTP 200 pero el cuerpo no es JSON válido o no contiene status="ok".
- ERROR_CONEXION: Rechazo de conexión o timeout al contactar el puerto 8010.

En modo `demo` (por defecto), controla exclusivamente el subproceso del backend de pruebas
en el puerto 8010 para demostrar:
1) Operación saludable inicial,
2) Caída controlada (deteniendo solo el backend 8010, sin tocar PostgreSQL, MySQL ni Supabase),
3) Reinicio del backend 8010 y recuperación verificada.
"""

import argparse
import json
import subprocess
import sys
import time
from datetime import datetime, timezone
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
from verificar_paso3 import esperar_salud

ZONA_MX = ZoneInfo("America/Mexico_City")
URL_HEALTH = "http://127.0.0.1:8010/health"


def ejecutar_sonda(numero: int, fase: str, timeout_s: float = 1.5) -> dict:
    """Ejecuta una sonda individual hacia /health y clasifica el resultado."""
    instante = datetime.now(ZONA_MX).isoformat()
    inicio = time.perf_counter()
    codigo_http = None
    categoria = "SALUDABLE"
    detalle = "OK"

    try:
        resp = httpx.get(URL_HEALTH, timeout=timeout_s, trust_env=False)
        duracion_ms = round((time.perf_counter() - inicio) * 1000, 2)
        codigo_http = resp.status_code

        if resp.status_code != 200:
            categoria = "ERROR_HTTP"
            detalle = f"HTTP {resp.status_code}"
        else:
            try:
                cuerpo = resp.json()
                if not isinstance(cuerpo, dict) or cuerpo.get("status") != "ok":
                    categoria = "RESPUESTA_INVALIDA"
                    detalle = "Cuerpo JSON sin status='ok'"
                else:
                    categoria = "SALUDABLE"
                    detalle = f"status={cuerpo.get('status')} service={cuerpo.get('service')}"
            except ValueError:
                categoria = "RESPUESTA_INVALIDA"
                detalle = "Respuesta no es JSON válido"

    except httpx.TimeoutException:
        duracion_ms = round((time.perf_counter() - inicio) * 1000, 2)
        categoria = "ERROR_CONEXION"
        detalle = "Timeout al esperar respuesta de /health"
    except httpx.RequestError as exc:
        duracion_ms = round((time.perf_counter() - inicio) * 1000, 2)
        categoria = "ERROR_CONEXION"
        detalle = f"Conexión rechazada o caída ({type(exc).__name__})"

    return {
        "sonda": numero,
        "timestamp": instante,
        "fase": fase,
        "estado": categoria,
        "saludable": categoria == "SALUDABLE",
        "http_status": codigo_http,
        "duracion_ms": duracion_ms,
        "detalle": detalle,
    }


def _iniciar_subproceso_backend(archivo_log):
    return subprocess.Popen(
        [sys.executable, str(CARPETA_SOPORTE / "iniciar_backend_pruebas.py")],
        cwd=str(BACKEND_DIR),
        env=construir_entorno_pruebas(),
        stdout=archivo_log,
        stderr=subprocess.STDOUT,
        text=True,
    )


def _detener_subproceso_backend(proc: subprocess.Popen | None) -> None:
    if proc is not None and proc.poll() is None:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=2)


def simular_ciclo_disponibilidad(intervalo_s: float = 0.5, timeout_s: float = 1.5) -> dict:
    """
    Ejecuta el ciclo completo de demostración:
    - Inicia el backend en 8010 y toma 4 sondas saludables.
    - Detiene el backend en 8010 y toma 4 sondas durante la caída.
    - Reinicia el backend en 8010 y sondea hasta acumular 4 sondas saludables tras recuperarse.
    """
    if puerto_ocupado(8010):
        raise RuntimeError(
            "El puerto 8010 ya está ocupado por otro proceso. "
            "Detén esa instancia para que el monitor controle la caída y recuperación."
        )

    carpeta_res = CARPETA / "resultados"
    carpeta_res.mkdir(exist_ok=True)
    ruta_log_backend = carpeta_res / "backend_monitoreo_p3.log"
    ruta_jsonl = carpeta_res / "paso5_monitoreo.jsonl"
    ruta_resumen = carpeta_res / "paso5_disponibilidad.json"

    sondas: list[dict] = []
    contador = 0
    inicio_ventana = datetime.now(ZONA_MX)
    t0_mono = time.perf_counter()

    with open(ruta_log_backend, "w", encoding="utf-8") as log_file:
        proc = _iniciar_subproceso_backend(log_file)
        try:
            # Esperar arranque inicial antes de comenzar la ventana de muestreo
            esperar_salud(timeout_s=15.0)

            # Fase 1: 4 sondas en operación normal
            for _ in range(4):
                contador += 1
                reg = ejecutar_sonda(contador, "1_operacion_normal", timeout_s)
                sondas.append(reg)
                print(
                    f"[Sonda {reg['sonda']:02d}] {reg['timestamp']} | {reg['fase']} | "
                    f"{reg['estado']} ({reg['duracion_ms']} ms) - {reg['detalle']}",
                    flush=True,
                )
                time.sleep(intervalo_s)

            # Fase 2: Caída controlada (detener exclusivamente el backend 8010)
            print("\n--- Deteniendo instancia de backend de pruebas (8010) ---", flush=True)
            _detener_subproceso_backend(proc)
            proc = None

            for _ in range(4):
                contador += 1
                reg = ejecutar_sonda(contador, "2_caida_controlada", timeout_s)
                sondas.append(reg)
                print(
                    f"[Sonda {reg['sonda']:02d}] {reg['timestamp']} | {reg['fase']} | "
                    f"{reg['estado']} ({reg['duracion_ms']} ms) - {reg['detalle']}",
                    flush=True,
                )
                time.sleep(intervalo_s)

            # Fase 3: Reinicio y sondas hasta confirmar 4 sondas saludables seguidas
            print("\n--- Reiniciando instancia de backend de pruebas (8010) ---", flush=True)
            proc = _iniciar_subproceso_backend(log_file)

            saludables_recuperacion = 0
            intentos_recuperacion = 0
            while saludables_recuperacion < 4 and intentos_recuperacion < 20:
                intentos_recuperacion += 1
                contador += 1
                reg = ejecutar_sonda(contador, "3_recuperacion", timeout_s)
                sondas.append(reg)
                print(
                    f"[Sonda {reg['sonda']:02d}] {reg['timestamp']} | {reg['fase']} | "
                    f"{reg['estado']} ({reg['duracion_ms']} ms) - {reg['detalle']}",
                    flush=True,
                )
                if reg["saludable"]:
                    saludables_recuperacion += 1
                else:
                    saludables_recuperacion = 0
                time.sleep(intervalo_s)

        finally:
            _detener_subproceso_backend(proc)

    fin_ventana = datetime.now(ZONA_MX)
    duracion_ventana_s = round(time.perf_counter() - t0_mono, 3)

    # Guardar registro estructurado JSONL (una sonda por línea)
    with open(ruta_jsonl, "w", encoding="utf-8") as f_jsonl:
        for s in sondas:
            f_jsonl.write(json.dumps(s, ensure_ascii=False) + "\n")

    total_sondas = len(sondas)
    total_saludables = sum(1 for s in sondas if s["saludable"])
    total_fallidas = total_sondas - total_saludables

    # Calcular ventana observada entre la primera sonda fallida y la primera saludable posterior
    indices_fallo = [i for i, s in enumerate(sondas) if not s["saludable"]]
    primera_fallida = sondas[indices_fallo[0]]["timestamp"] if indices_fallo else None
    indice_recup = (
        next(
            (i for i in range(indices_fallo[-1] + 1, len(sondas)) if sondas[i]["saludable"]),
            None,
        )
        if indices_fallo
        else None
    )
    primera_recuperada = sondas[indice_recup]["timestamp"] if indice_recup is not None else None

    resumen = {
        "fecha_utc": datetime.now(timezone.utc).isoformat(),
        "endpoint": URL_HEALTH,
        "intervalo_muestreo_segundos": intervalo_s,
        "timeout_sonda_segundos": timeout_s,
        "ventana_inicio": inicio_ventana.isoformat(),
        "ventana_fin": fin_ventana.isoformat(),
        "duracion_ventana_segundos": duracion_ventana_s,
        "total_sondas": total_sondas,
        "sondas_saludables": total_saludables,
        "sondas_fallidas": total_fallidas,
        "porcentaje_saludables_en_ventana": round((total_saludables / total_sondas) * 100, 2),
        "primera_sonda_fallida": primera_fallida,
        "primera_sonda_recuperada": primera_recuperada,
        "recuperacion_verificada": indice_recup is not None,
        "nota_metodologica": (
            "Demostración controlada de caída y recuperación del proceso API en el puerto 8010. "
            "No equivale a restauración de respaldos de base de datos ni certifica disponibilidad mensual."
        ),
        "resultado": "APROBADO" if (total_fallidas >= 4 and indice_recup is not None) else "INCOMPLETO",
    }

    ruta_resumen.write_text(
        json.dumps(resumen, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return resumen


def monitorear_continuo(muestras: int, intervalo_s: float, timeout_s: float) -> None:
    """Modo de sondeo pasivo para observar una instancia ya iniciada manualmente."""
    for n in range(1, muestras + 1):
        reg = ejecutar_sonda(n, "monitoreo_manual", timeout_s)
        print(
            f"[Sonda {reg['sonda']:02d}] {reg['timestamp']} | "
            f"{reg['estado']} ({reg['duracion_ms']} ms) - {reg['detalle']}",
            flush=True,
        )
        if n < muestras:
            time.sleep(intervalo_s)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Monitor de disponibilidad y recuperación de /health (Paso 5)."
    )
    parser.add_argument(
        "--modo",
        choices=["demo", "continuo"],
        default="demo",
        help="demo: ejecuta ciclo automático de operación, caída y recuperación; continuo: solo sondea",
    )
    parser.add_argument(
        "--intervalo",
        type=float,
        default=0.5,
        help="Segundos de espera entre sondas (por defecto: 0.5)",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=1.5,
        help="Timeout de cada petición HTTP en segundos (por defecto: 1.5)",
    )
    parser.add_argument(
        "--muestras",
        type=int,
        default=20,
        help="Cantidad de sondas en modo continuo (por defecto: 20)",
    )
    args = parser.parse_args()

    if args.modo == "demo":
        resumen = simular_ciclo_disponibilidad(
            intervalo_s=args.intervalo,
            timeout_s=args.timeout,
        )
        print("\nResumen Paso 5:")
        print(json.dumps(resumen, indent=2, ensure_ascii=False))
    else:
        monitorear_continuo(args.muestras, args.intervalo, args.timeout)


if __name__ == "__main__":
    main()
