import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { SessionShell } from "@/components/auth/session-shell";
import { DESTINATION_HEADER, loginUrl } from "@/lib/login-return";
import { getSession } from "@/lib/session";
import { sessionActor } from "@/lib/session-actor";
import { leaveApplication } from "./actions";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await connection();
  const session = await getSession();
  if (!session) redirect(loginUrl({ expired: true, destination: (await headers()).get(DESTINATION_HEADER) ?? undefined }));
  if (session.roles.length === 0) redirect("/no-role");
  const actor = await sessionActor(session);

  return (
    <SessionShell actorId={actor.userId} scenarioId={actor.scenarioId} identity={actor.m1Identity} logoutAction={leaveApplication}>
      {children}
    </SessionShell>
  );
}
