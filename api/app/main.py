from __future__ import annotations

import os
import re
import html
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles


# =========================
# APP
# =========================
app = FastAPI(title="MecaUp API", version="1.0.0")

# Static
# Put your assets here:
# app/static/
#   mecaup_logo.png
#   cars/renault_clio_3.png
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
if os.path.isdir(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


# =========================
# HELPERS
# =========================
def normalize_key(s: str) -> str:
    s = (s or "").strip().lower()
    s = re.sub(r"[^a-z0-9]+", "_", s)
    return s.strip("_")


def fmt_dt(s: str | datetime | None) -> str:
    if s is None:
        return "-"
    if isinstance(s, datetime):
        return s.strftime("%Y-%m-%d %H:%M")
    try:
        dt = datetime.fromisoformat(str(s).replace("Z", "+00:00"))
        return dt.strftime("%Y-%m-%d %H:%M")
    except Exception:
        return str(s)


def tunisian_plate_svg(immatriculation: str) -> str:
    raw = (immatriculation or "").strip()
    nums = re.findall(r"\d+", raw)
    left = nums[0] if len(nums) >= 1 else "000"
    right = nums[1] if len(nums) >= 2 else "0000"
    left = left[:3].rjust(3, "0")
    right = right[:4].rjust(4, "0")

    return f"""
<svg viewBox="0 0 820 220" width="520" height="140"
     aria-label="Plaque tunisienne" role="img"
     style="filter: drop-shadow(0 12px 24px rgba(0,0,0,.18));">

  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#f4f6f8"/>
    </linearGradient>
    <linearGradient id="rg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#c9151b"/>
      <stop offset="1" stop-color="#a80f14"/>
    </linearGradient>
  </defs>

  <!-- Outer border -->
  <rect x="10" y="10" rx="26" ry="26"
        width="800" height="200"
        fill="url(#g)"
        stroke="#111"
        stroke-width="10"/>

  <!-- Inner -->
  <rect x="30" y="30" rx="18" ry="18"
        width="760" height="160"
        fill="transparent"
        stroke="rgba(0,0,0,.12)"
        stroke-width="4"/>



  <!-- Left numbers -->
  <text x="180" y="140"
        text-anchor="middle"
        font-size="92"
        font-weight="900"
        fill="#111"
        style="letter-spacing:4px;">
        {html.escape(left)}
  </text>

  <!-- RIGHT numbers -->
  <text x="620" y="140"
        text-anchor="middle"
        font-size="92"
        font-weight="900"
        fill="#111"
        style="letter-spacing:6px;">
        {html.escape(right)}
  </text>

  <!-- CENTER TN + تونس -->
  <g transform="translate(480,110)">
    <text x="-100" y="-10"
          text-anchor="middle"
          font-size="28"
          font-weight="900"
          fill="#111">
          TN
    </text>

    <text x="-100" y="40"
          text-anchor="middle"
          font-size="44"
          font-weight="900"
          fill="#111"
          direction="rtl">
          تونس
    </text>
  </g>

</svg>
""".strip()


def car_image_url(vehicle: Dict[str, Any]) -> Optional[str]:
    make = normalize_key(vehicle.get("make", ""))
    model = normalize_key(vehicle.get("model", ""))
    generation = normalize_key(str(vehicle.get("generation", "")))
    year = str(vehicle.get("year") or "").strip()

    mapping = {
        "renault_clio_3": "/static/cars/renault_clio_3.png",
        "renault_clio_iii": "/static/cars/renault_clio_3.png",
    }

    key_candidates = [
        f"{make}_{model}_{generation}".strip("_"),
        f"{make}_{model}_{year}".strip("_"),
        f"{make}_{model}".strip("_"),
    ]

    for k in key_candidates:
        if k in mapping:
            return mapping[k]

    url = (vehicle.get("image_url") or "").strip()
    if url:
        return url

    return None


def compute_next_service(entretiens: List[Dict[str, Any]]) -> Tuple[Optional[int], Optional[str]]:
    """
    Returns (next_km, next_date_str)
    Strategy:
      - If last entretien has km_prochain -> use it.
      - Else if last entretien has km and has interval_km -> km+interval_km
      - Else None.
    """
    if not entretiens:
        return (None, None)

    # Pick most recent by date string (best effort)
    def sort_key(e: Dict[str, Any]) -> str:
        return str(e.get("date") or "")

    last = sorted(entretiens, key=sort_key, reverse=True)[0]
    next_km = last.get("km_prochain") or last.get("next_km")
    next_date = last.get("date_prochaine") or last.get("next_date")

    if next_km is None:
        km = last.get("km")
        interval_km = last.get("interval_km")
        if isinstance(km, int) and isinstance(interval_km, int):
            next_km = km + interval_km

    # normalize
    if isinstance(next_km, str) and next_km.isdigit():
        next_km = int(next_km)

    next_date_str = fmt_dt(next_date) if next_date else None
    return (next_km if isinstance(next_km, int) else None, next_date_str)


# =========================
# DATA ACCESS (replace with your DB)
# =========================
def get_carnet_by_token(token: str) -> Dict[str, Any]:
    if not token or len(token) < 6:
        raise HTTPException(status_code=404, detail="Token invalide")

    return {
        "client": {"name": "Client", "phone": "+216 XX XXX XXX"},
        "vehicle": {"immat": "123 TU 4567", "make": "Renault", "model": "Clio", "generation": "3", "year": 2008},
        "entretiens": [
            {
                "date": "2026-02-20 15:33",
                "km": 120000,
                "km_prochain": 130000,  # <= used for "entretien prochain"
                "title": "Vidange + filtres",
                "details": {
                    "huile_moteur": "Total Quartz 9000",
                    "viscosite": "5W40",
                    "filtre_huile": "Oui",
                    "filtre_air": "Oui",
                    "filtre_habitacle": "Oui",
                },
            },
            {
                "date": "2025-10-05 10:20",
                "km": 112000,
                "title": "Freinage",
                "details": {"plaquettes_av": "Remplacées", "liquide_frein": "Purge"},
            },
        ],
    }


# =========================
# PREMIUM PAGE
# =========================
@app.get("/carnet/{token}", response_class=HTMLResponse)
def carnet_page(token: str, request: Request) -> HTMLResponse:
    carnet = get_carnet_by_token(token)
    client = carnet.get("client", {}) or {}
    vehicle = carnet.get("vehicle", {}) or {}
    entretiens: List[Dict[str, Any]] = carnet.get("entretiens", []) or []

    immat = str(vehicle.get("immat") or "-")
    plate_svg = tunisian_plate_svg(immat)
    img_url = car_image_url(vehicle)

    make = html.escape(str(vehicle.get("make") or ""))
    model = html.escape(str(vehicle.get("model") or ""))
    gen = html.escape(str(vehicle.get("generation") or ""))
    year = html.escape(str(vehicle.get("year") or ""))

    client_name = html.escape(str(client.get("name") or ""))
    client_phone = html.escape(str(client.get("phone") or ""))

    def sort_key(e: Dict[str, Any]) -> str:
        return str(e.get("date") or "")

    entretiens_sorted = sorted(entretiens, key=sort_key, reverse=True)

    next_km, next_date_str = compute_next_service(entretiens_sorted)
    next_km_txt = f"{next_km} km" if next_km is not None else "Non défini"
    next_date_txt = next_date_str or "Non définie"

    cards_html = []
    for e in entretiens_sorted:
        title = html.escape(str(e.get("title") or "Entretien"))
        km = html.escape(str(e.get("km") or "-"))
        date = html.escape(fmt_dt(e.get("date")))
        details = e.get("details") or {}
        rows = []
        for k, v in details.items():
            rows.append(
                f"""
                <div class="kv">
                  <div class="k">{html.escape(str(k).replace("_"," ").title())}</div>
                  <div class="v">{html.escape(str(v))}</div>
                </div>
                """.strip()
            )
        details_html = "\n".join(rows) if rows else "<div class='muted'>Aucun détail.</div>"

        cards_html.append(
            f"""
            <div class="card">
              <div class="card-top">
                <div>
                  <div class="card-title">{title}</div>
                  <div class="card-sub">{date}</div>
                </div>
                <div class="pill">{km} km</div>
              </div>
              <div class="grid">
                {details_html}
              </div>
            </div>
            """.strip()
        )

    entretiens_block = "\n".join(cards_html) if cards_html else "<div class='empty'>Aucun entretien enregistré.</div>"

    # Logo
    logo_src = "/static/mecaup_logo.png"  # put file in app/static/mecaup_logo.png

    if img_url:
        car_img_html = f"""
        <div class="car-wrap">
          <img class="car-img" src="{html.escape(img_url)}" alt="Véhicule" loading="lazy"/>
          <div class="shine"></div>
        </div>
        """.strip()
    else:
        car_img_html = """
        <div class="car-wrap car-empty">
          <div class="car-missing">
            Image véhicule non configurée
            <div class="hint">Ajoute une image dans <b>/static/cars/</b> ou renseigne <b>vehicle.image_url</b></div>
          </div>
        </div>
        """.strip()

    html_page = f"""
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Carnet d'entretien • {immat}</title>
  <style>
    :root {{
      --bg1:#0b0f14;
      --bg2:#0e1622;
      --card:#0f1724cc;
      --stroke:rgba(255,255,255,.08);
      --text:rgba(255,255,255,.92);
      --muted:rgba(255,255,255,.62);
      --accent:#7cf6c5;
      --accent2:#66a3ff;
    }}
    *{{box-sizing:border-box}}
    body {{
      margin:0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
      color:var(--text);
      background:
        radial-gradient(1200px 600px at 20% 10%, rgba(124,246,197,.18), transparent 60%),
        radial-gradient(900px 500px at 80% 20%, rgba(102,163,255,.18), transparent 55%),
        linear-gradient(180deg, var(--bg1), var(--bg2));
      min-height:100vh;
    }}
    .wrap {{
      max-width: 1100px;
      margin: 0 auto;
      padding: 22px 18px 80px;
    }}
    .header {{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:14px;
      margin-bottom: 14px;
    }}
    .brand {{
      display:flex; align-items:center; gap:10px;
    }}
    .brand img {{
      height: 34px;
      width:auto;
      filter: drop-shadow(0 10px 18px rgba(0,0,0,.28));
    }}
    .brand .tag {{
      color: rgba(255,255,255,.60);
      font-weight: 800;
      letter-spacing: .2px;
      font-size: 13px;
    }}
    .btn {{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      gap:10px;
      padding: 12px 14px;
      border-radius: 999px;
      border: 1px solid rgba(102,163,255,.35);
      background: rgba(102,163,255,.12);
      color: rgba(255,255,255,.92);
      font-weight: 900;
      text-decoration:none;
      transition: transform .15s ease, background .15s ease;
      user-select:none;
      white-space:nowrap;
    }}
    .btn:hover {{
      transform: translateY(-1px);
      background: rgba(102,163,255,.18);
    }}
    .btn:active {{
      transform: translateY(0px);
    }}

    .top {{
      display:flex;
      gap:18px;
      align-items:stretch;
      justify-content:space-between;
      flex-wrap:wrap;
    }}
    .hero {{
      flex: 1 1 520px;
      background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02));
      border: 1px solid var(--stroke);
      border-radius: 22px;
      padding: 18px;
      position:relative;
      overflow:hidden;
    }}
    .hero::before {{
      content:"";
      position:absolute; inset:-120px -120px auto auto;
      width:320px; height:320px;
      background: radial-gradient(circle, rgba(124,246,197,.28), transparent 60%);
      filter: blur(8px);
      transform: rotate(18deg);
    }}
    .hero-row {{
      display:flex;
      gap:18px;
      align-items:center;
      justify-content:space-between;
      flex-wrap:wrap;
      position:relative;
      z-index:2;
    }}
    .meta {{
      margin-top:14px;
      display:flex;
      gap:10px;
      flex-wrap:wrap;
      position:relative;
      z-index:2;
    }}
    .chip {{
      border:1px solid var(--stroke);
      background: rgba(255,255,255,.04);
      padding:10px 12px;
      border-radius:14px;
      color:var(--muted);
      font-weight:600;
      backdrop-filter: blur(10px);
    }}
    .chip b{{ color:var(--text); font-weight:900; }}

    .car-wrap {{
      width: 360px;
      max-width: 100%;
      border-radius: 22px;
      border:1px solid var(--stroke);
      background: rgba(255,255,255,.03);
      overflow:hidden;
      position:relative;
      align-self:stretch;
      min-height: 190px;
    }}
    .car-img {{
      width:100%;
      height:100%;
      object-fit: cover;
      display:block;
      transform: translateY(10px) scale(1.02);
      animation: floatIn .85s ease-out both, drift 2s ease-in-out infinite;
      filter: saturate(1.08) contrast(1.04);
    }}
    .shine {{
      position:absolute; inset:0;
      background: linear-gradient(120deg, transparent 35%, rgba(255,255,255,.10), transparent 65%);
      transform: translateX(-60%);
      animation: shine 3.6s ease-in-out infinite;
      pointer-events:none;
    }}

    .summary {{
      margin-top: 14px;
      display:flex;
      gap: 14px;
      flex-wrap: wrap;
    }}
    .summary .box {{
      flex: 1 1 260px;
      background: rgba(0,0,0,.16);
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 18px;
      padding: 14px;
    }}
    .summary .title {{
      color: rgba(255,255,255,.62);
      font-weight: 900;
      font-size: 12px;
      letter-spacing: .25px;
      margin-bottom: 8px;
      text-transform: uppercase;
    }}
    .summary .value {{
      font-weight: 950;
      font-size: 18px;
    }}
    .summary .sub {{
      margin-top: 6px;
      color: rgba(255,255,255,.55);
      font-weight: 800;
      font-size: 13px;
    }}

    .section-title {{
      margin: 26px 2px 14px;
      display:flex;
      align-items:baseline;
      justify-content:space-between;
      gap:12px;
    }}
    .section-title h2 {{
      margin:0;
      font-size: 18px;
      letter-spacing:.2px;
    }}
    .section-title .count {{
      color: var(--muted);
      font-weight:800;
      font-size: 13px;
    }}
    .cards {{
      display:grid;
      grid-template-columns: repeat(12, 1fr);
      gap: 14px;
    }}
    .card {{
      grid-column: span 6;
      background: var(--card);
      border: 1px solid var(--stroke);
      border-radius: 18px;
      padding: 14px;
      overflow:hidden;
      position:relative;
      backdrop-filter: blur(12px);
    }}
    @media (max-width: 900px) {{
      .card {{ grid-column: span 12; }}
    }}
    .card-top {{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap: 10px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255,255,255,.06);
      margin-bottom: 10px;
    }}
    .card-title {{
      font-size: 16px;
      font-weight: 950;
      letter-spacing:.2px;
    }}
    .card-sub {{
      margin-top: 4px;
      color: var(--muted);
      font-weight: 850;
      font-size: 13px;
    }}
    .pill {{
      border:1px solid rgba(124,246,197,.30);
      background: rgba(124,246,197,.10);
      color: rgba(124,246,197,.95);
      padding: 8px 10px;
      border-radius: 999px;
      font-weight: 950;
      font-size: 13px;
      white-space:nowrap;
    }}
    .grid {{
      display:grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }}
    @media (max-width: 520px) {{
      .grid {{ grid-template-columns: 1fr; }}
    }}
    .kv {{
      border: 1px solid rgba(255,255,255,.06);
      background: rgba(0,0,0,.14);
      border-radius: 14px;
      padding: 10px 10px;
    }}
    .k {{
      color: rgba(255,255,255,.55);
      font-weight: 900;
      font-size: 12px;
      margin-bottom: 6px;
      letter-spacing:.2px;
    }}
    .v {{
      font-weight: 950;
      font-size: 14px;
      color: rgba(255,255,255,.92);
      overflow-wrap:anywhere;
    }}
    .empty {{
      padding: 18px;
      border-radius: 18px;
      border: 1px dashed rgba(255,255,255,.14);
      color: var(--muted);
      background: rgba(255,255,255,.03);
    }}
    .footer {{
      margin-top: 18px;
      color: rgba(255,255,255,.42);
      font-weight: 800;
      font-size: 12px;
    }}

    @keyframes floatIn {{
      from {{ opacity:0; transform: translateY(16px) scale(.98); }}
      to   {{ opacity:1; transform: translateY(10px) scale(1.02); }}
    }}
    @keyframes drift {{
      0%,100% {{ transform: translateY(10px) scale(1.02); }}
      50%     {{ transform: translateY(4px)  scale(1.02); }}
    }}
    @keyframes shine {{
      0%   {{ transform: translateX(-60%); opacity:.0; }}
      20%  {{ opacity:.9; }}
      60%  {{ opacity:.5; }}
      100% {{ transform: translateX(60%); opacity:.0; }}
    }}
  </style>
</head>
<body>
  <div class="wrap">

    <div class="header">
      <div class="brand">
        <img src="{logo_src}" alt="MecaUp"/>
        <div class="tag">Carnet d'entretien</div>
      </div>

      <!-- Button goes to your website contact section -->
      <a class="btn" href="http://localhost:3000/#contact" target="_blank" rel="noopener">
        Prendre rendez-vous
      </a>
    </div>

    <div class="top">
      <div class="hero">
        <div class="hero-row">
          <div class="plate">{plate_svg}</div>
          {car_img_html}
        </div>

        <div class="meta">
          <div class="chip"><b>Véhicule</b> {make} {model} {("• " + gen) if gen else ""} {("• " + year) if year else ""}</div>
          <div class="chip"><b>Client</b> {client_name}</div>
          <div class="chip"><b>Tél</b> {client_phone}</div>
        </div>

        <div class="summary">
          <div class="box">
            <div class="title">Entretien prochain</div>
            <div class="value">{html.escape(next_km_txt)}</div>
            <div class="sub">Date: {html.escape(next_date_txt)}</div>
          </div>
          <div class="box">
            <div class="title">Accès rapide</div>
            <div class="sub">
              Utilisez le bouton “Prendre rendez-vous” pour nous contacter.<br/>
              Vous pouvez aussi enregistrer cette page dans vos favoris.
            </div>
          </div>
        </div>

      </div>
    </div>

    <div class="section-title">
      <h2>Historique des entretiens</h2>
      <div class="count">{len(entretiens_sorted)} enregistrements</div>
    </div>

    <div class="cards">
      {entretiens_block}
    </div>

    <div class="footer">
      MecaUp • Accès via QR code / token • Version locale
    </div>

  </div>
</body>
</html>
""".strip()

    return HTMLResponse(content=html_page)


# Optional: API JSON
@app.get("/api/carnet/{token}")
def carnet_api(token: str) -> Dict[str, Any]:
    return get_carnet_by_token(token)