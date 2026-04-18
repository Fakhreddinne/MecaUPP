from __future__ import annotations

from datetime import datetime
from typing import Any, TypedDict


class ClientData(TypedDict, total=False):
    name: str
    phone: str


class VehicleData(TypedDict, total=False):
    immat: str
    make: str
    model: str
    generation: str
    year: int
    image_url: str


class ServiceData(TypedDict, total=False):
    date: str | datetime
    km: int
    km_prochain: int
    next_km: int
    date_prochaine: str
    next_date: str
    interval_km: int
    title: str
    details: dict[str, Any]


class CarnetData(TypedDict):
    client: ClientData
    vehicle: VehicleData
    entretiens: list[ServiceData]
