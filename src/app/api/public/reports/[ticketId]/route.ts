import { NextResponse } from "next/server";

import { fetchPublicBackend, publicError, publicMockMode, relayPublicResponse, withCacheControl } from "@/lib/public-bff";
import { findPublicReportFixture } from "@/lib/public-report-fixtures";
import { isTicketId } from "@/lib/public-reports";

export async function GET(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  const path = new URL(request.url).pathname;
  const { ticketId } = await params;
  if (!isTicketId(ticketId)) return publicError(400, "El código de seguimiento no tiene el formato correcto.", path);

  if (publicMockMode()) {
    const report = findPublicReportFixture(ticketId);
    return report ? withCacheControl(NextResponse.json(report)) : publicError(404, "No se encontró lo que buscabas.", path);
  }

  const response = await fetchPublicBackend(request, `/public/reports/${ticketId.toLowerCase()}`);
  return relayPublicResponse(response, path);
}
