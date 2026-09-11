import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";

import { NestedCatalogPrototype } from "@/components/prototype/catalogo-shell/catalogo-shell";
import { isCatalogCategorySlug } from "@/components/prototype/catalogo-shell/catalogo-shell-data";
import { getScenario } from "@/lib/scenarios";
import { getSession } from "@/lib/session";

export default async function CatalogoShellCategoryRoute({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  const { category } = await params;
  if (!isCatalogCategorySlug(category)) notFound();

  return <NestedCatalogPrototype scenario={getScenario(session.scenarioId)} category={category} />;
}
