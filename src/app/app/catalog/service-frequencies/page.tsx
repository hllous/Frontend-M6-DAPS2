import { connection } from "next/server";
import { redirect } from "next/navigation";

import { ServiceFrequenciesPanel } from "@/components/catalog/service-frequencies-panel";
import { getScenario } from "@/lib/scenarios";
import { getSession } from "@/lib/session";

export default async function ServiceFrequenciesPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <main className="p-6">
      <ServiceFrequenciesPanel scenario={getScenario(session.scenarioId)} />
    </main>
  );
}
