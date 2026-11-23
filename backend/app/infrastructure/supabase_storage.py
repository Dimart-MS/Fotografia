
"""
Servicio para gestionar archivos privados en Supabase Storage.
Utiliza enlaces temporales para subir y descargar fotografías.
"""

from urllib.parse import quote

import httpx

from app.core.config import settings


class SupabaseStorageError(Exception):
    """Error al comunicarse con Supabase Storage."""


class SupabaseStorage:

    def __init__(self):
        self.base_url = settings.SUPABASE_URL.rstrip("/")
        self.api_key = settings.SUPABASE_SERVICE_ROLE_KEY
        self.bucket = settings.SUPABASE_BUCKET_FOTOGRAFIAS

        if not self.base_url or not self.api_key:
            raise RuntimeError(
                "Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY."
            )

        self.headers = {
            "apikey": self.api_key,
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def crear_url_subida(
        self,
        ruta: str,
        content_type: str,
    ) -> dict:
        """Genera una URL temporal para subir un archivo."""

        ruta_segura = quote(ruta, safe="/")
        url = (
            f"{self.base_url}/storage/v1/object/upload/sign/"
            f"{self.bucket}/{ruta_segura}"
        )

        try:
            response = httpx.post(
                url,
                headers=self.headers,
                json={"upsert": False},
                timeout=30,
            )

            response.raise_for_status()
            data = response.json()

            signed_url = data.get("url") or data.get("signedURL")

            if not signed_url:
                raise SupabaseStorageError(
                    "Supabase no devolvió una URL de subida."
                )

            if signed_url.startswith("/"):
                signed_url = (
                    self.base_url + "/storage/v1" + signed_url
                )

            return {
                "signed_url": signed_url,
                "ruta": ruta,
                "token": data.get("token"),
            }

        except httpx.HTTPStatusError as exc:
            detalle = exc.response.text

            raise SupabaseStorageError(
                f"Supabase respondió HTTP "
                f"{exc.response.status_code}: {detalle}"
            ) from exc

        except httpx.RequestError as exc:
            raise SupabaseStorageError(
                f"No fue posible conectar con Supabase: {exc}"
            ) from exc

    def crear_url_descarga(
        self,
        ruta: str,
        segundos: int = 3600,
    ) -> str:
        """Genera una URL temporal para descargar un archivo."""

        ruta_segura = quote(ruta, safe="/")
        url = (
            f"{self.base_url}/storage/v1/object/sign/"
            f"{self.bucket}/{ruta_segura}"
        )

        try:
            response = httpx.post(
                url,
                headers=self.headers,
                json={"expiresIn": segundos},
                timeout=30,
            )

            response.raise_for_status()
            data = response.json()

            signed_url = data.get("signedURL")

            if not signed_url:
                raise SupabaseStorageError(
                    "Supabase no devolvió una URL de descarga."
                )

            if signed_url.startswith("/"):
                signed_url = (
                    self.base_url + "/storage/v1" + signed_url
                )

            return signed_url

        except httpx.HTTPStatusError as exc:
            detalle = exc.response.text

            raise SupabaseStorageError(
                f"Supabase respondió HTTP "
                f"{exc.response.status_code}: {detalle}"
            ) from exc

        except httpx.RequestError as exc:
            raise SupabaseStorageError(
                f"No fue posible conectar con Supabase: {exc}"
            ) from exc

    def eliminar_archivo(self, ruta: str):
        try:
            url = (
                f"{self.base_url}/storage/v1/object/"
                f"{self.bucket}/{quote(ruta, safe='/')}"
            )

            headers = dict(self.headers)
            headers.pop("Content-Type", None)
            headers.pop("content-type", None)

            respuesta = httpx.delete(
                url,
                headers=headers,
                timeout=30
            )

            respuesta.raise_for_status()
            return True

        except httpx.HTTPStatusError as error:
            raise SupabaseStorageError(
                f"No se pudo eliminar el archivo de Supabase: "
                f"{error.response.text}"
            )

        except httpx.RequestError as error:
            raise SupabaseStorageError(
                f"Error de conexión al eliminar el archivo: {str(error)}"
            )
        

