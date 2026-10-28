import { z } from "zod";

import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";

/** Barrio del catálogo de M9 que cachea el backend de M6. `id` (UUID) es lo que se guarda en una zona. */
export const neighborhoodSchema = z.object({
  id: z.string(),
  codigo: z.string(),
  nombre: z.string(),
  /** Comuna administrativa de M9 (`comuna-14`); los barrios dados de baja traen zonas ficticias (`norte`). */
  zona: z.string(),
  zonaNombre: z.string(),
  metadatos: z.record(z.string(), z.unknown()).nullish(),
  activo: z.boolean(),
});

export type Neighborhood = z.infer<typeof neighborhoodSchema>;

export type NeighborhoodQuery = {
  soloActivos?: boolean;
  zona?: string;
  q?: string;
};

export class NeighborhoodRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "NeighborhoodRequestError";
    this.status = status;
  }
}

/** 503 del backend: el catálogo de M9 todavía no se pudo leer del Core. */
export function isCatalogUnavailable(error: unknown): boolean {
  return error instanceof NeighborhoodRequestError && error.status === 503;
}

const SUBJECT_LABEL = { barrios: "los barrios", comunas: "las comunas" } as const;
const RESOURCE = { barrios: "neighborhoods", comunas: "communes" } as const;

/** Mensaje para el usuario según el fallo del catálogo. Solo los barrios tienen 503 en el contrato. */
export function catalogErrorMessage(error: unknown, subject: "barrios" | "comunas" = "barrios"): string {
  return subject === "barrios" && isCatalogUnavailable(error)
    ? "El catálogo de barrios todavía no está disponible. Intente nuevamente en unos minutos."
    : `No se pudieron cargar ${SUBJECT_LABEL[subject]}. Intente nuevamente.`;
}

/** Lee `GET /api/<recurso>` del BFF (array sin paginar): errores tipados y forma validada. */
export async function fetchCatalogList<T extends z.ZodType>(
  url: string,
  itemSchema: T,
  subject: "barrios" | "comunas",
): Promise<z.output<T>[]> {
  let response: Response;
  try {
    response = await authenticatedFetch(url);
  } catch (cause) {
    if (cause instanceof NetworkFailureError) {
      recordTelemetryEvent({ name: "request_network_failure", resource: RESOURCE[subject] });
    }
    throw cause;
  }

  const payload: unknown = await response.json().catch(() => undefined);
  if (!response.ok) {
    const message = (payload as { message?: unknown } | undefined)?.message;
    throw new NeighborhoodRequestError(
      Array.isArray(message) ? message.join(" ") : typeof message === "string" ? message : `No se pudieron cargar ${SUBJECT_LABEL[subject]}.`,
      response.status,
    );
  }

  const parsed = z.array(itemSchema).safeParse(payload);
  if (!parsed.success) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: RESOURCE[subject] });
    throw new NeighborhoodRequestError(`La respuesta de ${subject} no respeta el contrato esperado.`, 502);
  }
  return parsed.data;
}

export const neighborhoodsAdapter = {
  list(query: NeighborhoodQuery = {}): Promise<Neighborhood[]> {
    const params = new URLSearchParams();
    if (query.soloActivos !== undefined) params.set("soloActivos", String(query.soloActivos));
    if (query.zona) params.set("zona", query.zona);
    if (query.q) params.set("q", query.q);
    const queryString = params.toString();
    return fetchCatalogList(`/api/neighborhoods${queryString ? `?${queryString}` : ""}`, neighborhoodSchema, "barrios");
  },
};

/** El nombre se resuelve al mostrar (un barrio puede renombrarse); nunca se expone el id crudo. */
export type CatalogStatus = "loading" | "ready" | "failed";

export function neighborhoodName(catalog: Neighborhood[], id: string, status: CatalogStatus = "ready"): string {
  const found = catalog.find((neighborhood) => neighborhood.id === id);
  if (found) return found.nombre;
  if (status === "failed") return "No se pudo cargar el nombre";
  return status === "ready" ? "Barrio no disponible" : "Cargando barrio…";
}

export type NeighborhoodGroup = { key: string; label: string; neighborhoods: Neighborhood[] };

const communeNumber = (key: string) => Number(/^comuna-(\d+)$/.exec(key)?.[1] ?? Number.POSITIVE_INFINITY);

/** Agrupa por comuna (orden numérico, luego alfabético) y los barrios por nombre, para el selector. */
export function groupNeighborhoodsByCommune(neighborhoods: Neighborhood[]): NeighborhoodGroup[] {
  const groups = new Map<string, NeighborhoodGroup>();
  for (const neighborhood of neighborhoods) {
    const group = groups.get(neighborhood.zona) ?? { key: neighborhood.zona, label: neighborhood.zonaNombre, neighborhoods: [] };
    group.neighborhoods.push(neighborhood);
    groups.set(neighborhood.zona, group);
  }
  return [...groups.values()]
    .sort((a, b) => communeNumber(a.key) - communeNumber(b.key) || a.label.localeCompare(b.label, "es"))
    .map((group) => ({
      ...group,
      neighborhoods: [...group.neighborhoods].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    }));
}
