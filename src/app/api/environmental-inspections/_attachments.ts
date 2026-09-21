import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";

/**
 * Reenvía la respuesta del backend agregando `attachments` a cada inspección.
 * InspectionResponseDto no trae la evidencia (vive en GET /evidence), y Oficina la
 * necesita para habilitar el acta. Si la evidencia no se puede leer, la inspección
 * sale igual, sin `attachments`.
 */
export async function withInspectionAttachments(request: Request, backendResponse: Response): Promise<NextResponse> {
  const text = await backendResponse.text();
  const headers = { "content-type": backendResponse.headers.get("content-type") ?? "application/json" };
  if (!backendResponse.ok) return new NextResponse(text, { status: backendResponse.status, headers });

  let payload: unknown;
  try { payload = JSON.parse(text); } catch { return new NextResponse(text, { status: backendResponse.status, headers }); }

  const withAttachments = async (inspection: unknown) => {
    if (!inspection || typeof inspection !== "object" || typeof (inspection as { id?: unknown }).id !== "string") return inspection;
    const id = (inspection as { id: string }).id;
    try {
      const evidence = await fetchBackend(request, `/evidence?ownerType=INSPECTION&ownerId=${encodeURIComponent(id)}`);
      return evidence.ok ? { ...inspection, attachments: await evidence.json() } : inspection;
    } catch {
      return inspection;
    }
  };

  const enriched = Array.isArray(payload) ? await Promise.all(payload.map(withAttachments)) : await withAttachments(payload);
  return NextResponse.json(enriched, { status: backendResponse.status });
}
