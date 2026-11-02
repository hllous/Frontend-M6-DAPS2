import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AccessWorkspace } from "@/components/admin/access-workspace";
import { ShellForbidden } from "@/components/shell/shell-states";
import { DEMO_IDENTITIES } from "@/lib/demo-identities";
import { getSession } from "@/lib/session";

export default async function AccessPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.roles.includes("M6_ADMIN")) return <ShellForbidden />;
  // Las sesiones reales de M1 deben usar el sub del token (#796).
  return <AccessWorkspace ownUserId={DEMO_IDENTITIES[session.scenarioId].sub} />;
}
