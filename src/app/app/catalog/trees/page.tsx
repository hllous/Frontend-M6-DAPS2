import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";

import { TreeCatalogPanel } from "@/components/catalog/tree-catalog-panel";
import { getScenario } from "@/lib/scenarios";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Inventario urbano — Ambiente e Higiene" };

export default async function TreesCatalogPage() {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  return <TreeCatalogPanel scenario={getScenario(session)} />;
}
