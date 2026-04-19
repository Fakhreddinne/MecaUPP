import { business } from "@/lib/business";
import type { Locale } from "@/lib/i18n/config";
import frJson from "@/lib/i18n/messages/fr.json";
import enJson from "@/lib/i18n/messages/en.json";
import arJson from "@/lib/i18n/messages/ar.json";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type DeepWiden<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends readonly (infer U)[]
        ? DeepWiden<U>[]
        : T extends object
          ? { [K in keyof T]: DeepWiden<T[K]> }
          : T;

export type TranslationDictionary = DeepWiden<typeof frJson>;

const replacements = {
  brand_name: business.brand_name,
  city: business.city,
} as const;

function replaceTokensInString(value: string): string {
  return value.replace(/\{\{(\w+)\}\}/g, (_, key: keyof typeof replacements) => replacements[key] ?? "");
}

function hydrateMessages<T extends JsonValue>(value: T): T {
  if (typeof value === "string") {
    return replaceTokensInString(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => hydrateMessages(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, hydrateMessages(nestedValue)])
    ) as T;
  }

  return value;
}

export const dictionaries: Record<Locale, TranslationDictionary> = {
  fr: hydrateMessages(frJson) as TranslationDictionary,
  en: hydrateMessages(enJson) as TranslationDictionary,
  darija: hydrateMessages(arJson) as TranslationDictionary,
};
