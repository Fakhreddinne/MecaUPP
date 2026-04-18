from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


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

    matricule: str = Field(min_length=1)
    vehicule_marque: str = Field(min_length=1)
    vehicule_modele: str = Field(min_length=1)
    vehicule_annee: int = Field(ge=1886)
    maintenance_event: MaintenanceEventPayload


class CarOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(alias="_id")
    matricule: str
    image_path: str | None = None
    vehicule_marque: str | None = None
    vehicule_modele: str | None = None
    vehicule_annee: int | None = None
    maintenance: list[MaintenanceEventPayload] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
