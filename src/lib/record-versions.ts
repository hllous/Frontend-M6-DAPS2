/**
 * Concurrencia optimista del lado del navegador (ADR-012 del backend; `docs/adr/0009-concurrencia-optimista-y-timeout-del-bff.md`).
 *
 * Guarda, por registro, la última versión que la pestaña leyó y la manda como `If-Match` al guardar o transicionar ese
 * registro. Si otra persona lo cambió en el medio, el backend responde 412 y la interfaz avisa sin pisar nada.
 *
 * De dónde sale la versión, en orden:
 * 1. el header `ETag` de `GET /api/<recurso>/:id` y de la respuesta de una escritura sobre ese registro;
 * 2. si la respuesta no lo trae (un listado, o una ruta que arma el cuerpo), `W/"<ms de updatedAt>"`, que es exactamente
 *    como el backend calcula el ETag. Sin `updatedAt` no hay versión y la escritura sale sin `If-Match`, como antes.
 */

export const STALE_RECORD_EVENT = "m6:stale-record";
/** Texto del 412: lo usa el BFF en el cuerpo y la interfaz en el aviso. */
export const STALE_RECORD_MESSAGE = "Otra persona modificó este registro. Recargue para ver los cambios.";

/** Recursos con ETag en el backend y las acciones que aceptan `If-Match` (ADR-012, `docs/backend-context/api/endpoints.md`). */
const VERSIONED_ACTIONS: Record<string, ReadonlySet<string>> = {
  containers: new Set(["report-overflow", "report-damage", "empty", "start-repair", "complete-repair", "relocate", "confirm-relocation", "remove"]),
  services: new Set(["start", "suspend", "resume", "complete", "cancel", "reschedule", "confirm-reschedule"]),
  "tree-interventions": new Set(["submit-for-authorization", "authorize", "reject"]),
  "environmental-reports": new Set(["start-review", "forward", "dismiss", "close"]),
};
/** `PATCH /:id` de edición de datos: solo existe en estos dos (el backend también lo acepta en servicios). */
const VERSIONED_PATCH = new Set(["containers", "services"]);

type Target =
  | { kind: "list"; resource: string }
  | { kind: "record"; resource: string; id: string; action?: string };

export type StaleRecordDetail = { resource: string; id: string };

const versions = new Map<string, string>();

function key(resource: string, id: string) {
  return `${resource}/${id}`;
}

function target(input: string): Target | undefined {
  let pathname: string;
  try {
    pathname = new URL(input, "http://bff.local").pathname;
  } catch {
    return undefined;
  }
  const [, api, resource, rawId, action, extra] = pathname.split("/");
  if (api !== "api" || !resource || !(resource in VERSIONED_ACTIONS) || extra !== undefined) return undefined;
  if (rawId === undefined || rawId === "") return { kind: "list", resource };
  let id: string;
  try {
    id = decodeURIComponent(rawId);
  } catch {
    return undefined;
  }
  return { kind: "record", resource, id, ...(action ? { action } : {}) };
}

function methodOf(init?: RequestInit) {
  return (init?.method ?? "GET").toUpperCase();
}

/** Escritura que el backend versiona: una transición conocida o el `PATCH` de edición. */
function versionedWrite(t: Target | undefined, method: string): t is Extract<Target, { kind: "record" }> {
  if (!t || t.kind !== "record") return false;
  if (t.action === undefined) return method === "PATCH" && VERSIONED_PATCH.has(t.resource);
  return method === "POST" && VERSIONED_ACTIONS[t.resource]?.has(t.action) === true;
}

function versionFromUpdatedAt(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? `W/"${ms}"` : undefined;
}

function remember(resource: string, item: unknown, etag?: string | null) {
  if (!item || typeof item !== "object") return;
  const record = item as { id?: unknown; updatedAt?: unknown };
  if (typeof record.id !== "string") return;
  const version = etag || versionFromUpdatedAt(record.updatedAt);
  if (version) versions.set(key(resource, record.id), version);
}

/** Agrega `If-Match` con la versión leída cuando la llamada es una escritura versionada y el llamador no fijó uno. */
export function withRecordVersion(input: string, init?: RequestInit): RequestInit | undefined {
  const t = target(input);
  if (!versionedWrite(t, methodOf(init))) return init;
  const version = versions.get(key(t.resource, t.id));
  if (!version) return init;
  const headers = new Headers(init?.headers);
  if (headers.has("if-match")) return init;
  headers.set("If-Match", version);
  return { ...init, headers };
}

/**
 * Lee la versión de la respuesta (sin consumir su cuerpo) y, ante un 412 de una escritura versionada, avisa a la
 * interfaz con `STALE_RECORD_EVENT`. No reintenta: el usuario decide recargar.
 */
export async function rememberRecordVersions(input: string, init: RequestInit | undefined, response: Response): Promise<void> {
  const t = target(input);
  if (!t) return;
  const method = methodOf(init);
  if (response.status === 412) {
    if (versionedWrite(t, method) && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent<StaleRecordDetail>(STALE_RECORD_EVENT, { detail: { resource: t.resource, id: t.id } }));
    }
    return;
  }
  if (!response.ok) return;
  const isRead = method === "GET";
  if (t.kind === "list" ? !isRead : !(isRead && t.action === undefined) && !versionedWrite(t, method)) return;

  const etag = t.kind === "record" ? response.headers.get("etag") : null;
  if (etag && t.kind === "record") {
    versions.set(key(t.resource, t.id), etag);
    return;
  }
  const body: unknown = await response.clone().json().catch(() => undefined);
  if (t.kind === "record") {
    if (body && typeof body === "object" && (body as { id?: unknown }).id === t.id) remember(t.resource, body);
    return;
  }
  const items = Array.isArray(body)
    ? body
    : body && typeof body === "object" && Array.isArray((body as { data?: unknown }).data)
      ? (body as { data: unknown[] }).data
      : [];
  for (const item of items) remember(t.resource, item);
}

/** Versión guardada de un registro (pruebas y diagnóstico). */
export function recordVersion(resource: string, id: string): string | undefined {
  return versions.get(key(resource, id));
}

export function resetRecordVersions() {
  versions.clear();
}
