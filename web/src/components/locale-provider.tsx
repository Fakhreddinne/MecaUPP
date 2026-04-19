"use client";

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  isLocale,
  localeConfig,
  LOCALE_COOKIE_NAME,
  type Locale,
  type LocaleDirection,
} from "@/lib/i18n/config";
import type { TranslationDictionary } from "@/lib/i18n/messages";
import { getByPath } from "@/lib/i18n/utils";

type LocaleContextValue = {
  locale: Locale;
  dir: LocaleDirection;
  messages: TranslationDictionary;
  t: (path: string) => string;
  setLocale: (nextLocale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function applyLocaleToDocument(locale: Locale) {
  const html = document.documentElement;
  const localeMeta = localeConfig.locales[locale];

  html.lang = localeMeta.lang;
  html.dir = localeMeta.dir;
}

function persistLocale(locale: Locale) {
  window.localStorage.setItem(LOCALE_COOKIE_NAME, locale);
  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

export function LocaleProvider({
  initialLocale,
  messages,
  children,
}: {
  initialLocale: Locale;
  messages: TranslationDictionary;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState(initialLocale);

  useEffect(() => {
    applyLocaleToDocument(initialLocale);
  }, [initialLocale]);

  useEffect(() => {
    const storedLocale = window.localStorage.getItem(LOCALE_COOKIE_NAME);
    if (!isLocale(storedLocale) || storedLocale === initialLocale) {
      persistLocale(initialLocale);
      return;
    }

    applyLocaleToDocument(storedLocale);
    persistLocale(storedLocale);
    startTransition(() => {
      router.refresh();
    });
  }, [initialLocale, router]);

  const activeLocale = locale === initialLocale ? initialLocale : locale;
  const dir = localeConfig.locales[activeLocale].dir;

  return (
    <LocaleContext.Provider
      value={{
        locale: activeLocale,
        dir,
        messages,
        t: (path) => getByPath<string>(messages as Record<string, unknown>, path),
        setLocale: (nextLocale) => {
          if (nextLocale === activeLocale) {
            return;
          }

          applyLocaleToDocument(nextLocale);
          persistLocale(nextLocale);
          setLocaleState(nextLocale);
          startTransition(() => {
            router.refresh();
          });
        },
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useI18n(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useI18n must be used within LocaleProvider");
  }

  return context;
}
