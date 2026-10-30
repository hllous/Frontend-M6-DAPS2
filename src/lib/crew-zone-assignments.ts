import { z } from "zod";

import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { CrewContractError } from "./crews";
import { recordTelemetryEvent } from "./telemetry";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "La fecha no es válida.");

export const crewZoneAssignmentSchema = z.object({
  id: z.string(), crewId: z.string(), zoneId: z.string(), validFrom: dateOnly, validTo: dateOnly.nullable().default(null),
  reason: z.string(), createdBy: z.string().nullable().default(null), createdAt: z.string().nullable().default(null),
});
export type CrewZoneAssignment = z.infer<typeof crewZoneAssignmentSchema>;

export const createCrewZoneAssignmentInputSchema = z.object({
  zoneId: z.string().trim().min(1, "Elija la zona de destino."),
  validFrom: dateOnly.catch("").refine(Boolean, "Indique la fecha de inicio."),
  validTo: dateOnly.nullish(),
  reason: z.string().trim().min(1, "El motivo es obligatorio.").max(500, "El motivo admite hasta 500 caracteres."),
}).refine((value) => !value.validTo || value.validTo >= value.validFrom, { path: ["validTo"], message: "La fecha de fin no puede ser anterior a la de inicio." });
export type CreateCrewZoneAssignmentInput = z.infer<typeof createCrewZoneAssignmentInputSchema>;

export class CrewZoneAssignmentRequestError extends Error { readonly status: number; constructor(message: string, status: number) { super(message); this.name = "CrewZoneAssignmentRequestError"; this.status = status; } }

const errorSchema = z.object({ statusCode: z.number(), message: z.union([z.string(), z.array(z.string())]) });

async function requestJson(path: string, init?: RequestInit) {
  let response: Response;
  try { response = await authenticatedFetch(path, init); } catch (cause) { if (cause instanceof NetworkFailureError) recordTelemetryEvent({ name: "request_network_failure", resource: "crews" }); throw cause; }
  let payload: unknown;
  try { payload = await response.json(); } catch (cause) { recordTelemetryEvent({ name: "request_malformed_response", resource: "crews" }); throw new CrewContractError("La respuesta de reubicaciones no es JSON válido.", { cause }); }
  if (!response.ok) {
    const parsed = errorSchema.safeParse(payload);
    if (!parsed.success) throw new CrewContractError("La respuesta de error no respeta el contrato documentado.", { cause: parsed.error });
    throw new CrewZoneAssignmentRequestError(Array.isArray(parsed.data.message) ? parsed.data.message.join(" ") : parsed.data.message, parsed.data.statusCode);
  }
  return payload;
}

export const crewZoneAssignmentsAdapter = {
  async list(crewId: string): Promise<CrewZoneAssignment[]> {
    const payload = await requestJson(`/api/crews/${encodeURIComponent(crewId)}/zone-assignments`);
    const parsed = z.array(crewZoneAssignmentSchema).safeParse(Array.isArray(payload) ? payload : (payload as { data?: unknown })?.data);
    if (!parsed.success) { recordTelemetryEvent({ name: "request_malformed_response", resource: "crews" }); throw new CrewContractError("El historial de reubicaciones no respeta el contrato esperado.", { cause: parsed.error }); }
    return parsed.data;
  },
  async create(crewId: string, input: CreateCrewZoneAssignmentInput): Promise<CrewZoneAssignment> {
    const parsedInput = createCrewZoneAssignmentInputSchema.safeParse(input);
    if (!parsedInput.success) throw new CrewContractError("Los datos de la reubicación son inválidos.", { cause: parsedInput.error });
    const payload = await requestJson(`/api/crews/${encodeURIComponent(crewId)}/zone-assignments`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsedInput.data) });
    const parsed = crewZoneAssignmentSchema.safeParse(payload);
    if (!parsed.success) { recordTelemetryEvent({ name: "request_malformed_response", resource: "crews" }); throw new CrewContractError("La respuesta de reubicación no respeta el contrato esperado.", { cause: parsed.error }); }
    return parsed.data;
  },
};
