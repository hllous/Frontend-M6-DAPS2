import { connection } from "next/server";
import { redirect } from "next/navigation";

import { NoRoleScreen } from "@/components/auth/no-role-screen";
import { loginUrl } from "@/lib/login-return";
import { sessionActor } from "@/lib/session-actor";
import { getSession } from "@/lib/session";

export default async function NoRolePage() {
  await connection();
  const session = await getSession();
  if (!session) redirect(loginUrl({ expired: true }));
  if (session.roles.length > 0) redirect("/app");

  const actor = sessionActor(session);
  return <NoRoleScreen identity={actor.displayName} />;
}
