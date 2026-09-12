import { connection } from "next/server";
import { redirect } from "next/navigation";

import { RouteCatalogPanel } from "@/components/catalog/route-catalog-panel";
import { getScenario } from "@/lib/scenarios";
import { getSession } from "@/lib/session";

export default async function RoutesCatalogPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  return <RouteCatalogPanel scenario={getScenario(session.scenarioId)} />;
}
