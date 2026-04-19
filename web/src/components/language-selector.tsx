"use client";

import { cn } from "@/lib/utils";
import { localeCodes, localeConfig } from "@/lib/i18n/config";
import { useI18n } from "@/components/locale-provider";

export function LanguageSelector({ className, dark = false }: { className?: string; dark?: boolean }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.2em]",
          dark ? "text-white/55" : "text-black/45"
        )}
      >
        {t("languageSwitcher.shortLabel")}
      </span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as (typeof localeCodes)[number])}
        aria-label={t("languageSwitcher.label")}
        style={{ colorScheme: dark ? "dark" : "light" }}
        className={cn(
          "h-10 rounded-xl border px-3 text-sm font-medium outline-none transition focus-visible:ring-2 focus-visible:ring-offset-2",
          dark
            ? "border-white/12 bg-[#101926] text-white shadow-[0_10px_30px_rgba(0,0,0,0.24)] focus-visible:ring-white/40 focus-visible:ring-offset-transparent"
            : "border-black/10 bg-white text-black/80 shadow-xs focus-visible:ring-black/20 focus-visible:ring-offset-white"
        )}
      >
        {localeCodes.map((localeCode) => (
          <option
            key={localeCode}
            value={localeCode}
            lang={localeConfig.locales[localeCode].lang}
            dir={localeConfig.locales[localeCode].dir}
          >
            {localeConfig.locales[localeCode].label}
          </option>
        ))}
      </select>
    </label>
  );
}
