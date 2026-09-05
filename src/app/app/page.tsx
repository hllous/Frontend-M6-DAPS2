import { redirect } from "next/navigation";
import { connection } from "next/server";

import { FoundationDemo } from "@/components/shell/foundation-demo";
import { getSession } from "@/lib/session";
import { leaveApplication } from "./actions";

export default async function AppPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  return <FoundationDemo scenarioId={session.scenarioId} logoutAction={leaveApplication} />;
}
