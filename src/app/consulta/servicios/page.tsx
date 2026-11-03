import type { Metadata } from "next";

import { PublicPageHeader } from "@/components/public/public-page-header";
import { ServiceSchedule } from "@/components/public/service-schedule";

export const metadata: Metadata = { title: "¿Cuándo pasa el servicio? · Ambiente e Higiene" };

type ServicesSearchParams = Promise<{ zona?: string | string[] }>;

export default async function ServicesPage({ searchParams }: { searchParams: ServicesSearchParams }) {
  const { zona } = await searchParams;
  const initialZoneId = Array.isArray(zona) ? zona[0] : zona;

  return (
    <>
      <PublicPageHeader
        title="¿Cuándo pasa el servicio?"
        introduction="Elegí tu zona y mirá los servicios programados para los próximos 30 días."
      />
      <ServiceSchedule initialZoneId={initialZoneId} />
    </>
  );
}
