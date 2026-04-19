"use client";

import { useState } from "react";
import { formatDate, formatKilometers, type MaintenanceEvent } from "@/lib/carnet";
import type { Locale, LocaleDirection } from "@/lib/i18n/config";
import { formatMessage } from "@/lib/i18n/utils";

type DetailLabels = Record<Exclude<keyof MaintenanceEvent, "date_heure" | "kilometrage">, string>;

type MaintenanceCarouselProps = {
  events: MaintenanceEvent[];
  locale: Locale;
  dir: LocaleDirection;
  labels: DetailLabels;
  copy: {
    title: string;
    slideTitle: string;
    countSingleRecorded: string;
    countPluralRecorded: string;
    previous: string;
    next: string;
    date: string;
    empty: string;
    emptyDetails: string;
    goTo: string;
  };
};

function getMaintenanceDetails(
  event: MaintenanceEvent,
  locale: Locale,
  labels: DetailLabels
): Array<[string, string]> {
  return Object.entries(event)
    .filter(([key]) => key !== "date_heure" && key !== "kilometrage")
    .map(([key, value]) => {
      const typedKey = key as keyof DetailLabels;
      const displayValue =
        key === "prochain_km" ? formatKilometers(Number(value), locale) : String(value);
      return [labels[typedKey], displayValue];
    });
}

function getRecordedCountLabel(
  count: number,
  copy: MaintenanceCarouselProps["copy"]
): string {
  return formatMessage(count === 1 ? copy.countSingleRecorded : copy.countPluralRecorded, { count });
}

export function MaintenanceCarousel({
  events,
  locale,
  dir,
  labels,
  copy,
}: MaintenanceCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  if (events.length === 0) {
    return <div className="rounded-[26px] border border-white/10 bg-white/6 p-6 text-white/65">{copy.empty}</div>;
  }

  const safeActiveIndex = Math.min(activeIndex, events.length - 1);
  const isAtStart = safeActiveIndex === 0;
  const isAtEnd = safeActiveIndex === events.length - 1;

  const goTo = (nextIndex: number) => {
    const clampedIndex = Math.max(0, Math.min(nextIndex, events.length - 1));
    setActiveIndex(clampedIndex);
  };

  const previousGlyph = dir === "rtl" ? "→" : "←";
  const nextGlyph = dir === "rtl" ? "←" : "→";

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/6 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.24)] backdrop-blur md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-white/45">{copy.title}</div>
          <h3 className="mt-2 text-2xl font-black text-white md:text-3xl">
            {formatMessage(copy.slideTitle, { count: safeActiveIndex + 1 })}
          </h3>
          <div className="mt-2 text-sm text-white/60">{getRecordedCountLabel(events.length, copy)}</div>
        </div>

        <div className={`flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
          <button
            type="button"
            onClick={() => goTo(safeActiveIndex - 1)}
            aria-label={copy.previous}
            disabled={isAtStart}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/20 text-lg font-black text-white transition enabled:hover:border-sky-300/40 enabled:hover:bg-sky-300/10 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {previousGlyph}
          </button>
          <button
            type="button"
            onClick={() => goTo(safeActiveIndex + 1)}
            aria-label={copy.next}
            disabled={isAtEnd}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/20 text-lg font-black text-white transition enabled:hover:border-sky-300/40 enabled:hover:bg-sky-300/10 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {nextGlyph}
          </button>
        </div>
      </div>

      <div
        className="mt-5 overflow-hidden"
        dir="ltr"
        onTouchStart={(event) => setTouchStartX(event.changedTouches[0]?.clientX ?? null)}
        onTouchEnd={(event) => {
          if (touchStartX === null) {
            return;
          }

          const touchEndX = event.changedTouches[0]?.clientX ?? touchStartX;
          const deltaX = touchEndX - touchStartX;
          setTouchStartX(null);

          if (Math.abs(deltaX) < 40) {
            return;
          }

          if (deltaX < 0 && !isAtEnd) {
            goTo(safeActiveIndex + 1);
            return;
          }

          if (deltaX > 0 && !isAtStart) {
            goTo(safeActiveIndex - 1);
          }
        }}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${safeActiveIndex * 100}%)` }}
        >
          {events.map((event, index) => {
            const slideDetails = getMaintenanceDetails(event, locale, labels);

            return (
              <article
                key={`${event.date_heure || "maintenance"}-${event.kilometrage || index}`}
                dir={dir}
                className="w-full shrink-0 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.16))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.18)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-white/45">{copy.date}</div>
                    <div className="mt-2 text-xl font-black text-white" dir="ltr">
                      {formatDate(event.date_heure, locale)}
                    </div>
                  </div>
                  <div
                    dir="ltr"
                    className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm font-black text-white"
                  >
                    {formatKilometers(event.kilometrage, locale)}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {slideDetails.length > 0 ? (
                    slideDetails.map(([key, value]) => (
                      <div key={key} className="rounded-2xl border border-white/8 bg-black/18 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">{key}</div>
                        <div className="mt-2 text-base font-semibold text-white/90" dir={/\d/.test(value) ? "ltr" : dir}>
                          {value}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-black/18 p-4 text-sm text-white/60">
                      {copy.emptyDetails}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {events.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goTo(index)}
              aria-label={formatMessage(copy.goTo, { count: index + 1 })}
              className={`h-2.5 rounded-full transition ${
                index === safeActiveIndex ? "w-8 bg-sky-300" : "w-2.5 bg-white/28 hover:bg-white/45"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
