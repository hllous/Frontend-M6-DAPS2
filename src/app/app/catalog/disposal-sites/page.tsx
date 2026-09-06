import { connection } from "next/server";
import { redirect } from "next/navigation";

import { DisposalSitesPanel } from "@/components/catalog/disposal-sites-panel";
import { getScenario } from "@/lib/scenarios";
import { getSession } from "@/lib/session";

export default async function DisposalSitesPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  return <DisposalSitesPanel scenario={getScenario(session.scenarioId)} />;
}
