"""
Medición HTTP local de lecturas concurrentes para Clientes y Reservas.
Registra tiempos promedio y percentil 95 (P95) en backend/artifacts/rendimiento.json.
"""
import json
import math
import os
import platform
import statistics
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import httpx

API_KEY = os.environ["FOTO_API_KEY"]
HEADERS = {"Authorization": f"Bearer {API_KEY}"}
ENDPOINTS = [
    "http://127.0.0.1:8011/api/clientes",
    "http://127.0.0.1:8012/api/reservas",
]


def run_client_sample(url: str) -> tuple[list[float], int]:
    """Ejecuta una lectura de calentamiento y 25 lecturas medidas para un cliente HTTP."""
    with httpx.Client(headers=HEADERS, timeout=10, trust_env=False) as client:
        client.get(url).raise_for_status()
        latencies_ms: list[float] = []
        error_count = 0

        for _ in range(25):
            start_time = time.perf_counter()
            try:
                response = client.get(url)
                if response.status_code != 200:
                    error_count += 1
            except httpx.RequestError:
                error_count += 1
            elapsed_ms = (time.perf_counter() - start_time) * 1000
            latencies_ms.append(elapsed_ms)

        return latencies_ms, error_count


def main() -> None:
    results = []
    for endpoint_url in ENDPOINTS:
        records_count = len(
            httpx.get(
                endpoint_url,
                headers=HEADERS,
                timeout=10,
                trust_env=False,
            ).json()
        )

        with ThreadPoolExecutor(max_workers=4) as executor:
            batches = list(executor.map(run_client_sample, [endpoint_url] * 4))

        all_times = sorted(t for batch_times, _ in batches for t in batch_times)
        p95_index = math.ceil(len(all_times) * 0.95) - 1

        results.append(
            {
                "endpoint": endpoint_url,
                "records": records_count,
                "requests": len(all_times),
                "concurrency": 4,
                "errors": sum(err for _, err in batches),
                "mean_ms": round(statistics.mean(all_times), 2),
                "p95_ms": round(all_times[p95_index], 2),
                "max_ms": round(max(all_times), 2),
            }
        )

    report = {
        "environment": platform.platform(),
        "python": platform.python_version(),
        "database": "SQLite local",
        "method": (
            "HTTP directo a cada servicio; 4 clientes concurrentes, 25 lecturas por cliente, "
            "una lectura previa de calentamiento por cliente excluida"
        ),
        "results": results,
        "limitations": (
            "No incluye WAN ni prueba de carga sostenida; no demuestra disponibilidad "
            "mensual ni desempeño en PostgreSQL."
        ),
    }

    output_path = Path("artifacts/rendimiento.json")
    output_path.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
