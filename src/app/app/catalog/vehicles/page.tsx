import { connection } from "next/server";
import { redirect } from "next/navigation";

import { VehicleCatalogPanel } from "@/components/catalog/vehicle-catalog-panel";
import { getScenario } from "@/lib/scenarios";
import { getSession } from "@/lib/session";

export default async function VehiclesPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  return <VehicleCatalogPanel scenario={getScenario(session.scenarioId)} />;
}
