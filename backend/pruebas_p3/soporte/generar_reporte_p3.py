"""
Paso 7: Generador del reporte físico de Proyecto 3 en formato Word (.docx) y PDF (.pdf).
Sigue exactamente el diseño institucional de `backend/documentacion/finalizar_documento.py`
(Portada con logo UTL, tipografía Georgia/Arial, tablas en tonos #DCE6ED / #F5F7F8)
y cumple estrictamente la estructura de:
- Portada institucional
- Página 1: Entorno aislado y matriz resumida de pruebas funcionales
- Página 2: Resultados de disponibilidad, caída/recuperación y fragmentos reales de logs JSONL
- Página 3: Evaluación de indicadores frente al SLA y límites metodológicos
"""

import json
from pathlib import Path

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt, RGBColor

CARPETA_SOPORTE = Path(__file__).resolve().parent
CARPETA_P3 = CARPETA_SOPORTE.parent
BACKEND_DIR = CARPETA_P3.parent
DOC_DIR = BACKEND_DIR / "documentacion"
RES_DIR = CARPETA_P3 / "resultados"
LOGO_UTL = CARPETA_SOPORTE / "logo_utl.png"


def generar_docx() -> Path:
    datos_p2 = json.loads((RES_DIR / "paso2_verificacion.json").read_text(encoding="utf-8"))
    datos_p4 = json.loads((RES_DIR / "paso4_funcionales.json").read_text(encoding="utf-8"))
    datos_p5 = json.loads((RES_DIR / "paso5_disponibilidad.json").read_text(encoding="utf-8"))
    datos_p6 = json.loads((RES_DIR / "paso6_resumen.json").read_text(encoding="utf-8"))
    lineas_sondas = [
        json.loads(x)
        for x in (RES_DIR / "paso5_monitoreo.jsonl").read_text(encoding="utf-8").splitlines()
        if x.strip()
    ]
    lineas_eventos = [
        json.loads(x)
        for x in (RES_DIR / "paso6_eventos.jsonl").read_text(encoding="utf-8").splitlines()
        if x.strip()
    ]

    doc = Document()
    sec = doc.sections[0]
    sec.page_width = Cm(21)
    sec.page_height = Cm(29.7)
    sec.top_margin = sec.bottom_margin = Cm(1.5)
    sec.left_margin = sec.right_margin = Cm(1.9)

    for s in doc.styles:
        for b in list(s.element.iter(qn("w:pBdr"))):
            b.getparent().remove(b)

    for name, size in [("Normal", 9.5), ("Title", 24), ("Heading 1", 15), ("Heading 2", 10.5)]:
        s = doc.styles[name]
        s.font.name = "Arial"
        s.font.size = Pt(size)
        s.font.color.rgb = RGBColor(0, 0, 0)
        s.paragraph_format.space_after = Pt(5)

    doc.styles["Normal"].paragraph_format.line_spacing = 1.06
    sec.different_first_page_header_footer = True
    p_footer = sec.footer.paragraphs[0]
    p_footer.alignment = 1
    fld = OxmlElement("w:fldSimple")
    fld.set(qn("w:instr"), "PAGE")
    p_footer._p.append(fld)

    def p(t: str, space_after: float = 5):
        para = doc.add_paragraph(t)
        para.paragraph_format.space_after = Pt(space_after)
        return para

    def h(t: str):
        hd = doc.add_heading(t, 2)
        hd.paragraph_format.space_before = Pt(6)
        hd.paragraph_format.space_after = Pt(3)
        return hd

    def page(t: str):
        doc.add_page_break()
        hd = doc.add_heading(t, 1)
        hd.paragraph_format.space_before = Pt(0)
        hd.paragraph_format.space_after = Pt(6)
        return hd

    def code_box(lines: list[str]):
        t = doc.add_table(rows=1, cols=1)
        t.autofit = False
        t.columns[0].width = Cm(17.2)
        cell = t.rows[0].cells[0]
        cell.width = Cm(17.2)
        cell.text = "\n".join(lines)
        pr = cell._tc.get_or_add_tcPr()
        borders = OxmlElement("w:tcBorders")
        for edge in ["top", "left", "bottom", "right"]:
            e = OxmlElement("w:" + edge)
            e.set(qn("w:val"), "single")
            e.set(qn("w:sz"), "4")
            e.set(qn("w:color"), "CFD8DC")
            borders.append(e)
        pr.append(borders)
        sh = OxmlElement("w:shd")
        sh.set(qn("w:fill"), "F5F7F8")
        pr.append(sh)
        for para in cell.paragraphs:
            para.paragraph_format.space_before = Pt(3)
            para.paragraph_format.space_after = Pt(3)
            para.paragraph_format.line_spacing = 1.02
            for r in para.runs:
                r.font.name = "Consolas"
                r.font.size = Pt(7.5)
        spacer = doc.add_paragraph("")
        spacer.paragraph_format.space_after = Pt(3)

    def table(headers, rows, widths, font_pt: float = 8.5):
        t = doc.add_table(rows=1, cols=len(headers))
        t.autofit = False
        for c, w in zip(t.columns, widths):
            c.width = Cm(w)
        for i, values in enumerate([headers] + rows):
            cells = t.rows[0].cells if i == 0 else t.add_row().cells
            tr = cells[0]._tc.getparent()
            pr = tr.get_or_add_trPr()
            pr.append(OxmlElement("w:cantSplit"))
            if i == 0:
                pr.append(OxmlElement("w:tblHeader"))
            for c, txt, w in zip(cells, values, widths):
                c.width = Cm(w)
                c.text = str(txt)
                tc_pr = c._tc.get_or_add_tcPr()
                borders = OxmlElement("w:tcBorders")
                for edge in ["top", "left", "bottom", "right"]:
                    e = OxmlElement("w:" + edge)
                    e.set(qn("w:val"), "single")
                    e.set(qn("w:sz"), "4")
                    e.set(qn("w:color"), "D9D9D9")
                    borders.append(e)
                tc_pr.append(borders)
                sh = OxmlElement("w:shd")
                sh.set(
                    qn("w:fill"),
                    "DCE6ED" if i == 0 else ("F5F7F8" if i % 2 else "FFFFFF"),
                )
                tc_pr.append(sh)
                for para in c.paragraphs:
                    para.paragraph_format.space_before = Pt(3)
                    para.paragraph_format.space_after = Pt(3)
                    para.paragraph_format.line_spacing = 1.02
                    for r in para.runs:
                        r.font.size = Pt(font_pt)
                        r.bold = i == 0
        spacer = doc.add_paragraph("")
        spacer.paragraph_format.space_after = Pt(3)

    def cover(text, size=12, bold=False, before=0, after=10, title=False):
        q = doc.add_paragraph(text, "Title" if title else "Normal")
        q.alignment = 1
        q.paragraph_format.space_before = Pt(before)
        q.paragraph_format.space_after = Pt(after)
        q.paragraph_format.line_spacing = 1.15
        for r in q.runs:
            r.font.size = Pt(size)
            r.bold = bold

    # ─── PORTADA (IDÉNTICA AL FORMATO ANTERIOR) ──────────────────────────────
    brand = doc.add_table(rows=1, cols=3)
    brand.autofit = False
    for c, w in zip(brand.columns, [9, 2, 6]):
        c.width = Cm(w)
    for c, w in zip(brand.rows[0].cells, [9, 2, 6]):
        c.width = Cm(w)
    if LOGO_UTL.exists():
        brand.cell(0, 1).paragraphs[0].add_run().add_picture(str(LOGO_UTL), width=Cm(1.6))
    brand.cell(0, 2).vertical_alignment = 1
    q = brand.cell(0, 2).paragraphs[0]
    q.alignment = 1
    q.add_run("Universidad Tecnológica de León\nSer, saber, hacer").font.size = Pt(10)
    for c in brand.rows[0].cells:
        for para in c.paragraphs:
            para.paragraph_format.space_after = Pt(0)

    q = p("Carrera: Desarrollo y Gestión de Software")
    q.alignment = 2
    q.paragraph_format.space_before = Pt(12)

    cover("Proyecto 3", 21, False, before=112, after=14, title=True)
    cover("Sistema Integral de Gestión\npara Fotografía", 26, False, after=18, title=True)
    for para in doc.paragraphs[-2:]:
        for r in para.runs:
            r.font.name = "Georgia"

    cover("Pruebas automáticas de disponibilidad y funcionalidad", 13, after=6)
    cover("Generación de logs estructurados y evaluación del SLA", 11, after=26)
    cover("Materia: Gestión de Procesos de Desarrollo de Software", 11, after=12)
    cover("Grupo: IDGS1004", 11, after=0)
    cover("Integrantes", 11, True, before=128, after=10)
    doc.paragraphs[-1].alignment = 0
    for text in [
        "Jimena Anahí Gómez Ramírez",
        "Stefania Martínez Pro",
        "Diego Ignacio de Jesús Martínez Quintana",
    ]:
        cover(text, 11, after=5)
        doc.paragraphs[-1].alignment = 0
    cover("León, Guanajuato", 9, before=32, after=6)
    cover("24 de noviembre de 2026", 9, after=0)

    # ─── PÁGINA 1: ENTORNO Y MATRIZ RESUMIDA DE PRUEBAS ──────────────────────
    page("1 Entorno de pruebas aislado y matriz funcional")
    p(
        "Este reporte documenta la verificación automatizada del Sistema Integral de Gestión para "
        "Fotografía (Luz & Memoria) en un entorno aislado que reproduce las reglas de datos del proyecto "
        "sin afectar la base compartida de Supabase ni exponer información real de clientes. Las pruebas "
        "evalúan disponibilidad, funcionalidad de los siete módulos principales y generación de logs "
        "estructurados para contrastar el comportamiento observado contra el Acuerdo de Nivel de Servicio (SLA)."
    )
    h("Configuración del entorno aislado (Docker PostgreSQL 17.12 y Backend en puerto 8010)")
    table(
        ["Elemento", "Configuración verificada y mecanismo de aislamiento"],
        [
            (
                "Base de datos de pruebas",
                f"Contenedor Docker postgres:17-alpine (PostgreSQL {datos_p2['version']}) en 127.0.0.1:55432, "
                f"base {datos_p2['base']} y usuario pruebas. Conexion_local.py rechaza cualquier destino distinto.",
            ),
            (
                "Estructura importada",
                f"{datos_p2['tablas']} tablas, {datos_p2['columnas']} columnas, {datos_p2['indices']} índices "
                f"(incluyendo uq_reservacion_fecha_ocupada y lower(correo)), {datos_p2['claves_foraneas']} FKs, "
                f"{datos_p2['checks']} CHECKs, {datos_p2['triggers']} triggers y subtotal_centavos GENERATED ALWAYS.",
            ),
            (
                "Backend y semilla",
                "Instancia FastAPI en http://127.0.0.1:8010 con variables de entorno en memoria, "
                "SUPABASE_URL local deshabilitada y usuarios Administrador y Cliente con hash PBKDF2-SHA256 (600,000 iteraciones).",
            ),
        ],
        [4.0, 13.2],
        font_pt=8.2,
    )
    h(
        f"Matriz resumida de pruebas funcionales ({datos_p4['aprobados']}/{datos_p4['total_casos']} "
        f"aprobadas en {datos_p4['duracion_total_segundos']:.2f} s)"
    )
    filas_matriz = []
    for item in datos_p4["matriz"]:
        filas_matriz.append(
            (
                f"{item['caso'].replace('test_', '')} ({item['modulo']})",
                item["accion"],
                item["resultado_esperado"],
                f"{item['estado']} ({item['duracion_segundos']:.2f} s)",
            )
        )
    table(
        ["Caso / Módulo", "Acción ejecutada", "Resultado esperado", "Estado"],
        filas_matriz,
        [3.8, 5.5, 5.7, 2.2],
        font_pt=7.8,
    )
    p(
        "Criterio de aprobación: los escenarios positivos comprueban código HTTP 2xx y persistencia real en "
        "PostgreSQL; los escenarios negativos aprueban cuando el servidor rechaza la operación inválida "
        "(HTTP 400, 401, 403, 404, 409, 415 o 422) sin alterar los registros existentes.",
        space_after=2,
    )

    # ─── PÁGINA 2: RESULTADOS, DISPONIBILIDAD Y FRAGMENTOS DE LOGS ───────────
    page("2 Disponibilidad, recuperación y registros (Logs)")
    p(
        f"El script monitorear_servicio.py consultó {datos_p5['endpoint']} con un intervalo de muestreo de "
        f"{datos_p5['intervalo_muestreo_segundos']} s y timeout de {datos_p5['timeout_sonda_segundos']} s "
        f"durante una ventana controlada de {datos_p5['duracion_ventana_segundos']} s ({datos_p5['total_sondas']} sondas). "
        "Cada sonda valida HTTP 200 y el cuerpo JSON status='ok', clasificando fallos en ERROR_CONEXION, "
        "ERROR_HTTP o RESPUESTA_INVALIDA."
    )
    table(
        ["Fase del monitoreo", "Sondas", "Comportamiento observado en los logs", "Estado registrado"],
        [
            (
                "1. Operación normal",
                "Sondas 01 a 04 (4)",
                "Servicio activo en puerto 8010 conectado a PostgreSQL local; latencias de sonda entre 344.5 ms y 494.7 ms.",
                "4 / 4 SALUDABLE (100 %)",
            ),
            (
                "2. Caída controlada",
                "Sondas 05 a 08 (4)",
                f"Detención exclusiva del proceso API en 8010. Primera falla detectada en {datos_p5['primera_sonda_fallida']}.",
                "4 / 4 ERROR_CONEXION",
            ),
            (
                "3. Reinicio y recuperación",
                "Sondas 09 a 14 (6)",
                f"Reinicio del proceso en 8010; 2 sondas durante arranque y recuperación verificada en {datos_p5['primera_sonda_recuperada']}.",
                "2 arranque + 4 SALUDABLE",
            ),
        ],
        [3.4, 2.8, 7.8, 3.2],
        font_pt=8.2,
    )
    h("Fragmentos reales de logs de monitoreo (paso5_monitoreo.jsonl)")
    sondas_muestra = [
        json.dumps(lineas_sondas[0], ensure_ascii=False),
        json.dumps(lineas_sondas[4], ensure_ascii=False),
        json.dumps(lineas_sondas[10], ensure_ascii=False),
    ]
    code_box(sondas_muestra)

    h(
        f"Fragmentos reales de logs estructurados y sanitizados (eventos.jsonl — {datos_p6['archivos_generados']['total_lineas_jsonl']} eventos)"
    )
    p(
        "El script resumir_resultados.py consolida las pruebas funcionales, las sondas de salud y las "
        "mediciones de latencia HTTP en formato JSONL bajo resultados/<id_ejecucion>/eventos.jsonl. "
        "Cada registro incluye identificador de ejecución, fecha con zona horaria, entorno, módulo, caso, "
        "resultado esperado/obtenido sanitizado, estado, duración en ms y categoría de error, omitiendo "
        "tokens JWT, cabeceras Authorization, contraseñas, cadenas de conexión y datos personales:"
    )
    ev_func = next(e for e in lineas_eventos if e["caso"] == "test_08_reservas_concurrencia_exclusividad_de_fecha")
    ev_sonda = next(e for e in lineas_eventos if e["tipo_registro"] == "sonda_disponibilidad" and e["estado"] == "FALLIDO")
    ev_lat = next(e for e in lineas_eventos if e["tipo_registro"] == "latencia_http_lectura")
    code_box(
        [
            json.dumps(ev_func, ensure_ascii=False),
            json.dumps(ev_sonda, ensure_ascii=False),
            json.dumps(ev_lat, ensure_ascii=False),
        ]
    )

    # ─── PÁGINA 3: EVALUACIÓN DE INDICADORES DEL SLA Y LÍMITES ───────────────
    page("3 Evaluación de indicadores del SLA y límites")
    p(
        "Para evaluar los indicadores propuestos en el SLA sin mezclar métricas distintas, resumir_resultados.py "
        "separa el porcentaje de aprobación de la suite funcional, la tasa de éxito de operaciones válidas, "
        "la cobertura de las sondas de salud y los percentiles P95 de latencia HTTP medidos desde el cliente."
    )
    ind1 = datos_p6["indicadores_separados"]["1_pruebas_funcionales"]
    ind2 = datos_p6["indicadores_separados"]["2_exito_operaciones_validas"]
    ind3 = datos_p6["indicadores_separados"]["3_monitoreo_disponibilidad_health"]
    ind4 = datos_p6["indicadores_separados"]["4_latencia_http_cliente_p95"]

    table(
        ["Indicador separado", "Meta en SLA", "Resultado medido en entorno aislado", "Interpretación técnica"],
        [
            (
                "1. Pruebas funcionales",
                "100 % reglas del incremento",
                f"{ind1['aprobados']}/{ind1['total_casos']} aprobadas ({ind1['porcentaje_aprobacion']} %); 0 fallos, 0 omitidos.",
                f"Duración de suite Pytest: {ind1['duracion_suite_pytest_segundos']} s (no es latencia HTTP).",
            ),
            (
                "2. Éxito de operaciones válidas",
                "≥ 99.0 % éxito (< 1.0 % 5xx)",
                f"{ind2['solicitudes_exitosas_2xx']}/{ind2['total_solicitudes_validas']} exitosas ({ind2['porcentaje_exito']} %); 0 respuestas 5xx (0.0 %).",
                "Separa rechazos legítimos 4xx de errores internos del servidor 5xx.",
            ),
            (
                "3. Disponibilidad y sondas (/health)",
                "≥ 99.0 % mensual",
                f"{ind3['sondas_con_servicio_activo']} con servicio activo; {ind3['porcentaje_bruto_con_caida_inducida']} % bruto con caída inducida.",
                "Valida detección de caída y recuperación; una ventana de 26.7 s no certifica un mes.",
            ),
            (
                "4a. Latencia HTTP de lectura",
                "P95 ≤ 1,000 ms (1 s)",
                f"N={ind4['lectura_global']['muestras']}: Media {ind4['lectura_global']['media_ms']} ms | P95 {ind4['lectura_global']['p95_ms']} ms | Máx {ind4['lectura_global']['max_ms']} ms.",
                "Dentro del objetivo local en los 4 endpoints de consulta.",
            ),
            (
                "4b. Latencia HTTP de escritura",
                "P95 ≤ 3,000 ms (3 s)",
                f"N={ind4['escritura_global']['muestras']}: Media {ind4['escritura_global']['media_ms']} ms | P95 {ind4['escritura_global']['p95_ms']} ms | Máx {ind4['escritura_global']['max_ms']} ms.",
                "Dentro del objetivo local en actualizaciones transaccionales.",
            ),
            (
                "5. Integridad de agenda",
                "0 fechas confirmadas duplicadas",
                "0 duplicados (2 hilos concurrentes -> respuestas [200, 409]).",
                "Protegido por transacción e índice único parcial uq_reservacion_fecha_ocupada.",
            ),
        ],
        [3.3, 3.0, 5.4, 5.5],
        font_pt=7.9,
    )

    h("Desglose de latencia HTTP por operación (medida desde el cliente httpx)")
    filas_lat = []
    for op in ind4["desglose_por_operacion"]:
        filas_lat.append(
            (
                op["operacion"],
                op["tipo"].capitalize(),
                str(op["muestras"]),
                f"{op['media_ms']:.2f} ms",
                f"{op['p95_ms']:.2f} ms",
                f"{op['max_ms']:.2f} ms",
                f"≤ {int(op['meta_sla_ms'])} ms",
            )
        )
    table(
        ["Operación HTTP", "Tipo", "Muestra (N)", "Media", "P95", "Máximo", "Meta SLA"],
        filas_lat,
        [5.2, 2.2, 2.1, 1.9, 1.9, 1.9, 2.0],
        font_pt=8.0,
    )

    h("Alcance metodológico y límites de la evaluación")
    p(
        "1. Diferencia entre duración de suite y latencia HTTP: los 7.13 s de Pytest incluyen preparación de "
        "datos, múltiples llamadas por prueba y ejecución de hilos concurrentes; la latencia P95 real de "
        "cada petición se mide de forma individual en resumir_resultados.py (25.64 ms en lectura y 95.49 ms en escritura). "
        "2. Latencia del cliente frente al servidor: los tiempos reportados son medidos por el cliente HTTP "
        "en localhost sobre PostgreSQL 17.12 en Docker; en operación remota incluirán tránsito de red WAN. "
        "3. Disponibilidad y respaldos: la prueba de caída controlada comprueba la detección de indisponibilidad "
        "y la recuperación del proceso API en el puerto 8010, pero no sustituye una prueba de restauración de "
        "respaldos de base de datos (RPO/RTO) ni acredita el 99.0 % mensual (43,200 minutos), el cual requiere "
        "monitoreo continuo durante el periodo piloto."
    )

    doc.core_properties.title = "Proyecto 3 Reporte de Pruebas, Logs y SLA"
    doc.core_properties.author = "Equipo IDGS1004"
    ruta_salida = DOC_DIR / "Proyecto_3_Pruebas_Logs_y_SLA.docx"
    doc.save(ruta_salida)
    print(f"DOCX generado: {ruta_salida}")
    return ruta_salida


if __name__ == "__main__":
    generar_docx()
