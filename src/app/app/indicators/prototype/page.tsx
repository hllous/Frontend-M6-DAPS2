import { notFound } from "next/navigation";

import { VARIANTS, type VariantId } from "@/components/indicators/prototype/prototype-data";
import { PrototypeShell } from "@/components/indicators/prototype/prototype-shell";

// PROTOTIPO DESCARTABLE (#849, fase 1): tres variantes de Tableros con datos de ejemplo.
// No enlazado desde la app; solo fuera de producción. Se borra al implementar la variante elegida.
export default async function IndicatorsPrototypePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { v } = await searchParams;
  const variant = VARIANTS.find((item) => item.id === v)?.id ?? "a";
  return <PrototypeShell variant={variant as VariantId} />;
}
