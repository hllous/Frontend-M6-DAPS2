import { connection } from "next/server";
import { redirect } from "next/navigation";

import { ContainerCatalogPanel } from "@/components/catalog/container-catalog-panel";
import { getScenario } from "@/lib/scenarios";
import { getSession } from "@/lib/session";

export default async function ContainersCatalogPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  return <ContainerCatalogPanel scenario={getScenario(session.scenarioId)} />;
}
