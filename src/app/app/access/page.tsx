import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AccessWorkspace } from "@/components/admin/access-workspace";
import { ShellForbidden } from "@/components/shell/shell-states";
import { sessionUserId } from "@/lib/session-actor";
import { getSession } from "@/lib/session";

export default async function AccessPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.roles.includes("M6_ADMIN")) return <ShellForbidden />;
  const ownUserId = sessionUserId(session);
  if (!ownUserId) return <ShellForbidden />;
  return <AccessWorkspace ownUserId={ownUserId} />;
}
