"""Validaciones para las operaciones de reservaciones."""

from datetime import date
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
    package: Literal["foto", "video", "combinado"]


class AnticipoConfirmar(BaseModel):
    model_config = ConfigDict(extra="forbid")

    amount: Decimal = Field(
        gt=0,
        max_digits=9,
        decimal_places=2,
    )
