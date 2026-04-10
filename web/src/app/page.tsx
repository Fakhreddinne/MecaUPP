import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const services = [
  { title: "Vidange & filtres", desc: "Huile, filtre à huile, air, habitacle." },
  { title: "Freinage", desc: "Plaquettes, disques, purge, contrôle sécurité." },
  { title: "Réparation Pare-brsie", desc: "Fissures, rayures, polissage" },
  { title: "Diagnostic", desc: "Valise, voyants, contrôle électronique." },
  { title: "Entretien complet", desc: "Révision constructeur, check-up global." },
  { title: "Climatisation", desc: "Recharge, détection fuite, désinfection." },
  { title: "Lavage / detailing", desc: "Nettoyage intérieur/extérieur premium." },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 font-semibold tracking-tight">
            <Image
              src="/logo.png"
              alt="MecaUp Station"
              width={140}
              height={40}
              className="h-10 w-auto"
              priority
            />
            
          </div>

          <nav className="hidden gap-6 text-sm md:flex">
            <a className="hover:underline" href="#services">Services</a>
            <a className="hover:underline" href="#contact">Contact</a>
            <a className="hover:underline" href="#localisation">Localisation</a>
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
              Chaque intervention est tracée dans votre carnet d’entretien accessible par QR.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild><a href="#services">Voir nos services</a></Button>
              <Button variant="outline" asChild><a href="#localisation">Nous trouver</a></Button>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3 text-sm">
              <Card><CardContent className="p-4"><div className="font-medium">Transparence</div><div className="text-muted-foreground">Détails & km</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="font-medium">Qualité</div><div className="text-muted-foreground">Pièces & huile</div></CardContent></Card>
              <Card><CardContent className="p-4"><div className="font-medium">Suivi</div><div className="text-muted-foreground">Rappel prochain</div></CardContent></Card>
            </div>
          </div>

          <div className="rounded-2xl border bg-muted p-6">

            <div className="rounded-2xl border bg-muted p-6">
              <Image
                src="/facade.png"
                alt="Façade de l'atelier MecaUp"
                width={1200}
                height={800}
                className="h-[320px] w-full rounded-xl object-cover"
                priority
              />
              <p className="mt-3 text-center text-sm text-muted-foreground">
               Notre atelier MecaUp Station.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="services" className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-semibold">Services</h2>
        <p className="mt-2 text-muted-foreground">
          Des prestations essentielles, avec traçabilité dans votre carnet.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Card key={s.title} className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">{s.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                {s.desc}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-8 md:grid-cols-2">
          <Card id="contact" className="rounded-2xl">
            <CardHeader><CardTitle>Contact</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div><span className="font-medium">Téléphone:</span> +216 99 18 18 87</div>
              <div><span className="font-medium">WhatsApp:</span> +216 99 18 18 87</div>
              <Button className="w-full" asChild>
                <a
                  href="https://wa.me/21699181887?text=Bonjour%20MecaUp%20Station,%20je%20veux%20un%20rendez-vous."
                  target="_blank"
                  rel="noreferrer"
                >
                  Envoyer sur WhatsApp
                </a>
              </Button>
              <div><span className="font-medium">Horaires:</span> Lun–Sam 9:00–18:00</div>
              <Button className="w-full">Envoyer un message</Button>
            </CardContent>
          </Card>

          <Card id="localisation" className="rounded-2xl">
  <CardHeader>
    <CardTitle>Localisation</CardTitle>
  </CardHeader>

  <CardContent className="space-y-3">
    
    <div className="overflow-hidden rounded-xl border">
      <iframe
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3174.012459157004!2d9.849190175528452!3d37.29483853966165!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x12e31f003ff16157%3A0xd715cd367dd85041!2sMecaUp%20Services%20Rapide%20%26%20Lavage!5e0!3m2!1sen!2sfr!4v1772011414788!5m2!1sen!2sfr"
        width="100%"
        height="260"
        style={{ border: 0 }}
        allowFullScreen
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      ></iframe>
    </div>

    <div className="text-sm text-muted-foreground">
      Av. Ain meriam, à coté du lycée Gustave Eiffel, Bizerte, Tunisie.
    </div>

    <Button
      variant="outline"
      className="w-full"
      asChild
    >
      <a
        href="https://maps.google.com/?q=MecaUp Services Rapide & Lavage"
        target="_blank"
      >
        Itinéraire
      </a>
    </Button>

  </CardContent>
</Card>
        </div>
      </section>

      <footer className="border-t py-10">
        <div className="mx-auto max-w-6xl px-4 text-sm text-muted-foreground">
          © {new Date().getFullYear()} MecaUp Station — Tous droits réservés.
        </div>
      </footer>
    </main>
  );
}
