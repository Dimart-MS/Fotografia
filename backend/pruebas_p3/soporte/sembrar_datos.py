"""
Paso 3: Siembra repetible de datos ficticios en PostgreSQL local (127.0.0.1:55432).
Crea usuarios Administrador y Cliente, clientes y paquetes ficticios con hashes PBKDF2-SHA256.
Nunca toca Supabase ni usa backend/.env.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

CARPETA_SOPORTE = Path(__file__).resolve().parent
CARPETA = CARPETA_SOPORTE.parent
BACKEND_DIR = CARPETA.parent
for ruta in (str(CARPETA_SOPORTE), str(BACKEND_DIR)):
    if ruta not in sys.path:
        sys.path.insert(0, ruta)

from conexion_local import conectar
from app.core.security import hash_password

# Credenciales ficticias exclusivas para el entorno de pruebas P3
CUENTAS_PRUEBA = {
    "admin": {
        "correo": "admin.p3@luzymemoria.mx",
        "password_plano": "AdminP3_Luz2026!",
        "rol": "Administrador",
    },
    "cliente1": {
        "correo": "cliente1.p3@luzymemoria.mx",
        "password_plano": "Cliente1P3_Luz2026!",
        "rol": "Cliente",
        "nombre": "Elena Morales P3",
        "telefono": "4771002001",
        "domicilio": "Av. Pruebas 101, Col. Campestre, León, Gto.",
    },
    "cliente2": {
        "correo": "cliente2.p3@luzymemoria.mx",
        "password_plano": "Cliente2P3_Luz2026!",
        "rol": "Cliente",
        "nombre": "Carlos Vega P3",
        "telefono": "4771002002",
        "domicilio": "Blvd. Pruebas 202, Jardines del Moral, León, Gto.",
    },
}

PAQUETES_PRUEBA = [
    {
        "clave": "foto-p3",
        "nombre": "Fotografía Social P3",
        "descripcion": "Cobertura fotográfica de evento social para pruebas del parcial 3.",
        "precio_centavos": 350000,
        "activo": True,
    },
    {
        "clave": "video-p3",
        "nombre": "Cobertura de Video P3",
        "descripcion": "Cobertura en video de evento social para pruebas del parcial 3.",
        "precio_centavos": 450000,
        "activo": True,
    },
    {
        "clave": "combinado-p3",
        "nombre": "Paquete Integral Foto y Video P3",
        "descripcion": "Paquete completo de fotografía y video para pruebas del parcial 3.",
        "precio_centavos": 700000,
        "activo": True,
    },
]


def _upsert_cliente(cur, nombre: str, telefono: str, correo: str, domicilio: str) -> int:
    """Inserta o actualiza un cliente ficticio identificado por su correo en minúsculas."""
    correo_norm = correo.strip().lower()
    fila = cur.execute(
        "SELECT id_cliente FROM public.clientes WHERE lower(correo) = %s",
        (correo_norm,),
    ).fetchone()

    if fila:
        id_cliente = fila[0]
        cur.execute(
            """
            UPDATE public.clientes
            SET nombre = %s, telefono = %s, domicilio = %s, activo = true
            WHERE id_cliente = %s
            """,
            (nombre, telefono, domicilio, id_cliente),
        )
        return id_cliente

    nueva = cur.execute(
        """
        INSERT INTO public.clientes (nombre, telefono, correo, domicilio, activo)
        VALUES (%s, %s, %s, %s, true)
        RETURNING id_cliente
        """,
        (nombre, telefono, correo_norm, domicilio),
    ).fetchone()
    return nueva[0]


def _upsert_usuario(cur, correo: str, password_plano: str, rol: str, id_cliente: int | None) -> int:
    """Inserta o actualiza un usuario ficticio con el hash PBKDF2-SHA256 del proyecto."""
    correo_norm = correo.strip().lower()
    hash_generado = hash_password(password_plano)

    fila = cur.execute(
        "SELECT id_usuario FROM public.usuarios WHERE lower(correo) = %s",
        (correo_norm,),
    ).fetchone()

    if fila:
        id_usuario = fila[0]
        cur.execute(
            """
            UPDATE public.usuarios
            SET id_cliente = %s,
                contrasena_hash = %s,
                rol = %s,
                activo = true,
                registro_pendiente = false,
                debe_cambiar_contrasena = false
            WHERE id_usuario = %s
            """,
            (id_cliente, hash_generado, rol, id_usuario),
        )
        return id_usuario

    nueva = cur.execute(
        """
        INSERT INTO public.usuarios (
            id_cliente, correo, contrasena_hash, rol, activo,
            registro_pendiente, debe_cambiar_contrasena
        )
        VALUES (%s, %s, %s, %s, true, false, false)
        RETURNING id_usuario
        """,
        (id_cliente, correo_norm, hash_generado, rol),
    ).fetchone()
    return nueva[0]


def _upsert_paquete(cur, paquete: dict) -> int:
    """Inserta o actualiza un paquete ficticio identificado por su clave única."""
    fila = cur.execute(
        "SELECT id_paquete FROM public.paquetes WHERE clave = %s",
        (paquete["clave"],),
    ).fetchone()

    if fila:
        id_paquete = fila[0]
        cur.execute(
            """
            UPDATE public.paquetes
            SET nombre = %s, descripcion = %s, precio_centavos = %s, activo = %s
            WHERE id_paquete = %s
            """,
            (
                paquete["nombre"],
                paquete["descripcion"],
                paquete["precio_centavos"],
                paquete["activo"],
                id_paquete,
            ),
        )
        return id_paquete

    nueva = cur.execute(
        """
        INSERT INTO public.paquetes (clave, nombre, descripcion, precio_centavos, activo)
        VALUES (%s, %s, %s, %s, %s)
        RETURNING id_paquete
        """,
        (
            paquete["clave"],
            paquete["nombre"],
            paquete["descripcion"],
            paquete["precio_centavos"],
            paquete["activo"],
        ),
    ).fetchone()
    return nueva[0]


def sembrar() -> dict:
    """Ejecuta la siembra en una transacción sobre fotografia_p3_test."""
    with conectar() as conn:
        with conn.cursor() as cur:
            # 1. Usuario Administrador (sin registro en clientes)
            id_admin = _upsert_usuario(
                cur,
                correo=CUENTAS_PRUEBA["admin"]["correo"],
                password_plano=CUENTAS_PRUEBA["admin"]["password_plano"],
                rol="Administrador",
                id_cliente=None,
            )

            # 2. Clientes ficticios y sus cuentas de usuario con rol Cliente
            clientes_creados = []
            for clave in ("cliente1", "cliente2"):
                datos = CUENTAS_PRUEBA[clave]
                id_cli = _upsert_cliente(
                    cur,
                    nombre=datos["nombre"],
                    telefono=datos["telefono"],
                    correo=datos["correo"],
                    domicilio=datos["domicilio"],
                )
                id_usr = _upsert_usuario(
                    cur,
                    correo=datos["correo"],
                    password_plano=datos["password_plano"],
                    rol="Cliente",
                    id_cliente=id_cli,
                )
                clientes_creados.append(
                    {
                        "clave": clave,
                        "id_cliente": id_cli,
                        "id_usuario": id_usr,
                        "correo": datos["correo"],
                    }
                )

            # 3. Paquetes ficticios
            paquetes_creados = []
            for pkg in PAQUETES_PRUEBA:
                id_pkg = _upsert_paquete(cur, pkg)
                paquetes_creados.append(
                    {
                        "id_paquete": id_pkg,
                        "clave": pkg["clave"],
                        "precio_centavos": pkg["precio_centavos"],
                    }
                )

        conn.commit()

    resumen = {
        "fecha_utc": datetime.now(timezone.utc).isoformat(),
        "base": "fotografia_p3_test",
        "destino": "127.0.0.1:55432",
        "admin": {
            "id_usuario": id_admin,
            "correo": CUENTAS_PRUEBA["admin"]["correo"],
            "rol": "Administrador",
            "mecanismo_hash": "pbkdf2_sha256$600000",
        },
        "clientes": clientes_creados,
        "paquetes": paquetes_creados,
        "resultado": "SEMBRADO_OK",
    }

    carpeta_res = CARPETA / "resultados"
    carpeta_res.mkdir(exist_ok=True)
    (carpeta_res / "paso3_semilla.json").write_text(
        json.dumps(resumen, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return resumen


if __name__ == "__main__":
    resultado = sembrar()
    print(json.dumps(resultado, indent=2, ensure_ascii=False))
