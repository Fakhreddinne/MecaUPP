import { business } from "@/lib/business";
import { localeConfig, type Locale } from "@/lib/i18n/config";

export type MaintenanceEvent = {
  date_heure: string;
  kilometrage: number;
  huile_moteur: string;
  viscosite: string;
  filtre_huile: string;
  filtre_air: string;
  filtre_habitacle: string;
  boite_pont: string;
  huile_boite: string;
  autre: string;
  prochain_km: number;
};

export type CarType = "TUN" | "RS" | "REM" | "AA" | "MOTO" | "ES" | "TRAC";

export type Car = {
  _id: string;
  type: CarType;
  matricule: string;
  plate_left?: string | null;
  plate_right?: string | null;
  image_path?: string | null;
  vehicule_marque?: string | null;
  vehicule_modele?: string | null;
  vehicule_annee?: number | null;
  maintenance: MaintenanceEvent[];
  created_at: string;
  updated_at: string;
};

function normalizeDateValue(value?: string): string | null {
  if (!value) {
    return null;
  }

  return value.includes("T") ? value : value.replace(" ", "T");
}

function toTimestamp(value?: string): number {
  const normalized = normalizeDateValue(value);
  if (!normalized) {
    return Number.NEGATIVE_INFINITY;
  }

  const parsed = Date.parse(normalized);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}

export function formatDate(value: string | undefined, locale: Locale): string {
  const normalized = normalizeDateValue(value);
  if (!normalized) {
    return "-";
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return value || "-";
  }

  return new Intl.DateTimeFormat(localeConfig.locales[locale].formatLocale, {
    timeZone: business.display_timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

export function formatKilometers(value: number | null | undefined, locale: Locale): string {
  if (typeof value !== "number") {
    return "-";
  }

  return `${value.toLocaleString(localeConfig.locales[locale].formatLocale)} km`;
}

export function sortMaintenanceEvents(events: MaintenanceEvent[]): MaintenanceEvent[] {
  return [...events].sort((a, b) => toTimestamp(b.date_heure) - toTimestamp(a.date_heure));
}

export function computeNextService(event?: MaintenanceEvent | null): { km: number | null; date: string | null } {
  if (!event) {
    return { km: null, date: null };
  }

  return {
    km: typeof event.prochain_km === "number" ? event.prochain_km : null,
    date: event.date_heure || null,
  };
}
