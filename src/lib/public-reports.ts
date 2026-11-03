import { z } from "zod";

import { environmentalReportTypeSchema } from "./environmental-reports";

/** Contrato del seguimiento público (`GET /public/reports/:ticketId`). Solo lo que el backend publica para el vecino. */
export const publicReportStageSchema = z.enum([
  "RECIBIDA",
  "EN_ANALISIS",
  "INSPECCION_PROGRAMADA",
  "INSPECCIONADA",
  "EN_TRAMITE_SANCIONATORIO",
  "DERIVADA",
  "CERRADA",
]);
export type PublicReportStage = z.infer<typeof publicReportStageSchema>;

export const publicReportSchema = z.object({
  ticketId: z.string(),
  publicId: z.string().nullish(),
  reportType: environmentalReportTypeSchema,
  stage: publicReportStageSchema,
  stageLabel: z.string(),
  address: z.string().nullish(),
  openedAt: z.string(),
  lastUpdateAt: z.string(),
  inspectedAt: z.string().nullish(),
  closed: z.boolean(),
});
export type PublicReport = z.infer<typeof publicReportSchema>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isTicketId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export const PUBLIC_REPORT_MESSAGES = {
  malformed: "Ese código no tiene el formato correcto. Copialo tal cual figura en tu comprobante.",
  readableReference: "Ese es el número de referencia de tu denuncia, pero para consultar necesitás el código de seguimiento, que es otro. Buscalo en tu comprobante.",
  notFound: "No encontramos una denuncia con ese código. Revisá que sea el código de seguimiento de tu comprobante.",
  rateLimited: "Hiciste muchas consultas seguidas. Probá de nuevo en un minuto.",
  unavailable: "El servicio no responde en este momento.",
} as const;

export type PublicReportLookupFailure = keyof typeof PUBLIC_REPORT_MESSAGES;

/** Valida lo que escribió la persona antes de gastar una consulta. */
export function checkTicketInput(raw: string): { ticketId: string } | { failure: "malformed" | "readableReference" } {
  const value = raw.trim();
  if (/^TK-/i.test(value)) return { failure: "readableReference" };
  if (!isTicketId(value)) return { failure: "malformed" };
  return { ticketId: value.toLowerCase() };
}

export type PublicReportLookup =
  | { ok: true; report: PublicReport }
  | { ok: false; failure: PublicReportLookupFailure };

/** Consulta el BFF público. Nunca devuelve el cuerpo crudo: una respuesta fuera de contrato es "no responde". */
export async function fetchPublicReport(ticketId: string, signal?: AbortSignal): Promise<PublicReportLookup> {
  let response: Response;
  try {
    response = await fetch(`/api/public/reports/${encodeURIComponent(ticketId)}`, { signal, cache: "no-store" });
  } catch (error) {
    if (signal?.aborted) throw error;
    return { ok: false, failure: "unavailable" };
  }
  if (response.status === 404) return { ok: false, failure: "notFound" };
  if (response.status === 429) return { ok: false, failure: "rateLimited" };
  if (response.status === 400) return { ok: false, failure: "malformed" };
  if (!response.ok) return { ok: false, failure: "unavailable" };
  const parsed = publicReportSchema.safeParse(await response.json().catch(() => undefined));
  return parsed.success ? { ok: true, report: parsed.data } : { ok: false, failure: "unavailable" };
}
