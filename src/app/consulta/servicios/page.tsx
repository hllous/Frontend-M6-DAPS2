import type { Metadata } from "next";

import { ServiceSchedule } from "@/components/public/service-schedule";

export const metadata: Metadata = { title: "¿Cuándo pasa el servicio? · Ambiente e Higiene" };

type ServicesSearchParams = Promise<{ zona?: string | string[] }>;

export default async function ServicesPage({ searchParams }: { searchParams: ServicesSearchParams }) {
  const { zona } = await searchParams;
  const initialZoneId = Array.isArray(zona) ? zona[0] : zona;

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] leading-[34px]">¿Cuándo pasa el servicio?</h1>
        <p className="max-w-[60ch] text-muted-foreground">Elegí tu zona y mirá los servicios programados para los próximos 30 días.</p>
      </div>
      <ServiceSchedule initialZoneId={initialZoneId} />
    </>
  );
}
