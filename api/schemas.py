from datetime import date
from pydantic import BaseModel

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