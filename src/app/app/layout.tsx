import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { SessionShell } from "@/components/auth/session-shell";
import { DESTINATION_HEADER, loginUrl } from "@/lib/login-return";
import { getSession } from "@/lib/session";
import { getScenario } from "@/lib/scenarios";
import { leaveApplication } from "./actions";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const session = await getSession();
  if (!session) redirect(loginUrl({ expired: true, destination: (await headers()).get(DESTINATION_HEADER) ?? undefined }));

  return (
    <SessionShell actorId={getScenario(session).actor.userId} scenarioId={session.scenarioId} logoutAction={leaveApplication}>
      {children}
    </SessionShell>
  );
}
