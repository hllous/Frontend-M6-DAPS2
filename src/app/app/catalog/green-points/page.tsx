import { connection } from "next/server";
import { redirect } from "next/navigation";

import { GreenPointCatalogPanel } from "@/components/catalog/green-point-catalog-panel";
import { getScenario } from "@/lib/scenarios";
import { getSession } from "@/lib/session";

export default async function GreenPointsCatalogPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  return <GreenPointCatalogPanel scenario={getScenario(session.scenarioId)} />;
}
