# Luz & Memoria · Sistema Integral de Gestión para Fotografía

Repositorio del proyecto **Luz & Memoria** (Web, Backend FastAPI, Aplicación Android y Suite de Pruebas de Disponibilidad, Funcionalidad y Logs para evaluación de SLA).

## Estructura del Proyecto

```text
Proyecto_2_1_Fotografia/
├── backend/
│   ├── app/                                       <-- Código principal del backend FastAPI
│   ├── documentacion/
│   │   ├── Guia_Presentacion_Proyecto_3.md        <-- Guía y guion de 15 min para los 3 integrantes
│   │   └── Proyecto_3_Pruebas_Logs_y_SLA.docx     <-- Reporte físico (Portada + 3 páginas)
│   ├── pruebas_p3/
│   │   ├── soporte/                               <-- Módulos internos (conexión, semilla, SQL, reporte)
│   │   ├── resultados/                            <-- Evidencias JSON y logs JSONL (ignorados en Git)
│   │   ├── compose.yaml                           <-- Docker PostgreSQL 17.12 aislado (puerto 55432)
│   │   ├── verificar_paso3.py                     <-- Comando 1 de la guía (Parte 1: Semilla y acceso)
│   │   ├── ejecutar_pruebas.py                    <-- Comando 2 de la guía (Parte 2: 11 pruebas funcionales)
│   │   ├── test_funcionales_p3.py                 <-- Casos Pytest de los 7 módulos del sistema
│   │   ├── monitorear_servicio.py                 <-- Comando 3 de la guía (Parte 3: Caída y recuperación)
│   │   ├── resumir_resultados.py                  <-- Comando 4 de la guía (Parte 4: Logs JSONL, P95 y SLA)
│   │   └── README.md
│   ├── .env.example / .gitignore
│   ├── README.md
│   └── requirements.txt
│
├── frontend/
│   ├── public/
│   ├── src/                                       <-- Aplicación React 19 + Material UI 7 + Redux Toolkit
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
│
└── mobil/                                         <-- Aplicación Android (Kotlin / Jetpack Compose)
```

---

## Ejecución de la Demostración y Pruebas del Proyecto 3

### Requisitos en una computadora nueva (solo la primera vez)
1. Instalar y abrir **Docker Desktop** (https://www.docker.com/products/docker-desktop/). No es necesario instalar PostgreSQL aparte.
2. En una terminal dentro de `backend/`, crear el entorno virtual e instalar dependencias:
   ```powershell
   cd backend
   python -m venv .venv
   .\.venv\Scripts\python.exe -m pip install -r requirements.txt
   ```
   *(Al correr por primera vez `verificar_paso3.py`, el script crea automáticamente `pruebas_p3/.env`, inicia el contenedor de PostgreSQL 17 en Docker y carga las 23 tablas del esquema).*

---

### Parte 1 — Verificar contenedor PostgreSQL local y sembrar datos de prueba
Verifica que el contenedor `fotografia-pruebas-p3-postgres-1` esté activo en `127.0.0.1:55432`, siembra las cuentas de prueba (Administrador, Clientes y Paquetes) y comprueba `/health` y login JWT en el puerto `8010`:

```powershell
docker compose --env-file pruebas_p3/.env -f pruebas_p3/compose.yaml ps
.\.venv\Scripts\python.exe pruebas_p3/verificar_paso3.py
```

### Parte 2 — Ejecutar la suite de 11 pruebas funcionales sobre los 7 módulos
Ejecuta los casos de Acceso/Roles, Clientes, Paquetes, Reservas/Concurrencia, Pagos, Ventas y Galerías/Entregas, mostrando la tabla resumen por columnas en consola:

```powershell
.\.venv\Scripts\python.exe pruebas_p3/ejecutar_pruebas.py
```

### Parte 3 — Monitoreo de disponibilidad (`/health`), caída controlada y recuperación
Sondea `http://127.0.0.1:8010/health` cada `0.5 s`, detiene únicamente el proceso del backend en `8010` para registrar las sondas fallidas (`ERROR_CONEXION`), lo reinicia y verifica la recuperación con 4 sondas saludables consecutivas:

```powershell
.\.venv\Scripts\python.exe pruebas_p3/monitorear_servicio.py
```

### Parte 4 — Medición de latencia HTTP (P95), logs JSONL sanitizados y evaluación de SLA
Ejecuta 100 peticiones HTTP válidas (80 lecturas y 20 escrituras), genera la bitácora sanitizada `eventos.jsonl` (sin tokens ni contraseñas) y muestra en pantalla los 4 indicadores separados frente al SLA:

```powershell
.\.venv\Scripts\python.exe pruebas_p3/resumir_resultados.py
Get-Content pruebas_p3/resultados/paso6_eventos.jsonl -TotalCount 4
```

---

## Documentación para el Equipo
* **Guía paso a paso para la exposición:** [documentacion/Guia_Presentacion_Proyecto_3.md](documentacion/Guia_Presentacion_Proyecto_3.md)
* **Reporte físico en Word:** [documentacion/Proyecto_3_Pruebas_Logs_y_SLA.docx](documentacion/Proyecto_3_Pruebas_Logs_y_SLA.docx)
