import { connection } from "next/server";
import { redirect } from "next/navigation";

import { TreeInterventionsPanel } from "@/components/catalog/tree-interventions-panel";
import { getScenario } from "@/lib/scenarios";
import { getSession } from "@/lib/session";

export default async function TreeInterventionsCatalogPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  return <main className="p-6"><TreeInterventionsPanel scenario={getScenario(session.scenarioId)} /></main>;
}
