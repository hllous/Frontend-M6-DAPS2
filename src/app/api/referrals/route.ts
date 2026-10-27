import { backendMode, errorResponse, mapSessionError } from "@/lib/bff-route";
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

/**
 * Strict by default: any invalid record fails the collection. With `onInvalid` each record is
 * validated on its own and invalid ones are reported and dropped, so one unknown value (e.g. a new
 * backend enum member) cannot take down the rest of the list.
 */
export async function backendCollection<T>(
  request: Request,
  path: string,
  recordSchema: z.ZodType<T>,
  onInvalid?: (record: unknown) => void,
): Promise<T[]> {
  const pageSchema = z.object({
    data: z.array(onInvalid ? z.unknown() : recordSchema),
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
    for (const record of payload.data) {
      if (!onInvalid) {
        records.push(record as T);
        continue;
      }
      const parsed = recordSchema.safeParse(record);
      if (parsed.success) records.push(parsed.data);
      else onInvalid(record);
    }
    if (page >= payload.meta.totalPages) return records;
  }
  throw new Error("La consulta de derivaciones superó el límite de páginas.");
}

// Only the four fields the Field scope needs. Not `serviceSchema.pick`: that drags in the closed
// service-status/origin enums, and a new backend value would take down /referrals for Field (#638).
const referralServiceSchema = z.object({
  id: z.string(),
  crewId: z.string().nullable().optional(),
  origin: z.string(),
  inspectionId: z.string().nullable().optional(),
}).passthrough();

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

async function backendReferralCollection(
  request: Request,
  sourceIds: ReadonlySet<string> | undefined,
): Promise<{ referrals: Referral[]; invalid: number }> {
  let invalid = 0;
  const skip = (resource: string) => (record: unknown) => {
    invalid += 1;
    const { id, status } = (record ?? {}) as { id?: unknown; status?: unknown };
    console.warn(`Derivación ${resource} ${String(id ?? "?")} descartada: no respeta el contrato (status: ${String(status ?? "?")}).`);
  };
  const [repairs, closures] = await Promise.all([
    backendCollection(request, "/repair-requests", repairRequestSchema, skip("repair-request")),
    backendCollection(request, "/street-closure-requests", streetClosureRequestSchema, skip("street-closure-request")),
  ]);
  const referrals = [
    ...repairs.map(referralFromBackendRepairRequest),
    ...closures.map(referralFromStreetClosureRequest),
  ].filter((referral) => isReferralVisibleToBackendSources(referral, sourceIds))
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  return { referrals, invalid };
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
    const { referrals, invalid } = useBackend
      ? await backendReferralCollection(request, sourceIds)
      : { referrals: referralsForScenario(scenario), invalid: 0 };
    return NextResponse.json({ data: referrals, meta: { total: referrals.length, ...(invalid ? { invalid } : {}) } });
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudieron cargar las derivaciones.");
  }
}

export function findFixtureReferral(id: string): Referral | null {
  const repair = getRepairRequestFixture(id);
  if (repair) return referralFromRepairRequest(repair);
  const closure = getStreetClosureRequestFixture(id);
  return closure ? referralFromStreetClosureRequest(closure) : null;
}
