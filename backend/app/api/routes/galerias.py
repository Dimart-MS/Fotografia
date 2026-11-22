
"""
Rutas para administrar galerías, fotografías, videos y entregas.
"""

from datetime import date
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field, HttpUrl

MAX_FOTOGRAFIA_BYTES = 50 * 1024 * 1024

TIPOS_FOTOGRAFIA = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

MAX_VIDEO_BYTES = 50 * 1024 * 1024

TIPOS_VIDEO = {
    "video/mp4",
}


class GaleriaCrear(BaseModel):
    id_reservacion: int
    titulo: str = Field(min_length=1, max_length=200)
    descripcion: str | None = None


class FotografiaSolicitar(BaseModel):
    nombre_archivo: str = Field(min_length=1, max_length=255)
    tipo_mime: str
    tamano_bytes: int = Field(gt=0, le=MAX_FOTOGRAFIA_BYTES)


class FotografiaConfirmar(BaseModel):
    ruta_storage: str
    nombre_archivo: str
    tipo_mime: str
    tamano_bytes: int = Field(gt=0, le=MAX_FOTOGRAFIA_BYTES)
    ancho_px: int | None = None
    alto_px: int | None = None
    orden: int = 0


class VideoCrear(BaseModel):
    titulo: str = Field(min_length=1, max_length=200)
    url_externa: HttpUrl
    proveedor: str = "Otro"
    orden: int = 0

class VideoSolicitar(BaseModel):
    nombre_archivo: str = Field(min_length=1, max_length=255)
    tipo_mime: str
    tamano_bytes: int = Field(gt=0, le=MAX_VIDEO_BYTES)


class VideoConfirmar(BaseModel):
    ruta_storage: str
    nombre_archivo: str = Field(min_length=1, max_length=255)
    tipo_mime: str
    tamano_bytes: int = Field(gt=0, le=MAX_VIDEO_BYTES)
    orden: int = 0


class EntregaCrear(BaseModel):
    id_reservacion: int
    fecha_compromiso: date
    domicilio: str = Field(min_length=1, max_length=255)
    observaciones: str | None = None


class EntregaActualizar(BaseModel):
    estado: str = Field(min_length=1, max_length=100)
    comentario: str | None = None
    fecha_real: date | None = None


def create_galerias_router(usuario_autenticado, solo_administrador):

    router = APIRouter(
        prefix="/api/galerias",
        tags=["Galerías y entregas"],
    )

    def obtener_repo(request: Request):
        return request.app.state.galerias_repo

    def validar_galeria(request, id_galeria, usuario):
        galeria = obtener_repo(request).obtener_galeria(
            id_galeria,
            usuario,
        )

        if not galeria:
            raise HTTPException(
                status_code=404,
                detail="Galería no encontrada.",
            )

        return galeria

    @router.get("")
    def listar_galerias(
        request: Request,
        usuario=Depends(usuario_autenticado),
    ):
        return obtener_repo(request).listar_galerias(usuario)

    @router.post("", status_code=201)
    def crear_galeria(
        datos: GaleriaCrear,
        request: Request,
        usuario=Depends(solo_administrador),
    ):
        repo = obtener_repo(request)

        try:
            return repo.crear_galeria(datos.model_dump())
        except Exception as exc:
            print(f"ERROR AL CREAR GALERIA: {exc}")
            raise HTTPException(
                status_code=400,
                detail="No se pudo crear la galería. Verifica la reservación.",
            ) from exc

    @router.get("/{id_galeria}")
    def detalle_galeria(
        id_galeria: int,
        request: Request,
        usuario=Depends(usuario_autenticado),
    ):
        galeria = validar_galeria(request, id_galeria, usuario)
        repo = obtener_repo(request)

        return {
            "galeria": galeria,
            "fotografias": repo.listar_fotografias(id_galeria),
            "videos": repo.listar_videos(id_galeria),
        }

    @router.patch("/{id_galeria}/publicar")
    def publicar_galeria(
        id_galeria: int,
        request: Request,
        usuario=Depends(solo_administrador),
    ):
        galeria = obtener_repo(request).publicar_galeria(
            id_galeria,
            True,
        )

        if not galeria:
            raise HTTPException(404, "Galería no encontrada.")

        return galeria

    @router.patch("/{id_galeria}/ocultar")
    def ocultar_galeria(
        id_galeria: int,
        request: Request,
        usuario=Depends(solo_administrador),
    ):
        galeria = obtener_repo(request).publicar_galeria(
            id_galeria,
            False,
        )

        if not galeria:
            raise HTTPException(404, "Galería no encontrada.")

        return galeria

    @router.post("/{id_galeria}/fotografias/solicitar-subida")
    def solicitar_subida(
        id_galeria: int,
        datos: FotografiaSolicitar,
        request: Request,
        usuario=Depends(solo_administrador),
    ):
        repo = obtener_repo(request)
        galeria = repo.obtener_galeria(id_galeria, usuario)

        if not galeria:
            raise HTTPException(404, "Galería no encontrada.")

        if datos.tipo_mime not in TIPOS_FOTOGRAFIA:
            raise HTTPException(
                status_code=415,
                detail="Formato no permitido. Usa JPEG, PNG o WebP.",
            )

        nombre_limpio = Path(datos.nombre_archivo).name
        extension = Path(nombre_limpio).suffix.lower()

        ruta = (
            f"{galeria['id_reservacion']}/"
            f"{id_galeria}/{uuid4().hex}{extension}"
        )

        try:
            resultado = request.app.state.storage.crear_url_subida(
                ruta,
                datos.tipo_mime,
            )

        except Exception as exc:
            print(f"ERROR AL GENERAR URL DE SUBIDA: {exc}")

            raise HTTPException(
                status_code=502,
                detail=str(exc),
            ) from exc

        return {
            "ruta_storage": ruta,
            "signed_url": resultado["signed_url"],
            "token": resultado.get("token"),
            "metodo": "PUT",
            "tipo_mime": datos.tipo_mime,
            "tamano_maximo_bytes": MAX_FOTOGRAFIA_BYTES,
        }

    @router.post(
        "/{id_galeria}/fotografias/confirmar-subida",
        status_code=201,
    )
    def confirmar_subida(
        id_galeria: int,
        datos: FotografiaConfirmar,
        request: Request,
        usuario=Depends(solo_administrador),
    ):
        repo = obtener_repo(request)
        galeria = repo.obtener_galeria(id_galeria, usuario)

        if not galeria:
            raise HTTPException(404, "Galería no encontrada.")

        if datos.tipo_mime not in TIPOS_FOTOGRAFIA:
            raise HTTPException(
                415,
                "Formato de fotografía no permitido.",
            )

        prefijo = f"{galeria['id_reservacion']}/{id_galeria}/"

        if not datos.ruta_storage.startswith(prefijo):
            raise HTTPException(
                400,
                "La ruta del archivo no es válida.",
            )

        try:
            contenido = datos.model_dump()
            contenido["id_galeria"] = id_galeria

            return repo.registrar_fotografia(contenido)

        except Exception as exc:
            print(f"ERROR AL REGISTRAR FOTOGRAFIA: {exc}")
            raise HTTPException(
                400,
                "No se pudo registrar la fotografía.",
            ) from exc

    @router.get(
        "/{id_galeria}/fotografias/{id_fotografia}/descarga"
    )
    def descargar_fotografia(
        id_galeria: int,
        id_fotografia: int,
        request: Request,
        usuario=Depends(usuario_autenticado),
    ):
        validar_galeria(request, id_galeria, usuario)

        fotografias = obtener_repo(request).listar_fotografias(
            id_galeria
        )

        fotografia = next(
            (
                foto for foto in fotografias
                if foto["id_fotografia"] == id_fotografia
            ),
            None,
        )

        if not fotografia:
            raise HTTPException(404, "Fotografía no encontrada.")

        try:
            url = request.app.state.storage.crear_url_descarga(
                fotografia["ruta_storage"]
            )
        except Exception as exc:
            print(f"ERROR AL GENERAR URL DE DESCARGA: {exc}")
            raise HTTPException(
                status_code=502,
                detail="No fue posible generar el enlace de descarga.",
            ) from exc

        return {
            "url": url,
            "nombre_archivo": fotografia["nombre_archivo"],
            "expira_en_segundos": 3600,
        }

    @router.delete("/{id_galeria}/fotografias/{id_fotografia}")
    def eliminar_fotografia(
        id_galeria: int,
        id_fotografia: int,
        request: Request,
        usuario=Depends(solo_administrador),
    ):
        repo = obtener_repo(request)

        galeria = repo.obtener_galeria(id_galeria, usuario)

        if not galeria:
            raise HTTPException(404, "Galería no encontrada.")

        fotografias = repo.listar_fotografias(id_galeria)

        fotografia = next(
            (
                foto for foto in fotografias
                if foto["id_fotografia"] == id_fotografia
            ),
            None,
        )

        if not fotografia:
            raise HTTPException(404, "Fotografía no encontrada.")

        try:
            request.app.state.storage.eliminar_archivo(
                fotografia["ruta_storage"]
            )

            resultado = repo.eliminar_fotografia(
                id_fotografia,
                id_galeria,
            )

            if not resultado:
                raise HTTPException(
                    404,
                    "No se pudo eliminar el registro de la fotografía.",
                )

            return {
                "mensaje": "Fotografía eliminada correctamente.",
                "id_fotografia": id_fotografia,
            }

        except HTTPException:
            raise

        except Exception as exc:
            print(f"ERROR AL ELIMINAR FOTOGRAFÍA: {exc}")
            raise HTTPException(
                500,
                "No fue posible eliminar la fotografía.",
            ) from exc

    @router.post("/{id_galeria}/videos/solicitar-subida")
    def solicitar_subida_video(
        id_galeria: int,
        datos: VideoSolicitar,
        request: Request,
        usuario=Depends(solo_administrador),
    ):
        repo = obtener_repo(request)
        galeria = repo.obtener_galeria(id_galeria, usuario)

        if not galeria:
            raise HTTPException(404, "Galería no encontrada.")

        if datos.tipo_mime not in TIPOS_VIDEO:
            raise HTTPException(
                415,
                "Formato no permitido. Selecciona un video MP4.",
            )

        nombre_limpio = Path(datos.nombre_archivo).name
        extension = Path(nombre_limpio).suffix.lower()

        if extension != ".mp4":
            raise HTTPException(
                415,
                "El archivo debe tener extensión MP4.",
            )

        ruta = (
            f"{galeria['id_reservacion']}/"
            f"{id_galeria}/{uuid4().hex}.mp4"
        )

        try:
            resultado = request.app.state.storage.crear_url_subida(
                ruta,
                datos.tipo_mime,
            )
        except Exception as exc:
            print(f"ERROR AL GENERAR SUBIDA DE VIDEO: {exc}")
            raise HTTPException(
                502,
                "No fue posible generar el enlace de subida.",
            ) from exc

        return {
            "ruta_storage": ruta,
            "signed_url": resultado["signed_url"],
            "token": resultado.get("token"),
            "metodo": "PUT",
            "tipo_mime": datos.tipo_mime,
            "tamano_maximo_bytes": MAX_VIDEO_BYTES,
        }

    @router.post(
        "/{id_galeria}/videos/confirmar-subida",
        status_code=201,
    )
    def confirmar_subida_video(
        id_galeria: int,
        datos: VideoConfirmar,
        request: Request,
        usuario=Depends(solo_administrador),
    ):
        repo = obtener_repo(request)
        galeria = repo.obtener_galeria(id_galeria, usuario)

        if not galeria:
            raise HTTPException(404, "Galería no encontrada.")

        if datos.tipo_mime not in TIPOS_VIDEO:
            raise HTTPException(
                415,
                "Formato de video no permitido.",
            )

        if Path(datos.nombre_archivo).suffix.lower() != ".mp4":
            raise HTTPException(
                415,
                "El archivo debe tener extensión MP4.",
            )

        prefijo = f"{galeria['id_reservacion']}/{id_galeria}/"

        if not datos.ruta_storage.startswith(prefijo):
            raise HTTPException(
                400,
                "La ruta del archivo no es válida.",
            )

        contenido = {
            "id_galeria": id_galeria,
            "titulo": datos.nombre_archivo,
            "url_externa": datos.ruta_storage,
            "proveedor": "Supabase",
            "orden": datos.orden,
        }

        try:
            return repo.registrar_video(contenido)
        except Exception as exc:
            print(f"ERROR AL REGISTRAR VIDEO: {exc}")
            raise HTTPException(
                400,
                "No se pudo registrar el video.",
            ) from exc

    @router.post("/{id_galeria}/videos", status_code=201)
    def agregar_video(
        id_galeria: int,
        datos: VideoCrear,
        request: Request,
        usuario=Depends(solo_administrador),
    ):
        repo = obtener_repo(request)

        if not repo.obtener_galeria(id_galeria, usuario):
            raise HTTPException(404, "Galería no encontrada.")

        contenido = datos.model_dump()
        contenido["id_galeria"] = id_galeria
        contenido["url_externa"] = str(datos.url_externa)

        try:
            return repo.registrar_video(contenido)
        except Exception as exc:
            print(f"ERROR AL REGISTRAR VIDEO: {exc}")
            raise HTTPException(
                400,
                "No se pudo registrar el video.",
            ) from exc

    @router.get(
        "/{id_galeria}/videos/{id_video}/descarga"
    )
            
    def descargar_video(
        id_galeria: int,
        id_video: int,
        request: Request,
        usuario=Depends(usuario_autenticado),
    ):
        validar_galeria(request, id_galeria, usuario)

        videos = obtener_repo(request).listar_videos(id_galeria)

        video = next(
            (
                item for item in videos
                if item["id_video"] == id_video
                and item["proveedor"] == "Supabase"
            ),
            None,
        )

        if not video:
            raise HTTPException(404, "Video no encontrado.")

        try:
            url = request.app.state.storage.crear_url_descarga(
                video["url_externa"]
            )
        except Exception as exc:
            print(f"ERROR AL GENERAR DESCARGA DE VIDEO: {exc}")
            raise HTTPException(
                502,
                "No fue posible generar el enlace del video.",
            ) from exc

        return {
            "url": url,
            "nombre_archivo": video["titulo"],
            "expira_en_segundos": 3600,
        }
    
    @router.delete("/{id_galeria}/videos/{id_video}")
    def eliminar_video(
        id_galeria: int,
        id_video: int,
        request: Request,
        usuario=Depends(solo_administrador),
    ):
        repo = obtener_repo(request)

        galeria = repo.obtener_galeria(id_galeria, usuario)

        if not galeria:
            raise HTTPException(404, "Galería no encontrada.")

        videos = repo.listar_videos(id_galeria)

        video = next(
            (
                item for item in videos
                if item["id_video"] == id_video
            ),
            None,
        )

        if not video:
            raise HTTPException(404, "Video no encontrado.")

        try:
            if video["proveedor"] == "Supabase":
                request.app.state.storage.eliminar_archivo(
                    video["url_externa"]
                )

            resultado = repo.eliminar_video(
                id_video,
                id_galeria,
            )

            if not resultado:
                raise HTTPException(
                    404,
                    "No se pudo eliminar el registro del video.",
                )

            return {
                "mensaje": "Video eliminado correctamente.",
                "id_video": id_video,
            }

        except HTTPException:
            raise

        except Exception as exc:
            print(f"ERROR AL ELIMINAR VIDEO: {exc}")
            raise HTTPException(
                500,
                "No fue posible eliminar el video.",
            ) from exc


    @router.get("/entregas/listado")
    def listar_entregas(
        request: Request,
        usuario=Depends(usuario_autenticado),
    ):
        return obtener_repo(request).listar_entregas(usuario)

    @router.post("/entregas", status_code=201)
    def crear_entrega(
        datos: EntregaCrear,
        request: Request,
        usuario=Depends(solo_administrador),
    ):
        contenido = datos.model_dump()
        contenido["estado"] = "Pendiente"

        return obtener_repo(request).crear_entrega(
            contenido,
            usuario.get("id"),
        )

    @router.patch("/entregas/{id_entrega}")
    def actualizar_entrega(
        id_entrega: int,
        datos: EntregaActualizar,
        request: Request,
        usuario=Depends(solo_administrador),
    ):
        repo = obtener_repo(request)

        resultado = repo.actualizar_entrega(
            id_entrega=id_entrega,
            estado_nuevo=datos.estado,
            comentario=datos.comentario,
            usuario_id=usuario.get("id"),
        )

        if not resultado:
            raise HTTPException(404, "Entrega no encontrada.")

        if datos.fecha_real is not None:
            from sqlalchemy import update

            with request.app.state.engine.begin() as conexion:
                conexion.execute(
                    update(repo.entregas)
                    .where(
                        repo.entregas.c.id_entrega == id_entrega
                    )
                    .values(fecha_real=datos.fecha_real)
                )

            resultado["fecha_real"] = datos.fecha_real

        return resultado

    @router.get("/entregas/{id_entrega}/historial")
    def historial_entrega(
        id_entrega: int,
        request: Request,
        usuario=Depends(usuario_autenticado),
    ):
        repo = obtener_repo(request)

        entregas = repo.listar_entregas(usuario)

        entrega = next(
            (
                item for item in entregas
                if item["id_entrega"] == id_entrega
            ),
            None,
        )

        if not entrega:
            raise HTTPException(404, "Entrega no encontrada.")

        return repo.listar_historial(id_entrega)

    return router
