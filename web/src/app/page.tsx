import Image from "next/image";
import { LanguageSelector } from "@/components/language-selector";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildMailtoUrl, buildWhatsAppUrl, business } from "@/lib/business";
import { getI18n } from "@/lib/i18n/server";

export default async function HomePage() {
  const { dictionary } = await getI18n();
  const { landing } = dictionary;
  const whatsappUrl = buildWhatsAppUrl(landing.messages.whatsapp);
  const emailUrl = buildMailtoUrl(landing.messages.emailSubject);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fcfcf8,#f2f0e8)]">
      <header className="sticky top-0 z-50 border-b border-black/8 bg-white/88 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 font-semibold tracking-tight">
            <Image
              src="/logo.png"
              alt={business.brand_name}
              width={140}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </div>

          <nav className="hidden gap-6 text-sm md:flex">
            <a className="hover:underline" href="#services">
              {landing.nav.services}
            </a>
            <a className="hover:underline" href="#contact">
              {landing.nav.contact}
            </a>
            <a className="hover:underline" href="#localisation">
              {landing.nav.location}
            </a>
          </nav>

          <div className="flex items-end gap-3">
            <LanguageSelector className="w-[150px]" />
            <Button asChild>
              <a href="#contact">{landing.cta.book}</a>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h1 className="text-3xl font-semibold leading-tight md:text-5xl">{landing.hero.title}</h1>
            <p className="mt-4 text-muted-foreground md:text-lg">{landing.hero.description}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <a href="#services">{landing.cta.viewServices}</a>
              </Button>
              <Button variant="outline" asChild>
                <a href="#localisation">{landing.cta.findUs}</a>
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              {landing.highlights.map((highlight) => (
                <Card key={highlight.title}>
                  <CardContent className="p-4">
                    <div className="font-medium">{highlight.title}</div>
                    <div className="text-muted-foreground">{highlight.desc}</div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-black/8 bg-white/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
            <Image
              src="/Facade.png"
              alt={landing.hero.workshopAlt}
              width={1200}
              height={800}
              className="h-[320px] w-full rounded-2xl object-cover"
              priority
            />
            <p className="mt-3 text-center text-sm text-muted-foreground">{landing.hero.workshopCaption}</p>
          </div>
        </div>
      </section>

      <section id="services" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-semibold">{landing.servicesIntro.title}</h2>
        <p className="mt-2 text-muted-foreground">{landing.servicesIntro.description}</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {landing.services.map((service) => (
            <Card key={service.title} className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">{service.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{service.desc}</CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-8 md:grid-cols-2">
          <Card id="contact" className="rounded-2xl">
            <CardHeader>
              <CardTitle>{landing.contact.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="font-medium">{landing.contact.phone}:</span> {business.phone_display}
              </div>
              <div>
                <span className="font-medium">{landing.contact.whatsapp}:</span> {business.phone_display}
              </div>
              <div>
                <span className="font-medium">{landing.contact.email}:</span> {business.email}
              </div>
              <div>
                <span className="font-medium">{landing.contact.hours}:</span> {business.hours_display}
              </div>
              <Button className="w-full" asChild>
                <a href={whatsappUrl} target="_blank" rel="noreferrer">
                  {landing.cta.whatsapp}
                </a>
              </Button>
              <Button className="w-full" variant="outline" asChild>
                <a href={emailUrl}>{landing.cta.email}</a>
              </Button>
            </CardContent>
          </Card>

          <Card id="localisation" className="rounded-2xl">
            <CardHeader>
              <CardTitle>{landing.location.title}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="overflow-hidden rounded-xl border">
                <iframe
                  src={business.maps_embed_url}
                  width="100%"
                  height="260"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>

              <div className="text-sm text-muted-foreground">{business.address_site}</div>

              <Button variant="outline" className="w-full" asChild>
                <a href={business.maps_directions_url} target="_blank" rel="noreferrer">
                  {landing.cta.directions}
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t border-black/8 py-10">
        <div className="mx-auto max-w-6xl px-4 text-sm text-muted-foreground">
          © {new Date().getFullYear()} {business.brand_name} - {landing.footer.rights}
        </div>
      </footer>
    </main>
  );
}
