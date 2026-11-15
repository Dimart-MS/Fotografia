# Luz y Memoria · Sistema de gestión para fotografía

## Tecnologías y requisitos

| Componente | Tecnologías | Versión para desarrollo |
|---|---|---|
| Backend | Python, FastAPI y SQLAlchemy | Python 3.11 mínimo según las dependencias. Probado con 3.13. |
| Frontend | React 19, Vite 6, Material UI 7.0.2 y Redux Toolkit | Para Windows, Node.js 18.x mínimo según las dependencias de Vite (también admite 20.x y 22 en adelante). Se recomienda la versión probada, Node.js 24.16 con npm. |
| Base de datos | MySQL 8 y PyMySQL | Probado con MySQL 8.4.3. |

## Arranque local en Windows

Con MySQL activo, abre dos terminales en la raíz del proyecto.

**1. Backend** (PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe run_local.py
```

`venv` crea el entorno local y `pip install -r requirements.txt` descarga las dependencias del backend en ese entorno. El último comando inicia Clientes (puerto 8011) y Reservas (8012) y muestra la **clave del estudio** que usarás en el panel.

El backend se conecta a MySQL en `127.0.0.1:3306`. Intenta entrar como `root` sin contraseña y, si MySQL rechaza el acceso, solicita usuario y contraseña por consola. La cuenta debe poder crear bases y tablas. Al primer arranque se crean **fotografia_clientes** y **fotografia_reservas**, con cuatro clientes y cuatro reservas de ejemplo en una instalación vacía. Si tu MySQL usa otro puerto, ejecuta, por ejemplo, `$env:MYSQL_PORT = '3307'` en esa terminal antes de iniciar el backend.

**2. Frontend** (segunda terminal)

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

`npm.cmd ci` instala las versiones registradas en `package-lock.json`. `npm.cmd run dev` inicia el frontend en **http://127.0.0.1:5175**. Entra con la clave que muestra el backend.

Para los siguientes arranques basta con tener MySQL activo y repetir el último comando de cada bloque desde su carpeta. Vuelve a instalar dependencias si cambian `requirements.txt` o `package-lock.json`.

## Historias cubiertas

- **HU06 · Registro y consulta de clientes.** Guarda nombre, teléfono, correo y domicilio, permite consultar el directorio y rechaza correos duplicados.
- **HU02 · Reservas y anticipos.** Registra solicitudes por cliente, fecha, evento y paquete. Una solicitud pendiente deja disponible la fecha. Un anticipo de entre 50 % y 100 % confirma la reserva y aparta el día. Las solicitudes pendientes se pueden cancelar conservando el historial.

**Pruebas.** Desde `backend`, ejecuta `.\.venv\Scripts\python.exe -m pytest tests -q`. Por defecto se usa SQLite temporal. El [reporte de la entrega en MySQL](artifacts/pruebas_mysql.xml) contiene los resultados de los 26 casos.
