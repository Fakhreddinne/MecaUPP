export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main className="p-6">
      <h1 className="text-xl font-semibold">Carnet</h1>
      <p className="mt-4">Token: {token}</p>
    </main>
  );
}