# Guía y Guion de Presentación (15 Minutos) — Proyecto 3: Luz & Memoria

**Equipo IDGS1004:**
* **Integrante 1:** Diego Ignacio de Jesús Martínez Quintana
* **Integrante 2:** Jimena Anahí Gómez Ramírez
* **Integrante 3:** Stefania Martínez Pro

---

## 0. Contexto General para el Equipo (Leer antes de presentar)

Esta sección es para que los tres integrantes del equipo entiendan de forma rápida y clara qué se hizo y cómo funciona todo:

1. **¿Qué nos pide el profesor en el Proyecto 3?**
   Nos pide demostrar que nuestro sistema (**Luz & Memoria**) funciona de verdad mediante **pruebas automáticas** de sus módulos principales, **monitoreo de disponibilidad** (ver qué pasa cuando el servidor se cae y cuando se levanta), **generación de registros (logs)** y usar esos datos reales para evaluar el **SLA (Acuerdo de Nivel de Servicio)** que entregamos en el parcial anterior.

2. **¿Dónde se ejecuta todo esto y por qué usamos Docker?**
   * Nuestro proyecto principal está conectado a una base de datos en la nube (**Supabase**).
   * Si corriéramos pruebas automáticas que meten clientes ficticios, fuerzan errores o simulan caídas sobre la base de Supabase, ensuciaríamos los datos reales del equipo.
   * Por eso creamos una carpeta especial llamada `backend/pruebas_p3/`. Ahí levantamos una **base de datos PostgreSQL 17.12 local dentro de Docker** (en el puerto `55432`) que tiene exactamente las mismas **23 tablas, 49 índices, 35 llaves foráneas y 5 triggers** de nuestro sistema, y levantamos una copia aislada del backend en el puerto `8010`. Todo corre ahí adentro sin tocar nada de Supabase.

3. **¿Cómo hay que preparar la laptop 3 minutos antes de pasar con el profesor?**
   * **Paso A:** Abrir **Docker Desktop** y verificar que aparezca en verde el contenedor `fotografia-pruebas-p3-postgres-1`.
   * **Paso B:** Abrir **VS Code**, abrir una terminal PowerShell y asegurarse de estar dentro de la carpeta `backend`:
     ```powershell
     cd C:\Users\user\Documents\Proyectos\Proyecto_2_1_Fotografia\backend
     ```
   * **Paso C:** Entregar al profesor el reporte impreso (`Proyecto_3_Pruebas_Logs_y_SLA.docx`, que consta de portada más 3 páginas).

---

## Parte 1 (Minutos 00:00 a 03:00) — Explicación del Entorno Aislado y Datos de Prueba
**Participa:** Integrante 1 (Diego)

### Explicación para el integrante (Qué hace esta parte)
En esta primera parte solo vamos a mostrar que nuestra base de datos local de pruebas en Docker está encendida con las 23 tablas del proyecto y que el backend de pruebas (en el puerto `8010`) arranca correctamente, conecta con esa base de datos y permite iniciar sesión tanto a un usuario **Administrador** como a un usuario **Cliente** cuyas contraseñas están encriptadas (hasheadas) con el algoritmo real del sistema (`PBKDF2-SHA256`).

### Instrucción / Acción en la computadora
Copiar y pegar estos dos comandos en la terminal de `backend` y presionar Enter:

```powershell
docker compose --env-file pruebas_p3/.env -f pruebas_p3/compose.yaml ps
.\.venv\Scripts\python.exe pruebas_p3/verificar_paso3.py
```

### Lo que aparecerá en la pantalla
1. El primer comando mostrará una tabla de Docker indicando que `fotografia-pruebas-p3-postgres-1` está activo (`Up / healthy`) en el puerto `127.0.0.1:55432`.
2. El segundo comando tardará unos 5 segundos y mostrará un bloque JSON que termina con `"resultado": "APROBADO"`, mostrando `"http_status": 200` en el login del Administrador, `"http_status": 200` en el login del Cliente, 2 clientes registrados y 3 paquetes en catálogo.

### Estimación de qué decir y explicar al profesor
> "Buenas tardes, profesor. Aquí le entregamos nuestro reporte físico de tres páginas y vamos a iniciar la demostración.
>
> Como se describe en la Página 1 del reporte, para no alterar la base de datos compartida en Supabase ni usar datos reales de clientes, configuramos un entorno de pruebas aislado usando Docker con PostgreSQL 17.12 en el puerto local 55432. En esta base importamos y verificamos las 23 tablas del sistema, sus 49 índices, 35 llaves foráneas, 5 triggers de auditoría de fechas y la columna calculada automáticamente para los subtotales de venta.
>
> Con el comando que acabamos de ejecutar en consola (`verificar_paso3.py`), sembramos datos ficticios —un Administrador, dos Clientes con sus contraseñas encriptadas mediante PBKDF2-SHA256 y tres paquetes fotográficos— y levantamos una instancia aislada del backend en el puerto 8010. Como se ve en la salida JSON con estado APROBADO, el endpoint `/health` responde correctamente y la autenticación con tokens JWT funciona para ambos roles."

---

## Parte 2 (Minutos 03:00 a 08:00) — Pruebas Automáticas Funcionales de los 7 Módulos
**Participa:** Integrante 2 (Jimena)

### Explicación para el integrante (Qué hace esta parte)
Aquí vamos a ejecutar las **11 pruebas funcionales automáticas** (`ejecutar_pruebas.py`) que revisan los **7 módulos reales** del backend:
1. **Acceso y permisos:** que el login funcione, que sin token rechace el acceso (`HTTP 401`), y que si un usuario con rol `Cliente` intenta entrar a rutas de `Administrador` (como ver todos los clientes o las ventas), el servidor lo bloquee con `HTTP 403 (Prohibido)`.
2. **Clientes:** registrar cliente nuevo, consultarlo, editar su domicilio, darle baja lógica (inactivarlo) y reactivarlo. También prueba que si intentan registrar un correo repetido o datos mal escritos, el sistema los rechace (`HTTP 409` y `HTTP 422`).
3. **Paquetes:** que no permita crear paquetes con precio cero (`HTTP 422`), que permita crear y editar paquetes válidos, y que al inactivar un paquete deje de aparecer en el catálogo público.
4. **Reservas y Concurrencia:** que no deje reservar en fechas pasadas (`HTTP 400`), y una prueba clave para el estudio fotográfico: **dos personas intentando confirmar al mismo tiempo un evento para el mismo día**. El sistema procesa ambas peticiones simultáneamente, confirma solo una (`HTTP 200`) y rechaza la segunda (`HTTP 409`) para que jamás haya dos eventos confirmados en la misma fecha.
5. **Pagos y Ventas:** que al crear una reserva se genere automáticamente su venta; que al pagar el 50 % de anticipo la reserva y la venta pasen a estado `Confirmada`; que al pagar el otro 50 % el saldo quede en cero; y que si intentan registrar un pago extra cuando ya está liquidada, el sistema lo bloquee (`HTTP 409`).
6. **Galerías y Entregas:** que una galería recién creada sea privada hasta que el administrador la publique; que una vez publicada solo pueda verla el cliente dueño de ese evento (y si otro cliente intenta abrirla reciba `HTTP 404`); y que las entregas físicas guarden su historial de cambios de estado.

*Nota importante para recordar:* En las pruebas donde mandamos errores a propósito (llamadas **pruebas negativas**), la prueba aparece en verde (`PASSED`) porque lo que estamos comprobando es que el sistema **sí bloquee** la operación incorrecta.

### Instrucción / Acción en la computadora
Copiar y pegar este comando en la terminal de `backend` y presionar Enter:

```powershell
.\.venv\Scripts\python.exe pruebas_p3/ejecutar_pruebas.py
```

### Lo que aparecerá en la pantalla
Aparecerá una tabla alineada por columnas (`CASO DE PRUEBA | MÓDULO | ESTADO | TIEMPO`) con los 11 casos (`test_01` hasta `test_11`), cada uno con **`APROBADO`** en su propia columna, y al final: **`RESULTADO FINAL: 11/11 APROBADOS (APROBADO)`**.

### Estimación de qué decir y explicar al profesor
> "Continuando con la matriz de la Página 1 de nuestro reporte, ahora ejecutamos `ejecutar_pruebas.py`, que corre nuestra suite de 11 pruebas de integración real con Pytest contra PostgreSQL local cubriendo los 7 módulos del sistema.
>
> Como vemos en pantalla, los 11 casos aprueban en alrededor de 7 segundos. La suite evalúa tanto flujos completos exitosos como reglas de rechazo o pruebas negativas:
>
> Por ejemplo, en los casos 1 al 3 comprobamos autenticación y control de roles: si un Cliente intenta consultar el listado administrativo de clientes o ventas, el servidor lo bloquea con código HTTP 403.
>
> En los casos 4 al 6 validamos el ciclo completo de clientes y paquetes, incluyendo baja lógica, reactivación y rechazo de correos duplicados con código 409.
>
> En el caso 8 probamos la regla crítica de integridad de agenda del SLA: lanzamos dos hilos concurrentes intentando confirmar al mismo tiempo dos solicitudes para la misma fecha. Gracias al control transaccional y al índice único parcial en PostgreSQL, exactamente una reserva se confirma con código 200 y la segunda es rechazada con código 409, garantizando cero fechas duplicadas.
>
> Finalmente, en los casos 10 y 11 comprobamos que los anticipos del 50 % confirmen automáticamente la venta asociada, que la liquidación deje el saldo en cero bloqueando cobros adicionales, y que las galerías publicadas solo puedan ser consultadas por el cliente propietario de esa reservación."

---

## Parte 3 (Minutos 08:00 a 11:00) — Monitoreo de Disponibilidad, Caída Controlada y Recuperación
**Participa:** Integrante 3 (Stefania)

### Explicación para el integrante (Qué hace esta parte)
En esta parte vamos a demostrar cómo se vigila la disponibilidad del sistema para el SLA.
El script `monitorear_servicio.py` funciona como un "monitor de signos vitales": cada `0.5 segundos` le envía una consulta (llamada **sonda**) a la ruta `http://127.0.0.1:8010/health` para verificar que el servidor responda `HTTP 200` y `"status": "ok"`.
Para que la demostración sea rápida y segura, el script hace tres cosas frente al profesor:
1. **Fase 1 (Operación normal):** Con el backend encendido, lanza 4 sondas y muestra en pantalla que las 4 salen `SALUDABLE`.
2. **Fase 2 (Caída controlada):** El propio script **apaga únicamente el backend de pruebas del puerto 8010** (sin apagar la base de datos ni tocar nada más). Lanza 4 sondas mientras está apagado y muestra en pantalla cómo el monitor detecta inmediatamente la caída marcando `ERROR_CONEXION`.
3. **Fase 3 (Recuperación):** El script **vuelve a encender el backend del puerto 8010** y sigue lanzando sondas hasta que el servidor termina de arrancar y logra 4 respuestas `SALUDABLE` seguidas, guardando cada sonda con su hora exacta en el archivo de logs `paso5_monitoreo.jsonl`.

### Instrucción / Acción en la computadora
Copiar y pegar este comando en la terminal de `backend` y presionar Enter:

```powershell
.\.venv\Scripts\python.exe pruebas_p3/monitorear_servicio.py
```

### Lo que aparecerá en la pantalla
Irán apareciendo en vivo las 14 sondas (`[Sonda 01]` a `[Sonda 14]`):
* Sondas 01 a 04: `1_operacion_normal | SALUDABLE`
* Aviso: `--- Deteniendo instancia de backend de pruebas (8010) ---`
* Sondas 05 a 08: `2_caida_controlada | ERROR_CONEXION`
* Aviso: `--- Reiniciando instancia de backend de pruebas (8010) ---`
* Sondas 09 y 10: `3_recuperacion | ERROR_CONEXION` (mientras termina de encender el servidor)
* Sondas 11 a 14: `3_recuperacion | SALUDABLE`
* Y al final un resumen JSON con `"recuperacion_verificada": true`.

### Estimación de qué decir y explicar al profesor
> "Pasando a la Página 2 del reporte, ahora ejecutamos `monitorear_servicio.py` para demostrar el monitoreo de disponibilidad sobre el endpoint `/health` con un intervalo de muestreo de 0.5 segundos y un timeout de 1.5 segundos.
>
> Cada sonda verifica no solo que el puerto responda HTTP 200, sino que el servicio confirme conectividad con PostgreSQL devolviendo el JSON `status: ok`.
>
> Como se observa en tiempo real en la consola: en la Fase 1 tenemos 4 sondas consecutivas en estado SALUDABLE. En seguida, detenemos exclusivamente la instancia del backend de pruebas en el puerto 8010 y las sondas 05 a 08 detectan de inmediato la interrupción clasificándola como `ERROR_CONEXION`.
>
> Posteriormente reiniciamos el backend en el puerto 8010; las sondas 09 y 10 registran los segundos que tarda el servidor en levantar, y de la sonda 11 a la 14 confirmamos la recuperación con cuatro muestras saludables consecutivas. Todo este ciclo queda guardado línea por línea con su marca de tiempo exacta para calcular la ventana de indisponibilidad."

---

## Parte 4 (Minutos 11:00 a 13:30) — Lectura de Logs Estructurados (JSONL) y Evaluación del SLA
**Participan:** Integrante 3 (Stefania) e Integrante 1 (Diego)

### Explicación para el integrante (Qué hace esta parte)
En esta última parte ejecutamos `resumir_resultados.py`. Este script hace tres cosas fundamentales que pide la rúbrica:
1. **Mide la velocidad real (Latencia HTTP P95):** Hace **100 peticiones reales** al servidor (80 consultas de lectura y 20 actualizaciones de escritura) y calcula el **P95 (Percentil 95)**, que es el tiempo máximo que tardan el 95 % de las peticiones.
   * Nuestro SLA promete que las **lecturas** tardarán **menos de 1 segundo (`1,000 ms`)** → Nuestro resultado medido es **P95 = `25.64 ms`** (cumple de sobra).
   * Nuestro SLA promete que las **escrituras** tardarán **menos de 3 segundos (`3,000 ms`)** → Nuestro resultado medido es **P95 = `95.49 ms`** (cumple de sobra).
2. **Une todos los logs en un archivo `eventos.jsonl` sanitizado:** Junta las 11 pruebas funcionales + las 14 sondas de disponibilidad + las 100 muestras de latencia = **125 registros en total**. **"Sanitizado"** quiere decir que los registros no guardan contraseñas, ni tokens JWT, ni datos personales de clientes.
3. **Imprime en pantalla el cuadro con los 4 indicadores separados del SLA** (que son los mismos de la Página 3 del reporte impreso).

### Instrucción / Acción en la computadora
Copiar y pegar estos dos comandos en la terminal de `backend` y presionar Enter:

```powershell
.\.venv\Scripts\python.exe pruebas_p3/resumir_resultados.py
Get-Content pruebas_p3/resultados/paso6_eventos.jsonl -TotalCount 4
```

### Lo que aparecerá en la pantalla
1. Primero aparecerá una tabla limpia en consola llamada `PROYECTO 3 - RESUMEN DE PRUEBAS, LOGS Y EVALUACIÓN DE INDICADORES (SLA)` con los 4 apartados numerados (`100 %` pruebas aprobadas, `100 %` éxito en operaciones válidas con `0 %` errores `5xx`, resumen de las `14` sondas de `/health`, y los tiempos `P95` de lectura y escritura).
2. Debajo aparecerán las primeras 4 líneas reales del archivo `paso6_eventos.jsonl` para que el profesor vea la estructura del log.

### Estimación de qué decir y explicar al profesor
> "Finalmente, como mostramos en las Páginas 2 y 3 del reporte, ejecutamos `resumir_resultados.py` para generar los logs estructurados en formato JSONL y evaluar por separado cada indicador del SLA:
>
> En primer lugar, separamos la duración total de Pytest —que fue de 7.13 segundos para toda la suite— de la latencia HTTP real por petición. Al medir 80 operaciones de lectura y 20 de escritura desde el cliente HTTP, obtuvimos un percentil 95 (P95) de lectura de alrededor de 25 milisegundos, muy por debajo del límite de 1,000 milisegundos establecido en el SLA; y un P95 de escritura cercano a 95 milisegundos, dentro del límite de 3,000 milisegundos.
>
> En segundo lugar, sobre las 100 solicitudes válidas ejecutadas, obtuvimos 100 % de respuestas exitosas 2xx y 0 % de errores internos 5xx, cumpliendo el objetivo del SLA de mantener los errores 5xx por debajo del 1 %.
>
> En tercer lugar, con el segundo comando mostramos en pantalla fragmentos reales de nuestro archivo `eventos.jsonl`: cada línea contiene el identificador de ejecución, la fecha con zona horaria de Ciudad de México, el módulo, el caso, la duración en milisegundos y el resultado sanitizado, garantizando que nunca se expongan tokens Bearer, contraseñas ni datos personales en los archivos de log.
>
> Como conclusión y límite metodológico documentado en la Página 3, estas pruebas demuestran que las reglas de negocio, la prevención de fechas duplicadas, la detección de caídas y los tiempos de respuesta locales cumplen con lo diseñado; mientras que el compromiso de 99.0 % de disponibilidad mensual requiere recolectar estas mismas sondas de forma continua durante los 43,200 minutos del mes en el servidor operativo."

---

## Parte 5 (Minutos 13:30 a 15:00) — Guía Rápida de Respuestas por si el Profesor Pregunta

Si al terminar el profesor les hace alguna de estas preguntas, cualquiera de los tres puede responder con seguridad:

1. **Si pregunta: *"¿Apagar y prender el backend como hicieron en el Paso 5 demuestra que cumplen con los respaldos (RPO de 24 h y RTO de 8 h)?"***
   * **Qué responder:** *"No, profesor. Detener el backend en el puerto 8010 demuestra cómo el monitoreo detecta una caída del servicio API y verifica su recuperación al reiniciar. Para demostrar RPO y RTO de respaldos se requiere hacer un volcado de la base de datos y restaurarlo en limpio; por eso en la Página 3 del reporte especificamos esa diferencia."*

2. **Si pregunta: *"¿Por qué en el resumen de disponibilidad aparece un 57.14 % en la ventana de monitoreo si su SLA dice 99.0 %?"***
   * **Qué responder:** *"Porque esa ventana de monitoreo duró solo 26 segundos y dentro de ella apagamos el servidor a propósito durante 6 de las 14 sondas para probar que el monitor sí detecta las caídas. Si tomamos únicamente las sondas cuando el servidor estuvo encendido —antes de apagarlo y después de recuperarse—, el 100 % de las sondas (8 de 8) fueron saludables."*

3. **Si pregunta: *"¿Por qué dicen que los 7.13 segundos de Pytest no son la latencia HTTP?"***
   * **Qué responder:** *"Porque Pytest en esos 7 segundos ejecuta los 11 casos completos, prepara datos en la base y lanza decenas de peticiones seguidas. La latencia HTTP real es lo que tarda una sola petición individual en responder, que medimos aparte en el Paso 6 y nos dio un P95 de 25 milisegundos en lectura y 95 milisegundos en escritura."*
