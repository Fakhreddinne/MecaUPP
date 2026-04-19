import Image from "next/image";
import { headers } from "next/headers";
import { MaintenanceCarousel } from "./maintenance-carousel";
import { business } from "@/lib/business";
import { LanguageSelector } from "@/components/language-selector";
import {
  computeNextService,
  formatDate,
  formatKilometers,
  sortMaintenanceEvents,
  type Car,
  type CarType,
} from "@/lib/carnet";
import { getI18n } from "@/lib/i18n/server";
import { formatMessage } from "@/lib/i18n/utils";

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

async function getCar(id: string, apiBase: string, errorMessages: {
  serviceUnavailableMessage: string;
  apiUnavailableMessage: string;
}): Promise<CarResult> {
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
        message: errorMessages.serviceUnavailableMessage,
      };
    }

    const data = (await response.json()) as Car;
    return { kind: "success", data, apiBase };
  } catch {
    return {
      kind: "error",
      apiBase,
      message: errorMessages.apiUnavailableMessage,
    };
  }
}

function TunisianPlate({
  plateLeft,
  plateRight,
  typeLabels,
}: {
  plateLeft: string;
  plateRight: string;
  typeLabels: Record<CarType, { fr: string; ar: string }>;
}) {
  const labels = typeLabels.TUN;

  return (
    <div
      dir="ltr"
      className="w-full max-w-[420px] rounded-[24px] border-[6px] border-neutral-950 bg-white p-3 text-neutral-950 shadow-[0_18px_50px_rgba(0,0,0,0.28)]"
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center rounded-[18px] border border-black/10 px-5 py-4">
        <div className="text-center text-[2rem] font-black tracking-[0.16em] md:text-[2.6rem]">{plateLeft}</div>
        <div className="px-3 text-center">
          <div className="text-sm font-black">{labels.fr}</div>
          <div className="text-[1.6rem] font-black leading-none md:text-[1.9rem]">{labels.ar}</div>
        </div>
        <div className="text-center text-[2rem] font-black tracking-[0.18em] md:text-[2.6rem]">{plateRight}</div>
      </div>
    </div>
  );
}

function extractPlateDigits(value: string): string {
  const digits = value.match(/\d+/g) || [];
  return digits.join("");
}

function TypedPlate({
  immat,
  carType,
  typeLabels,
}: {
  immat: string;
  carType: CarType;
  typeLabels: Record<CarType, { fr: string; ar: string }>;
}) {
  const labels = typeLabels[carType];
  const number = extractPlateDigits(immat) || "0000";

  return (
    <div
      dir="ltr"
      className="w-full max-w-[420px] rounded-[24px] border-[6px] border-neutral-950 bg-white p-3 text-neutral-950 shadow-[0_18px_50px_rgba(0,0,0,0.28)]"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center rounded-[18px] border border-black/10 px-5 py-4">
        <div className="pr-4 text-center text-[2rem] font-black tracking-[0.12em] md:text-[2.6rem]">{number}</div>
        <div className="border-l border-black/15 pl-4 text-center">
          <div className="text-[1.6rem] font-black leading-none md:text-[1.9rem]">{labels.ar}</div>
        </div>
      </div>
    </div>
  );
}

function ErrorState({
  title,
  message,
  carId,
  requestIdLabel,
}: {
  title: string;
  message: string;
  carId: string;
  requestIdLabel: string;
}) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(124,246,197,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(102,163,255,0.22),_transparent_28%),linear-gradient(180deg,#0b0f14,#0e1622)] px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl rounded-[28px] border border-white/10 bg-white/6 p-8 shadow-2xl backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/55">{requestIdLabel}</p>
        <h1 className="mt-4 text-3xl font-black">{title}</h1>
        <p className="mt-3 text-base text-white/72">{message}</p>
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white/70">
          {requestIdLabel}: <span className="font-semibold text-white">{carId}</span>
        </div>
      </div>
    </main>
  );
}

function getInterventionCountLabel(
  count: number,
  messages: { countSingle: string; countPlural: string }
) {
  return formatMessage(count === 1 ? messages.countSingle : messages.countPlural, { count });
}

export default async function CarnetPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { locale, dir, dictionary } = await getI18n();
  const { token: carId } = await params;
  const requestHeaders = await headers();
  const resolvedApiBase =
    process.env.NEXT_PUBLIC_API_BASE ||
    inferApiBase(requestHeaders.get("host"), requestHeaders.get("x-forwarded-proto"));
  const result = await getCar(carId, resolvedApiBase, {
    serviceUnavailableMessage: dictionary.carnet.errors.serviceUnavailableMessage,
    apiUnavailableMessage: dictionary.carnet.errors.apiUnavailableMessage,
  });

  if (result.kind === "not_found") {
    return (
      <ErrorState
        title={dictionary.carnet.errors.notFoundTitle}
        message={dictionary.carnet.errors.notFoundMessage}
        carId={carId}
        requestIdLabel={dictionary.carnet.errors.requestId}
      />
    );
  }

  if (result.kind === "invalid_id") {
    return (
      <ErrorState
        title={dictionary.carnet.errors.invalidIdTitle}
        message={dictionary.carnet.errors.invalidIdMessage}
        carId={carId}
        requestIdLabel={dictionary.carnet.errors.requestId}
      />
    );
  }

  if (result.kind === "error") {
    return (
      <ErrorState
        title={dictionary.carnet.errors.serviceUnavailableTitle}
        message={result.message}
        carId={carId}
        requestIdLabel={dictionary.carnet.errors.requestId}
      />
    );
  }

  const { data } = result;
  const sortedMaintenance = sortMaintenanceEvents(data.maintenance || []);
  const latestEvent = sortedMaintenance[0] || null;
  const vehicleMake = data.vehicule_marque || null;
  const vehicleModel = data.vehicule_modele || null;
  const vehicleLabel =
    [vehicleMake, vehicleModel].filter(Boolean).join(" ") || dictionary.carnet.hero.vehicleLabel;
  const nextService = computeNextService(latestEvent);
  const plateTypeLabels = dictionary.carnet.plateTypes as Record<CarType, { fr: string; ar: string }>;
  const plateComponent =
    data.type === "TUN" ? (
      <TunisianPlate
        plateLeft={data.plate_left || ""}
        plateRight={data.plate_right || ""}
        typeLabels={plateTypeLabels}
      />
    ) : (
      <TypedPlate immat={data.matricule || ""} carType={data.type} typeLabels={plateTypeLabels} />
    );

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
              <div className="text-xs font-black uppercase tracking-[0.22em] text-white/55">
                {dictionary.carnet.brand.digitalBooklet}
              </div>
              <div className="text-lg font-semibold text-white/92">{business.brand_name}</div>
            </div>
          </div>
          <LanguageSelector className="w-[170px]" dark />
        </div>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/6 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.28)] backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-2xl">
                <p className="text-sm font-black uppercase tracking-[0.24em] text-white/48">
                  {dictionary.carnet.hero.vehicleSection}
                </p>
                <h1 className="mt-3 text-3xl font-black leading-tight md:text-5xl">{vehicleLabel}</h1>
                <p className="mt-3 max-w-xl text-base text-white/70 md:text-lg">
                  {dictionary.carnet.hero.description}
                </p>
              </div>
              {plateComponent}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <div
                dir="ltr"
                className="rounded-full border border-white/10 bg-black/18 px-4 py-2 text-sm font-semibold text-white/82"
              >
                {dictionary.carnet.hero.registration}: {data.matricule || "-"}
              </div>
              <div className="rounded-full border border-white/10 bg-black/18 px-4 py-2 text-sm font-semibold text-white/82">
                {dictionary.carnet.hero.type}: {plateTypeLabels[data.type]?.fr || data.type}
              </div>
              {data.vehicule_annee ? (
                <div
                  dir="ltr"
                  className="rounded-full border border-white/10 bg-black/18 px-4 py-2 text-sm font-semibold text-white/82"
                >
                  {dictionary.carnet.hero.year}: {data.vehicule_annee}
                </div>
              ) : null}
              <div className="rounded-full border border-white/10 bg-black/18 px-4 py-2 text-sm font-semibold text-white/82">
                {getInterventionCountLabel(sortedMaintenance.length, dictionary.carnet.history)}
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="rounded-[24px] border border-white/10 bg-black/18 p-5">
                <div className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
                  {dictionary.carnet.hero.nextService}
                </div>
                <div className="mt-3 text-3xl font-black" dir="ltr">
                  {nextService.km !== null
                    ? formatKilometers(nextService.km, locale)
                    : dictionary.carnet.hero.notDefined}
                </div>
                <div className="mt-2 text-sm font-semibold text-white/65">
                  {formatMessage(dictionary.carnet.hero.basedOnLastService, {
                    date: nextService.date
                      ? formatDate(nextService.date, locale)
                      : dictionary.carnet.hero.notDefined,
                  })}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                      {dictionary.carnet.hero.creation}
                    </div>
                    <div className="mt-2 text-lg font-bold" dir="ltr">
                      {formatDate(data.created_at, locale)}
                    </div>
                    <div className="mt-1 text-sm text-white/65">{dictionary.carnet.hero.creationHint}</div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="text-xs font-black uppercase tracking-[0.18em] text-white/45">
                      {dictionary.carnet.hero.updated}
                    </div>
                    <div className="mt-2 text-lg font-bold" dir="ltr">
                      {formatDate(data.updated_at, locale)}
                    </div>
                    <div className="mt-1 text-sm text-white/65">{dictionary.carnet.hero.updatedHint}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside className="rounded-[28px] border border-white/10 bg-white/6 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.25)] backdrop-blur">
            <div className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
              {dictionary.carnet.summary.title}
            </div>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
                <div className="text-sm text-white/55">{dictionary.carnet.summary.latestService}</div>
                <div className="mt-2 text-base font-bold" dir="ltr">
                  {latestEvent
                    ? formatKilometers(latestEvent.kilometrage, locale)
                    : dictionary.carnet.summary.none}
                </div>
                <div className="mt-1 text-sm text-white/65" dir="ltr">
                  {latestEvent?.date_heure ? formatDate(latestEvent.date_heure, locale) : "-"}
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/18 p-4">
                <div className="text-sm text-white/55">{dictionary.carnet.summary.timeline}</div>
                <div className="mt-2 text-base font-bold" dir="ltr">
                  {formatDate(data.created_at, locale)}
                </div>
                <div className="mt-1 text-sm text-white/65">{dictionary.carnet.summary.bookletCreated}</div>
                <div className="mt-4 text-base font-bold" dir="ltr">
                  {formatDate(data.updated_at, locale)}
                </div>
                <div className="mt-1 text-sm text-white/65">{dictionary.carnet.summary.bookletUpdated}</div>
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-8">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-white/45">
              {dictionary.carnet.history.eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-black">{dictionary.carnet.history.title}</h2>
          </div>

          <MaintenanceCarousel
            events={sortedMaintenance}
            locale={locale}
            dir={dir}
            labels={dictionary.carnet.detailLabels}
            copy={dictionary.carnet.carousel}
          />
        </section>
      </div>
    </main>
  );
}
