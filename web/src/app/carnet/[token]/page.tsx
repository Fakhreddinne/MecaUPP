import { headers } from "next/headers";

type MaintenanceEvent = {
  date_heure: string;
  kilometrage: number;
  vehicule_marque: string;
  vehicule_modele: string;
  vehicule_annee: number;
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

type Car = {
  _id: string;
  matricule: string;
  image_path?: string | null;
  maintenance: MaintenanceEvent[];
  created_at: string;
  updated_at: string;
};

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

function normalizeKey(value: string | undefined): string {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function assetUrl(base: string, path: string): string {
  return new URL(path, base.endsWith("/") ? base : `${base}/`).toString();
}

function resolveVehicleImage(
  base: string,
  make: string | undefined,
  model: string | undefined,
): string | null {
  if (!make && !model) {
    return null;
  }

  const mapping: Record<string, string> = {
    renault_clio_3: "/static/cars/renault_clio_3.png",
    renault_clio_iii: "/static/cars/renault_clio_3.png",
  };

  const normalizedMake = normalizeKey(make);
  const normalizedModel = normalizeKey(model);
  const candidates = [
    `${normalizedMake}_${normalizedModel}_3`.replace(/^_+|_+$/g, ""),
    `${normalizedMake}_${normalizedModel}_iii`.replace(/^_+|_+$/g, ""),
    `${normalizedMake}_${normalizedModel}`.replace(/^_+|_+$/g, ""),
  ];

  for (const key of candidates) {
    if (mapping[key]) {
      return assetUrl(base, mapping[key]);
    }
  }

  return null;
}

function formatDate(value?: string): string {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function sortMaintenanceEvents(events: MaintenanceEvent[]): MaintenanceEvent[] {
  return [...events].sort((a, b) => String(b.date_heure || "").localeCompare(String(a.date_heure || "")));
}

function computeNextService(events: MaintenanceEvent[]): { km: number | null; date: string | null } {
  if (events.length === 0) {
    return { km: null, date: null };
  }

  const sorted = sortMaintenanceEvents(events);
  const last = sorted[0];

  return {
    km: typeof last.prochain_km === "number" ? last.prochain_km : null,
    date: last.date_heure || null,
  };
}

function formatMaintenanceLabel(key: string): string {
  return key.replaceAll("_", " ");
}

function getMaintenanceDetails(event: MaintenanceEvent): Array<[string, string]> {
  return Object.entries(event)
    .filter(([key]) => key !== "date_heure" && key !== "kilometrage")
    .map(([key, value]) => [formatMaintenanceLabel(key), String(value)]);
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
  const latestEvent = sortedMaintenance[0];
  const vehicleImage = data.image_path
    ? assetUrl(apiBase, data.image_path)
    : resolveVehicleImage(apiBase, latestEvent?.vehicule_marque, latestEvent?.vehicule_modele);
  const nextService = computeNextService(sortedMaintenance);
  const logoUrl = assetUrl(apiBase, "/static/mecaup_logo.png");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,246,197,0.18),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(102,163,255,0.22),_transparent_30%),linear-gradient(180deg,#0b0f14,#0e1622)] px-4 py-6 text-white md:px-6 md:py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoUrl} alt="MecaUp" className="h-10 w-auto drop-shadow-[0_10px_18px_rgba(0,0,0,0.28)]" />
            <div>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-white/55">Carnet digital</div>
              <div className="text-lg font-semibold text-white/92">MecaUp Station</div>
            </div>
          </div>
          <div className="rounded-full border border-sky-400/35 bg-sky-400/12 px-4 py-2 text-sm font-bold text-white/90">
            ID {carId}
          </div>
        </div>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_380px]">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/6 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.28)] backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-2xl">
                <p className="text-sm font-black uppercase tracking-[0.24em] text-white/48">Vehicule</p>
                <h1 className="mt-3 text-3xl font-black leading-tight md:text-5xl">
                  {latestEvent?.vehicule_marque || "Vehicule"} {latestEvent?.vehicule_modele || ""}
                </h1>
                <p className="mt-3 max-w-xl text-base text-white/70 md:text-lg">
                  Entretien premium, historique centralise et prochain service calcule depuis les donnees du backend.
                </p>
              </div>
              <TunisianPlate immat={data.matricule || "000 TU 0000"} />
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-white/45">Immatriculation</div>
                <div className="mt-2 text-lg font-bold">{data.matricule || "-"}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-white/45">Marque</div>
                <div className="mt-2 text-lg font-bold">{latestEvent?.vehicule_marque || "-"}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-white/45">Modele</div>
                <div className="mt-2 text-lg font-bold">{latestEvent?.vehicule_modele || "-"}</div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="rounded-[24px] border border-white/10 bg-black/18 p-5">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-white/45">Prochain entretien</div>
                <div className="mt-3 text-3xl font-black">
                  {nextService.km !== null ? `${nextService.km.toLocaleString("fr-FR")} km` : "Non defini"}
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
                    <img src={vehicleImage} alt="Vehicule" className="h-full w-full object-cover" />
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
                <div className="text-sm text-white/55">Modele</div>
                <div className="mt-2 text-xl font-black">
                  {latestEvent?.vehicule_marque || "Vehicule"} {latestEvent?.vehicule_modele || ""}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
                <div className="text-sm text-white/55">Historique</div>
                <div className="mt-2 text-xl font-black">{sortedMaintenance.length} interventions</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
                <div className="text-sm text-white/55">Derniere intervention</div>
                <div className="mt-2 text-base font-bold">
                  {latestEvent ? `${latestEvent.kilometrage.toLocaleString("fr-FR")} km` : "Aucune intervention"}
                </div>
                <div className="mt-1 text-sm text-white/65">
                  {latestEvent?.date_heure ? formatDate(latestEvent.date_heure) : "-"}
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">Historique d&apos;entretien</p>
              <h2 className="mt-2 text-2xl font-black">Interventions detaillees</h2>
            </div>
            <div className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white/72">
              {sortedMaintenance.length} enregistrements
            </div>
          </div>

          <div className="grid gap-4">
            {sortedMaintenance.length > 0 ? (
              sortedMaintenance.map((event, index) => (
                <article
                  key={`${event.date_heure || "maintenance"}-${event.kilometrage || index}`}
                  className="rounded-[26px] border border-white/10 bg-white/6 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)] backdrop-blur"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-xl font-black">
                        {event.vehicule_marque || "Vehicule"} {event.vehicule_modele || ""}
                      </div>
                      <div className="mt-1 text-sm font-semibold text-white/60">
                        {event.date_heure ? formatDate(event.date_heure) : "-"}
                      </div>
                    </div>
                    <div className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-sm font-black text-white">
                      {typeof event.kilometrage === "number" ? `${event.kilometrage.toLocaleString("fr-FR")} km` : "-"}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {getMaintenanceDetails(event).length > 0 ? (
                      getMaintenanceDetails(event).map(([key, value]) => (
                        <div key={key} className="rounded-2xl border border-white/8 bg-black/18 p-4">
                          <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                            {key}
                          </div>
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
              ))
            ) : (
              <div className="rounded-[26px] border border-white/10 bg-white/6 p-6 text-white/65">
                Aucun entretien enregistre pour ce carnet.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
