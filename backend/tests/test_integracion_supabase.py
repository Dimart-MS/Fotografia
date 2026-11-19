"""
Prueba de integración con Supabase PostgreSQL.

Las inserciones se realizan dentro de una transacción
que siempre se revierte al finalizar.

No elimina físicamente registros existentes.
"""
import os
import uuid

import pytest
from sqlalchemy import select
from sqlalchemy.engine import make_url

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.domain.supabase_models import cargar_modelos_supabase
from app.infrastructure.database import database


@pytest.mark.integration
def test_registro_cliente_usuario_con_rollback():

    if os.environ.get("RUN_SUPABASE_INTEGRATION") != "1":
        pytest.skip(
            "Prueba de integración deshabilitada."
        )

    test_url = os.environ.get("TEST_DATABASE_URL", "").strip()

    if not test_url:
        pytest.skip(
            "TEST_DATABASE_URL no está configurada."
        )

    if not settings.DATABASE_URL:
        pytest.fail(
            "DATABASE_URL principal no está configurada."
        )

    # Comparar los destinos sin mostrar credenciales.
    principal = make_url(settings.DATABASE_URL)
    pruebas = make_url(test_url)

    if principal.render_as_string(hide_password=False) == pruebas.render_as_string(hide_password=False):
        pytest.fail(
            "La base de pruebas no puede utilizar la conexión principal."
        )

    if (
        principal.host == pruebas.host
        and principal.port == pruebas.port
        and principal.database == pruebas.database
        and principal.username == pruebas.username
    ):
        pytest.fail(
            "La base de pruebas apunta al mismo destino que la principal."
        )

    engine = database(test_url)

    try:
        # Reflejar las tablas reales de Supabase.
        _, tablas = cargar_modelos_supabase(engine)

        clientes = tablas["clientes"]
        usuarios = tablas["usuarios"]

        # Correo único para evitar conflictos.
        identificador = uuid.uuid4().hex[:12]
        correo = f"prueba.{identificador}@example.com"

        password = "PruebaSegura2026!"
        password_hash = hash_password(password)

        with engine.connect() as conexion:
            transaccion = conexion.begin()

            try:
                # 1. Registrar cliente ficticio.
                resultado_cliente = conexion.execute(
                    clientes.insert()
                    .values(
                        nombre="Cliente de Integracion",
                        telefono="4770000000",
                        correo=correo,
                        domicilio="Domicilio ficticio 123",
                    )
                    .returning(clientes.c.id_cliente)
                )

                id_cliente = resultado_cliente.scalar_one()

                # 2. Registrar usuario asociado.
                resultado_usuario = conexion.execute(
                    usuarios.insert()
                    .values(
                        id_cliente=id_cliente,
                        correo=correo,
                        contrasena_hash=password_hash,
                        rol="Cliente",
                        activo=True,
                        registro_pendiente=False,
                    )
                    .returning(usuarios.c.id_usuario)
                )

                id_usuario = resultado_usuario.scalar_one()

                # 3. Consultar los registros dentro
                # de la misma transacción.
                cliente = conexion.execute(
                    select(clientes).where(
                        clientes.c.id_cliente == id_cliente
                    )
                ).mappings().one()

                usuario = conexion.execute(
                    select(usuarios).where(
                        usuarios.c.id_usuario == id_usuario
                    )
                ).mappings().one()

                # 4. Verificar integridad y seguridad.
                assert cliente["correo"] == correo
                assert cliente["activo"] is True

                assert usuario["id_cliente"] == id_cliente
                assert usuario["correo"] == correo
                assert usuario["rol"] == "Cliente"
                assert usuario["activo"] is True
                assert usuario["registro_pendiente"] is False

                assert usuario["contrasena_hash"] != password
                assert verify_password(
                    password,
                    usuario["contrasena_hash"],
                )

            finally:
                # 5. Revertir las inserciones.
                transaccion.rollback()

    finally:
        engine.dispose()
