# Suite de Pruebas de Disponibilidad, Funcionalidad y Logs (Proyecto 3)

Entorno de pruebas aislado en Docker (`PostgreSQL 17.12` en `127.0.0.1:55432`, base `fotografia_p3_test`) y backend de pruebas (`http://127.0.0.1:8010`) para evaluar los 7 módulos del sistema y los indicadores del SLA sin afectar la base operativa en Supabase.

## Estructura de `pruebas_p3/`

```text
pruebas_p3/
├── soporte/                               <-- Módulos internos (conexión, semilla, SQL de 23 tablas, reporte)
├── resultados/                            <-- Evidencias JSON y logs JSONL (generados localmente)
├── compose.yaml                           <-- Definición del contenedor PostgreSQL 17.12 (puerto 55432)
├── verificar_paso3.py                     <-- Parte 1: Siembra datos ficticios y verifica login/salud en 8010
├── ejecutar_pruebas.py                    <-- Parte 2: Corre las 11 pruebas y muestra tabla alineada en consola
├── test_funcionales_p3.py                 <-- Suite Pytest de los 7 módulos (positivos, negativos y concurrencia)
├── monitorear_servicio.py                 <-- Parte 3: Sondeo /health, caída controlada y recuperación
├── resumir_resultados.py                  <-- Parte 4: Latencia HTTP P95, logs JSONL sanitizados y resumen SLA
└── README.md
```

## Comandos de ejecución (desde `backend/`)

*(En una computadora nueva, solo se requiere tener **Docker Desktop** abierto y haber ejecutado `python -m venv .venv` y `.\.venv\Scripts\python.exe -m pip install -r requirements.txt`. El primer script configura `.env`, inicia el contenedor y crea las 23 tablas automáticamente).*

```powershell
# 1. Verificar contenedor y sembrar datos iniciales
docker compose --env-file pruebas_p3/.env -f pruebas_p3/compose.yaml ps
.\.venv\Scripts\python.exe pruebas_p3/verificar_paso3.py

# 2. Ejecutar las 11 pruebas funcionales (7 módulos)
.\.venv\Scripts\python.exe pruebas_p3/ejecutar_pruebas.py

# 3. Monitorear disponibilidad (/health), caída controlada y recuperación
.\.venv\Scripts\python.exe pruebas_p3/monitorear_servicio.py

# 4. Medir latencia HTTP P95, generar logs JSONL sanitizados y resumen del SLA
.\.venv\Scripts\python.exe pruebas_p3/resumir_resultados.py
```

## Documentación y entregables
* **Guía y guion de exposición (15 min):** `../documentacion/Guia_Presentacion_Proyecto_3.md`
* **Reporte físico para impresión:** `../documentacion/Proyecto_3_Pruebas_Logs_y_SLA.docx`
