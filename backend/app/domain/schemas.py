"""
Esquemas Pydantic de entrada, validación y respuesta para clientes y reservas.
Basado en la capa de dominio de MicroserviciosSitic (app/domain/schemas.py).
"""
import re
from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

EventTypeLiteral = Literal["Boda", "XV años", "Bautizo", "Fiesta"]
PackageLiteral = Literal["foto", "video", "combinado"]


class ClientInput(BaseModel):
    """Datos requeridos para registrar un nuevo cliente en el estudio (HU 06)."""

    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")

    name: str = Field(
        min_length=3,
        max_length=100,
        description="Nombre completo del cliente",
    )
    phone: str = Field(
        pattern=r"^\d{10}$",
        description="Teléfono de contacto a 10 dígitos",
    )
    email: str = Field(
        max_length=160,
        description="Correo electrónico único del cliente",
    )
    address: str = Field(
        min_length=5,
        max_length=250,
        description="Domicilio para entrega de material fotográfico",
    )

    @field_validator("email")
    @classmethod
    def validate_and_normalize_email(cls, value: str) -> str:
        normalized = value.lower()
        if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", normalized):
            raise ValueError("Correo electrónico inválido")
        return normalized


class BookingInput(BaseModel):
    """Datos requeridos para registrar una solicitud de reserva (HU 02)."""

    model_config = ConfigDict(extra="forbid")

    client_id: int = Field(gt=0, description="Identificador del cliente registrado")
    event_date: date = Field(description="Fecha programada del evento")
    event_type: EventTypeLiteral = Field(description="Categoría del evento social")
    package: PackageLiteral = Field(description="Clave del paquete contratado")


class PaymentInput(BaseModel):
    """Datos para registrar el anticipo y confirmar una fecha (HU 02)."""

    model_config = ConfigDict(extra="forbid")

    amount: Decimal = Field(
        gt=0,
        max_digits=9,
        decimal_places=2,
        description="Monto del anticipo verificado en MXN (entre 50% y 100% del paquete)",
    )

class ClientUpdateInput(ClientInput):
    """Datos requeridos para actualizar un cliente existente."""

    pass

class UserRegisterInput(BaseModel):
    """Datos necesarios para registrar una cuenta de cliente."""
    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
    )

    name: str = Field(min_length=3, max_length=100)
    phone: str = Field(pattern=r"^\d{10}$")
    email: str = Field(max_length=160)
    address: str = Field(min_length=5, max_length=250)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        normalized = value.lower()
        if not re.fullmatch(
            r"[^\s@]+@[^\s@]+\.[^\s@]+",
            normalized,
        ):
            raise ValueError("Correo electrónico inválido")
        return normalized


class UserLoginInput(BaseModel):
    """Credenciales para iniciar sesión."""
    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
    )
    email: str = Field(max_length=160)
    password: str
    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.lower()


class UserResponse(BaseModel):
    """Información pública de una cuenta."""
    id: int
    client_id: int | None
    email: str
    role: Literal["Administrador", "Cliente"]
    is_active: bool


class TokenResponse(BaseModel):
    """Respuesta al iniciar sesión."""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
