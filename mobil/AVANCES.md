# Registro de trabajo · Android

## Estado actual · preparación para Git (19 de noviembre de 2026)

- Proyecto ubicado en `mobil/`; los archivos versionados de web y backend no se modificaron.
- Conexión debug actualizada a la API unificada en 8000. `studioApiUrl` permite configurar un único backend al compilar; no se requieren claves de Supabase en Android.
- Contrato revisado contra el backend `c493e69`: filtros de estados ampliados, fechas Realizada/Entregada ocupadas, evento Otro y explicación de errores HTTP 400. Eliminada una llamada no utilizada a un endpoint de detalle inexistente.
- README actualizado con requisitos, ejecución, alcance, pruebas y exclusiones de Git.
- Pendiente: prueba integral con la API real conectada a Supabase y revisión de búsqueda/regreso de Maps en Samsung. Las pruebas HTTP automatizadas son simuladas; no prueban la base remota.
- Las entradas siguientes son históricas; sus puertos 8011/8012 y pruebas MySQL corresponden a versiones anteriores.

## 18 de noviembre de 2026

Objetivo: implementar en Android la gestión administrativa de clientes y reservas de Luz & Memoria, conservando la identidad de la web y consumiendo las APIs existentes.

### Completado en código

- Inspección de la plantilla y del contrato del backend en `origin/main` (`5aac237`).
- Identificación de la incompatibilidad inicial: dependencias AndroidX superiores al SDK/AGP configurados. Se fijaron versiones compatibles con SDK 35.
- Preparación de respaldo de los archivos originales antes de aplicar cambios.
- Separación de modelos, repositorio HTTP, estado, navegación y pantallas por función.
- Acceso administrativo, sesión en memoria, manejo de errores y protección contra envíos duplicados.
- Tema del estudio, inicio, directorio de clientes, alta y detalle.
- Agenda mensual, filtros, creación y detalle de reservas, registro de anticipos y cancelación.
- Pruebas de validación y contrato HTTP con MockWebServer; instrucciones de ejecución en README.

### Verificación realizada

- `:app:assembleDebug`: correcto; APK generado en `app/build/outputs/apk/debug/app-debug.apk`.
- `:app:testDebugUnitTest`: 10 pruebas aprobadas, 0 fallos, 0 errores (9 de reglas/HTTP añadidas y 1 heredada de la plantilla).
- `:app:lintDebug`: finalizado correctamente, sin errores bloqueantes. Conserva advertencias sobre actualización de versiones, recursos heredados sin uso, catálogo de dependencias y ubicación de la fotografía. No equivale a una revisión visual.
- Resultado conjunto: `BUILD SUCCESSFUL`.
- La primera ejecución señaló el límite de anticipo para totales impares en centavos. La versión final redondea el mínimo hacia arriba y pasa esa prueba.
- La compilación original fallaba por incompatibilidad de dependencias antes de estos cambios.
- No había un dispositivo conectado ni un AVD disponible en la comprobación inicial. No se realizaron pruebas instrumentadas ni se afirma haber validado visualmente la aplicación.

### Actualización: integración real y diseño en Samsung

- Backend del equipo ejecutado sin modificar sus archivos versionados; comparación con `origin/main` (`5aac237`) sin diferencias.
- Python local reparado y dependencias instaladas. MySQL real identificado en el puerto 3307. Se ejecutaron las migraciones existentes del equipo.
- Verificados con respuestas HTTP 200/201: salud de ambos servicios con MySQL, login JWT, sesión, clientes, paquetes, reservas, alta de cliente, alta de reserva, detalle y confirmación de anticipo.
- Verificado por el proxy web en 5175 que el cliente y la reserva confirmada son los mismos registros persistidos en MySQL.
- APK instalado en Samsung SM-A035M. Acceso real por USB (`adb reverse` en 8011 y 8012); carga de clientes, paquetes y reservas confirmada en logs del backend.
- Revisados visualmente login, inicio, directorio y agenda en el teléfono. Login adaptado al administrativo de la web: fotografía, logo, títulos serif, campos con iconos y paleta verde/crema. Inicio con próxima cobertura confirmada y encabezados coherentes entre módulos.
- Eliminados tonos morados residuales de navegación. Añadido ajuste del teclado. La configuración de APIs pasó a compilación, sin controles técnicos en las pantallas y sin guardar contraseña ni token.
- Recompilación y 10 pruebas JVM aprobadas; análisis estático finalizado sin errores bloqueantes.

Estado actual: integración básica real comprobada y diseño revisado en Samsung. No se afirma haber completado todos los casos de aceptación en interfaz móvil.

### Pendiente de integración real

- Completar desde la interfaz móvil el recorrido de escritura: alta de cliente → reserva → anticipo. Esas operaciones ya se probaron directamente contra las APIs reales.
- Probar conflicto entre dos solicitudes sobre la misma fecha y sesión vencida.
- Ampliar pruebas de accesibilidad, rotación y tamaños de pantalla.
- Edición de clientes: depende de completar la operación en el backend. No se modificó por estar fuera del alcance móvil.

La integración descrita utilizó MySQL real. Los tests JVM con MockWebServer siguen siendo pruebas independientes de contrato y no sustituyen los recorridos pendientes.

### Respaldo

Los originales de la plantilla se conservaron en `C:\Users\user\Documents\Proyectos\Proyecto_2_1_Fotografia\backend\artifacts\android_stage\original`. Esa carpeta es un área local de preparación, no una dependencia del proyecto Android.

### Cierre de UX y cuentas

- Audiencia confirmada: administración interna del estudio. Mensajes de agenda, clientes y anticipos, sin invitaciones de contratación para clientes.
- Se retiraron del producto el botón Conexión, el diálogo de URLs y su almacenamiento como preferencias. La configuración de servidores pertenece a Gradle/ConnectionConfig.
- El login administrativo usa el mismo estilo fotográfico y colores del sitio, adaptados al teléfono.
- Se creó un administrador en la base local a petición del usuario. Se mantiene el script original `crear_admin.py` para otras instalaciones; la propuesta de creación automática fue retirada, sin cambios versionados en la web/backend.
- Los registros temporales de cliente, reserva y cuenta de prueba fueron retirados. Los registros previos del equipo se conservaron.

### 19 de noviembre de 2026 · Selectores y cierre de verificaciones

- Selectores de cliente, tipo de evento, paquete y estado con campo etiquetado, flecha desplegable, opción seleccionada y estados deshabilitados/vacíos.
- Sustituido el diálogo de fecha de Android por un calendario Compose con los colores del estudio. Impide elegir fechas anteriores al día local de México o fechas con reserva confirmada. Cancelar no modifica la selección previa; se conservan las validaciones del backend.
- No hay controles de conexión ni URLs en las pantallas. La app sigue siendo administrativa; no hay autorregistro ni promoción para clientes.
- Resultado final: assembleDebug, testDebugUnitTest (10 aprobadas) y lintDebug completados; BUILD SUCCESSFUL. Persisten avisos no bloqueantes de versiones y una API de anclaje de menú deprecada, compatibles con las dependencias actuales.
- Comprobación final de MySQL: se conservaron 4 clientes y 4 reservas; solo quedó la cuenta administrativa solicitada. Login por la web y lectura de clientes/reservas: HTTP 200.
- Se eliminaron los registros de prueba y las copias temporales de credenciales empleadas para verificar. La contraseña del administrador permanece únicamente en su archivo local ignorado por Git; no se modificó crear_admin.py.
- Web/backend: comparación con origin/main sin diferencias versionadas.
- Pendiente de dispositivo: el Samsung se desconectó antes de instalar la última revisión sin Conexión y con los selectores nuevos. El APK final está generado, pero no se afirma haber verificado estos últimos controles en el teléfono. Las pantallas y el acceso de la revisión anterior sí fueron comprobados allí.

### 19 de noviembre de 2026 · Revisión final en Samsung completada

- Samsung SM-A035M reconectado; APK final instalado y puertos USB 8011/8012 restablecidos.
- Login administrativo probado con la cuenta local. No hay botón ni diálogo de conexión en el producto.
- Selector de clientes: abre opciones reales y conserva la selección. Selector de paquetes: muestra catálogo real y actualiza total/anticipo (Fotografía: $3,500.00 / $1,750.00).
- Calendario: verificados días pasados y ocupados deshabilitados (18, 21 y 28 de noviembre, según datos de prueba actuales). Cancelar conservó la fecha anterior; confirmar el 20 de noviembre actualizó el formulario.
- La revisión visual detectó ayuda superpuesta al título. Se corrigió, recompiló e instaló; captura final verificada sin superposición. También se sustituyó el anclaje de menú deprecado por la API con tipo explícito.
- No se guardaron nuevas reservas ni clientes durante esta revisión. Se dejó la app en Inicio, con la sesión administrativa abierta y los cuatro clientes/cuatro reservas existentes.
- Queda resuelto el pendiente de instalación y revisión de estos controles en el teléfono. Se mantienen los pendientes de pruebas ampliadas indicados arriba; esta comprobación no equivale a una auditoría completa de todos los flujos.

### 19 de noviembre de 2026 · Repositorio unificado

- Proyecto Android trasladado a `mobil/`, junto a `frontend/` y `backend/`. Abrir esta nueva carpeta en Android Studio; no crear otro repositorio Git dentro.
- Se excluyen de Git cachés, compilaciones, configuración local del SDK, archivos del IDE y claves de firma. El wrapper de Gradle sí se incluye.
- Web y backend conservan los archivos de `origin/main` (`c493e69`), sin modificaciones versionadas por este traslado. No se realizó commit ni push.
- Pendiente: adaptar y verificar el móvil con la API unificada de Supabase en el puerto 8000. La conexión anterior usa 8011/8012; el traslado no la cambia.
- Domicilio: formulario estructurado y enlaces de búsqueda/ruta de Maps implementados; queda pendiente verificar apertura y regreso de Maps en Samsung. No se modificó el esquema de la base de datos.
- Verificación desde la nueva ubicación: assembleDebug y testDebugUnitTest completados correctamente (BUILD SUCCESSFUL).

### Verificación de preparación para Git
- assembleDebug, testDebugUnitTest y lintDebug: BUILD SUCCESSFUL.
- 16 pruebas aprobadas, 0 fallos y 0 errores. Incluyen API unificada simulada, validación HTTP 400 y ocupación de fechas completadas.
- Sin diferencias versionadas en frontend/backend. Git únicamente muestra mobil como incorporación pendiente; no se realizó commit ni push.


### Revisión física adicional · 19 de noviembre de 2026

- Samsung: búsqueda real de una dirección pública desde el formulario abrió Google Maps y mostró el lugar; al regresar a la app el borrador conservó calle y ciudad. No se guardó el cliente ni se modificó la base.
- Esta prueba se hizo con la versión previamente instalada, cuyo componente de domicilio coincide con el actual. No equivale a una prueba de integración de Supabase.
- Después se instaló correctamente el APK actual y se verificó visualmente su login, sin recortes en esta pantalla. Se dejó el dispositivo en el acceso.
- No había servicio escuchando en 8000; sí estaban activos 8011/8012. La navegación autenticada de la versión actual contra Supabase sigue sin verificar.
- Maps implementa búsqueda externa y rutas. Pendiente funcional: elegir un lugar y devolver sus datos al formulario; requiere un selector integrado y configuración del proveedor, no solo un enlace externo.

### 19 de noviembre de 2026 · Selector integrado de domicilio con confirmación y ajuste manual

- **Proveedor e integración:** se integró un cliente directo para **Google Places API (New)** (`/v1/places:autocomplete` y `/v1/places/{placeId}` con `X-Goog-Api-Key` y `X-Goog-FieldMask`), sin solicitar permiso de ubicación ni añadir dependencias ajenas. Conserva intacto el contrato `address` de máximo 250 caracteres enviado al backend (sin agregar coordenadas ni `place_id` al JSON del servidor).
- **Flujo en interfaz (`PlacePickerDialog` en `DeliveryAddressField`):**
  - Permite buscar lugares, ver estados de carga, lista vacía, error de red/proveedor o falta de clave, y seleccionar una sugerencia.
  - Al elegir un resultado pasa a una vista de confirmación donde desglosa calle, número exterior faltante, interior/referencia, colonia, ciudad/estado y código postal, permitiendo corregir errores humanos y validando que la dirección no contenga solo signos ni supere 250 caracteres.
  - Cancelar conserva intactos el domicilio anterior y los demás datos del formulario. Confirmar rellena los campos sin guardar automáticamente el cliente.
  - Se conserva el enlace externo «Ver en Google Maps» en el formulario y el botón «Cómo llegar» en el detalle del cliente.
- **Configuración necesaria del proveedor:**
  - Habilitar **Places API (New)** en un proyecto de Google Cloud con facturación activa.
  - Definir `studioPlacesApiKey` localmente en `mobil/local.properties` o `%USERPROFILE%\.gradle\gradle.properties` (nunca en Git), restringida a aplicaciones Android (`com.example.fotografia` + huella SHA-1 del certificado) y a Places API (New).
- **Archivos modificados (exclusivamente dentro de `mobil/`):**
  - `app/build.gradle.kts`
  - `app/src/main/java/com/example/fotografia/data/ConnectionConfig.kt`
  - `app/src/main/java/com/example/fotografia/data/DeliveryAddress.kt`
  - `app/src/main/java/com/example/fotografia/ui/clients/DeliveryAddressField.kt`
  - `app/src/test/java/com/example/fotografia/DeliveryAddressTest.kt`
  - `app/src/androidTest/java/com/example/fotografia/ExampleInstrumentedTest.kt`
  - `README.md` y `AVANCES.md`
- **Pruebas realmente ejecutadas:**
  - `.\gradlew.bat :app:assembleDebug :app:testDebugUnitTest :app:lintDebug` → `BUILD SUCCESSFUL` (20 pruebas unitarias JVM aprobadas, incluyendo autocompletado y detalle de Google Places con `MockWebServer`, resultados sin número/colonia/CP, ajuste manual, cancelación, límite de 250 caracteres y errores 403/sin clave).
  - Instalación y ejecución en dispositivo físico Samsung SM-A035M (`R9HT30BTNVL`) mediante `adb install -r` y `:app:connectedDebugAndroidTest` (pruebas instrumentadas de Compose UI para selección, edición manual de número exterior/interior, cancelación y preservación tras cambio de configuración/rotación, sin guardar clientes de prueba en la base compartida).
- **Pendientes concretos:**
  - Configurar una clave real `studioPlacesApiKey` del equipo en `local.properties` si se desea usar Google Places API (New) en lugar del proveedor geográfico abierto predeterminado.
  - Verificar el flujo autenticado completo contra el backend unificado en el puerto 8000 conectado a Supabase cuando el servicio esté activo.

### 20 de noviembre de 2026 · Alineación con últimos commits del equipo (`bb77f00`) e Historias Móviles (`HU-04` a `HU-08`)

- **Gestión completa de Clientes (`HU-06`):**
  - Conectados `PATCH /api/clientes/{id}`, `PATCH /api/clientes/{id}/inactivar` y `PATCH /api/clientes/{id}/reactivar`.
  - Indicadores de clientes totales/activos/inactivos, edición reutilizando `DeliveryAddress.fromFormatted` y el selector de lugares, y bloqueo de creación de reservas para clientes inactivos.
- **Módulo Administrativo de Paquetes (`HU-07` / Req. 10):**
  - Nueva pestaña **Paquetes** en la barra de navegación inferior (`ui/packages/PackageScreens.kt`).
  - Conectados `GET /api/paquetes/administracion` (con respaldo a `GET /api/paquetes`), `POST /api/paquetes`, `PATCH /api/paquetes/{clave}`, `PATCH /api/paquetes/{clave}/inactivar` y `PATCH /api/paquetes/{clave}/reactivar`.
  - Incluye plantillas rápidas para **Paquete 2 ($6,500)**, **Paquete 3 ($10,000)**, **Paquete 4 ($13,000)** y **Paquete 5 ($15,000)**.
- **Seguimiento en Detalle de Reserva (`HU-04`, `HU-05`, `HU-08`):**
  - Acceso directo a domicilio de entrega y botón **«Cómo llegar»** (ruta GPS en Google Maps) desde el detalle de la reserva (`HU-05`).
  - Aprobación de comprobante/anticipo, opción de rechazo con motivo (`HU-04`) y panel de entrega digital con selección de fotografías del dispositivo, enlace de video (Drive/YouTube) y avance de estado `Confirmada → Realizada → Entregada` (`HU-08`).
