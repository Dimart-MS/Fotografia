"""Validaciones y respuestas del módulo de clientes."""

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class ClienteCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=3, max_length=150)
    email: EmailStr
    phone: str = Field(pattern=r"^\d{10}$")
    address: str = Field(min_length=5)

    @field_validator("name", "email", "phone", "address", mode="before")
    @classmethod
    def limpiar_texto(cls, valor):
        if isinstance(valor, str):
            return valor.strip()
        return valor


class ClienteActualizar(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=3, max_length=150)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, pattern=r"^\d{10}$")
    address: str | None = Field(default=None, min_length=5)

    @field_validator("name", "email", "phone", "address", mode="before")
    @classmethod
    def limpiar_texto(cls, valor):
        if valor is None:
            raise ValueError("El campo no puede ser nulo")
        if isinstance(valor, str):
            return valor.strip()
        return valor
