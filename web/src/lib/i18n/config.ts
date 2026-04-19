export const LOCALE_COOKIE_NAME = "mecaup_locale";

export const localeConfig = {
  defaultLocale: "fr",
  locales: {
    fr: {
      code: "fr",
      label: "Français",
      lang: "fr",
      dir: "ltr",
      formatLocale: "fr-FR",
    },
    en: {
      code: "en",
      label: "English",
      lang: "en",
      dir: "ltr",
      formatLocale: "en-US",
    },
    darija: {
      code: "darija",
      label: "الدارجة التونسية",
      lang: "aeb",
      dir: "rtl",
      formatLocale: "ar-TN",
    },
  },
} as const;

export type Locale = keyof typeof localeConfig.locales;
export type LocaleDirection = (typeof localeConfig.locales)[Locale]["dir"];

export const localeCodes = Object.keys(localeConfig.locales) as Locale[];

export function isLocale(value: string | null | undefined): value is Locale {
  return Boolean(value && value in localeConfig.locales);
}

