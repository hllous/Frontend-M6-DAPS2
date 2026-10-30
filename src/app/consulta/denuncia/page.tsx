import type { Metadata } from "next";

import { PublicPageHeader } from "@/components/public/public-page-header";
import { ReportTracker } from "@/components/public/report-tracker";

export const metadata: Metadata = { title: "Seguir mi denuncia · Ambiente e Higiene" };

type TrackingSearchParams = Promise<{ codigo?: string | string[] }>;

export default async function TrackReportPage({ searchParams }: { searchParams: TrackingSearchParams }) {
  const { codigo } = await searchParams;
  const initialCode = Array.isArray(codigo) ? codigo[0] : codigo;

  return (
    <>
      <PublicPageHeader
        title="Seguir mi denuncia"
        introduction="Ingresá el código de seguimiento de tu comprobante para ver en qué etapa está."
      />
      <ReportTracker initialCode={initialCode} />
    </>
  );
}
