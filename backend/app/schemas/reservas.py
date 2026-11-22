"""Validaciones para las operaciones de reservaciones."""

from datetime import date, datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ReservaCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")

    client_id: int = Field(gt=0)
    event_date: date
    event_type: Literal[
        "Boda", "XV años", "Bautizo", "Fiesta", "Otro"
    ]
    package: str = Field(min_length=1)


class AnticipoConfirmar(BaseModel):
    model_config = ConfigDict(extra="forbid")

    amount: Decimal = Field(
        gt=0,
        max_digits=9,
        decimal_places=2,
    )


class ProrrogaAnticipoCrear(BaseModel):
    nueva_fecha_limite: datetime
    motivo: str = Field(min_length=5, max_length=500)


class CancelacionReservaCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")

    motivo: str = Field(
        min_length=5,
        max_length=500,
        pattern=r".*\S.*",
    )