import type { Metadata } from "next";

import { ReportTracker } from "@/components/public/report-tracker";

export const metadata: Metadata = { title: "Seguir mi denuncia · Ambiente e Higiene" };

type TrackingSearchParams = Promise<{ codigo?: string | string[] }>;

export default async function TrackReportPage({ searchParams }: { searchParams: TrackingSearchParams }) {
  const { codigo } = await searchParams;
  const initialCode = Array.isArray(codigo) ? codigo[0] : codigo;

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] leading-[34px]">Seguir mi denuncia</h1>
        <p className="max-w-[60ch] text-muted-foreground">Ingresá el código de seguimiento de tu comprobante para ver en qué etapa está.</p>
      </div>
      <ReportTracker initialCode={initialCode} />
    </>
  );
}
