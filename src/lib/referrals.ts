import { z } from "zod";

import { authenticatedFetch } from "./authenticated-fetch";
import { environmentalInspectionFixtures, environmentalReportFixtures } from "./environmental-report-fixtures";
import type { RepairRequest } from "./repair-requests";
import { serviceFixtures } from "./services-fixtures";
import type { OperationalScenario } from "./scenarios";
import type { StreetClosureRequest } from "./street-closure-requests";

export type Referral =
  | {
      kind: "REPAIR_REQUEST";
      destination: "M3";
      id: string;
      sourceServiceId: string;
      sourceLabel: string;
      sourceHref: string;
      status: RepairRequest["status"];
      createdAt: string;
      updatedAt: string;
      request: RepairRequest;
    }
  | {
      kind: "STREET_CLOSURE_REQUEST";
      destination: "M7";
      id: string;
      sourceServiceId: string;
      sourceLabel: string;
      sourceHref: string;
      status: StreetClosureRequest["status"];
      createdAt: string;
      updatedAt: string;
      request: StreetClosureRequest;
    };

export type ReferralsPage = {
  referrals: Referral[];
  total: number;
};

const referralSourceSchema = z.object({
  id: z.string(),
  label: z.string(),
  href: z.string(),
});

const referralSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("REPAIR_REQUEST"),
    destination: z.literal("M3"),
    id: z.string(),
    sourceServiceId: z.string(),
    sourceLabel: z.string(),
    sourceHref: z.string(),
    status: z.enum(["REQUESTED", "IN_PROGRESS", "CLOSED"]),
    createdAt: z.string(),
    updatedAt: z.string(),
    request: z.object({
      id: z.string(),
      damageType: z.string(),
      address: z.string(),
      severity: z.string(),
      publicSafetyRisk: z.boolean(),
      detectedInType: z.string(),
      detectedInId: z.string(),
      status: z.enum(["REQUESTED", "IN_PROGRESS", "CLOSED"]),
      workOrderId: z.string().nullable().optional(),
      requestedAt: z.string(),
    }).passthrough(),
  }),
  z.object({
    kind: z.literal("STREET_CLOSURE_REQUEST"),
    destination: z.literal("M7"),
    id: z.string(),
    sourceServiceId: z.string(),
    sourceLabel: z.string(),
    sourceHref: z.string(),
    status: z.enum(["REQUESTED", "APPROVED", "REJECTED", "ENDED"]),
    createdAt: z.string(),
    updatedAt: z.string(),
    request: z.object({
      id: z.string(),
      reason: z.string(),
      sourceType: z.string(),
      sourceId: z.string(),
      sourceModule: z.literal("M6"),
      closureType: z.enum(["TOTAL", "PARTIAL"]),
      requestedFrom: z.string(),
      requestedTo: z.string(),
      affectedSections: z.array(z.object({
        streetName: z.string(),
        fromCross: z.string(),
        toCross: z.string(),
      })),
      status: z.enum(["REQUESTED", "APPROVED", "REJECTED", "ENDED"]),
      closureId: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }).passthrough(),
  }),
]);

const referralsPageSchema = z.object({
  data: z.array(referralSchema),
  meta: z.object({ total: z.number() }),
});

export function getReferralSourceServiceIds(scenario: OperationalScenario): string[] | undefined {
  if (scenario.actor.kind === "OFFICE") return undefined;
  const serviceIds = serviceFixtures
    .filter((service) => service.crewId === scenario.actor.crewId)
    .map((service) => service.id);
  // ── Issue #137: EnvironmentalInspection referral visibility ──
  const inspectionIds = environmentalInspectionFixtures
    .filter((inspection) => inspection.serviceId && serviceIds.includes(inspection.serviceId))
    .map((inspection) => inspection.id);
  // ── End issue #137 ──
  return [...serviceIds, ...inspectionIds];
}

export function isReferralVisibleToScenario(referral: Pick<Referral, "sourceServiceId"> | { sourceServiceId: string }, scenario: OperationalScenario): boolean {
  const serviceIds = getReferralSourceServiceIds(scenario);
  return serviceIds === undefined || serviceIds.includes(referral.sourceServiceId);
}

export function serviceSourceHref(serviceId: string): string {
  return `/app?destination=services&detail=${encodeURIComponent(serviceId)}`;
}

function environmentalInspectionSourceHref(inspectionId: string): string {
  const inspection = environmentalInspectionFixtures.find((candidate) => candidate.id === inspectionId);
  const reportId = inspection?.reportId;
  const report = reportId ? environmentalReportFixtures.find((candidate) => candidate.id === reportId) : undefined;
  return `/app?destination=environment${report ? `&detail=${encodeURIComponent(report.id)}` : ""}&inspectionId=${encodeURIComponent(inspectionId)}`;
}

export function referralFromRepairRequest(request: RepairRequest): Referral {
  const source = request.sourceContext;
  const isInspection = request.detectedInType === "INSPECTION";
  return {
    kind: "REPAIR_REQUEST",
    destination: "M3",
    id: request.id,
    sourceServiceId: request.detectedInId,
    sourceLabel: source?.label ?? (isInspection ? `Inspección ambiental ${request.detectedInId}` : `Servicio ${request.detectedInId}`),
    sourceHref: source?.href ?? (isInspection ? environmentalInspectionSourceHref(request.detectedInId) : serviceSourceHref(request.detectedInId)),
    status: request.status,
    createdAt: request.createdAt ?? request.requestedAt,
    updatedAt: request.updatedAt ?? request.createdAt ?? request.requestedAt,
    request,
  };
}

export function referralFromStreetClosureRequest(request: StreetClosureRequest): Referral {
  return {
    kind: "STREET_CLOSURE_REQUEST",
    destination: "M7",
    id: request.id,
    sourceServiceId: request.sourceId,
    sourceLabel: request.sourceContext.title,
    sourceHref: serviceSourceHref(request.sourceId),
    status: request.status,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    request,
  };
}

export class ReferralContractError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ReferralContractError";
  }
}

async function requestJson(path: string): Promise<unknown> {
  const response = await authenticatedFetch(path);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    throw new ReferralContractError("La respuesta de derivaciones no es JSON válido.", { cause });
  }
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "message" in payload
      ? String((payload as { message: unknown }).message)
      : "No se pudieron cargar las derivaciones.";
    throw new ReferralContractError(message);
  }
  return payload;
}

export const referralsAdapter = {
  async list(): Promise<ReferralsPage> {
    const parsed = referralsPageSchema.safeParse(await requestJson("/api/referrals"));
    if (!parsed.success) throw new ReferralContractError("La lista de derivaciones no respeta el contrato esperado.", { cause: parsed.error });
    return { referrals: parsed.data.data as Referral[], total: parsed.data.meta.total };
  },

  async get(id: string): Promise<Referral> {
    const parsed = referralSchema.safeParse(await requestJson(`/api/referrals/${encodeURIComponent(id)}`));
    if (!parsed.success) throw new ReferralContractError("El detalle de la derivación no respeta el contrato esperado.", { cause: parsed.error });
    return parsed.data as Referral;
  },
};
