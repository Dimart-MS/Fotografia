"""Almacenamiento privado de comprobantes en Supabase Storage (REST)."""
from urllib.parse import quote
import httpx
from fastapi import HTTPException
from app.core.config import settings

class SupabaseComprobantesStorage:
    def __init__(self):
        self.base_url = settings.SUPABASE_URL.rstrip('/')
        self.key = settings.SUPABASE_SERVICE_ROLE_KEY
        self.bucket = settings.SUPABASE_BUCKET_COMPROBANTES
        if not self.base_url or not self.key or not self.bucket:
            raise RuntimeError('Configura SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y SUPABASE_BUCKET_COMPROBANTES.')

    def _headers(self):
        headers = {
            "apikey": self.key,
        }
        if not self.key.startswith("sb_secret_"):
            headers["Authorization"] = f"Bearer {self.key}"
        return headers

    def subir(self, ruta: str, contenido: bytes, tipo_mime: str):
        url = f'{self.base_url}/storage/v1/object/{quote(self.bucket, safe="")}/{quote(ruta, safe="/")}'
        try:
            with httpx.Client(timeout=30.0) as client:
                respuesta = client.post(url, content=contenido, headers={**self._headers(), 'Content-Type': tipo_mime, 'x-upsert': 'false'})
        except httpx.RequestError as exc:
            raise HTTPException(502, 'No se pudo conectar con el almacenamiento de comprobantes.') from exc
        if respuesta.status_code not in (200, 201):
            raise HTTPException(502, 'No se pudo almacenar el comprobante. Comprueba que el bucket privado exista.')

    def eliminar_objeto_fallido(self, ruta: str):
        """Compensación técnica SOLO para un objeto recién subido sin registro en BD.
        No se usa para eliminar comprobantes registrados ni historial.
        """
        url = f'{self.base_url}/storage/v1/object/{quote(self.bucket, safe="")}/{quote(ruta, safe="/")}'
        try:
            with httpx.Client(timeout=15.0) as client:
                respuesta = client.delete(url, headers=self._headers())
            return respuesta.status_code in (200, 204, 404)
        except httpx.RequestError:
            return False

    def url_firmada(self, ruta: str, segundos: int = 120):
        url = f'{self.base_url}/storage/v1/object/sign/{quote(self.bucket, safe="")}/{quote(ruta, safe="/")}'
        try:
            with httpx.Client(timeout=15.0) as client:
                respuesta = client.post(url, json={'expiresIn': segundos}, headers=self._headers())
        except httpx.RequestError as exc:
            raise HTTPException(502, 'No se pudo generar el acceso temporal al comprobante.') from exc
        if respuesta.status_code != 200:
            raise HTTPException(502, 'No se pudo generar el acceso temporal al comprobante.')
        firmado = respuesta.json().get('signedURL') or respuesta.json().get('signedUrl')
        if not firmado:
            raise HTTPException(502, 'Respuesta inválida del servicio de almacenamiento.')
        if firmado.startswith('http'):
            return firmado
        return f'{self.base_url}/storage/v1{firmado if firmado.startswith("/") else "/" + firmado}'
