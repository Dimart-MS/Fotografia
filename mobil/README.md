# Luz & Memoria · Android

Aplicación para administradores del estudio. Comparte clientes y reservas con la web mediante el mismo backend; **Android no se conecta directamente a Supabase**.

## Requisitos

- Android Studio compatible con AGP 8.9.2, JDK 17 o 21 (se verificó con el JDK 21 integrado).
- Android SDK 35 y teléfono/emulador con Android 8.0 (API 26) o superior.
- Backend del equipo funcionando en el puerto **8000**, con su conexión a Supabase y una cuenta de rol **Administrador**. Para crearla se utiliza `backend/crear_admin.py`; no hay contraseñas incluidas en la app.

Gradle Wrapper 8.11.1 descarga las dependencias al sincronizar; no necesitas instalar Gradle por separado. Tecnologías: Kotlin 2.0.21, Jetpack Compose BOM 2024.09.00, Material 3, Retrofit 2.11.0, OkHttp 4.12.0, Lifecycle 2.8.7 y Navigation 2.8.9.

## Abrir y ejecutar

1. En Android Studio abre **`mobil`**, no la raíz del repositorio. Espera a que termine la sincronización de Gradle y acepta instalar el SDK solicitado si falta.
2. Comprueba que el backend configurado responda en `http://127.0.0.1:8000/health`. La configuración de la base de datos pertenece al backend.
3. Selecciona un dispositivo y ejecuta `app` con Run.
4. Inicia sesión con la cuenta administrativa del mismo backend que usa la web.

**Emulador de Android Studio:** debug utiliza automáticamente `http://10.0.2.2:8000/` para acceder al backend de tu computadora.

**Teléfono por USB:** activa la depuración USB, acepta la autorización y ejecuta en PowerShell:

```powershell
adb devices
adb reverse tcp:8000 tcp:8000
```

Si `adb` no está en PATH, usa la terminal de Android Studio o su ruta completa:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" reverse tcp:8000 tcp:8000
```

Debug en teléfono físico usa `http://127.0.0.1:8000/`. El enlace USB debe seguir conectado; repite `adb reverse` si se pierde. Con varios dispositivos utiliza `adb -s SERIAL reverse tcp:8000 tcp:8000`.

**Backend alojado o conexión por Wi-Fi:** define la URL al compilar, desde `mobil`:

```powershell
.\gradlew.bat :app:assembleDebug "-PstudioApiUrl=https://api.ejemplo.com/"
```

Sustituye el ejemplo por la URL real del **backend**, no por la URL del panel/proyecto Supabase. Para usar Run de Android Studio puedes definir `studioApiUrl=URL_REAL` en tu archivo personal `%USERPROFILE%\.gradle\gradle.properties` y sincronizar. Por Wi-Fi, usa la IP local de la computadora y el puerto 8000; el backend debe aceptar conexiones de esa red. HTTP solo se permite en debug. Release requiere HTTPS y una firma propia; no se incluyen claves de firma.

## Alcance e historias

| Historia | Funciones |
|---|---|
| Como administrador, quiero gestionar clientes para asociarlos a una contratación. | Acceso, búsqueda, registro y detalle de clientes; domicilio dividido en campos, selector integrado de lugares con confirmación/ajuste manual y consulta o ruta externa en Maps. |
| Como administrador, quiero gestionar reservas para organizar los eventos. | Agenda mensual, filtros, detalle, alta, registro de anticipo y cancelación de solicitudes pendientes sin pagos. |

Incluye inicio con métricas y próximos eventos. Contempla los estados actuales de reservas, fechas ocupadas y tipo de evento Otro. El servidor valida disponibilidad, importes y permisos. El anticipo se registra como efectivo según el contrato actual del backend: solo debe confirmarse dinero realmente recibido.

El domicilio incluye el selector integrado **«Buscar y seleccionar lugar»** (conectado a **Google Places API (New)** sin solicitar permiso de ubicación), que permite buscar sugerencias, elegir un resultado, revisar/corregir número exterior, interior, colonia, ciudad o código postal y rellenar el formulario sin guardar automáticamente el cliente. El botón **«Ver en Google Maps»** abre la consulta externa y **«Cómo llegar»** en el detalle del cliente abre la ruta en Maps. Todos los campos se envían al backend como una sola cadena `address` (máximo 250 caracteres), sin cambios de esquema.

### Configuración local de Google Places API (New)

Para habilitar sugerencias reales en el selector de domicilio sin subir credenciales a Git:

1. En Google Cloud Console, vincula una cuenta de facturación al proyecto y habilita **Places API (New)** (`places.googleapis.com`).
2. Crea una clave de API y **restríngela**:
   - **Restricción de aplicación:** *Aplicaciones de Android*, paquete `com.example.fotografia` y huella digital **SHA-1** de tu certificado debug/release.
   - **Restricción de API:** limita la clave únicamente a **Places API (New)**.
3. Define `studioPlacesApiKey` en `mobil/local.properties` (ignorado por Git) o en `%USERPROFILE%\.gradle\gradle.properties`:

```properties
studioPlacesApiKey=TU_CLAVE_RESTRINGIDA_DE_PLACES
```

Si la clave no está configurada o no hay conexión, el selector lo informa claramente y mantiene disponible la captura y edición manual.

No incluye portal de clientes, edición/baja de clientes, galerías, ventas ni gestión de entregas. Que el backend tenga esas funciones no significa que estén implementadas en este incremento móvil.

## Estructura

```text
mobil/
  app/src/main/java/com/example/fotografia/
    data/          Modelos, validaciones, sesión y API
    ui/auth/       Acceso administrativo
    ui/home/       Inicio
    ui/clients/    Clientes y domicilio
    ui/bookings/   Agenda y reservas
    ui/theme/      Colores y tipografía
  app/src/test/    Pruebas de reglas y contrato HTTP
  gradle/          Versiones y wrapper
```

StateFlow y ViewModel gestionan el estado. El token permanece en memoria; al cerrar el proceso se solicita acceso nuevamente. Las escrituras evitan dobles pulsaciones y no se reintentan automáticamente si se pierde la respuesta. Los importes se manejan en centavos.

## Comprobar antes de subir

Desde `mobil`, con Java configurado:

```powershell
.\gradlew.bat :app:assembleDebug :app:testDebugUnitTest :app:lintDebug
```

APK: `app/build/outputs/apk/debug/app-debug.apk`. Resultados de pruebas: `app/build/reports/tests/testDebugUnitTest/index.html`. Lint: `app/build/reports/lint-results-debug.html`.

El código se ajustó al contrato del backend `c493e69`. Las pruebas HTTP de backend y de Google Places utilizan MockWebServer; **la consulta en vivo a Google Places API (New) depende de que el equipo proporcione su clave local `studioPlacesApiKey`** y **la integración real con Supabase sigue pendiente de verificar** con el backend configurado en el puerto 8000 y una cuenta del equipo. El selector de domicilio con confirmación y ajuste manual, la conservación del borrador al cancelar o rotar pantalla y la apertura de Maps se verificaron con pruebas unitarias e instrumentadas en Samsung SM-A035M (`R9HT30BTNVL`). El historial detallado está en `AVANCES.md`.

## Git

`mobil` pertenece al repositorio de `frontend` y `backend`: no ejecutes otro `git init` aquí. Se incluyen código, recursos y Gradle Wrapper. Se excluyen SDK local (`local.properties`), cachés, compilaciones, IDE, archivos de entorno y claves de firma. Android Studio genera la configuración local al abrir el proyecto en cada computadora.

No agregues contraseñas, JWT, cadenas de conexión ni claves de Supabase al código o a propiedades versionadas. Para compartir datos, web y móvil deben apuntar al mismo backend conectado a la misma base.
