"""Repositorio de paquetes conectado a Supabase PostgreSQL."""

from sqlalchemy import select, update, func


class SupabasePaquetesRepository:

    def __init__(self, engine, paquetes_table, auditoria_table):
        self.engine = engine
        self.paquetes = paquetes_table
        self.auditoria = auditoria_table

    def listar_paquetes(self, incluir_inactivos=False):
        consulta = select(self.paquetes)

        if not incluir_inactivos:
            consulta = consulta.where(self.paquetes.c.activo.is_(True))

        consulta = consulta.order_by(self.paquetes.c.id_paquete)

        with self.engine.connect() as conexion:
            filas = conexion.execute(consulta).mappings().all()

        return [self._formatear(fila) for fila in filas]

    def obtener_paquete(self, clave):
        consulta = select(self.paquetes).where(
            self.paquetes.c.clave == clave
        )

        with self.engine.connect() as conexion:
            fila = conexion.execute(consulta).mappings().first()

        return self._formatear(fila) if fila else None

    def crear_paquete(self, datos, id_administrador):
        clave = datos["clave"].strip().lower()

        with self.engine.begin() as conexion:
            existente = conexion.execute(
                select(self.paquetes.c.id_paquete).where(
                    func.lower(self.paquetes.c.clave) == clave
                )
            ).scalar_one_or_none()

            if existente is not None:
                raise ValueError("La clave del paquete ya está registrada")

            paquete = conexion.execute(
                self.paquetes.insert()
                .values(
                    clave=clave,
                    nombre=datos["nombre"],
                    descripcion=datos.get("descripcion"),
                    precio_centavos=datos["precio_centavos"],
                    activo=True,
                )
                .returning(self.paquetes)
            ).mappings().one()

            conexion.execute(
                self.auditoria.insert().values(
                    id_usuario=id_administrador,
                    accion="CREAR",
                    entidad="paquetes",
                    id_registro=paquete["id_paquete"],
                    detalles={
                        "clave": clave,
                        "nombre": datos["nombre"],
                        "precio_centavos": datos["precio_centavos"],
                    },
                )
            )

            return self._formatear(paquete)

    def actualizar_paquete(self, clave, datos, id_administrador):
        campos = {
            "nombre",
            "descripcion",
            "precio_centavos",
        }

        cambios = {
            campo: valor
            for campo, valor in datos.items()
            if campo in campos
        }

        if not cambios:
            raise ValueError("No se proporcionaron campos para actualizar")

        with self.engine.begin() as conexion:
            anterior = conexion.execute(
                select(self.paquetes)
                .where(
                    self.paquetes.c.clave == clave,
                    self.paquetes.c.activo.is_(True),
                )
                .with_for_update()
            ).mappings().first()

            if anterior is None:
                return None

            actualizado = conexion.execute(
                update(self.paquetes)
                .where(self.paquetes.c.clave == clave)
                .values(**cambios)
                .returning(self.paquetes)
            ).mappings().one()

            conexion.execute(
                self.auditoria.insert().values(
                    id_usuario=id_administrador,
                    accion="ACTUALIZAR",
                    entidad="paquetes",
                    id_registro=anterior["id_paquete"],
                    detalles={
                        "campos_modificados": list(cambios.keys()),
                        "clave": clave,
                    },
                )
            )

            return self._formatear(actualizado)

    def cambiar_estado(self, clave, activo, id_administrador):
        with self.engine.begin() as conexion:
            anterior = conexion.execute(
                select(self.paquetes)
                .where(self.paquetes.c.clave == clave)
                .with_for_update()
            ).mappings().first()

            if anterior is None or anterior["activo"] == activo:
                return False

            conexion.execute(
                update(self.paquetes)
                .where(self.paquetes.c.clave == clave)
                .values(activo=activo)
            )

            conexion.execute(
                self.auditoria.insert().values(
                    id_usuario=id_administrador,
                    accion="REACTIVAR" if activo else "INACTIVAR",
                    entidad="paquetes",
                    id_registro=anterior["id_paquete"],
                    detalles={
                        "estado_anterior": (
                            "Activo" if anterior["activo"] else "Inactivo"
                        ),
                        "estado_nuevo": "Activo" if activo else "Inactivo",
                        "clave": clave,
                    },
                )
            )

            return True

    @staticmethod
    def _formatear(fila):
        return {
            "id": fila["clave"],
            "name": fila["nombre"],
            "description": fila["descripcion"],
            "price_cents": fila["precio_centavos"],
            "active": fila["activo"],
        }