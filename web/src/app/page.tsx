import Image from "next/image";
import { LanguageSelector } from "@/components/language-selector";
import {
  BrakeIcon,
  CarIcon,
  ChevronRightIcon,
  GlassIcon,
  LockIcon,
  OilIcon,
  PulseIcon,
  QrIcon,
  ScanIcon,
  ShieldIcon,
  SnowIcon,
  SparklesIcon,
  WrenchIcon,
} from "@/components/site-icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildMailtoUrl, buildWhatsAppUrl, business } from "@/lib/business";
import { getI18n } from "@/lib/i18n/server";

const serviceIcons = [OilIcon, BrakeIcon, GlassIcon, ScanIcon, WrenchIcon, SnowIcon, SparklesIcon];
const trustIcons = [ShieldIcon, PulseIcon, LockIcon];

function PhoneQrVisual() {
  return (
    <div className="relative mx-auto flex w-full max-w-[420px] items-center justify-center">
      <div className="absolute -left-4 top-8 h-28 w-28 rounded-full bg-sky-400/18 blur-3xl" />
      <div className="absolute -right-2 bottom-4 h-32 w-32 rounded-full bg-cyan-300/12 blur-3xl" />
      <div className="relative w-[220px] rounded-[2.5rem] border border-white/12 bg-[linear-gradient(180deg,rgba(16,24,40,0.92),rgba(8,13,24,0.96))] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.34)]">
        <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-white/14" />
        <div className="rounded-[1.6rem] border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between text-white/70">
            <CarIcon className="size-5" />
            <span className="text-xs font-semibold tracking-[0.16em] uppercase">MecaUp</span>
          </div>
          <div className="mt-5 rounded-[1.4rem] border border-white/10 bg-white px-4 py-3 text-center text-neutral-950 shadow-[0_12px_30px_rgba(255,255,255,0.12)]">
            <div className="text-[10px] font-black uppercase tracking-[0.22em] text-neutral-500">231 TUN 1984</div>
            <div className="mt-2 text-xl font-black">Peugeot 208</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl border border-white/10 bg-white/6 p-3 text-white">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45">QR</div>
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                <QrIcon className="size-4" />
                Historique
              </div>
            </div>
            <div className="rounded-2xl border border-emerald-300/16 bg-emerald-300/10 p-3 text-white">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-100/70">Suivi</div>
              <div className="mt-2 text-sm font-semibold">192 450 km</div>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -right-6 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-[2rem] border border-white/12 bg-white p-4 shadow-[0_24px_50px_rgba(0,0,0,0.22)]">
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 9 }).map((_, index) => (
            <span
              key={index}
              className={`size-4 rounded-[4px] ${
                [0, 1, 3, 5, 6, 7, 8].includes(index) ? "bg-neutral-950" : "bg-slate-200"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const { dictionary } = await getI18n();
  const { landing } = dictionary;
  const whatsappUrl = buildWhatsAppUrl(landing.messages.whatsapp);
  const emailUrl = buildMailtoUrl(landing.messages.emailSubject);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.08),transparent_28%),linear-gradient(180deg,#f9fbff,#f7f8fb_38%,#eef4fb)] text-slate-900">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/78 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <a href="#" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt={business.brand_name}
              width={148}
              height={42}
              className="h-10 w-auto"
              priority
            />
          </a>

          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 lg:flex">
            <a className="transition hover:text-slate-950" href="#services">
              {landing.nav.services}
            </a>
            <a className="transition hover:text-slate-950" href="#carnet-digital">
              {landing.nav.booklet}
            </a>
            <a className="transition hover:text-slate-950" href="#about">
              {landing.nav.about}
            </a>
            <a className="transition hover:text-slate-950" href="#contact">
              {landing.nav.contact}
            </a>
          </nav>

          <div className="flex items-end gap-3">
            <LanguageSelector className="w-[145px] sm:w-[160px]" />
            <Button asChild className="hidden sm:inline-flex">
              <a href="#contact">{landing.cta.book}</a>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-16 pt-10 sm:px-6 md:pb-24 md:pt-16">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
          <div>
            <div className="inline-flex rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-600 shadow-[0_10px_30px_rgba(37,99,235,0.08)]">
              {landing.hero.eyebrow}
            </div>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold tracking-tight text-balance text-slate-950 md:text-6xl xl:text-7xl">
              <span className="block">{landing.hero.headlineStart}</span>
              <span className="mt-1 block">{landing.hero.headlineMiddle}</span>
              <span className="mt-1 block text-blue-600">{landing.hero.headlineAccent}</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 md:text-xl">{landing.hero.description}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <a href="#services">{landing.cta.viewServices}</a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="#carnet-digital">{landing.cta.viewBooklet}</a>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-x-10 -top-8 h-40 rounded-full bg-sky-200/50 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/72 p-3 shadow-[0_30px_100px_rgba(15,23,42,0.14)] backdrop-blur">
              <Image
                src="/Facade.png"
                alt={landing.hero.workshopAlt}
                width={1200}
                height={900}
                className="h-[440px] w-full rounded-[1.5rem] object-cover object-center"
                priority
              />
              <div className="pointer-events-none absolute inset-x-6 bottom-6 rounded-[1.5rem] border border-white/50 bg-white/88 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500">MecaUp Station</div>
                    <div className="mt-2 text-lg font-semibold text-slate-950">{landing.hero.workshopCaption}</div>
                  </div>
                  <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold tracking-[0.14em] uppercase text-emerald-700">
                    Premium service
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-10">
        <div className="flex flex-col gap-4 md:max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">{landing.trust.title}</h2>
          <p className="text-base leading-7 text-slate-600 md:text-lg">{landing.trust.description}</p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {landing.trust.items.map((item, index) => {
            const Icon = trustIcons[index] || ShieldIcon;
            return (
              <Card
                key={item.title}
                className="border-white/80 bg-white/90 py-0 shadow-[0_18px_50px_rgba(15,23,42,0.08)] hover:-translate-y-1 hover:border-sky-200"
              >
                <CardContent className="p-6">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_14px_30px_rgba(11,18,32,0.18)]">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{item.desc}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section id="services" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
        <div className="flex max-w-2xl flex-col gap-4">
          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">Workshop services</div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">{landing.servicesIntro.title}</h2>
          <p className="text-base leading-7 text-slate-600 md:text-lg">{landing.servicesIntro.description}</p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {landing.services.map((service, index) => {
            const Icon = serviceIcons[index] || WrenchIcon;
            return (
              <Card
                key={service.title}
                className="group border-slate-200/80 bg-white/92 py-0 hover:-translate-y-1.5 hover:border-sky-200 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
              >
                <CardContent className="flex h-full flex-col p-6">
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-950 transition group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-600">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold tracking-tight text-slate-950">{service.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-6 text-slate-600">{service.desc}</p>
                  <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-blue-600">
                    {service.link}
                    <ChevronRightIcon className="size-4" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section id="carnet-digital" className="mx-auto max-w-7xl px-4 py-4 sm:px-6 md:py-10">
        <div className="overflow-hidden rounded-[2rem] bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.28),transparent_26%),linear-gradient(135deg,#09111f,#0f1d32_58%,#0b1220)] px-6 py-8 text-white shadow-[0_26px_80px_rgba(11,18,32,0.28)] sm:px-8 md:px-10 md:py-10">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(340px,0.8fr)]">
            <div>
              <div className="inline-flex rounded-full border border-white/12 bg-white/8 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-white/66">
                {landing.cta.bookletAnchor}
              </div>
              <h2 className="mt-5 max-w-xl text-3xl font-semibold tracking-tight text-balance md:text-5xl">
                {landing.booklet.title}
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-white/72 md:text-lg">{landing.booklet.description}</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {landing.stats.map((stat) => (
                  <div key={stat.label} className="rounded-[1.4rem] border border-white/10 bg-white/6 p-4 backdrop-blur">
                    <div className="text-2xl font-semibold tracking-tight text-white">{stat.value}</div>
                    <div className="mt-2 text-sm text-white/65">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <PhoneQrVisual />
          </div>
        </div>
      </section>

      <section id="about" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
          <div>
            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">MecaUp Station</div>
            <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-slate-950 md:text-5xl">
              {landing.about.title}
            </h2>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">{landing.about.description}</p>
          </div>
          <div className="rounded-[1.75rem] border border-slate-200/80 bg-white/92 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="text-sm font-semibold text-slate-950">What defines the experience</div>
            <div className="mt-5 space-y-4">
              {landing.about.points.map((point) => (
                <div key={point} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <span className="mt-1 size-2 rounded-full bg-blue-600" />
                  <p className="text-sm leading-6 text-slate-700">{point}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:pb-20">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Card className="border-slate-200/80 bg-white/94 py-0">
            <CardContent className="p-6 md:p-8">
              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">{landing.contact.title}</div>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{landing.cta.book}</h2>
              <p className="mt-3 max-w-lg text-base leading-7 text-slate-600">{landing.contact.description}</p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {landing.contact.phone}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-950">{business.phone_display}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {landing.contact.hours}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-950">{business.hours_display}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                  <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                    {landing.contact.email}
                  </div>
                  <div className="mt-2 text-lg font-semibold text-slate-950">{business.email}</div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <a href={whatsappUrl} target="_blank" rel="noreferrer">
                    {landing.cta.whatsapp}
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href={emailUrl}>{landing.cta.email}</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-slate-200/80 bg-white/94 py-0">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.22em] text-blue-700">
                    {landing.location.title}
                  </div>
                  <div className="mt-3 text-xl font-semibold text-slate-950">{business.address_site}</div>
                </div>
                <Button variant="outline" asChild>
                  <a href={business.maps_directions_url} target="_blank" rel="noreferrer">
                    {landing.cta.directions}
                  </a>
                </Button>
              </div>
              <div className="mt-6 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-100">
                <iframe
                  src={business.maps_embed_url}
                  width="100%"
                  height="320"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t border-slate-200/80 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            © {new Date().getFullYear()} {business.brand_name}
          </div>
          <div>{landing.footer.rights}</div>
        </div>
      </footer>
    </main>
  );
}
