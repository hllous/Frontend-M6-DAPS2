import { redirect } from "next/navigation";
import { connection } from "next/server";

import { GreenSpacesPanel } from "@/components/catalog/green-spaces-panel";
import { getScenario } from "@/lib/scenarios";
import { getSession } from "@/lib/session";

export default async function GreenSpacesPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  return <main className="p-6"><GreenSpacesPanel scenario={getScenario(session.scenarioId)} /></main>;
}
