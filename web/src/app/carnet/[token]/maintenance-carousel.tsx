"use client";

import { useState } from "react";
import { formatDate, formatKilometers, type MaintenanceEvent } from "@/lib/carnet";

const DETAIL_LABELS: Record<Exclude<keyof MaintenanceEvent, "date_heure" | "kilometrage">, string> = {
  huile_moteur: "Huile moteur",
  viscosite: "Viscosite",
  filtre_huile: "Filtre a huile",
  filtre_air: "Filtre a air",
  filtre_habitacle: "Filtre habitacle",
  boite_pont: "Boite / pont",
  huile_boite: "Huile boite",
  autre: "Autre",
  prochain_km: "Prochain entretien",
};

type MaintenanceCarouselProps = {
  events: MaintenanceEvent[];
};

function getMaintenanceDetails(event: MaintenanceEvent): Array<[string, string]> {
  return Object.entries(event)
    .filter(([key]) => key !== "date_heure" && key !== "kilometrage")
    .map(([key, value]) => {
      const typedKey = key as keyof typeof DETAIL_LABELS;
      const displayValue = key === "prochain_km" ? formatKilometers(Number(value)) : String(value);
      return [DETAIL_LABELS[typedKey], displayValue];
    });
}

export function MaintenanceCarousel({ events }: MaintenanceCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  if (events.length === 0) {
    return (
      <div className="rounded-[26px] border border-white/10 bg-white/6 p-6 text-white/65">
        Aucun entretien enregistre pour ce carnet.
      </div>
    );
  }

  const safeActiveIndex = Math.min(activeIndex, events.length - 1);

  const goTo = (nextIndex: number) => {
    const normalizedIndex = (nextIndex + events.length) % events.length;
    setActiveIndex(normalizedIndex);
  };

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/6 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.24)] backdrop-blur md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.22em] text-white/45">Historique</div>
          <h3 className="mt-2 text-2xl font-black text-white md:text-3xl">Intervention {safeActiveIndex + 1}</h3>
          <div className="mt-2 text-sm text-white/60">
            {events.length} intervention{events.length > 1 ? "s" : ""} enregistree{events.length > 1 ? "s" : ""}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goTo(safeActiveIndex - 1)}
            aria-label="Intervention precedente"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/20 text-lg font-black text-white transition hover:border-sky-300/40 hover:bg-sky-300/10"
          >
            {"<"}
          </button>
          <button
            type="button"
            onClick={() => goTo(safeActiveIndex + 1)}
            aria-label="Intervention suivante"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/20 text-lg font-black text-white transition hover:border-sky-300/40 hover:bg-sky-300/10"
          >
            {">"}
          </button>
        </div>
      </div>

      <div
        className="mt-5 overflow-hidden"
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

          if (deltaX < 0) {
            goTo(safeActiveIndex + 1);
            return;
          }

          goTo(safeActiveIndex - 1);
        }}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${safeActiveIndex * 100}%)` }}
        >
          {events.map((event, index) => {
            const slideDetails = getMaintenanceDetails(event);

            return (
              <article
                key={`${event.date_heure || "maintenance"}-${event.kilometrage || index}`}
                className="w-full shrink-0 rounded-[26px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(0,0,0,0.16))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.18)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-white/45">
                      Date intervention
                    </div>
                    <div className="mt-2 text-xl font-black text-white">{formatDate(event.date_heure)}</div>
                  </div>
                  <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm font-black text-white">
                    {formatKilometers(event.kilometrage)}
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {slideDetails.length > 0 ? (
                    slideDetails.map(([key, value]) => (
                      <div key={key} className="rounded-2xl border border-white/8 bg-black/18 p-4">
                        <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">{key}</div>
                        <div className="mt-2 text-base font-semibold text-white/90">{value}</div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-white/8 bg-black/18 p-4 text-sm text-white/60">
                      Aucun detail enregistre.
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-white/58">Glissez horizontalement ou utilisez les fleches.</div>
        <div className="flex items-center gap-2">
          {events.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goTo(index)}
              aria-label={`Afficher l'intervention ${index + 1}`}
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
