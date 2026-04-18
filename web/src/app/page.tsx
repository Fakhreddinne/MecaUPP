import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildMailtoUrl, buildWhatsAppUrl, business } from "@/lib/business";

const services = [
  { title: "Vidange & filtres", desc: "Huile, filtre a huile, air et habitacle." },
  { title: "Freinage", desc: "Plaquettes, disques, purge et controle securite." },
  { title: "Reparation pare-brise", desc: "Fissures, rayures et polissage." },
  { title: "Diagnostic", desc: "Valise, voyants et controle electronique." },
  { title: "Entretien complet", desc: "Revision constructeur et check-up global." },
  { title: "Climatisation", desc: "Recharge, detection de fuite et desinfection." },
  { title: "Lavage / detailing", desc: "Nettoyage interieur et exterieur premium." },
];

const highlights = [
  { title: "Transparence", desc: "Details clairs et kilometrage conserve." },
  { title: "Qualite", desc: "Pieces, huiles et consommables suivis." },
  { title: "Suivi", desc: "Prochain entretien disponible par QR code." },
];

export default function HomePage() {
  const whatsappUrl = buildWhatsAppUrl(`Bonjour ${business.brand_name}, je veux un rendez-vous.`);
  const emailUrl = buildMailtoUrl(`Demande de rendez-vous - ${business.brand_name}`);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fcfcf8,#f2f0e8)]">
      <header className="sticky top-0 z-50 border-b border-black/8 bg-white/88 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
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
              Services
            </a>
            <a className="hover:underline" href="#contact">
              Contact
            </a>
            <a className="hover:underline" href="#localisation">
              Localisation
            </a>
          </nav>

          <Button asChild>
            <a href="#contact">Prendre RDV</a>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h1 className="text-3xl font-semibold leading-tight md:text-5xl">
              Entretien auto clair, suivi digital, service premium.
            </h1>
            <p className="mt-4 text-muted-foreground md:text-lg">
              Chaque intervention est tracee dans votre carnet d&apos;entretien accessible par QR code.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild>
                <a href="#services">Voir nos services</a>
              </Button>
              <Button variant="outline" asChild>
                <a href="#localisation">Nous trouver</a>
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
              {highlights.map((highlight) => (
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
              alt={`Facade de l'atelier ${business.brand_name}`}
              width={1200}
              height={800}
              className="h-[320px] w-full rounded-2xl object-cover"
              priority
            />
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Notre atelier {business.brand_name}, a {business.city}.
            </p>
          </div>
        </div>
      </section>

      <section id="services" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-semibold">Services</h2>
        <p className="mt-2 text-muted-foreground">
          Des prestations essentielles, avec tracabilite dans votre carnet.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
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
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="font-medium">Telephone:</span> {business.phone_display}
              </div>
              <div>
                <span className="font-medium">WhatsApp:</span> {business.phone_display}
              </div>
              <div>
                <span className="font-medium">Email:</span> {business.email}
              </div>
              <div>
                <span className="font-medium">Horaires:</span> {business.hours_display}
              </div>
              <Button className="w-full" asChild>
                <a href={whatsappUrl} target="_blank" rel="noreferrer">
                  Envoyer sur WhatsApp
                </a>
              </Button>
              <Button className="w-full" variant="outline" asChild>
                <a href={emailUrl}>Envoyer un message</a>
              </Button>
            </CardContent>
          </Card>

          <Card id="localisation" className="rounded-2xl">
            <CardHeader>
              <CardTitle>Localisation</CardTitle>
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
                  Itineraire
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t border-black/8 py-10">
        <div className="mx-auto max-w-6xl px-4 text-sm text-muted-foreground">
          © {new Date().getFullYear()} {business.brand_name} - Tous droits reserves.
        </div>
      </footer>
    </main>
  );
}
