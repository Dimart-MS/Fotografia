"""Validaciones de entrada para el catálogo de paquetes."""

import re
from pydantic import BaseModel, ConfigDict, Field, field_validator


class PaqueteCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")

    clave: str = Field(min_length=2, max_length=40)
    nombre: str = Field(min_length=3, max_length=120)
    descripcion: str | None = Field(default=None, max_length=500)
    precio_centavos: int = Field(gt=0)

    @field_validator("clave", "nombre", "descripcion", mode="before")
    @classmethod
    def limpiar_texto(cls, valor):
        if isinstance(valor, str):
            valor = valor.strip()
            return valor or None
        return valor

    @field_validator("clave")
    @classmethod
    def validar_clave(cls, valor):
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", valor):
            raise ValueError(
                "La clave debe usar minúsculas, números y guiones. "
                "Ejemplo: sesion-premium"
            )
        return valor


class PaqueteActualizar(BaseModel):
    model_config = ConfigDict(extra="forbid")

    nombre: str | None = Field(default=None, min_length=3, max_length=120)
    descripcion: str | None = Field(default=None, max_length=500)
    precio_centavos: int | None = Field(default=None, gt=0)

    @field_validator("nombre", "descripcion", mode="before")
    @classmethod
    def limpiar_texto(cls, valor):
        if isinstance(valor, str):
            valor = valor.strip()
            return valor or None
        return valor