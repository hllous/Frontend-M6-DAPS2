import { backendMode, errorResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getRepairRequestFixture, repairRequestFixtures } from "@/lib/repair-request-fixtures";
import {
  getReferralSourceServiceIds,
  isReferralVisibleToScenario,
  isReferralVisibleToBackendSources,
  referralFromRepairRequest,
  referralFromBackendRepairRequest,
  referralFromStreetClosureRequest,
  type Referral,
} from "@/lib/referrals";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { repairRequestSchema } from "@/lib/repair-requests";
import { streetClosureRequestSchema } from "@/lib/street-closure-requests";
import { serviceSchema } from "@/lib/services";
import { getStreetClosureRequestFixture, streetClosureRequestFixtures } from "@/lib/street-closure-request-fixtures";





export function fixtureReferrals(): Referral[] {
  return [
    ...repairRequestFixtures.map(referralFromRepairRequest),
    ...streetClosureRequestFixtures.map(referralFromStreetClosureRequest),
  ].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export function referralsForScenario(scenario: ReturnType<typeof getScenario>): Referral[] {
  const serviceIds = getReferralSourceServiceIds(scenario);
  return fixtureReferrals().filter((referral) =>
    serviceIds === undefined || isReferralVisibleToScenario(referral, scenario),
  );
}

export async function backendCollection<T>(request: Request, path: string, recordSchema: z.ZodType<T>): Promise<T[]> {
  const pageSchema = z.object({
    data: z.array(recordSchema),
    meta: z.object({
      total: z.number().int().nonnegative(),
      page: z.number().int().positive(),
      pageSize: z.number().int().positive().max(100),
      totalPages: z.number().int().nonnegative(),
    }),
  });
  const records: T[] = [];
  for (let page = 1; page <= 50; page += 1) {
    const query = new URLSearchParams(path.split("?")[1]);
    query.set("page", String(page));
    query.set("pageSize", "100");
    const response = await fetchBackend(request, `${path.split("?")[0]}?${query}`);
    if (!response.ok) throw new Error(`Backend respondió ${response.status} al consultar derivaciones.`);
    const payload = pageSchema.parse(await response.json());
    records.push(...payload.data);
    if (page >= payload.meta.totalPages) return records;
  }
  throw new Error("La consulta de derivaciones superó el límite de páginas.");
}

const referralServiceSchema = serviceSchema.pick({ id: true, crewId: true, origin: true, inspectionId: true });

export async function backendReferralSourceIds(request: Request, crewId: string): Promise<ReadonlySet<string>> {
  const services = await backendCollection(request, `/services?crewId=${encodeURIComponent(crewId)}`, referralServiceSchema);
  const sourceIds = new Set<string>();
  for (const service of services) {
    if (service.crewId !== crewId) continue;
    sourceIds.add(service.id);
    let inspectionId = service.inspectionId;
    if (inspectionId === undefined && service.origin === "INSPECTION") {
      const response = await fetchBackend(request, `/services/${pathId(service.id)}`);
      if (!response.ok) throw new Error(`Backend respondió ${response.status} al consultar el servicio.`);
      const detail = referralServiceSchema.parse(await response.json());
      if (detail.id === service.id && detail.crewId === crewId) inspectionId = detail.inspectionId;
    }
    if (inspectionId) sourceIds.add(inspectionId);
  }
  return sourceIds;
}

async function backendReferralCollection(request: Request, sourceIds: ReadonlySet<string> | undefined): Promise<Referral[]> {
  const [repairs, closures] = await Promise.all([
    backendCollection(request, "/repair-requests", repairRequestSchema),
    backendCollection(request, "/street-closure-requests", streetClosureRequestSchema),
  ]);
  return [
    ...repairs.map(referralFromBackendRepairRequest),
    ...closures.map(referralFromStreetClosureRequest),
  ].filter((referral) => isReferralVisibleToBackendSources(referral, sourceIds))
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session);
    if (scenario.actor.kind !== "OFFICE" && scenario.actor.kind !== "FIELD") {
      return errorResponse(403, "Solo Oficina o Campo puede consultar derivaciones.", path);
    }

    const useBackend = backendMode(session);
    if (useBackend && scenario.actor.kind === "FIELD" && !session.crew?.id) {
      return errorResponse(403, "Solo puede consultar derivaciones de su cuadrilla.", path);
    }
    const sourceIds = useBackend && scenario.actor.kind === "FIELD"
      ? await backendReferralSourceIds(request, session.crew!.id)
      : undefined;
    const referrals = useBackend
      ? await backendReferralCollection(request, sourceIds)
      : referralsForScenario(scenario);
    return NextResponse.json({ data: referrals, meta: { total: referrals.length } });
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudieron cargar las derivaciones.", path);
  }
}

export function findFixtureReferral(id: string): Referral | null {
  const repair = getRepairRequestFixture(id);
  if (repair) return referralFromRepairRequest(repair);
  const closure = getStreetClosureRequestFixture(id);
  return closure ? referralFromStreetClosureRequest(closure) : null;
}
