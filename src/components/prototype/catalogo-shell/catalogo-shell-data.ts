export const catalogCategorySlugs = [
  "service-types",
  "disposal-sites",
  "zones",
  "routes",
  "service-frequencies",
  "vehicles",
  "crews",
  "green-spaces",
  "containers",
  "green-points",
  "trees",
  "tree-interventions",
] as const;

export type CatalogCategorySlug = (typeof catalogCategorySlugs)[number];
export type PrototypeVariant = "A" | "B" | "C";

export function isCatalogCategorySlug(value: string | undefined): value is CatalogCategorySlug {
  return catalogCategorySlugs.includes(value as CatalogCategorySlug);
}

export function isPrototypeVariant(value: string | undefined): value is PrototypeVariant {
  return value === "A" || value === "B" || value === "C";
}
