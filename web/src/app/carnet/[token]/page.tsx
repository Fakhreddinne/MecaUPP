import Image, { type ImageLoaderProps } from "next/image";
import { headers } from "next/headers";
import { MaintenanceCarousel } from "./maintenance-carousel";
import { business } from "@/lib/business";
import {
  computeNextService,
  formatDate,
  formatKilometers,
  sortMaintenanceEvents,
  type Car,
} from "@/lib/carnet";

type CarResult =
  | { kind: "success"; data: Car; apiBase: string }
  | { kind: "not_found"; apiBase: string }
  | { kind: "invalid_id"; apiBase: string }
  | { kind: "error"; apiBase: string; message: string };

function inferApiBase(host: string | null, protocol: string | null): string {
  if (!host) {
    return "http://127.0.0.1:8001";
  }

  const hostname = host.replace(/:\d+$/, "");
  return `${protocol || "http"}://${hostname}:8001`;
}

function assetUrl(base: string, path: string): string {
  return new URL(path, base.endsWith("/") ? base : `${base}/`).toString();
}

function remoteImageLoader({ src }: ImageLoaderProps): string {
  return src;
}

async function getCar(id: string, apiBase: string): Promise<CarResult> {
  try {
    const response = await fetch(`${apiBase}/api/cars/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });

    if (response.status === 400) {
      return { kind: "invalid_id", apiBase };
    }

    if (response.status === 404) {
      return { kind: "not_found", apiBase };
    }

    if (!response.ok) {
      return {
        kind: "error",
        apiBase,
        message: "Le service vehicule est indisponible pour le moment.",
      };
    }

    const data = (await response.json()) as Car;
    return { kind: "success", data, apiBase };
  } catch {
    return {
      kind: "error",
      apiBase,
      message: "Impossible de joindre l'API vehicule.",
    };
  }
}

function TunisianPlate({ immat }: { immat: string }) {
  const numbers = immat.match(/\d+/g) || [];
  const left = (numbers[0] || "000").slice(0, 3).padStart(3, "0");
  const right = (numbers[1] || "0000").slice(0, 4).padStart(4, "0");

  return (
    <div className="w-full max-w-[420px] rounded-[24px] border-[6px] border-neutral-950 bg-white p-3 text-neutral-950 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center rounded-[18px] border border-black/10 px-5 py-4">
        <div className="text-center text-4xl font-black tracking-[0.24em] md:text-5xl">{left}</div>
        <div className="px-3 text-center">
          <div className="text-sm font-black">TN</div>
          <div className="text-2xl font-black leading-none">تونس</div>
        </div>
        <div className="text-center text-4xl font-black tracking-[0.28em] md:text-5xl">{right}</div>
      </div>
    </div>
  );
}

function ErrorState({
  title,
  message,
  carId,
}: {
  title: string;
  message: string;
  carId: string;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,246,197,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(102,163,255,0.22),_transparent_28%),linear-gradient(180deg,#0b0f14,#0e1622)] px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl rounded-[28px] border border-white/10 bg-white/6 p-8 shadow-2xl backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/55">Carnet digital</p>
        <h1 className="mt-4 text-3xl font-black">{title}</h1>
        <p className="mt-3 text-base text-white/72">{message}</p>
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white/70">
          Identifiant demande: <span className="font-semibold text-white">{carId}</span>
        </div>
      </div>
    </main>
  );
}

export default async function CarnetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token: carId } = await params;
  const requestHeaders = await headers();
  const resolvedApiBase =
    process.env.NEXT_PUBLIC_API_BASE ||
    inferApiBase(requestHeaders.get("host"), requestHeaders.get("x-forwarded-proto"));
  const result = await getCar(carId, resolvedApiBase);

  if (result.kind === "not_found") {
    return (
      <ErrorState
        title="Vehicule introuvable"
        message="Aucun vehicule ne correspond a cet identifiant. Verifie le lien utilise."
        carId={carId}
      />
    );
  }

  if (result.kind === "invalid_id") {
    return (
      <ErrorState
        title="Identifiant invalide"
        message="L'identifiant du vehicule n'a pas un format MongoDB valide."
        carId={carId}
      />
    );
  }

  if (result.kind === "error") {
    return <ErrorState title="Service indisponible" message={result.message} carId={carId} />;
  }

  const { data, apiBase } = result;
  const sortedMaintenance = sortMaintenanceEvents(data.maintenance || []);
  const latestEvent = sortedMaintenance[0] || null;
  const vehicleMake = data.vehicule_marque || null;
  const vehicleModel = data.vehicule_modele || null;
  const vehicleLabel = [vehicleMake, vehicleModel].filter(Boolean).join(" ") || "Vehicule";
  const vehicleImage = data.image_path ? assetUrl(apiBase, data.image_path) : null;
  const nextService = computeNextService(latestEvent);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,246,197,0.18),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(102,163,255,0.22),_transparent_30%),linear-gradient(180deg,#0b0f14,#0e1622)] px-4 py-6 text-white md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt={business.brand_short_name}
              width={120}
              height={40}
              className="h-10 w-auto drop-shadow-[0_10px_18px_rgba(0,0,0,0.28)]"
              priority
            />
            <div>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-white/55">Carnet digital</div>
              <div className="text-lg font-semibold text-white/92">{business.brand_name}</div>
            </div>
          </div>
          <div className="rounded-full border border-sky-400/35 bg-sky-400/12 px-4 py-2 text-sm font-bold text-white/90">
            ID {carId}
          </div>
        </div>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/6 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.28)] backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-2xl">
                <p className="text-sm font-black uppercase tracking-[0.24em] text-white/48">Vehicule</p>
                <h1 className="mt-3 text-3xl font-black leading-tight md:text-5xl">{vehicleLabel}</h1>
                <p className="mt-3 max-w-xl text-base text-white/70 md:text-lg">
                  Historique centralise, prochaine revision visible en un coup d&apos;oeil et carnet accessible depuis le QR code de l&apos;atelier.
                </p>
              </div>
              <TunisianPlate immat={data.matricule || "000 TU 0000"} />
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-full border border-white/10 bg-black/18 px-4 py-2 text-sm font-semibold text-white/82">
                Immatriculation: {data.matricule || "-"}
              </div>
              {data.vehicule_annee ? (
                <div className="rounded-full border border-white/10 bg-black/18 px-4 py-2 text-sm font-semibold text-white/82">
                  Annee: {data.vehicule_annee}
                </div>
              ) : null}
              <div className="rounded-full border border-white/10 bg-black/18 px-4 py-2 text-sm font-semibold text-white/82">
                {sortedMaintenance.length} intervention{sortedMaintenance.length > 1 ? "s" : ""}
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="rounded-[24px] border border-white/10 bg-black/18 p-5">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-white/45">Prochain entretien</div>
                <div className="mt-3 text-3xl font-black">
                  {nextService.km !== null ? formatKilometers(nextService.km) : "Non defini"}
                </div>
                <div className="mt-2 text-sm font-semibold text-white/65">
                  Base sur la derniere intervention: {nextService.date ? formatDate(nextService.date) : "Non definie"}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Creation</div>
                    <div className="mt-2 text-lg font-bold">{formatDate(data.created_at)}</div>
                    <div className="mt-1 text-sm text-white/65">Premier enregistrement du vehicule</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">Mise a jour</div>
                    <div className="mt-2 text-lg font-bold">{formatDate(data.updated_at)}</div>
                    <div className="mt-1 text-sm text-white/65">Derniere synchronisation backend</div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.04]">
                {vehicleImage ? (
                  <div className="relative h-full min-h-[260px]">
                    <Image
                      loader={remoteImageLoader}
                      unoptimized
                      src={vehicleImage}
                      alt={vehicleLabel}
                      fill
                      sizes="(max-width: 1024px) 100vw, 280px"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(5,10,20,0.55))]" />
                  </div>
                ) : (
                  <div className="flex h-full min-h-[260px] items-center justify-center px-6 text-center text-sm font-semibold text-white/60">
                    Image vehicule non configuree
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="rounded-[28px] border border-white/10 bg-white/6 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.25)] backdrop-blur">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-white/45">Resume</div>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
                <div className="text-sm text-white/55">Derniere intervention</div>
                <div className="mt-2 text-base font-bold">
                  {latestEvent ? formatKilometers(latestEvent.kilometrage) : "Aucune intervention"}
                </div>
                <div className="mt-1 text-sm text-white/65">
                  {latestEvent?.date_heure ? formatDate(latestEvent.date_heure) : "-"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
                <div className="text-sm text-white/55">Chronologie</div>
                <div className="mt-2 text-base font-bold">{formatDate(data.created_at)}</div>
                <div className="mt-1 text-sm text-white/65">Creation du carnet</div>
                <div className="mt-4 text-base font-bold">{formatDate(data.updated_at)}</div>
                <div className="mt-1 text-sm text-white/65">Derniere mise a jour</div>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-8">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">Historique d&apos;entretien</p>
            <h2 className="mt-2 text-2xl font-black">Interventions detaillees</h2>
          </div>

          <MaintenanceCarousel events={sortedMaintenance} />
        </section>
      </div>
    </main>
  );
}
