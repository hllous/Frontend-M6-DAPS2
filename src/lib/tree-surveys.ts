import { z } from "zod";

import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";

export const treeHealthStatusSchema = z.enum(["HEALTHY", "WEAKENED", "DISEASED", "DEAD"]);
export type TreeHealthStatus = z.infer<typeof treeHealthStatusSchema>;
export const riskLevelSchema = z.enum(["NONE", "LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type RiskLevel = z.infer<typeof riskLevelSchema>;
export const riskTypeSchema = z.enum(["FALLING_BRANCH", "TRUNK_INSTABILITY", "ROOT_UPLIFT", "POWER_LINE_CONTACT", "SIGN_OBSTRUCTION", "PEST_INFESTATION"]);
export type RiskType = z.infer<typeof riskTypeSchema>;
export const treeInterventionTypeSchema = z.enum(["FORMATION_PRUNING", "SAFETY_PRUNING", "REMOVAL", "PLANTING", "TREATMENT"]);
export type TreeInterventionType = z.infer<typeof treeInterventionTypeSchema>;

export const treeSurveySchema = z.object({
  id: z.string(),
  treeId: z.string(),
  surveyedAt: z.string(),
  inspectorId: z.string().nullable(),
  healthStatus: treeHealthStatusSchema,
  riskLevel: riskLevelSchema,
  riskType: riskTypeSchema.nullable(),
  suggestedIntervention: treeInterventionTypeSchema.nullable(),
  requiresStreetClosure: z.boolean(),
  requiresPublicWorks: z.boolean(),
  notes: z.string().nullable(),
});
export type TreeSurvey = z.infer<typeof treeSurveySchema>;

export const treeSurveyCreateInputSchema = z.object({
  surveyedAt: z.string().trim().min(1, "La fecha del relevamiento es obligatoria."),
  healthStatus: treeHealthStatusSchema,
  riskLevel: riskLevelSchema,
  riskType: riskTypeSchema.optional(),
  suggestedIntervention: treeInterventionTypeSchema.optional(),
  requiresStreetClosure: z.boolean(),
  requiresPublicWorks: z.boolean(),
  notes: z.string().trim().max(2000, "Las observaciones no pueden superar los 2000 caracteres.").optional(),
}).refine((input) => !["HIGH", "CRITICAL"].includes(input.riskLevel) || Boolean(input.riskType), {
  path: ["riskType"],
  message: "Indique el tipo de riesgo para niveles altos o críticos.",
});
export type TreeSurveyCreateInput = z.infer<typeof treeSurveyCreateInputSchema>;

export type TreeSurveyQuery = {
  healthStatus?: TreeHealthStatus;
  riskLevel?: RiskLevel;
  page?: number;
  pageSize?: number;
};

export type TreeSurveysPage = {
  surveys: TreeSurvey[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export class TreeSurveyContractError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TreeSurveyContractError";
  }
}

export class TreeSurveyRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TreeSurveyRequestError";
    this.status = status;
  }
}

const pageSchema = z.object({
  data: z.array(treeSurveySchema),
  meta: z.object({ total: z.number(), page: z.number(), pageSize: z.number(), totalPages: z.number() }),
});
const errorResponseSchema = z.object({ statusCode: z.number(), message: z.union([z.string(), z.array(z.string())]), error: z.string(), timestamp: z.string(), path: z.string() });

const labels = {
  treeSurveys: "relevamientos de arbolado",
  treeSurvey: "relevamiento de arbolado",
};

function queryString(query: TreeSurveyQuery) {
  const params = new URLSearchParams();
  if (query.healthStatus) params.set("healthStatus", query.healthStatus);
  if (query.riskLevel) params.set("riskLevel", query.riskLevel);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const value = params.toString();
  return value ? `?${value}` : "";
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await authenticatedFetch(path, init);
  } catch (cause) {
    if (cause instanceof NetworkFailureError) recordTelemetryEvent({ name: "request_network_failure", resource: "tree-surveys" });
    throw cause;
  }

  let payload: unknown;
  try {
    payload = response.status === 204 ? undefined : await response.json();
  } catch (cause) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "tree-surveys" });
    throw new TreeSurveyContractError(`La respuesta de ${labels.treeSurveys} no es JSON válido.`, { cause });
  }
  if (!response.ok) {
    const parsedError = errorResponseSchema.safeParse(payload);
    if (!parsedError.success) throw new TreeSurveyContractError("La respuesta de error de relevamientos no respeta el contrato documentado.", { cause: parsedError.error });
    const message = Array.isArray(parsedError.data.message) ? parsedError.data.message.join(" ") : parsedError.data.message;
    throw new TreeSurveyRequestError(message, parsedError.data.statusCode);
  }
  return payload;
}

function parseSurvey(payload: unknown, message: string) {
  const parsed = treeSurveySchema.safeParse(payload);
  if (!parsed.success) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "tree-surveys" });
    throw new TreeSurveyContractError(message, { cause: parsed.error });
  }
  return parsed.data;
}

export const treeSurveysAdapter = {
  async getTreeSurveys(treeId: string, query: TreeSurveyQuery = {}): Promise<TreeSurveysPage> {
    const payload = await request(`/api/trees/${encodeURIComponent(treeId)}/surveys${queryString(query)}`);
    const parsed = pageSchema.safeParse(payload);
    if (!parsed.success) throw new TreeSurveyContractError("El historial de relevamientos no respeta el contrato esperado.", { cause: parsed.error });
    return { surveys: parsed.data.data, page: parsed.data.meta.page, pageSize: parsed.data.meta.pageSize, total: parsed.data.meta.total, totalPages: parsed.data.meta.totalPages };
  },

  async createTreeSurvey(treeId: string, input: TreeSurveyCreateInput): Promise<TreeSurvey> {
    const parsedInput = treeSurveyCreateInputSchema.safeParse(input);
    if (!parsedInput.success) throw new TreeSurveyContractError("Los datos del relevamiento son inválidos.", { cause: parsedInput.error });
    return parseSurvey(await request(`/api/trees/${encodeURIComponent(treeId)}/surveys`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsedInput.data) }), "La respuesta de creación del relevamiento no respeta el contrato esperado.");
  },

  async getTreeSurvey(treeId: string, surveyId: string): Promise<TreeSurvey> {
    return parseSurvey(await request(`/api/trees/${encodeURIComponent(treeId)}/surveys/${encodeURIComponent(surveyId)}`), "El detalle del relevamiento no respeta el contrato esperado.");
  },
};
