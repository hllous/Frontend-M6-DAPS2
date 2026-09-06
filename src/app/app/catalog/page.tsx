import { connection } from "next/server";
import { redirect } from "next/navigation";

import { CatalogLanding } from "@/components/catalog/catalog-landing";
import { getScenario } from "@/lib/scenarios";
import { getSession } from "@/lib/session";

export default async function CatalogPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <main className="p-6">
      <CatalogLanding scenario={getScenario(session.scenarioId)} />
    </main>
  );
}
