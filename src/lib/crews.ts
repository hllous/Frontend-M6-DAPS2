import { z } from "zod";

import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";

export const crewTypeSchema = z.enum(["MUNICIPAL", "COOPERATIVE", "CONTRACTOR"]);
export const shiftSchema = z.enum(["MORNING", "AFTERNOON", "NIGHT"]);
export type CrewType = z.infer<typeof crewTypeSchema>;
export type Shift = z.infer<typeof shiftSchema>;

export const crewSchema = z.object({
  id: z.string(), name: z.string(), crewType: crewTypeSchema, leaderUserId: z.string(), memberUserIds: z.array(z.string()), organizationId: z.string(), defaultShift: shiftSchema, active: z.boolean(),
});
export type Crew = z.infer<typeof crewSchema>;
export type CrewQuery = { active?: boolean; crewType?: CrewType; defaultShift?: Shift; page?: number; pageSize?: number };
export type CrewsPage = { crews: Crew[]; page: number; pageSize: number; total: number; totalPages: number };

export const createCrewInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio."), crewType: crewTypeSchema, leaderUserId: z.string().min(1), organizationId: z.string().min(1), defaultShift: shiftSchema,
});
export type CreateCrewInput = z.infer<typeof createCrewInputSchema>;
export const updateCrewInputSchema = createCrewInputSchema.extend({ active: z.boolean() }).strict();
export type UpdateCrewInput = z.infer<typeof updateCrewInputSchema>;

export class CrewContractError extends Error { constructor(message: string, options?: { cause?: unknown }) { super(message, options); this.name = "CrewContractError"; } }
export class CrewRequestError extends Error { readonly status: number; constructor(message: string, status: number, options?: { cause?: unknown }) { super(message, options); this.name = "CrewRequestError"; this.status = status; } }

const pageSchema = z.object({ data: z.array(crewSchema), meta: z.object({ total: z.number(), page: z.number(), pageSize: z.number(), totalPages: z.number() }) });
const errorSchema = z.object({ statusCode: z.number(), message: z.union([z.string(), z.array(z.string())]), error: z.string(), timestamp: z.string(), path: z.string() });

function queryString(query: CrewQuery) {
  const params = new URLSearchParams();
  if (query.active !== undefined) params.set("active", String(query.active));
  if (query.crewType) params.set("crewType", query.crewType);
  if (query.defaultShift) params.set("defaultShift", query.defaultShift);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const value = params.toString(); return value ? `?${value}` : "";
}
async function requestJson(path: string, init?: RequestInit) {
  let response: Response;
  try { response = await authenticatedFetch(path, init); } catch (cause) { if (cause instanceof NetworkFailureError) recordTelemetryEvent({ name: "request_network_failure", resource: "crews" }); throw cause; }
  let payload: unknown;
  try { payload = await response.json(); } catch (cause) { recordTelemetryEvent({ name: "request_malformed_response", resource: "crews" }); throw new CrewContractError("La respuesta de cuadrillas no es JSON válido.", { cause }); }
  if (!response.ok) { const parsed = errorSchema.safeParse(payload); if (!parsed.success) throw new CrewContractError("La respuesta de error no respeta el contrato documentado.", { cause: parsed.error }); const message = Array.isArray(parsed.data.message) ? parsed.data.message.join(" ") : parsed.data.message; throw new CrewRequestError(message, parsed.data.statusCode); }
  return payload;
}
function resource(payload: unknown, message: string): Crew {
  const raw = payload && typeof payload === "object" && "data" in payload && !("id" in payload) ? (payload as { data: unknown }).data : payload;
  const parsed = crewSchema.safeParse(raw); if (!parsed.success) { recordTelemetryEvent({ name: "request_malformed_response", resource: "crews" }); throw new CrewContractError(message, { cause: parsed.error }); } return parsed.data;
}

export const crewsAdapter = {
  async list(query: CrewQuery = {}): Promise<CrewsPage> { const parsed = pageSchema.safeParse(await requestJson(`/api/crews${queryString(query)}`)); if (!parsed.success) { recordTelemetryEvent({ name: "request_malformed_response", resource: "crews" }); throw new CrewContractError("La lista de cuadrillas no respeta el contrato esperado.", { cause: parsed.error }); } return { crews: parsed.data.data, page: parsed.data.meta.page, pageSize: parsed.data.meta.pageSize, total: parsed.data.meta.total, totalPages: parsed.data.meta.totalPages }; },
  async get(id: string) { return resource(await requestJson(`/api/crews/${id}`), "El detalle de cuadrilla no respeta el contrato esperado."); },
  async create(input: CreateCrewInput) { const parsed = createCrewInputSchema.safeParse(input); if (!parsed.success) throw new CrewContractError("Los datos de la cuadrilla son inválidos.", { cause: parsed.error }); return resource(await requestJson("/api/crews", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) }), "La respuesta de creación de cuadrilla no respeta el contrato esperado."); },
  async update(id: string, input: UpdateCrewInput) { const parsed = updateCrewInputSchema.safeParse(input); if (!parsed.success) throw new CrewContractError("Los datos editables de la cuadrilla son inválidos.", { cause: parsed.error }); return resource(await requestJson(`/api/crews/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) }), "La respuesta de actualización de cuadrilla no respeta el contrato esperado."); },
  async remove(id: string) { return resource(await requestJson(`/api/crews/${id}`, { method: "DELETE" }), "La respuesta de baja de cuadrilla no respeta el contrato esperado."); },
};
