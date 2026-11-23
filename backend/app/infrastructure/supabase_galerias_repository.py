
"""
Repositorio para administrar galerías, fotografías, videos y entregas.
Utiliza las tablas existentes de Supabase PostgreSQL.
"""

from sqlalchemy import select, insert, update, and_


class SupabaseGaleriasRepository:

    def __init__(
        self,
        engine,
        galerias,
        fotografias,
        videos,
        entregas,
        historial_entregas,
        reservaciones,
    ):
        self.engine = engine
        self.galerias = galerias
        self.fotografias = fotografias
        self.videos = videos
        self.entregas = entregas
        self.historial_entregas = historial_entregas
        self.reservaciones = reservaciones

    @staticmethod
    def _es_admin(usuario):
        return usuario.get("role") == "Administrador"

    def listar_galerias(self, usuario):
        consulta = (
            select(self.galerias)
            .select_from(
                self.galerias.join(
                    self.reservaciones,
                    self.galerias.c.id_reservacion
                    == self.reservaciones.c.id_reservacion,
                )
            )
            .order_by(self.galerias.c.creada_en.desc())
        )

        if not self._es_admin(usuario):
            consulta = consulta.where(
                and_(
                    self.reservaciones.c.id_cliente
                    == usuario["client_id"],
                    self.galerias.c.publicada.is_(True),
                )
            )

        with self.engine.connect() as conexion:
            return [
                dict(fila)
                for fila in conexion.execute(consulta).mappings().all()
            ]

    def obtener_galeria(self, id_galeria, usuario):
        consulta = (
            select(self.galerias)
            .select_from(
                self.galerias.join(
                    self.reservaciones,
                    self.galerias.c.id_reservacion
                    == self.reservaciones.c.id_reservacion,
                )
            )
            .where(self.galerias.c.id_galeria == id_galeria)
        )

        if not self._es_admin(usuario):
            consulta = consulta.where(
                and_(
                    self.reservaciones.c.id_cliente
                    == usuario["client_id"],
                    self.galerias.c.publicada.is_(True),
                )
            )

        with self.engine.connect() as conexion:
            fila = conexion.execute(consulta).mappings().first()
            return dict(fila) if fila else None

    def crear_galeria(self, datos):
        sentencia = (
            insert(self.galerias)
            .values(**datos)
            .returning(self.galerias)
        )

        with self.engine.begin() as conexion:
            fila = conexion.execute(sentencia).mappings().one()
            return dict(fila)

    
    def eliminar_archivo(self, ruta: str) -> bool:
        """Elimina un archivo del bucket privado de Supabase."""

        ruta_segura = quote(ruta, safe="/")
        url = (
            f"{self.base_url}/storage/v1/object/"
            f"{self.bucket}/{ruta_segura}"
        )

        try:
            response = httpx.delete(
                url,
                headers=self.headers,
                timeout=30,
            )
            response.raise_for_status()
            return True

        except httpx.HTTPStatusError as exc:
            detalle = exc.response.text
            raise SupabaseStorageError(
                f"No se pudo eliminar el archivo de Supabase: {detalle}"
            ) from exc

        except httpx.RequestError as exc:
            raise SupabaseStorageError(
                f"No fue posible conectar con Supabase: {exc}"
            ) from exc


    def publicar_galeria(self, id_galeria, publicada=True):
        valores = {"publicada": publicada}

        if publicada:
            from sqlalchemy import func
            valores["publicada_en"] = func.now()
        else:
            valores["publicada_en"] = None

        sentencia = (
            update(self.galerias)
            .where(self.galerias.c.id_galeria == id_galeria)
            .values(**valores)
            .returning(self.galerias)
        )

        with self.engine.begin() as conexion:
            fila = conexion.execute(sentencia).mappings().first()
            return dict(fila) if fila else None

    def listar_fotografias(self, id_galeria):
        consulta = (
            select(self.fotografias)
            .where(self.fotografias.c.id_galeria == id_galeria)
            .order_by(self.fotografias.c.orden)
        )

        with self.engine.connect() as conexion:
            return [
                dict(fila)
                for fila in conexion.execute(consulta).mappings().all()
            ]

    def registrar_fotografia(self, datos):
        sentencia = (
            insert(self.fotografias)
            .values(**datos)
            .returning(self.fotografias)
        )

        with self.engine.begin() as conexion:
            fila = conexion.execute(sentencia).mappings().one()
            return dict(fila)

    def eliminar_fotografia(self, id_fotografia, id_galeria):
        sentencia = (
            self.fotografias.delete()
            .where(
                and_(
                    self.fotografias.c.id_fotografia == id_fotografia,
                    self.fotografias.c.id_galeria == id_galeria,
                )
            )
        )

        with self.engine.begin() as conexion:
            resultado = conexion.execute(sentencia)
            return resultado.rowcount > 0

    def listar_videos(self, id_galeria):
        consulta = (
            select(self.videos)
            .where(self.videos.c.id_galeria == id_galeria)
            .order_by(self.videos.c.orden)
        )

        with self.engine.connect() as conexion:
            return [
                dict(fila)
                for fila in conexion.execute(consulta).mappings().all()
            ]

    def registrar_video(self, datos):
        sentencia = (
            insert(self.videos)
            .values(**datos)
            .returning(self.videos)
        )

        with self.engine.begin() as conexion:
            fila = conexion.execute(sentencia).mappings().one()
            return dict(fila)

    def eliminar_video(self, id_video, id_galeria):
        sentencia = (
            self.videos.delete()
            .where(
                and_(
                    self.videos.c.id_video == id_video,
                    self.videos.c.id_galeria == id_galeria,
                )
            )
        )

        with self.engine.begin() as conexion:
            resultado = conexion.execute(sentencia)
            return resultado.rowcount > 0

        

    def listar_entregas(self, usuario):
        consulta = (
            select(self.entregas)
            .select_from(
                self.entregas.join(
                    self.reservaciones,
                    self.entregas.c.id_reservacion
                    == self.reservaciones.c.id_reservacion,
                )
            )
            .order_by(self.entregas.c.fecha_compromiso.desc())
        )

        if not self._es_admin(usuario):
            consulta = consulta.where(
                self.reservaciones.c.id_cliente
                == usuario["client_id"]
            )

        with self.engine.connect() as conexion:
            return [
                dict(fila)
                for fila in conexion.execute(consulta).mappings().all()
            ]

    def crear_entrega(self, datos, usuario_id=None):
        datos = {
            **datos,
            "actualizado_por": usuario_id,
        }

        sentencia = (
            insert(self.entregas)
            .values(**datos)
            .returning(self.entregas)
        )

        with self.engine.begin() as conexion:
            fila = conexion.execute(sentencia).mappings().one()
            return dict(fila)

    def actualizar_entrega(
        self,
        id_entrega,
        estado_nuevo,
        comentario=None,
        usuario_id=None,
    ):
        with self.engine.begin() as conexion:
            consulta = (
                select(self.entregas)
                .where(self.entregas.c.id_entrega == id_entrega)
            )

            entrega = conexion.execute(
                consulta
            ).mappings().first()

            if not entrega:
                return None

            estado_anterior = entrega["estado"]

            actualizacion = (
                update(self.entregas)
                .where(self.entregas.c.id_entrega == id_entrega)
                .values(
                    estado=estado_nuevo,
                    actualizado_por=usuario_id,
                )
                .returning(self.entregas)
            )

            resultado = conexion.execute(
                actualizacion
            ).mappings().one()

            historial = {
                "id_entrega": id_entrega,
                "id_usuario": usuario_id,
                "estado_anterior": estado_anterior,
                "estado_nuevo": estado_nuevo,
                "comentario": comentario,
            }

            conexion.execute(
                insert(self.historial_entregas).values(**historial)
            )

            return dict(resultado)

    def listar_historial(self, id_entrega):
        consulta = (
            select(self.historial_entregas)
            .where(
                self.historial_entregas.c.id_entrega == id_entrega
            )
            .order_by(
                self.historial_entregas.c.registrado_en.desc()
            )
        )

        with self.engine.connect() as conexion:
            return [
                dict(fila)
                for fila in conexion.execute(consulta).mappings().all()
            ]
