import { connection } from "next/server";
import { redirect } from "next/navigation";

import { CrewCatalogPanel } from "@/components/catalog/crew-catalog-panel";
import { getScenario } from "@/lib/scenarios";
import { getSession } from "@/lib/session";

export default async function CrewsPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  return <CrewCatalogPanel scenario={getScenario(session.scenarioId)} />;
}
