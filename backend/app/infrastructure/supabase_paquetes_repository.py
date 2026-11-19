"""Repositorio de paquetes fotográficos en Supabase."""

from sqlalchemy import select


class SupabasePaquetesRepository:

    def __init__(self, engine, paquetes_table):
        self.engine = engine
        self.paquetes = paquetes_table

    def listar_paquetes(self):
        consulta = (
            select(self.paquetes)
            .where(self.paquetes.c.activo.is_(True))
            .order_by(self.paquetes.c.id_paquete)
        )

        with self.engine.connect() as conexion:
            filas = conexion.execute(consulta).mappings().all()

        return [
            {
                "id": fila["clave"],
                "name": fila["nombre"],
                "description": fila["descripcion"],
                "price_cents": fila["precio_centavos"],
            }
            for fila in filas
        ]
