import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Service = {
  date: string;
  km: number;
  title: string;
  details?: string;
};

type Carnet = {
  vehicle: { label: string };
  next: { km?: number; date?: string };
  history: Service[];
};

async function getCarnet(token: string): Promise<Carnet> {
  const base = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
  const res = await fetch(`${base}/api/carnet/${token}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Carnet introuvable");
  return res.json();
}

export default async function CarnetPage({ params }: { params: { token: string } }) {
  const data = await getCarnet(params.token);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Carnet d’entretien</h1>
        <p className="text-muted-foreground">{data.vehicle.label}</p>
      </header>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Prochain entretien <Badge variant="secondary">Recommandé</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="grid gap-2 sm:grid-cols-2">
            <div><span className="font-medium">Kilométrage :</span> {data.next.km ?? "—"} km</div>
            <div><span className="font-medium">Date :</span> {data.next.date ?? "—"}</div>
          </div>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Historique</h2>
        <div className="space-y-3">
          {data.history.map((s, idx) => (
            <Card key={idx} className="rounded-2xl">
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{s.title}</div>
                  <div className="text-sm text-muted-foreground">{s.date} • {s.km} km</div>
                </div>
                {s.details && <p className="mt-2 text-sm text-muted-foreground">{s.details}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}