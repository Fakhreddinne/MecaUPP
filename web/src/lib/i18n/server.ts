import { cookies } from "next/headers";
import { localeConfig, LOCALE_COOKIE_NAME, type Locale } from "@/lib/i18n/config";
import { dictionaries, type TranslationDictionary } from "@/lib/i18n/messages";
export { formatMessage, getByPath } from "@/lib/i18n/utils";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  return cookieLocale && cookieLocale in localeConfig.locales
    ? (cookieLocale as Locale)
    : localeConfig.defaultLocale;
}

export function getDictionary(locale: Locale): TranslationDictionary {
  return dictionaries[locale];
}

export async function getI18n() {
  const locale = await getServerLocale();
  const dictionary = getDictionary(locale);
  const localeMeta = localeConfig.locales[locale];

  return {
    locale,
    dictionary,
    lang: localeMeta.lang,
    dir: localeMeta.dir,
  };
}
