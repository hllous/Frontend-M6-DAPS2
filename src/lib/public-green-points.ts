import { z } from "zod";

import { WASTE_TYPE_LABELS, wasteTypeSchema } from "./green-points";
import type { PublicLookup } from "./public-services";

export const publicGreenPointSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  address: z.string().nullish(),
  lat: z.number().finite().min(-90).max(90).nullish(),
  lng: z.number().finite().min(-180).max(180).nullish(),
  zoneName: z.string(),
  wasteTypes: z.array(wasteTypeSchema),
});
export type PublicGreenPoint = z.infer<typeof publicGreenPointSchema>;

export const publicGreenPointsPageSchema = z.object({
  data: z.array(publicGreenPointSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
  }),
});
export type PublicGreenPointsPage = z.infer<typeof publicGreenPointsPageSchema>;

/** El backend público solo filtra por zona; el filtro de residuos queda en el navegador. */
export const PUBLIC_GREEN_POINTS_QUERY_KEYS = ["zoneId", "page", "pageSize"] as const;
export const PUBLIC_GREEN_POINTS_CACHE_CONTROL = "public, max-age=60";

export const PUBLIC_GREEN_POINT_MESSAGES = {
  rateLimited: "Hiciste muchas consultas seguidas. Probá de nuevo en un minuto.",
  unavailable: "El servicio no responde en este momento.",
} as const;

export const PUBLIC_GREEN_POINT_WASTE_LABELS = WASTE_TYPE_LABELS;

export async function fetchPublicGreenPoints(zoneId: string, signal?: AbortSignal): Promise<PublicLookup<PublicGreenPointsPage>> {
  const query = new URLSearchParams({ zoneId, page: "1", pageSize: "100" });
  let response: Response;
  try {
    response = await fetch(`/api/public/green-points?${query}`, { signal, cache: "no-store" });
  } catch (error) {
    if (signal?.aborted) throw error;
    return { ok: false, failure: "unavailable" };
  }
  if (response.status === 429) return { ok: false, failure: "rateLimited" };
  if (!response.ok) return { ok: false, failure: "unavailable" };

  const parsed = publicGreenPointsPageSchema.safeParse(await response.json().catch(() => undefined));
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, failure: "unavailable" };
}
