from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

class VehicleCreate(BaseModel):
    label: str
    plate: str | None = None
    owner_name: str | None = None
    owner_phone: str | None = None

class VehicleOut(BaseModel):
    token: str
    label: str
    plate: str | None = None
    owner_name: str | None = None
    owner_phone: str | None = None

class ServiceCreate(BaseModel):
    token: str
    date: date
    km: int
    title: str
    details: str | None = None

    # simple règle: prochain entretien à +10000 km et +6 mois (tu pourras changer)
    next_km: int | None = None
    next_date: date | None = None

class CarnetOut(BaseModel):
    vehicle: dict
    next: dict
    history: list


class MaintenanceEventPayload(BaseModel):
    date_heure: datetime
    kilometrage: int
    vehicule_marque: str
    vehicule_modele: str
    vehicule_annee: int
    huile_moteur: str
    viscosite: str
    filtre_huile: str
    filtre_air: str
    filtre_habitacle: str
    boite_pont: str
    huile_boite: str
    autre: str
    prochain_km: int


class MaintenanceEventCreate(BaseModel):
    matricule: str
    maintenance_event: MaintenanceEventPayload


class CarOut(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(alias="_id")
    matricule: str
    image_path: str | None = None
    maintenance: list[MaintenanceEventPayload]
    created_at: datetime
    updated_at: datetime
