import json
import logging
import os
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any
from urllib import error as urlerror
from urllib import parse as urlparse
from urllib import request as urlrequest
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import HTMLResponse, JSONResponse, Response
from pydantic import BaseModel, ConfigDict, Field
from PIL import Image, ImageDraw, ImageFont, ImageWin, UnidentifiedImageError
from dotenv import load_dotenv
import qrcode
import win32con
import win32ui


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("mecaup.sticker")

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")
DEFAULT_LOGO_PATH = str(BASE_DIR / "logo.png")
DEFAULT_PRINTER_NAME = "VEVOR Y486"
PRINTER_DPI = 203
CAR_DATA_API_ENV_VAR = "CAR_DATA_API_BASE_URL"
SAVE_CAR_DATA_PATH = "/api/cars/save_car_data"
BUSINESS_CONFIG_PATH = BASE_DIR.parent / "web" / "src" / "data" / "business.json"

DEFAULT_BUSINESS_CONFIG = {
    "brand_name": "MecaUp Station",
    "brand_short_name": "MecaUp",
    "city": "Bizerte",
    "email": "contact@meca-up.tn",
    "phone_display": "+216 99 18 18 87",
    "phone_local_display": "99 18 18 87",
    "whatsapp_number": "21699181887",
    "address_line": "Av. Ain Meriam, Bizerte 7057, Tunisie",
    "address_site": "Av. Ain Meriam, a cote du lycee Gustave Eiffel, Bizerte, Tunisie.",
    "hours_display": "Lun-Sam 9:00-18:00",
    "public_base_url": "http://www.meca-up.tn",
    "maps_embed_url": "",
    "maps_directions_url": "",
    "display_timezone": "Africa/Tunis",
}


def load_business_config() -> dict[str, str]:
    if not BUSINESS_CONFIG_PATH.exists():
        logger.warning("Business config not found at %s, using defaults", BUSINESS_CONFIG_PATH)
        return dict(DEFAULT_BUSINESS_CONFIG)

    try:
        raw_payload = json.loads(BUSINESS_CONFIG_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        logger.warning("Failed to read business config from %s: %s", BUSINESS_CONFIG_PATH, exc)
        return dict(DEFAULT_BUSINESS_CONFIG)

    if not isinstance(raw_payload, dict):
        logger.warning("Business config at %s is not an object, using defaults", BUSINESS_CONFIG_PATH)
        return dict(DEFAULT_BUSINESS_CONFIG)

    business_config = dict(DEFAULT_BUSINESS_CONFIG)
    for key, value in raw_payload.items():
        if isinstance(value, str) and key in business_config:
            business_config[key] = value

    return business_config


BUSINESS_CONFIG = load_business_config()
CONTACT_LINE_DEFAULT = f'{BUSINESS_CONFIG["phone_local_display"]}  |  {BUSINESS_CONFIG["email"]}'
PUBLIC_BASE_URL = BUSINESS_CONFIG["public_base_url"].rstrip("/")
PREVIEW_QR_TEXT = f"{PUBLIC_BASE_URL}/carnet/preview"
QR_BASE_URL = f"{PUBLIC_BASE_URL}/carnet"

try:
    DISPLAY_TIMEZONE = ZoneInfo(BUSINESS_CONFIG["display_timezone"])
except ZoneInfoNotFoundError:
    logger.warning("Unknown timezone %s, falling back to UTC", BUSINESS_CONFIG["display_timezone"])
    DISPLAY_TIMEZONE = timezone.utc

# Sticker size: 50 x 80 mm at about 203 dpi
W, H = 380, 620

FIELD_CONSTRAINTS = {
    "date_heure": {"max_len": 20, "suffix": ""},
    "kilometrage": {"max_len": 8, "suffix": ""},
    "vehicule_modele": {"max_len": 30, "suffix": ".."},
    "matricule": {"max_len": 10, "suffix": ""},
    "huile_moteur": {"max_len": 30, "suffix": ".."},
    "viscosite": {"max_len": 6, "suffix": ""},
    "filtre_huile": {"max_len": 4, "suffix": ""},
    "filtre_air": {"max_len": 4, "suffix": ""},
    "filtre_habitacle": {"max_len": 4, "suffix": ""},
    "boite_pont": {"max_len": 4, "suffix": ""},
    "huile_boite": {"max_len": 30, "suffix": ".."},
    "autre": {"max_len": 30, "suffix": ".."},
    "prochain_km": {"max_len": 8, "suffix": ""},
}

STATIC_STICKER_DEFAULTS = {
    "logo_path": DEFAULT_LOGO_PATH,
    "prochaine_revision_label": "PROCHAINE REVISION A",
    "footer": "Merci de votre visite, a bientot !",
}


class AppError(Exception):
    def __init__(
        self,
        message: str,
        *,
        code: str,
        status_code: int,
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}


class StickerAssetError(AppError):
    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(
            message,
            code="sticker_asset_error",
            status_code=400,
            details=details,
        )


class StickerRenderError(AppError):
    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(
            message,
            code="sticker_render_error",
            status_code=400,
            details=details,
        )


class PrinterError(AppError):
    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(
            message,
            code="printer_error",
            status_code=503,
            details=details,
        )


class ConfigError(AppError):
    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(
            message,
            code="config_error",
            status_code=500,
            details=details,
        )


class PersistenceError(AppError):
    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(
            message,
            code="persistence_error",
            status_code=502,
            details=details,
        )


class StickerData(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    contact_line: str = Field(default=CONTACT_LINE_DEFAULT)
    address_line: str = Field(default=BUSINESS_CONFIG["address_line"])
    kilometrage: str = Field(default="120000")
    vehicule_marque: str = Field(default="Yamaha")
    vehicule_modele: str = Field(default="Tenere 700")
    vehicule_annee: str = Field(default="")
    matricule: str = Field(default="123TU4565")
    huile_moteur: str = Field(default="Total Quartz 9000")
    viscosite: str = Field(default="5W40")
    filtre_huile: str = Field(default="Oui")
    filtre_air: str = Field(default="Oui")
    filtre_habitacle: str = Field(default="Oui")
    boite_pont: str = Field(default="Non")
    huile_boite: str = Field(default="Aucun")
    autre: str = Field(default="Aucun")
    prochain_km: str = Field(default="130000")


class ResolvedStickerData(StickerData):
    logo_path: str = Field(default=DEFAULT_LOGO_PATH)
    prochaine_revision_label: str = Field(default="PROCHAINE REVISION A")
    footer: str = Field(default="Merci de votre visite, a bientot !")
    qr_text: str = Field(default=PREVIEW_QR_TEXT)
    date_heure: str = Field(default="24/02/2026 15:54")


class PrintRequest(BaseModel):
    printer_name: str = Field(default=DEFAULT_PRINTER_NAME)
    top_border_margin: int = Field(default=8, ge=0)
    data: StickerData = Field(default_factory=StickerData)


class QrOnlyPrintRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    record_id: str = Field(alias="_id", min_length=1)
    printer_name: str = Field(default=DEFAULT_PRINTER_NAME)
    top_border_margin: int = Field(default=8, ge=0)


class TruncationWarning(BaseModel):
    field: str
    original_length: int
    applied_max_len: int
    truncated: bool = True


class StickerSize(BaseModel):
    width: int
    height: int


class ErrorBody(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class ErrorResponse(BaseModel):
    error: ErrorBody


class PrintStickerResponse(BaseModel):
    status: str
    printer_name: str
    size_px: StickerSize
    warnings: list[TruncationWarning]
    saved_record_id: str
    qr_text: str


class PrintQrResponse(BaseModel):
    status: str
    printer_name: str
    size_px: StickerSize
    qr_text: str
    saved_record_id: str


def load_font(size: int, bold: bool = False):
    if bold:
        candidates = ["arialbd.ttf", "Arial Bold.ttf", "DejaVuSans-Bold.ttf"]
    else:
        candidates = ["arial.ttf", "Arial.ttf", "DejaVuSans.ttf"]

    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except Exception:
            pass
    return ImageFont.load_default()


def center_text(draw: ImageDraw.ImageDraw, y: int, text: str, font, fill: str = "black"):
    draw.text((W // 2, y), text, font=font, fill=fill, anchor="mm")


def mm_to_px(mm: float, dpi: int = PRINTER_DPI) -> int:
    return round(mm / 25.4 * dpi)


def fit_text(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    if draw.textbbox((0, 0), text, font=font)[2] <= max_width:
        return [text]

    def split_long_token(token: str) -> list[str]:
        parts = []
        current = ""
        for char in token:
            test = current + char
            if current and draw.textbbox((0, 0), test, font=font)[2] > max_width:
                parts.append(current)
                current = char
            else:
                current = test
        if current:
            parts.append(current)
        return parts

    words = text.split()
    lines = []
    current = ""
    for word in words:
        if draw.textbbox((0, 0), word, font=font)[2] > max_width:
            if current:
                lines.append(current)
                current = ""
            lines.extend(split_long_token(word))
            continue

        test = word if not current else current + " " + word
        if draw.textbbox((0, 0), test, font=font)[2] <= max_width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def build_error_response(status_code: int, code: str, message: str, details: dict[str, Any] | None = None):
    payload = ErrorResponse(error=ErrorBody(code=code, message=message, details=details or {}))
    return JSONResponse(status_code=status_code, content=payload.model_dump())


def truncate_value(value: str, max_len: int, suffix: str) -> str:
    if len(value) <= max_len:
        return value
    if not suffix:
        return value[:max_len]
    visible_len = max(0, max_len - len(suffix))
    return value[:visible_len] + suffix


def resolve_sticker_data(data: StickerData, *, qr_text: str, date_heure: str) -> ResolvedStickerData:
    vehicle_model = data.vehicule_modele.strip()
    vehicle_year = data.vehicule_annee.strip()
    vehicle_display = " ".join(part for part in [vehicle_model, vehicle_year] if part)
    resolved_payload = {
        **STATIC_STICKER_DEFAULTS,
        **data.model_dump(),
        "vehicule_modele": vehicle_display,
        "qr_text": qr_text,
        "date_heure": date_heure,
    }

    return ResolvedStickerData(**resolved_payload)


def sanitize_sticker_data(data: ResolvedStickerData) -> tuple[ResolvedStickerData, list[TruncationWarning]]:
    sanitized = data.model_dump()
    warnings: list[TruncationWarning] = []

    for field_name, rule in FIELD_CONSTRAINTS.items():
        value = sanitized.get(field_name)
        if not isinstance(value, str):
            continue
        max_len = rule["max_len"]
        if len(value) <= max_len:
            continue

        sanitized[field_name] = truncate_value(value, max_len, rule["suffix"])
        warnings.append(
            TruncationWarning(
                field=field_name,
                original_length=len(value),
                applied_max_len=max_len,
            )
        )

    return ResolvedStickerData(**sanitized), warnings


def current_timestamps() -> tuple[str, str]:
    now_utc = datetime.now(timezone.utc)
    display_date = now_utc.astimezone(DISPLAY_TIMEZONE).strftime("%d/%m/%Y %H:%M")
    return now_utc.isoformat(), display_date


def parse_int_field(value: str, field_name: str) -> int:
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise PersistenceError(
            "Failed to save car data before printing",
            details={
                "field": field_name,
                "reason": "expected an integer-compatible value",
            },
        ) from exc


def get_save_car_data_url() -> str:
    base_url = os.getenv(CAR_DATA_API_ENV_VAR, "").strip()
    if not base_url:
        raise ConfigError(
            f"Missing required environment variable {CAR_DATA_API_ENV_VAR}",
            details={"env_var": CAR_DATA_API_ENV_VAR},
        )

    parsed = urlparse.urlparse(base_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ConfigError(
            f"Environment variable {CAR_DATA_API_ENV_VAR} must be a valid http(s) URL",
            details={"env_var": CAR_DATA_API_ENV_VAR, "value": base_url},
        )

    return urlparse.urljoin(base_url.rstrip("/") + "/", SAVE_CAR_DATA_PATH.lstrip("/"))


def save_car_data(data: StickerData, iso_date_heure: str) -> str:
    save_url = get_save_car_data_url()
    payload = {
        "matricule": data.matricule,
        "vehicule_marque": data.vehicule_marque,
        "vehicule_modele": data.vehicule_modele,
        "vehicule_annee": parse_int_field(data.vehicule_annee, "vehicule_annee"),
        "maintenance_event": {
            "date_heure": iso_date_heure,
            "kilometrage": parse_int_field(data.kilometrage, "kilometrage"),
            "huile_moteur": data.huile_moteur,
            "viscosite": data.viscosite,
            "filtre_huile": data.filtre_huile,
            "filtre_air": data.filtre_air,
            "filtre_habitacle": data.filtre_habitacle,
            "boite_pont": data.boite_pont,
            "huile_boite": data.huile_boite,
            "autre": data.autre,
            "prochain_km": parse_int_field(data.prochain_km, "prochain_km"),
        },
    }

    body = json.dumps(payload).encode("utf-8")
    request = urlrequest.Request(
        save_url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urlrequest.urlopen(request, timeout=10) as response:
            status_code = response.getcode()
            response_bytes = response.read()
    except urlerror.HTTPError as exc:
        raise PersistenceError(
            "Failed to save car data before printing",
            details={"endpoint": save_url, "status_code": exc.code},
        ) from exc
    except urlerror.URLError as exc:
        raise PersistenceError(
            "Failed to save car data before printing",
            details={"endpoint": save_url, "reason": str(exc.reason)},
        ) from exc

    if status_code != 200:
        raise PersistenceError(
            "Failed to save car data before printing",
            details={"endpoint": save_url, "status_code": status_code},
        )

    try:
        response_data = json.loads(response_bytes.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise PersistenceError(
            "Failed to save car data before printing",
            details={"endpoint": save_url, "reason": "invalid JSON response"},
        ) from exc

    record_id = response_data.get("_id")
    if not record_id:
        raise PersistenceError(
            "Failed to save car data before printing",
            details={"endpoint": save_url, "reason": "missing _id in response"},
        )

    return str(record_id)


def build_qr_text(record_id: str) -> str:
    return f"{QR_BASE_URL}/{record_id}"


def render_qr_only(record_id: str) -> tuple[Image.Image, str]:
    qr_text = build_qr_text(record_id)
    qr_size = W
    qr_canvas_height = qr_size

    img = Image.new("RGB", (W, qr_canvas_height), "white")
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((3, 3, W - 4, qr_canvas_height - 4), radius=12, outline="black", width=1)

    qr_img = qrcode.make(qr_text).convert("RGB").resize((qr_size, qr_size))
    qr_x = 0
    qr_y = 0
    img.paste(qr_img, (qr_x, qr_y))

    return img, qr_text


def render_sticker(data: ResolvedStickerData) -> Image.Image:
    try:
        img = Image.new("RGB", (W, H), "white")
        draw = ImageDraw.Draw(img)

        font_contact = load_font(13, False)
        font_service = load_font(28, True)
        font_label = load_font(15, True)
        font_value_bold = load_font(17, True)
        font_footer = load_font(15, False)
        font_km_big = load_font(24, True)
        font_km_small = load_font(15, True)

        draw.rounded_rectangle((3, 3, W - 4, H - 4), radius=12, outline="black", width=1)

        qr_size = mm_to_px(12)
        qr_x = W - 18 - qr_size
        qr_y = 10
        qr_img = qrcode.make(data.qr_text).convert("RGB").resize((qr_size, qr_size))
        img.paste(qr_img, (qr_x, qr_y))

        logo_area_left = 20
        logo_area_right = qr_x - 16
        logo_area_width = logo_area_right - logo_area_left
        logo_top = 14
        logo_max_w = min(logo_area_width, 150)
        logo_max_h = 48

        logo_path = Path(data.logo_path)
        if not logo_path.is_absolute():
            logo_path = BASE_DIR / logo_path
        if not logo_path.exists():
            raise StickerAssetError("Logo not found", {"logo_path": str(logo_path)})

        try:
            logo = Image.open(logo_path).convert("RGBA")
        except UnidentifiedImageError as exc:
            raise StickerAssetError("Logo file is not a valid image", {"logo_path": str(logo_path)}) from exc

        ratio = min(logo_max_w / logo.width, logo_max_h / logo.height)
        logo = logo.resize((int(logo.width * ratio), int(logo.height * ratio)))
        logo_x = logo_area_left
        logo_y = logo_top + (logo_max_h - logo.height) // 2
        img.paste(logo, (logo_x, logo_y), logo)

        text_left_x = logo_area_left
        draw.text((text_left_x, 78), data.contact_line, font=font_contact, fill="black")
        draw.text((text_left_x, 95), data.address_line, font=font_contact, fill="black")

        center_text(draw, 128, "Service", font_service)

        left_x = 18
        mid_x = 148
        right_x = 305
        y = 158
        line_gap = 29
        third_col_width = W - right_x - 18

        def row_2col(label: str, value: str, value_font=font_value_bold):
            nonlocal y
            draw.text((left_x, y), label, font=font_label, fill="black")
            draw.text((mid_x, y), value, font=value_font, fill="black")
            y += line_gap

        def row_3col(label: str, value: str, extra: str, value_font=font_value_bold, extra_font=font_value_bold):
            nonlocal y
            draw.text((left_x, y), label, font=font_label, fill="black")
            draw.text((mid_x, y), value, font=value_font, fill="black")
            extra_lines = fit_text(draw, extra, extra_font, third_col_width)
            for i, line in enumerate(extra_lines):
                draw.text((right_x, y + i * 18), line, font=extra_font, fill="black")
            y += max(line_gap, 18 * len(extra_lines))

        row_2col("Date heure", data.date_heure)
        row_3col("Kilometrage", data.kilometrage, "Km")

        draw.text((left_x, y), "Vehicule", font=font_label, fill="black")
        draw.text((mid_x, y), data.vehicule_marque, font=font_value_bold, fill="black")
        matricule_lines = fit_text(draw, data.matricule, font_value_bold, third_col_width)
        for i, line in enumerate(matricule_lines):
            draw.text((right_x, y + i * 18), line, font=font_value_bold, fill="black")
        y += max(24, 18 * len(matricule_lines))
        draw.text((mid_x, y), data.vehicule_modele, font=font_value_bold, fill="black")
        y += 30

        draw.text((left_x, y), "Huile moteur", font=font_label, fill="black")
        huile_lines = fit_text(draw, data.huile_moteur, font_value_bold, right_x - mid_x - 10)
        for i, line in enumerate(huile_lines[:2]):
            draw.text((mid_x, y + i * 20), line, font=font_value_bold, fill="black")
        draw.text((right_x, y), data.viscosite, font=font_value_bold, fill="black")
        y += max(30, 20 * len(huile_lines)) + 6

        row_2col("Filtre a huile", data.filtre_huile)
        row_2col("Filtre a air", data.filtre_air)
        row_2col("F. habitacle", data.filtre_habitacle)
        row_2col("Boite / Pont", data.boite_pont)
        row_3col("Huile", data.huile_boite, "Aucun")
        row_2col("Autre", data.autre)

        label_y = H - 92
        center_text(draw, label_y, data.prochaine_revision_label, font_label)

        bar_y1 = H - 72
        bar_y2 = H - 38
        draw.rectangle((18, bar_y1, W - 18, bar_y2), fill="black")

        draw.text((W // 2, (bar_y1 + bar_y2) // 2), data.prochain_km, font=font_km_big, fill="white", anchor="mm")
        draw.text((W - 46, (bar_y1 + bar_y2) // 2), "Km", font=font_km_small, fill="white", anchor="mm")

        center_text(draw, H - 18, data.footer, font_footer)
        return img
    except StickerAssetError:
        raise
    except Exception as exc:
        raise StickerRenderError("Failed to render sticker", {"reason": str(exc)}) from exc


def image_to_png_bytes(image: Image.Image) -> bytes:
    buffer = BytesIO()
    image.save(buffer, format="PNG")
    return buffer.getvalue()


def print_sticker(image: Image.Image, printer_name: str, top_border_margin: int = 8) -> None:
    pdc = win32ui.CreateDC()
    try:
        try:
            pdc.CreatePrinterDC(printer_name)
        except Exception as exc:
            raise PrinterError("Printer is unavailable", {"printer_name": printer_name}) from exc

        pdc.StartDoc("MecaUP Sticker")
        pdc.StartPage()

        image_width, image_height = image.size
        printable_h = pdc.GetDeviceCaps(win32con.VERTRES)
        offset_x = pdc.GetDeviceCaps(win32con.PHYSICALOFFSETX)
        offset_y = pdc.GetDeviceCaps(win32con.PHYSICALOFFSETY)

        draw_x1 = offset_x
        draw_y1 = offset_y + max(0, (printable_h - image_height) // 2) + top_border_margin
        draw_x2 = draw_x1 + image_width
        draw_y2 = draw_y1 + image_height

        dib = ImageWin.Dib(image)
        dib.draw(pdc.GetHandleOutput(), (draw_x1, draw_y1, draw_x2, draw_y2))

        pdc.EndPage()
        pdc.EndDoc()
    except PrinterError:
        raise
    except Exception as exc:
        raise PrinterError(
            "Failed to print sticker",
            {"printer_name": printer_name, "top_border_margin": top_border_margin},
        ) from exc
    finally:
        pdc.DeleteDC()


app = FastAPI(
    title="MecaUP Sticker API",
    version="1.0.0",
    description="Render and print service stickers. Use /docs for Swagger UI.",
)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    logger.warning("%s on %s: %s", exc.code, request.url.path, exc.message)
    return build_error_response(exc.status_code, exc.code, exc.message, exc.details)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning("Validation error on %s", request.url.path)
    return build_error_response(422, "validation_error", "Invalid request body", {"errors": exc.errors()})


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception("Unexpected error on %s", request.url.path)
    return build_error_response(500, "internal_server_error", "An unexpected error occurred")


@app.get("/health")
def healthcheck():
    return {"status": "ok"}


@app.get("/pos", response_class=HTMLResponse)
def pos_interface():
    return HTMLResponse(content=build_pos_html())


ERROR_RESPONSES = {
    400: {"model": ErrorResponse},
    422: {"model": ErrorResponse},
    500: {"model": ErrorResponse},
    502: {"model": ErrorResponse},
    503: {"model": ErrorResponse},
}

POS_DEMO_DATA = {
    "contact_line": CONTACT_LINE_DEFAULT,
    "address_line": BUSINESS_CONFIG["address_line"],
    "kilometrage": "182450",
    "vehicule_marque": "Peugeot",
    "vehicule_modele": "208 Allure",
    "vehicule_annee": "2021",
    "matricule": "231TU1984",
    "huile_moteur": "Total Quartz 9000",
    "viscosite": "5W40",
    "filtre_huile": "Oui",
    "filtre_air": "Oui",
    "filtre_habitacle": "Non",
    "boite_pont": "Non",
    "huile_boite": "Aucun",
    "autre": "Controle freins",
    "prochain_km": "192450",
}


def build_pos_html() -> str:
    demo_payload = json.dumps(POS_DEMO_DATA)
    default_printer_name = json.dumps(DEFAULT_PRINTER_NAME)
    default_margin = 8
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MecaUP Sticker POS</title>
  <style>
    :root {{
      color-scheme: light;
      --bg: #f3efe7;
      --panel: #fffaf2;
      --panel-strong: #ffffff;
      --line: #d8cdbd;
      --ink: #201a14;
      --muted: #6f6255;
      --accent: #c96b2c;
      --accent-dark: #8a4317;
      --ok: #1e7a52;
      --error: #b33a3a;
      --shadow: 0 18px 50px rgba(57, 37, 22, 0.12);
      --radius: 22px;
    }}

    * {{ box-sizing: border-box; }}

    body {{
      margin: 0;
      min-height: 100vh;
      font-family: "Trebuchet MS", "Segoe UI", sans-serif;
      color: var(--ink);
      background:
        radial-gradient(circle at top left, rgba(201, 107, 44, 0.18), transparent 28%),
        radial-gradient(circle at bottom right, rgba(91, 132, 119, 0.16), transparent 22%),
        linear-gradient(180deg, #f8f2e8 0%, var(--bg) 100%);
    }}

    .shell {{
      width: min(1360px, calc(100% - 32px));
      margin: 24px auto;
      display: grid;
      grid-template-columns: minmax(340px, 460px) minmax(420px, 1fr);
      gap: 24px;
      align-items: start;
    }}

    .panel {{
      background: rgba(255, 250, 242, 0.92);
      border: 1px solid rgba(216, 205, 189, 0.95);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      backdrop-filter: blur(10px);
    }}

    .form-panel {{
      padding: 24px;
      position: sticky;
      top: 24px;
    }}

    .preview-panel {{
      padding: 24px;
    }}

    .eyebrow {{
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      border-radius: 999px;
      background: #f3dfcf;
      color: var(--accent-dark);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }}

    h1 {{
      margin: 14px 0 8px;
      font-size: clamp(28px, 5vw, 42px);
      line-height: 1;
    }}

    .subtitle {{
      margin: 0 0 24px;
      color: var(--muted);
      line-height: 1.5;
    }}

    .controls {{
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 18px;
    }}

    button {{
      border: 0;
      border-radius: 14px;
      padding: 12px 16px;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
      transition: transform 120ms ease, opacity 120ms ease, background 120ms ease;
    }}

    button:hover {{
      transform: translateY(-1px);
    }}

    button:disabled {{
      opacity: 0.6;
      cursor: wait;
      transform: none;
    }}

    .primary {{
      background: var(--accent);
      color: white;
    }}

    .secondary {{
      background: #eadfce;
      color: var(--ink);
    }}

    .ghost {{
      background: #f6efe5;
      color: var(--muted);
    }}

    .grid {{
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }}

    .field {{
      display: flex;
      flex-direction: column;
      gap: 6px;
    }}

    .field.full {{
      grid-column: 1 / -1;
    }}

    label {{
      font-size: 13px;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }}

    input {{
      width: 100%;
      border: 1px solid var(--line);
      background: var(--panel-strong);
      color: var(--ink);
      border-radius: 14px;
      padding: 13px 14px;
      font: inherit;
    }}

    input:focus {{
      outline: 2px solid rgba(201, 107, 44, 0.18);
      border-color: var(--accent);
    }}

    .toolbar {{
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin: 20px 0 0;
    }}

    .status {{
      margin-top: 18px;
      min-height: 48px;
      border-radius: 16px;
      padding: 14px 16px;
      background: #f8f1e7;
      color: var(--muted);
      border: 1px solid var(--line);
      line-height: 1.45;
      white-space: pre-wrap;
    }}

    .status.ok {{
      color: var(--ok);
      border-color: rgba(30, 122, 82, 0.25);
      background: rgba(30, 122, 82, 0.08);
    }}

    .status.error {{
      color: var(--error);
      border-color: rgba(179, 58, 58, 0.25);
      background: rgba(179, 58, 58, 0.08);
    }}

    .preview-head {{
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      margin-bottom: 18px;
    }}

    .preview-box {{
      min-height: 640px;
      border-radius: 26px;
      border: 1px dashed var(--line);
      background:
        linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(247, 239, 227, 0.9)),
        repeating-linear-gradient(
          -45deg,
          rgba(201, 107, 44, 0.04),
          rgba(201, 107, 44, 0.04) 12px,
          transparent 12px,
          transparent 24px
        );
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      padding: 20px;
    }}

    .preview-box img {{
      width: min(100%, 420px);
      height: auto;
      object-fit: contain;
      border-radius: 18px;
      box-shadow: 0 18px 40px rgba(32, 26, 20, 0.18);
      background: white;
    }}

    .placeholder {{
      max-width: 360px;
      text-align: center;
      color: var(--muted);
      line-height: 1.6;
    }}

    .inline-config {{
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      margin-top: 22px;
      padding-top: 22px;
      border-top: 1px solid var(--line);
    }}

    @media (max-width: 1080px) {{
      .shell {{
        grid-template-columns: 1fr;
      }}

      .form-panel {{
        position: static;
      }}

      .preview-box {{
        min-height: 420px;
      }}
    }}

    @media (max-width: 640px) {{
      .shell {{
        width: min(100% - 20px, 1360px);
        margin: 10px auto 20px;
      }}

      .form-panel,
      .preview-panel {{
        padding: 18px;
        border-radius: 18px;
      }}

      .grid,
      .inline-config {{
        grid-template-columns: 1fr;
      }}

      .preview-box {{
        min-height: 320px;
        padding: 12px;
      }}
    }}
  </style>
</head>
<body>
  <main class="shell">
    <section class="panel form-panel">
      <div class="eyebrow">Printer Service POS</div>
      <h1>Sticker counter</h1>
      <p class="subtitle">Fill the ticket, preview the sticker, then print it from the same screen.</p>

      <div class="controls">
        <button class="secondary" type="button" id="demoButton">Prefill Demo Data</button>
        <button class="ghost" type="button" id="clearButton">Clear Form</button>
      </div>

      <form id="posForm">
        <div class="grid">
          <div class="field full">
            <label for="contact_line">Contact line</label>
            <input id="contact_line" name="contact_line" />
          </div>

          <div class="field full">
            <label for="address_line">Address line</label>
            <input id="address_line" name="address_line" />
          </div>

          <div class="field">
            <label for="kilometrage">Kilometrage</label>
            <input id="kilometrage" name="kilometrage" inputmode="numeric" />
          </div>

          <div class="field">
            <label for="prochain_km">Next revision km</label>
            <input id="prochain_km" name="prochain_km" inputmode="numeric" />
          </div>

          <div class="field">
            <label for="vehicule_marque">Vehicle brand</label>
            <input id="vehicule_marque" name="vehicule_marque" />
          </div>

          <div class="field">
            <label for="vehicule_modele">Vehicle model</label>
            <input id="vehicule_modele" name="vehicule_modele" />
          </div>

          <div class="field">
            <label for="vehicule_annee">Vehicle year</label>
            <input id="vehicule_annee" name="vehicule_annee" inputmode="numeric" />
          </div>

          <div class="field">
            <label for="matricule">Plate</label>
            <input id="matricule" name="matricule" />
          </div>

          <div class="field">
            <label for="huile_moteur">Engine oil</label>
            <input id="huile_moteur" name="huile_moteur" />
          </div>

          <div class="field">
            <label for="viscosite">Viscosity</label>
            <input id="viscosite" name="viscosite" />
          </div>

          <div class="field">
            <label for="filtre_huile">Oil filter</label>
            <input id="filtre_huile" name="filtre_huile" />
          </div>

          <div class="field">
            <label for="filtre_air">Air filter</label>
            <input id="filtre_air" name="filtre_air" />
          </div>

          <div class="field">
            <label for="filtre_habitacle">Cabin filter</label>
            <input id="filtre_habitacle" name="filtre_habitacle" />
          </div>

          <div class="field">
            <label for="boite_pont">Gearbox / differential</label>
            <input id="boite_pont" name="boite_pont" />
          </div>

          <div class="field">
            <label for="huile_boite">Gearbox oil</label>
            <input id="huile_boite" name="huile_boite" />
          </div>

          <div class="field">
            <label for="autre">Other work</label>
            <input id="autre" name="autre" />
          </div>
        </div>

        <div class="inline-config">
          <div class="field">
            <label for="printer_name">Printer name</label>
            <input id="printer_name" name="printer_name" />
          </div>

          <div class="field">
            <label for="top_border_margin">Top border margin</label>
            <input id="top_border_margin" name="top_border_margin" inputmode="numeric" />
          </div>
        </div>

        <div class="toolbar">
          <button class="secondary" type="button" id="previewButton">Update Preview</button>
          <button class="primary" type="submit" id="printButton">Print Sticker</button>
        </div>
      </form>

      <div class="status" id="statusBox">Ready. Load sample data or type your own values.</div>
    </section>

    <section class="panel preview-panel">
      <div class="preview-head">
        <div>
          <div class="eyebrow">Live Preview</div>
          <p class="subtitle">The preview uses the same render endpoint as the printer workflow.</p>
        </div>
      </div>

      <div class="preview-box" id="previewBox">
        <div class="placeholder">
          Preview will appear here after you click <strong>Update Preview</strong>.
        </div>
      </div>
    </section>
  </main>

  <script>
    const demoData = {demo_payload};
    const defaultPrinterName = {default_printer_name};
    const defaultMargin = "{default_margin}";
    const form = document.getElementById("posForm");
    const statusBox = document.getElementById("statusBox");
    const previewBox = document.getElementById("previewBox");
    const previewButton = document.getElementById("previewButton");
    const printButton = document.getElementById("printButton");
    const demoButton = document.getElementById("demoButton");
    const clearButton = document.getElementById("clearButton");

    const fieldNames = [
      "contact_line",
      "address_line",
      "kilometrage",
      "vehicule_marque",
      "vehicule_modele",
      "vehicule_annee",
      "matricule",
      "huile_moteur",
      "viscosite",
      "filtre_huile",
      "filtre_air",
      "filtre_habitacle",
      "boite_pont",
      "huile_boite",
      "autre",
      "prochain_km",
    ];

    function setStatus(message, kind = "") {{
      statusBox.className = kind ? `status ${{kind}}` : "status";
      statusBox.textContent = message;
    }}

    function setBusy(isBusy) {{
      previewButton.disabled = isBusy;
      printButton.disabled = isBusy;
      demoButton.disabled = isBusy;
      clearButton.disabled = isBusy;
    }}

    function writeValues(values) {{
      fieldNames.forEach((name) => {{
        const input = form.elements.namedItem(name);
        if (input) input.value = values[name] ?? "";
      }});
    }}

    function resetFormFields() {{
      writeValues({{}});
      form.elements.namedItem("printer_name").value = defaultPrinterName;
      form.elements.namedItem("top_border_margin").value = defaultMargin;
    }}

    function getStickerData() {{
      const payload = {{}};
      fieldNames.forEach((name) => {{
        payload[name] = String(form.elements.namedItem(name).value || "").trim();
      }});
      return payload;
    }}

    function getPrintPayload() {{
      return {{
        printer_name: String(form.elements.namedItem("printer_name").value || "").trim() || defaultPrinterName,
        top_border_margin: Number.parseInt(form.elements.namedItem("top_border_margin").value || defaultMargin, 10),
        data: getStickerData(),
      }};
    }}

    function validateBeforePrint(payload) {{
      const numericFields = ["vehicule_annee", "kilometrage", "prochain_km"];
      for (const field of numericFields) {{
        if (!payload.data[field] || Number.isNaN(Number.parseInt(payload.data[field], 10))) {{
          throw new Error(`Field "${{field}}" must be filled with a number before printing.`);
        }}
      }}

      if (Number.isNaN(payload.top_border_margin)) {{
        throw new Error('Top border margin must be a number.');
      }}
    }}

    async function updatePreview() {{
      setBusy(true);
      setStatus("Rendering preview...");

      try {{
        const response = await fetch("/stickers/render", {{
          method: "POST",
          headers: {{ "Content-Type": "application/json" }},
          body: JSON.stringify(getStickerData()),
        }});

        if (!response.ok) {{
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error?.message || "Preview failed.");
        }}

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        previewBox.innerHTML = "";
        const image = document.createElement("img");
        image.src = imageUrl;
        image.alt = "Sticker preview";
        previewBox.appendChild(image);
        setStatus("Preview updated.", "ok");
      }} catch (error) {{
        setStatus(error.message || "Preview failed.", "error");
      }} finally {{
        setBusy(false);
      }}
    }}

    async function printSticker(event) {{
      event.preventDefault();
      const payload = getPrintPayload();

      try {{
        validateBeforePrint(payload);
      }} catch (error) {{
        setStatus(error.message, "error");
        return;
      }}

      setBusy(true);
      setStatus("Sending sticker to the printer...");

      try {{
        const response = await fetch("/stickers/print", {{
          method: "POST",
          headers: {{ "Content-Type": "application/json" }},
          body: JSON.stringify(payload),
        }});

        const responseBody = await response.json().catch(() => null);
        if (!response.ok) {{
          throw new Error(responseBody?.error?.message || "Print failed.");
        }}

        const recordId = responseBody?.saved_record_id || "unknown";
        setStatus(`Printed successfully. Saved record: ${{recordId}}`, "ok");
        updatePreview();
      }} catch (error) {{
        setStatus(error.message || "Print failed.", "error");
      }} finally {{
        setBusy(false);
      }}
    }}

    demoButton.addEventListener("click", () => {{
      writeValues(demoData);
      setStatus("Demo data loaded. You can edit or clear it whenever you want.");
    }});

    clearButton.addEventListener("click", () => {{
      resetFormFields();
      previewBox.innerHTML = `
        <div class="placeholder">
          Preview will appear here after you click <strong>Update Preview</strong>.
        </div>
      `;
      setStatus("Form cleared.");
    }});

    previewButton.addEventListener("click", updatePreview);
    form.addEventListener("submit", printSticker);

    resetFormFields();
  </script>
</body>
</html>
"""


@app.post(
    "/stickers/render",
    response_class=Response,
    responses={**ERROR_RESPONSES, 200: {"content": {"image/png": {}}}},
)
def render_sticker_endpoint(data: StickerData):
    _, display_date = current_timestamps()
    resolved_data = resolve_sticker_data(data, qr_text=PREVIEW_QR_TEXT, date_heure=display_date)
    sanitized_data, _warnings = sanitize_sticker_data(resolved_data)
    image = render_sticker(sanitized_data)
    return Response(content=image_to_png_bytes(image), media_type="image/png")


@app.post("/stickers/print", response_model=PrintStickerResponse, responses=ERROR_RESPONSES)
def print_sticker_endpoint(request: PrintRequest):
    iso_date, display_date = current_timestamps()
    saved_record_id = save_car_data(request.data, iso_date)
    qr_text = build_qr_text(saved_record_id)
    resolved_data = resolve_sticker_data(request.data, qr_text=qr_text, date_heure=display_date)
    sanitized_data, warnings = sanitize_sticker_data(resolved_data)
    image = render_sticker(sanitized_data)
    print_sticker(image, request.printer_name, request.top_border_margin)
    return PrintStickerResponse(
        status="printed",
        printer_name=request.printer_name,
        size_px=StickerSize(width=W, height=H),
        warnings=warnings,
        saved_record_id=saved_record_id,
        qr_text=qr_text,
    )


@app.post("/stickers/print-qr", response_model=PrintQrResponse, responses=ERROR_RESPONSES)
def print_qr_only_endpoint(request: QrOnlyPrintRequest):
    image, qr_text = render_qr_only(request.record_id)
    print_sticker(image, request.printer_name, request.top_border_margin)
    return PrintQrResponse(
        status="printed",
        printer_name=request.printer_name,
        size_px=StickerSize(width=image.width, height=image.height),
        qr_text=qr_text,
        saved_record_id=request.record_id,
    )


@app.get("/")
def root():
    return {
        "message": "MecaUP Sticker API",
        "docs": "/docs",
        "pos_interface": "/pos",
        "render_endpoint": "/stickers/render",
        "print_endpoint": "/stickers/print",
        "print_qr_endpoint": "/stickers/print-qr",
        "required_env": [CAR_DATA_API_ENV_VAR],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
