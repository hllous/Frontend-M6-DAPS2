import { connection } from "next/server";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/shell/app-shell";
import { getScenario } from "@/lib/scenarios";
import { getSession } from "@/lib/session";
import { leaveApplication } from "../actions";

export default async function CatalogLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <AppShell
      scenario={getScenario(session.scenarioId)}
      logoutAction={leaveApplication}
      initialDestination="catalog"
      catalogContent={children}
    />
  );
}
