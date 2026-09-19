import { connection } from "next/server";
import { redirect } from "next/navigation";

import { getScenario } from "@/lib/scenarios";
import { getSession } from "@/lib/session";

export default async function DashboardPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  const scenario = getScenario(session.scenarioId);
  if (!scenario.capabilities.includes("indicator:view")) redirect("/app");
  redirect("/app?destination=dashboards");
}
