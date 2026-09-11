import { connection } from "next/server";
import { redirect } from "next/navigation";

import {
  CatalogoPrototypeApp,
  CatalogoPrototypeSwitcher,
  DropdownCatalogPrototype,
  DestinationCatalogPrototype,
} from "@/components/prototype/catalogo-shell/catalogo-shell";
import {
  isCatalogCategorySlug,
  isPrototypeVariant,
  type CatalogCategorySlug,
} from "@/components/prototype/catalogo-shell/catalogo-shell-data";
import { getScenario } from "@/lib/scenarios";
import { getSession } from "@/lib/session";

type SearchParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CatalogoShellPrototypePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await connection();
  const session = await getSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const rawVariant = firstValue(params.variant);
  const rawCategory = firstValue(params.category);
  const category: CatalogCategorySlug = isCatalogCategorySlug(rawCategory) ? rawCategory : "zones";

  if (isPrototypeVariant(rawVariant) && rawVariant === "B") {
    redirect(`/prototype/catalogo-shell/routes/${category}?variant=B`);
  }

  const scenario = getScenario(session.scenarioId);

  const variant = rawVariant === "C" ? "C" : "A";
  const catalogContent =
    variant === "C" ? (
      <DropdownCatalogPrototype scenario={scenario} initialCategory={category} />
    ) : (
      <DestinationCatalogPrototype scenario={scenario} initialCategory={category} />
    );

  return (
    <>
      <CatalogoPrototypeApp scenario={scenario} catalogContent={catalogContent} />
      <CatalogoPrototypeSwitcher variant={variant} category={category} />
    </>
  );
}
