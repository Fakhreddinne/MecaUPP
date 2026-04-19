from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, model_validator


class CarType(str, Enum):
    TUN = "TUN"
    RS = "RS"
    REM = "REM"
    AA = "AA"
    MOTO = "MOTO"
    ES = "ES"
    TRAC = "TRAC"


class MaintenanceEventPayload(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    date_heure: datetime
    kilometrage: int = Field(ge=0)
    huile_moteur: str = Field(min_length=1)
    viscosite: str = Field(min_length=1)
    filtre_huile: str = Field(min_length=1)
    filtre_air: str = Field(min_length=1)
    filtre_habitacle: str = Field(min_length=1)
    boite_pont: str = Field(min_length=1)
    huile_boite: str = Field(min_length=1)
    autre: str = Field(min_length=1)
    prochain_km: int = Field(ge=0)


class MaintenanceEventCreate(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    type: CarType
    matricule: str | None = None
    plate_left: str | None = None
    plate_right: str | None = None
    vehicule_marque: str = Field(min_length=1)
    vehicule_modele: str = Field(min_length=1)
    vehicule_annee: int = Field(ge=1886)
    maintenance_event: MaintenanceEventPayload

    @model_validator(mode="after")
    def validate_plate_shape(self) -> "MaintenanceEventCreate":
        if self.type == CarType.TUN:
            if not self.plate_left or not self.plate_right:
                raise ValueError("TUN plates require plate_left and plate_right")
            if self.matricule:
                raise ValueError("TUN plates must not provide matricule")
            if not self.plate_left.isdigit() or not self.plate_right.isdigit():
                raise ValueError("TUN plate_left and plate_right must contain only digits")
            return self

        if self.plate_left or self.plate_right:
            raise ValueError("Non-TUN plates must not provide plate_left or plate_right")
        if not self.matricule:
            raise ValueError("Non-TUN plates require matricule")
        return self


class CarOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(alias="_id")
    type: CarType
    matricule: str
    plate_left: str | None = None
    plate_right: str | None = None
    image_path: str | None = None
    vehicule_marque: str | None = None
    vehicule_modele: str | None = None
    vehicule_annee: int | None = None
    maintenance: list[MaintenanceEventPayload] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
