"""
Repositorio de clientes utilizando Supabase PostgreSQL.

Las consultas utilizan las tablas existentes de Supabase.
No se crean ni modifican tablas.
"""

from sqlalchemy import select, update, func


class SupabaseClientesRepository:

    def __init__(self, engine, clientes_table, usuarios_table, auditoria_table):
        self.engine = engine
        self.clientes = clientes_table
        self.usuarios = usuarios_table
        self.auditoria = auditoria_table

    def listar_clientes(self):
        consulta = (
            select(self.clientes)
            .where(self.clientes.c.activo.is_(True))
            .order_by(self.clientes.c.id_cliente)
        )

        with self.engine.connect() as conexion:
            resultado = conexion.execute(consulta)

            return [
                dict(fila._mapping)
                for fila in resultado
            ]

    def obtener_cliente(self, id_cliente: int):
        consulta = (
            select(self.clientes)
            .where(
                self.clientes.c.id_cliente == id_cliente,
                self.clientes.c.activo.is_(True),
            )
        )

        with self.engine.connect() as conexion:
            fila = conexion.execute(consulta).first()

            if fila is None:
                return None

            return dict(fila._mapping)


    def crear_cliente(self, datos: dict, id_administrador: int):
        """Registra un cliente administrativo sin crear credenciales."""

        correo = datos["email"].strip().lower()

        with self.engine.begin() as conexion:
            cliente_existente = conexion.execute(
                select(self.clientes.c.id_cliente)
                .where(func.lower(self.clientes.c.correo) == correo)
            ).scalar_one_or_none()

            usuario_existente = conexion.execute(
                select(self.usuarios.c.id_usuario)
                .where(func.lower(self.usuarios.c.correo) == correo)
            ).scalar_one_or_none()

            if cliente_existente is not None or usuario_existente is not None:
                raise ValueError("El correo ya está registrado")

            cliente = conexion.execute(
                self.clientes.insert()
                .values(
                    nombre=datos["name"],
                    correo=correo,
                    telefono=datos["phone"],
                    domicilio=datos["address"],
                    activo=True,
                )
                .returning(self.clientes)
            ).mappings().one()

            id_cliente = cliente["id_cliente"]

            conexion.execute(
                self.auditoria.insert().values(
                    id_usuario=id_administrador,
                    accion="CREAR",
                    entidad="clientes",
                    id_registro=id_cliente,
                    detalles={"origen": "panel_administrativo"},
                )
            )

            return dict(cliente)


    def actualizar_cliente(
        self,
        id_cliente: int,
        datos: dict,
        id_administrador: int,
    ):
        """Actualiza un cliente activo y sincroniza su correo."""

        campos_permitidos = {
            "nombre",
            "telefono",
            "correo",
            "domicilio",
        }

        cambios = {
            clave: valor
            for clave, valor in datos.items()
            if clave in campos_permitidos
        }

        if not cambios:
            raise ValueError(
                "No se proporcionaron campos para actualizar"
            )

        if "correo" in cambios:
            cambios["correo"] = cambios["correo"].strip().lower()

        with self.engine.begin() as conexion:
            anterior = conexion.execute(
                select(self.clientes)
                .where(
                    self.clientes.c.id_cliente == id_cliente,
                    self.clientes.c.activo.is_(True),
                )
                .with_for_update()
            ).mappings().first()

            if anterior is None:
                return None

            if "correo" in cambios:
                correo = cambios["correo"]

                cliente_existente = conexion.execute(
                    select(self.clientes.c.id_cliente)
                    .where(
                        func.lower(self.clientes.c.correo) == correo,
                        self.clientes.c.id_cliente != id_cliente,
                    )
                ).scalar_one_or_none()

                usuario_existente = conexion.execute(
                    select(self.usuarios.c.id_usuario)
                    .where(
                        func.lower(self.usuarios.c.correo) == correo,
                        self.usuarios.c.id_cliente != id_cliente,
                    )
                ).scalar_one_or_none()

                if (
                    cliente_existente is not None
                    or usuario_existente is not None
                ):
                    raise ValueError(
                        "El correo ya está registrado"
                    )

            actualizado = conexion.execute(
                update(self.clientes)
                .where(
                    self.clientes.c.id_cliente == id_cliente
                )
                .values(**cambios)
                .returning(self.clientes)
            ).mappings().one()

            if "correo" in cambios:
                conexion.execute(
                    update(self.usuarios)
                    .where(
                        self.usuarios.c.id_cliente == id_cliente
                    )
                    .values(correo=cambios["correo"])
                )

            conexion.execute(
                self.auditoria.insert().values(
                    id_usuario=id_administrador,
                    accion="ACTUALIZAR",
                    entidad="clientes",
                    id_registro=id_cliente,
                    detalles={
                        "campos_modificados": list(cambios.keys()),
                    },
                )
            )

            return dict(actualizado)


    def inactivar_cliente(self, id_cliente: int, id_administrador: int):
        """Inactiva cliente y usuarios, registrando la operación."""
        with self.engine.begin() as conexion:
            resultado = conexion.execute(
                update(self.clientes)
                .where(
                    self.clientes.c.id_cliente == id_cliente,
                    self.clientes.c.activo.is_(True),
                )
                .values(activo=False)
                .returning(self.clientes.c.id_cliente)
            )

            if resultado.scalar_one_or_none() is None:
                return False

            conexion.execute(
                update(self.usuarios)
                .where(self.usuarios.c.id_cliente == id_cliente)
                .values(activo=False)
            )

            conexion.execute(
                self.auditoria.insert().values(
                    id_usuario=id_administrador,
                    accion="INACTIVAR",
                    entidad="clientes",
                    id_registro=id_cliente,
                    detalles={
                        "estado_anterior": "Activo",
                        "estado_nuevo": "Inactivo",
                    },
                )
            )

            return True


    def reactivar_cliente(self, id_cliente: int, id_administrador: int):
        """Reactiva cliente y registra la operación."""
        with self.engine.begin() as conexion:
            resultado = conexion.execute(
                update(self.clientes)
                .where(
                    self.clientes.c.id_cliente == id_cliente,
                    self.clientes.c.activo.is_(False),
                )
                .values(activo=True)
                .returning(self.clientes.c.id_cliente)
            )

            if resultado.scalar_one_or_none() is None:
                return False

            # No reactivamos automáticamente las cuentas de usuario.
            # Una cuenta puede estar inactiva por motivos de seguridad.

            conexion.execute(
                self.auditoria.insert().values(
                    id_usuario=id_administrador,
                    accion="REACTIVAR",
                    entidad="clientes",
                    id_registro=id_cliente,
                    detalles={
                        "estado_anterior": "Inactivo",
                        "estado_nuevo": "Activo",
                        "usuarios_reactivados": False,
                    },
                )
            )

            return True
