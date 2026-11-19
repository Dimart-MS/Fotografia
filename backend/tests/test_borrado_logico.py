import pytest

from sqlalchemy import (
    Boolean,
    Column,
    ForeignKey,
    Integer,
    JSON,
    MetaData,
    String,
    Table,
    create_engine,
    select,
)
from sqlalchemy.pool import StaticPool

from app.infrastructure.supabase_clientes_repository import (
    SupabaseClientesRepository,
)


@pytest.fixture
def entorno_prueba():
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    metadata = MetaData()

    clientes = Table(
        "clientes",
        metadata,
        Column("id_cliente", Integer, primary_key=True),
        Column("nombre", String(100)),
        Column("activo", Boolean, nullable=False, default=True),
    )

    usuarios = Table(
        "usuarios",
        metadata,
        Column("id_usuario", Integer, primary_key=True),
        Column(
            "id_cliente",
            Integer,
            ForeignKey("clientes.id_cliente"),
        ),
        Column("activo", Boolean, nullable=False, default=True),
    )

    auditoria = Table(
        "auditoria",
        metadata,
        Column("id_auditoria", Integer, primary_key=True),
        Column("id_usuario", Integer),
        Column("accion", String(50), nullable=False),
        Column("entidad", String(50), nullable=False),
        Column("id_registro", Integer),
        Column("detalles", JSON),
    )

    metadata.create_all(engine)

    with engine.begin() as conexion:
        conexion.execute(
            clientes.insert().values(
                id_cliente=1,
                nombre="Cliente de prueba",
                activo=True,
            )
        )

        conexion.execute(
            usuarios.insert().values(
                id_usuario=1,
                id_cliente=1,
                activo=True,
            )
        )

    repositorio = SupabaseClientesRepository(
        engine,
        clientes,
        usuarios,
        auditoria,
    )

    yield engine, repositorio, clientes, usuarios, auditoria

    engine.dispose()


def test_inactivar_cliente_y_usuario(entorno_prueba):
    engine, repo, clientes, usuarios, auditoria = entorno_prueba

    resultado = repo.inactivar_cliente(
        id_cliente=1,
        id_administrador=99,
    )

    assert resultado is True

    with engine.connect() as conexion:
        cliente_activo = conexion.execute(
            select(clientes.c.activo)
            .where(clientes.c.id_cliente == 1)
        ).scalar_one()

        usuario_activo = conexion.execute(
            select(usuarios.c.activo)
            .where(usuarios.c.id_usuario == 1)
        ).scalar_one()

        acciones = conexion.execute(
            select(auditoria.c.accion)
        ).scalars().all()

    assert cliente_activo is False
    assert usuario_activo is False
    assert acciones == ["INACTIVAR"]


def test_cliente_inactivo_no_aparece_en_listado(entorno_prueba):
    engine, repo, clientes, usuarios, auditoria = entorno_prueba

    repo.inactivar_cliente(
        id_cliente=1,
        id_administrador=99,
    )

    resultado = repo.listar_clientes()

    assert resultado == []


def test_reactivar_cliente_no_reactiva_usuario(entorno_prueba):
    engine, repo, clientes, usuarios, auditoria = entorno_prueba

    repo.inactivar_cliente(
        id_cliente=1,
        id_administrador=99,
    )

    resultado = repo.reactivar_cliente(
        id_cliente=1,
        id_administrador=99,
    )

    assert resultado is True

    with engine.connect() as conexion:
        cliente_activo = conexion.execute(
            select(clientes.c.activo)
            .where(clientes.c.id_cliente == 1)
        ).scalar_one()

        usuario_activo = conexion.execute(
            select(usuarios.c.activo)
            .where(usuarios.c.id_usuario == 1)
        ).scalar_one()

    assert cliente_activo is True
    assert usuario_activo is False


def test_inactivacion_no_elimina_registros(entorno_prueba):
    engine, repo, clientes, usuarios, auditoria = entorno_prueba

    resultado = repo.inactivar_cliente(
        id_cliente=1,
        id_administrador=99,
    )

    assert resultado is True

    with engine.connect() as conexion:
        cliente = conexion.execute(
            select(clientes).where(clientes.c.id_cliente == 1)
        ).mappings().one_or_none()

        usuario = conexion.execute(
            select(usuarios).where(usuarios.c.id_usuario == 1)
        ).mappings().one_or_none()

    assert cliente is not None
    assert usuario is not None
    assert cliente["activo"] is False
    assert usuario["activo"] is False


def test_error_auditoria_revierte_inactivacion(entorno_prueba):
    engine, repo, clientes, usuarios, auditoria = entorno_prueba

    # Provocamos un error de forma controlada:
    # eliminamos la tabla de auditoria SOLO en SQLite de prueba.
    auditoria.drop(engine)

    with pytest.raises(Exception):
        repo.inactivar_cliente(
            id_cliente=1,
            id_administrador=99,
        )

    # La transaccion debe revertir las actualizaciones.
    with engine.connect() as conexion:
        cliente_activo = conexion.execute(
            select(clientes.c.activo)
            .where(clientes.c.id_cliente == 1)
        ).scalar_one()

        usuario_activo = conexion.execute(
            select(usuarios.c.activo)
            .where(usuarios.c.id_usuario == 1)
        ).scalar_one()

    assert cliente_activo is True
    assert usuario_activo is True


def test_inactivar_cliente_inexistente(entorno_prueba):
    engine, repo, clientes, usuarios, auditoria = entorno_prueba

    resultado = repo.inactivar_cliente(
        id_cliente=9999,
        id_administrador=99,
    )

    assert resultado is False

    with engine.connect() as conexion:
        cantidad_auditorias = conexion.execute(
            select(auditoria.c.id_auditoria)
        ).scalars().all()

    assert cantidad_auditorias == []
