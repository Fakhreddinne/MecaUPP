import json
import logging
import os
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Any
from urllib import error as urlerror
from urllib import parse as urlparse
from urllib import request as urlrequest

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, Response
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
PREVIEW_QR_TEXT = "http://www.meca-up.tn/carnet/preview"
QR_BASE_URL = "http://www.meca-up.tn/carnet"

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
    contact_line: str = Field(default="99 18 18 87  |  contact@meca-up.tn")
    address_line: str = Field(default="Av. Ain Meriam, Bizerte 7057, Tunisie")
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
    now = datetime.now()
    return now.isoformat(), now.strftime("%d/%m/%Y %H:%M")


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
        "maintenance_event": {
            "date_heure": iso_date_heure,
            "kilometrage": parse_int_field(data.kilometrage, "kilometrage"),
            "vehicule_marque": data.vehicule_marque,
            "vehicule_modele": data.vehicule_modele,
            "vehicule_annee": data.vehicule_annee,
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


ERROR_RESPONSES = {
    400: {"model": ErrorResponse},
    422: {"model": ErrorResponse},
    500: {"model": ErrorResponse},
    502: {"model": ErrorResponse},
    503: {"model": ErrorResponse},
}


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
        "render_endpoint": "/stickers/render",
        "print_endpoint": "/stickers/print",
        "print_qr_endpoint": "/stickers/print-qr",
        "required_env": [CAR_DATA_API_ENV_VAR],
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
