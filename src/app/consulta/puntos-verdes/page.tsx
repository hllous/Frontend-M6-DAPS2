import type { Metadata } from "next";

import { PublicGreenPoints } from "@/components/public/green-points";
import { PublicPageHeader } from "@/components/public/public-page-header";

export const metadata: Metadata = { title: "Puntos verdes · Ambiente e Higiene" };

type GreenPointsSearchParams = Promise<{ zona?: string | string[] }>;

export default async function GreenPointsPage({ searchParams }: { searchParams: GreenPointsSearchParams }) {
  const { zona } = await searchParams;
  const initialZoneId = Array.isArray(zona) ? zona[0] : zona;

  return (
    <>
      <PublicPageHeader
        title="Puntos verdes"
        introduction="Encontrá el punto verde más cercano y revisá qué residuos recibe cada uno."
      />
      <PublicGreenPoints initialZoneId={initialZoneId} />
    </>
  );
}
