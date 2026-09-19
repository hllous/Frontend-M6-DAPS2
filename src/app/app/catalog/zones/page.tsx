import { connection } from "next/server";
import { redirect } from "next/navigation";

import { ZoneCatalogPanel } from "@/components/catalog/zone-catalog-panel";
import { getScenario } from "@/lib/scenarios";
import { getSession } from "@/lib/session";

export default async function ZonesCatalogPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  return <ZoneCatalogPanel scenario={getScenario(session.scenarioId)} />;
}
