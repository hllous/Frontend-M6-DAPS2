import { z } from "zod";

import { serviceTypeCategorySchema } from "./service-types";

/** Contratos públicos de zonas y servicios (`GET /public/zones`, `GET /public/services`). Solo lo que el backend publica. */
export const publicZoneSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
});
export type PublicZone = z.infer<typeof publicZoneSchema>;

export const publicZonesSchema = z.array(publicZoneSchema);

export const publicServiceStageSchema = z.enum(["PROGRAMADO", "EN_CURSO", "REALIZADO", "REPROGRAMADO"]);
export type PublicServiceStage = z.infer<typeof publicServiceStageSchema>;

export const PUBLIC_SERVICE_STAGE_LABELS: Record<PublicServiceStage, string> = {
  PROGRAMADO: "Programado",
  EN_CURSO: "En curso",
  REALIZADO: "Realizado",
  REPROGRAMADO: "Reprogramado",
};

export const publicServiceSchema = z.object({
  id: z.string(),
  serviceTypeName: z.string(),
  category: serviceTypeCategorySchema,
  scheduledDate: z.string(),
  windowFrom: z.string().nullish(),
  windowTo: z.string().nullish(),
  stage: publicServiceStageSchema,
  zones: z.array(z.string()),
});
export type PublicService = z.infer<typeof publicServiceSchema>;

export const publicServicesPageSchema = z.object({
  data: z.array(publicServiceSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
  }),
});
export type PublicServicesPage = z.infer<typeof publicServicesPageSchema>;

/** Claves de consulta que el BFF público reenvía al backend para los servicios. */
export const PUBLIC_SERVICES_QUERY_KEYS = ["zoneId", "from", "to", "page", "pageSize"] as const;

export const PUBLIC_SERVICE_MESSAGES = {
  rateLimited: "Hiciste muchas consultas seguidas. Probá de nuevo en un minuto.",
  unavailable: "El servicio no responde en este momento.",
} as const;

export type PublicLookupFailure = keyof typeof PUBLIC_SERVICE_MESSAGES;

export type PublicLookup<T> = { ok: true; data: T } | { ok: false; failure: PublicLookupFailure };

async function getPublic<T>(url: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<PublicLookup<T>> {
  let response: Response;
  try {
    response = await fetch(url, { signal, cache: "no-store" });
  } catch (error) {
    if (signal?.aborted) throw error;
    return { ok: false, failure: "unavailable" };
  }
  if (response.status === 429) return { ok: false, failure: "rateLimited" };
  if (!response.ok) return { ok: false, failure: "unavailable" };
  const parsed = schema.safeParse(await response.json().catch(() => undefined));
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, failure: "unavailable" };
}

export function fetchPublicZones(signal?: AbortSignal) {
  return getPublic("/api/public/zones", publicZonesSchema, signal);
}

/** Pide la primera página con el máximo de filas: la ventana por defecto del backend son los próximos 30 días. */
export function fetchPublicServices(zoneId: string, signal?: AbortSignal) {
  const query = new URLSearchParams({ zoneId, page: "1", pageSize: "100" });
  return getPublic(`/api/public/services?${query}`, publicServicesPageSchema, signal);
}

/** Agrupa por día de `scheduledDate` (YYYY-MM-DD), en orden de fecha y luego de hora de inicio. */
export function groupServicesByDate(services: readonly PublicService[]): { date: string; services: PublicService[] }[] {
  const groups = new Map<string, PublicService[]>();
  for (const service of services) {
    const date = service.scheduledDate.slice(0, 10);
    groups.set(date, [...(groups.get(date) ?? []), service]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, items]) => ({
      date,
      services: items.sort((a, b) => (a.windowFrom ?? "99:99").localeCompare(b.windowFrom ?? "99:99")),
    }));
}
