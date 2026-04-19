from __future__ import annotations

import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

from config import settings
from db import close_client, get_database, ping_mongodb
from schemas import CarOut, CarType, MaintenanceEventCreate

logger = logging.getLogger(__name__)

app = FastAPI(title="MecaUp API", version="1.0.0")

STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
CARS_STATIC_DIR = os.path.join(STATIC_DIR, "cars")
if os.path.isdir(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.on_event("startup")
def startup_event() -> None:
    ping_mongodb()
    logger.info("Connected to MongoDB database '%s'", settings.mongodb_db)


@app.on_event("shutdown")
def shutdown_event() -> None:
    close_client()


def ensure_static_dirs() -> None:
    Path(CARS_STATIC_DIR).mkdir(parents=True, exist_ok=True)


def serialize_car_document(document: Dict[str, Any]) -> Dict[str, Any]:
    serialized = dict(document)
    serialized["_id"] = str(serialized["_id"])
    serialized["image_path"] = normalize_image_path(serialized.get("image_path"))
    return serialized


def build_tun_matricule(plate_left: str, plate_right: str) -> str:
    return f"{plate_left} TUN {plate_right}"


def normalize_image_path(path: str | None) -> str | None:
    if not path:
        return None
    return path if path.startswith("/") else f"/{path}"


def extract_signed_image_url(payload: Any) -> str | None:
    if isinstance(payload, str):
        stripped = payload.strip()
        if stripped.startswith("http://") or stripped.startswith("https://"):
            return stripped
        return None

    if isinstance(payload, dict):
        for key in ("signed_url", "url", "image_url", "src"):
            value = payload.get(key)
            if isinstance(value, str) and value.startswith(("http://", "https://")):
                return value

        data = payload.get("data")
        if data is not None:
            return extract_signed_image_url(data)

    return None


def parse_json_response(data: bytes) -> Any:
    try:
        return json.loads(data.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return data.decode("utf-8", errors="ignore")


def fetch_signed_car_image_url(make: str, model: str, year: int, image_format: str = "png") -> str | None:
    if not settings.carimages_api_key:
        return None

    query = urlencode(
        {
            "api_key": settings.carimages_api_key,
            "make": make,
            "model": model,
            "year": year,
            "format": image_format,
        }
    )
    endpoint = f"{settings.carimages_base_url.rstrip('/')}/api/v1/signed-url?{query}"
    logger.debug("Fetching car image for %s %s %s", make, model, year)

    request = Request(endpoint, headers={"Accept": "application/json"})
    with urlopen(request, timeout=15) as response:
        payload = parse_json_response(response.read())
    return extract_signed_image_url(payload)


def guess_extension(content_type: str | None, url: str) -> str:
    if content_type:
        lower = content_type.lower()
        if "png" in lower:
            return ".png"
        if "webp" in lower:
            return ".webp"
        if "jpeg" in lower or "jpg" in lower:
            return ".jpg"
    lowered_url = url.lower()
    for extension in (".png", ".webp", ".jpg", ".jpeg"):
        if extension in lowered_url:
            return ".jpg" if extension == ".jpeg" else extension
    return ".png"


def download_car_image(car_id: ObjectId, make: str, model: str, year: int) -> str | None:
    ensure_static_dirs()

    try:
        signed_url = None
        for image_format in ("png", "webp", "jpg"):
            signed_url = fetch_signed_car_image_url(make=make, model=model, year=year, image_format=image_format)
            if signed_url:
                break
        if not signed_url:
            return None

        request = Request(signed_url, headers={"Accept": "image/png,image/webp,image/jpeg;q=0.8,*/*;q=0.5"})
        with urlopen(request, timeout=30) as response:
            image_bytes = response.read()
            content_type = response.headers.get("Content-Type")
        if not image_bytes:
            return None

        extension = guess_extension(content_type, signed_url)
        for existing_extension in (".png", ".webp", ".jpg"):
            existing_file = Path(CARS_STATIC_DIR) / f"{car_id}{existing_extension}"
            if existing_file.exists() and existing_extension != extension:
                existing_file.unlink()

        filename = f"{car_id}{extension}"
        image_path = Path(CARS_STATIC_DIR) / filename
        image_path.write_bytes(image_bytes)
        return f"/static/cars/{filename}"
    except (HTTPError, URLError, TimeoutError, OSError, ValueError) as exc:
        logger.warning(
            "Unable to fetch car image for %s %s %s: %s",
            make,
            model,
            year,
            exc,
        )
        return None


def ensure_car_image(
    cars_collection: Any,
    saved_car: Dict[str, Any],
    vehicle_details: Dict[str, Any],
) -> Dict[str, Any]:
    existing_image_path = normalize_image_path(saved_car.get("image_path"))
    if existing_image_path:
        saved_car["image_path"] = existing_image_path
        return saved_car

    downloaded_image_path = download_car_image(
        car_id=saved_car["_id"],
        make=vehicle_details["vehicule_marque"],
        model=vehicle_details["vehicule_modele"],
        year=vehicle_details["vehicule_annee"],
    )
    if not downloaded_image_path:
        return saved_car

    cars_collection.update_one(
        {"_id": saved_car["_id"]},
        {"$set": {"image_path": downloaded_image_path}},
    )
    refreshed_car = cars_collection.find_one({"_id": saved_car["_id"]})
    if refreshed_car is not None:
        return refreshed_car
    saved_car["image_path"] = downloaded_image_path
    return saved_car


@app.get("/api/cars/{car_id}", response_model=CarOut)
def get_car_by_id(car_id: str) -> Dict[str, Any]:
    car_id = car_id.strip()
    if not car_id:
        raise HTTPException(status_code=400, detail="Car id cannot be blank")

    try:
        object_id = ObjectId(car_id)
    except (InvalidId, TypeError):
        raise HTTPException(status_code=400, detail="Invalid car id") from None

    database = get_database()
    saved_car = database["cars"].find_one({"_id": object_id})
    if saved_car is None:
        raise HTTPException(status_code=404, detail="Car not found")

    return serialize_car_document(saved_car)


@app.post("/api/cars/save_car_data", response_model=CarOut)
def save_car_data(payload: MaintenanceEventCreate) -> Dict[str, Any]:
    database = get_database()
    cars_collection = database["cars"]
    now = datetime.now(timezone.utc)
    maintenance_event = payload.maintenance_event.model_dump(mode="python")
    vehicle_details = {
        "vehicule_marque": payload.vehicule_marque,
        "vehicule_modele": payload.vehicule_modele,
        "vehicule_annee": payload.vehicule_annee,
    }
    car_type = payload.type

    if car_type == CarType.TUN:
        assert payload.plate_left is not None
        assert payload.plate_right is not None
        plate_fields = {
            "plate_left": payload.plate_left,
            "plate_right": payload.plate_right,
        }
        plate_document = {
            "matricule": build_tun_matricule(payload.plate_left, payload.plate_right),
            **plate_fields,
        }
        existing_car = cars_collection.find_one(
            {
                "type": car_type.value,
                "plate_left": payload.plate_left,
                "plate_right": payload.plate_right,
            }
        )
    else:
        assert payload.matricule is not None
        plate_document = {
            "matricule": payload.matricule,
        }
        existing_car = cars_collection.find_one(
            {
                "type": car_type.value,
                "matricule": payload.matricule,
            }
        )

    if existing_car is None:
        insert_result = cars_collection.insert_one(
            {
                "type": car_type.value,
                **plate_document,
                "image_path": None,
                **vehicle_details,
                "maintenance": [maintenance_event],
                "created_at": now,
                "updated_at": now,
            }
        )
        saved_car = cars_collection.find_one({"_id": insert_result.inserted_id})
    else:
        update_document: Dict[str, Any] = {
            "$push": {"maintenance": maintenance_event},
            "$set": {
                "type": car_type.value,
                **plate_document,
                **vehicle_details,
                "updated_at": now,
            },
        }
        if car_type != CarType.TUN:
            update_document["$unset"] = {"plate_left": "", "plate_right": ""}
        cars_collection.update_one({"_id": existing_car["_id"]}, update_document)
        saved_car = cars_collection.find_one({"_id": existing_car["_id"]})

    if saved_car is None:
        raise HTTPException(status_code=500, detail="Failed to save car data")

    saved_car = ensure_car_image(cars_collection, saved_car, vehicle_details)
    return serialize_car_document(saved_car)


@app.get("/health")
def healthcheck() -> Dict[str, str]:
    ping_mongodb()
    return {"status": "ok", "database": settings.mongodb_db}
