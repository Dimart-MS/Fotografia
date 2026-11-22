"""
Esquemas de autenticación de Luz & Memoria.

Validaciones para registro, inicio de sesión
y respuestas de usuarios.
"""

import re
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserRegisterInput(BaseModel):
    """Datos para registrar una cuenta de cliente."""

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
    must_change_password: bool = False


class TokenResponse(BaseModel):
    """Respuesta al iniciar sesión."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ChangePasswordInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8, max_length=128)