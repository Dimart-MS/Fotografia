"""Validaciones del módulo de ventas."""
from pydantic import BaseModel, ConfigDict, Field, model_validator

class ConceptoVenta(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id_paquete: int | None = Field(default=None, gt=0)
    descripcion: str | None = Field(default=None, max_length=250)
    cantidad: int = Field(default=1, gt=0, le=1000)
    precio_unitario_centavos: int | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validar(self):
        if self.id_paquete is None and (not self.descripcion or not self.descripcion.strip()):
            raise ValueError("El concepto libre requiere descripción")
        if self.id_paquete is None and self.precio_unitario_centavos is None:
            raise ValueError("El concepto libre requiere precio")
        if self.id_paquete is not None and self.precio_unitario_centavos is not None:
            raise ValueError("El precio del paquete se obtiene del catálogo")
        return self

class VentaCrear(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id_cliente: int = Field(gt=0)
    id_reservacion: int | None = Field(default=None, gt=0)
    observaciones: str | None = Field(default=None, max_length=1000)
    conceptos: list[ConceptoVenta] = Field(default_factory=list, max_length=50)

    @model_validator(mode="after")
    def validar(self):
        if not self.conceptos and self.id_reservacion is None:
            raise ValueError("Agrega al menos un concepto")
        return self
