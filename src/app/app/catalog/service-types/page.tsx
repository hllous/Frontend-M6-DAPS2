import { connection } from "next/server";
import { redirect } from "next/navigation";

import { ServiceTypesPanel } from "@/components/catalog/service-types-panel";
import { getScenario } from "@/lib/scenarios";
import { getSession } from "@/lib/session";

export default async function ServiceTypesPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  return <ServiceTypesPanel scenario={getScenario(session.scenarioId)} />;
}
