# MecaUPP

MecaUPP is split into three parts:

- `web/`: Next.js frontend for the workshop landing page and customer carnet pages.
- `api/app/`: FastAPI API backed by MongoDB for vehicle records and maintenance history.
- `printer_service/`: FastAPI service for sticker rendering and Windows printer output.

## Shared Project Data

Business-facing contact and branding data lives in `web/src/data/business.json`.

It is used by:

- the public website
- the carnet frontend
- the printer service QR/contact defaults

## Main Ports

- Web: `http://localhost`
- API: `http://localhost:8001`
- MongoDB: `mongodb://localhost:27017`

## Run The Main Stack

From the repo root:

```bash
docker compose up --build
```

That starts:

- `mongodb`
- `api`
- `web`

## Local Development

### Web

```bash
cd web
npm install
npm run dev
```

### API

```bash
cd api/app
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Required environment variables:

- `MONGODB_URL`
- `MONGODB_DB`
- `CARIMAGES_API_KEY` optional
- `CARIMAGES_BASE_URL` optional

### Printer Service

```bash
cd printer_service
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Then open:

- Interactive POS UI: `http://127.0.0.1:8000/pos`
- Swagger docs: `http://127.0.0.1:8000/docs`

Required environment variables:

- `CAR_DATA_API_BASE_URL`

Notes:

- The printer service uses `pywin32`, so printing is Windows-specific.
- Sticker QR URLs and contact defaults are derived from `web/src/data/business.json`.
- In Docker, the web app should use `http://api:8000` to reach the API over the compose network.

## Useful Paths

- Website homepage: `web/src/app/page.tsx`
- Carnet page: `web/src/app/carnet/[token]/page.tsx`
- API entrypoint: `api/app/main.py`
- Printer entrypoint: `printer_service/main.py`
- Cleanup audit snapshot: `PROJECT_AUDIT.md`
