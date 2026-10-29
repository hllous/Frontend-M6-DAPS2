import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { GreenSpacesPanel } from "@/components/catalog/green-spaces-panel";
import { getScenario } from "@/lib/scenarios";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Inventario urbano — Ambiente e Higiene" };

export default async function GreenSpacesPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  return <GreenSpacesPanel scenario={getScenario(session)} />;
}
