import Image from "next/image";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { MaintenanceCarousel } from "./maintenance-carousel";
import { DashboardCard, StatPill, StatusBadge, Timeline } from "@/components/carnet-ui";
import { LanguageSelector } from "@/components/language-selector";
import { CalendarIcon, CarIcon, GaugeIcon, QrIcon } from "@/components/site-icons";
import { business } from "@/lib/business";
import {
  computeNextService,
  formatDate,
  formatKilometers,
  sortMaintenanceEvents,
  type Car,
  type CarType,
} from "@/lib/carnet";
import { type Locale } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { formatMessage } from "@/lib/i18n/utils";

type CarResult =
  | { kind: "success"; data: Car; apiBase: string }
  | { kind: "not_found"; apiBase: string }
  | { kind: "invalid_id"; apiBase: string }
  | { kind: "error"; apiBase: string; message: string };

type PlateTypeLabels = Record<CarType, { fr: string; ar: string }>;

function inferApiBase(host: string | null, protocol: string | null): string {
  if (!host) {
    return "http://127.0.0.1:8001";
  }

  const hostname = host.replace(/:\d+$/, "");
  return `${protocol || "http"}://${hostname}:8001`;
}

async function getCar(
  id: string,
  apiBase: string,
  errorMessages: {
    serviceUnavailableMessage: string;
    apiUnavailableMessage: string;
  }
): Promise<CarResult> {
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
  locale,
}: {
  plateLeft: string;
  plateRight: string;
  typeLabels: PlateTypeLabels;
  locale: Locale;
}) {
  const label = getLocalizedPlateTypeLabel(typeLabels.TUN, locale);
  const isArabic = locale === "darija";

  return (
    <div
      dir="ltr"
      className="w-full max-w-[420px] rounded-[26px] border-[6px] border-neutral-950 bg-white p-3 text-neutral-950 shadow-[0_24px_55px_rgba(0,0,0,0.28)]"
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center rounded-[20px] border border-black/10 px-5 py-4">
        <div className="text-center text-[2rem] font-black tracking-[0.16em] md:text-[2.6rem]">{plateLeft}</div>
        <div className={`px-3 text-center ${isArabic ? "text-[1.6rem] md:text-[1.9rem]" : "text-sm tracking-[0.16em]"}`}>
          <div className="font-black leading-none">{label}</div>
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
  locale,
}: {
  immat: string;
  carType: CarType;
  typeLabels: PlateTypeLabels;
  locale: Locale;
}) {
  const label = getLocalizedPlateTypeLabel(typeLabels[carType], locale);
  const number = extractPlateDigits(immat) || "0000";

  return (
    <div
      dir="ltr"
      className="w-full max-w-[420px] rounded-[26px] border-[6px] border-neutral-950 bg-white p-3 text-neutral-950 shadow-[0_24px_55px_rgba(0,0,0,0.28)]"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center rounded-[20px] border border-black/10 px-5 py-4">
        <div className="pr-4 text-center text-[2rem] font-black tracking-[0.12em] md:text-[2.6rem]">{number}</div>
        <div className="border-l border-black/15 pl-4 text-center">
          <div className={`${locale === "darija" ? "text-[1.6rem] md:text-[1.9rem]" : "text-sm tracking-[0.16em]"} font-black leading-none`}>
            {label}
          </div>
        </div>
      </div>
    </div>
  );
}

function getLocalizedPlateTypeLabel(labels: { fr: string; ar: string }, locale: Locale): string {
  return locale === "darija" ? labels.ar : labels.fr;
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(34,197,94,0.12),_transparent_24%),linear-gradient(180deg,#050a12,#0a1320)] px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,36,0.92),rgba(8,14,24,0.94))] p-8 shadow-[0_30px_80px_rgba(0,0,0,0.34)] backdrop-blur">
        <div className="inline-flex rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-white/55">
          {requestIdLabel}
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 max-w-xl text-base text-white/72">{message}</p>
        <div className="mt-6 rounded-2xl border border-white/10 bg-black/18 px-4 py-3 text-sm text-white/70">
          {requestIdLabel}: <span className="font-semibold text-white">{carId}</span>
        </div>
      </div>
    </main>
  );
}

function getInterventionCountLabel(count: number, messages: { countSingle: string; countPlural: string }) {
  return formatMessage(count === 1 ? messages.countSingle : messages.countPlural, { count });
}

function getMaintenanceStatus(deltaKm: number | null, copy: Record<string, string>) {
  if (deltaKm === null) {
    return { tone: "slate" as const, label: copy.unknown };
  }

  if (deltaKm <= 0) {
    return { tone: "orange" as const, label: copy.overdue };
  }

  if (deltaKm <= 12000) {
    return { tone: "orange" as const, label: copy.soon };
  }

  return { tone: "green" as const, label: copy.safe };
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
  const plateTypeLabels = dictionary.carnet.plateTypes as PlateTypeLabels;
  const plateComponent =
    data.type === "TUN" ? (
      <TunisianPlate
        plateLeft={data.plate_left || ""}
        plateRight={data.plate_right || ""}
        typeLabels={plateTypeLabels}
        locale={locale}
      />
    ) : (
      <TypedPlate immat={data.matricule || ""} carType={data.type} typeLabels={plateTypeLabels} locale={locale} />
    );
  const remainingKm =
    latestEvent && typeof nextService.km === "number" ? nextService.km - latestEvent.kilometrage : null;
  const maintenanceStatus = getMaintenanceStatus(remainingKm, dictionary.carnet.nextMaintenance);
  const timelineItems: Array<{
    title: string;
    hint: string;
    value: ReactNode;
    tone?: "blue" | "green" | "slate";
  }> = [
    {
      title: dictionary.carnet.timeline.created,
      hint: dictionary.carnet.timeline.createdHint,
      value: <span dir="ltr">{formatDate(data.created_at, locale)}</span>,
      tone: "blue" as const,
    },
    {
      title: dictionary.carnet.timeline.lastService,
      hint: dictionary.carnet.timeline.lastServiceHint,
      value: (
        <span dir="ltr">
          {latestEvent?.date_heure ? formatDate(latestEvent.date_heure, locale) : dictionary.carnet.summary.none}
        </span>
      ),
      tone: "slate" as const,
    },
    {
      title: dictionary.carnet.timeline.today,
      hint: dictionary.carnet.timeline.todayHint,
      value: <span dir="ltr">{formatDate(new Date().toISOString(), locale)}</span>,
      tone: "blue" as const,
    },
    {
      title: dictionary.carnet.timeline.nextService,
      hint: dictionary.carnet.timeline.nextServiceHint,
      value: (
        <span dir="ltr">
          {nextService.km !== null ? formatKilometers(nextService.km, locale) : dictionary.carnet.hero.notDefined}
        </span>
      ),
      tone: maintenanceStatus.tone === "green" ? "green" : "slate",
    },
  ];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(34,197,94,0.12),_transparent_24%),linear-gradient(180deg,#050a12,#0a1320_45%,#07101a)] px-4 py-6 text-white md:px-6 md:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
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
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/50">
                {dictionary.carnet.brand.digitalBooklet}
              </div>
              <div className="mt-1 text-lg font-semibold text-white/92">{business.brand_name}</div>
            </div>
          </div>
          <LanguageSelector className="w-[170px]" dark />
        </div>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_340px]">
          <DashboardCard className="overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-2xl">
                <div className="inline-flex rounded-full border border-white/10 bg-white/6 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-white/55">
                  {dictionary.carnet.hero.vehicleSection}
                </div>
                <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight text-white md:text-5xl">
                  {vehicleLabel}
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/70 md:text-lg">
                  {dictionary.carnet.hero.description}
                </p>
              </div>
              {plateComponent}
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatPill
                label={dictionary.carnet.hero.registration}
                value={<span dir="ltr">{data.matricule || "-"}</span>}
              />
              <StatPill
                label={dictionary.carnet.hero.type}
                value={getLocalizedPlateTypeLabel(plateTypeLabels[data.type], locale)}
              />
              <StatPill
                label={dictionary.carnet.hero.year}
                value={<span dir="ltr">{data.vehicule_annee || dictionary.carnet.hero.notDefined}</span>}
              />
              <StatPill
                label={dictionary.carnet.history.title}
                value={getInterventionCountLabel(sortedMaintenance.length, dictionary.carnet.history)}
              />
            </div>

            <div className="mt-7 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
              <div className="rounded-[1.5rem] border border-white/10 bg-[linear-gradient(180deg,rgba(9,17,31,0.76),rgba(8,14,24,0.92))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
                      {dictionary.carnet.hero.nextService}
                    </div>
                    <div className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl" dir="ltr">
                      {nextService.km !== null
                        ? formatKilometers(nextService.km, locale)
                        : dictionary.carnet.hero.notDefined}
                    </div>
                  </div>
                  <StatusBadge tone={maintenanceStatus.tone}>{maintenanceStatus.label}</StatusBadge>
                </div>

                <div className="mt-4 text-sm font-semibold text-white/68">
                  {remainingKm !== null
                    ? formatMessage(dictionary.carnet.nextMaintenance.distance, {
                        count: formatKilometers(remainingKm, locale),
                      })
                    : dictionary.carnet.hero.notDefined}
                </div>
                <div className="mt-2 text-sm text-white/58">
                  {formatMessage(dictionary.carnet.hero.basedOnLastService, {
                    date: nextService.date
                      ? formatDate(nextService.date, locale)
                      : dictionary.carnet.hero.notDefined,
                  })}
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 text-white/48">
                      <GaugeIcon className="size-4" />
                      <span className="text-[11px] font-black uppercase tracking-[0.18em]">
                        {dictionary.carnet.nextMaintenance.latestMileage}
                      </span>
                    </div>
                    <div className="mt-3 text-lg font-semibold text-white" dir="ltr">
                      {latestEvent ? formatKilometers(latestEvent.kilometrage, locale) : dictionary.carnet.summary.none}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-center gap-2 text-white/48">
                      <CalendarIcon className="size-4" />
                      <span className="text-[11px] font-black uppercase tracking-[0.18em]">
                        {dictionary.carnet.summary.latestService}
                      </span>
                    </div>
                    <div className="mt-3 text-lg font-semibold text-white" dir="ltr">
                      {latestEvent?.date_heure ? formatDate(latestEvent.date_heure, locale) : "-"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-3">
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-white/45">
                    <QrIcon className="size-4" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">QR carnet</span>
                  </div>
                  <div className="mt-3 text-base font-semibold text-white/92">
                    {dictionary.carnet.brand.digitalBooklet}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/58">
                    Historique, prochaines echeances et donnees atelier centralisees.
                  </p>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-white/45">
                    <CarIcon className="size-4" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                      {dictionary.carnet.hero.creation}
                    </span>
                  </div>
                  <div className="mt-3 text-base font-semibold text-white" dir="ltr">
                    {formatDate(data.created_at, locale)}
                  </div>
                  <div className="mt-1 text-sm text-white/58">{dictionary.carnet.hero.creationHint}</div>
                </div>
                <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center gap-2 text-white/45">
                    <CalendarIcon className="size-4" />
                    <span className="text-[11px] font-black uppercase tracking-[0.2em]">
                      {dictionary.carnet.hero.updated}
                    </span>
                  </div>
                  <div className="mt-3 text-base font-semibold text-white" dir="ltr">
                    {formatDate(data.updated_at, locale)}
                  </div>
                  <div className="mt-1 text-sm text-white/58">{dictionary.carnet.hero.updatedHint}</div>
                </div>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard>
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
              {dictionary.carnet.hero.timelineTitle}
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">{dictionary.carnet.summary.timeline}</h2>
            <p className="mt-3 text-sm leading-6 text-white/58">{dictionary.carnet.hero.timelineDescription}</p>
            <div className="mt-8">
              <Timeline items={timelineItems} rtl={dir === "rtl"} />
            </div>
          </DashboardCard>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.22em] text-white/42">
                {dictionary.carnet.history.eyebrow}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                {dictionary.carnet.history.title}
              </h2>
            </div>
            <StatusBadge tone="blue">{getInterventionCountLabel(sortedMaintenance.length, dictionary.carnet.history)}</StatusBadge>
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
