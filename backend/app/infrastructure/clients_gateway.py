"""
Cliente HTTP para comunicación entre el servicio de reservas y el servicio de clientes.
Sigue el patrón de clientes de infraestructura de MicroserviciosSitic.
"""
import os
from typing import Any, Callable

import httpx
from fastapi import HTTPException


def build_remote_client_lookup(api_key: str | None = None) -> Callable[[int], dict[str, Any]]:
    """
    Construye la función de consulta HTTP hacia el servicio de clientes para verificar
    que el cliente exista antes de registrar una reserva.
    """

    def remote_lookup(client_id: int) -> dict[str, Any]:
        base_url = os.environ.get("CLIENTS_URL", "http://127.0.0.1:8011")
        token = api_key or os.environ.get("FOTO_API_KEY", "")
        try:
            response = httpx.get(
                f"{base_url}/api/internal/clientes/{client_id}",
                headers={"Authorization": f"Bearer {token}"},
                timeout=3,
            )
        except httpx.RequestError:
            raise HTTPException(
                status_code=503,
                detail="Servicio de clientes no disponible; intenta más tarde",
            )

        if response.status_code == 404:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")

        if response.status_code != 200:
            raise HTTPException(
                status_code=503,
                detail="No fue posible validar el cliente",
            )

        return response.json()

    return remote_lookup
