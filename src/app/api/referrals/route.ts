import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { getRepairRequestFixture, repairRequestFixtures } from "@/lib/repair-request-fixtures";
import {
  getReferralSourceServiceIds,
  isReferralVisibleToScenario,
  referralFromRepairRequest,
  referralFromStreetClosureRequest,
  type Referral,
} from "@/lib/referrals";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import type { RepairRequest } from "@/lib/repair-requests";
import type { StreetClosureRequest } from "@/lib/street-closure-requests";
import { getStreetClosureRequestFixture, streetClosureRequestFixtures } from "@/lib/street-closure-request-fixtures";

const ERROR_LABELS: Record<number, string> = {
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  500: "Internal Server Error",
  503: "Service Unavailable",
};

export function errorResponse(status: number, message: string, path: string) {
  return NextResponse.json(
    { statusCode: status, message, error: ERROR_LABELS[status] ?? "Error", timestamp: new Date().toISOString(), path },
    { status },
  );
}

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

async function backendReferralCollection(request: Request, scenario: ReturnType<typeof getScenario>): Promise<Referral[]> {
  const serviceIds = getReferralSourceServiceIds(scenario);
  const paths = serviceIds === undefined
    ? [
        { kind: "REPAIR_REQUEST" as const, path: "/repair-requests" },
        { kind: "STREET_CLOSURE_REQUEST" as const, path: "/street-closure-requests" },
      ]
    : serviceIds.flatMap((serviceId) => [
        { kind: "REPAIR_REQUEST" as const, path: `/repair-requests?detectedInId=${encodeURIComponent(serviceId)}` },
        { kind: "STREET_CLOSURE_REQUEST" as const, path: `/street-closure-requests?sourceId=${encodeURIComponent(serviceId)}` },
      ]);

  const collections = await Promise.all(paths.map(async ({ kind, path }) => {
    const backendResponse = await fetchBackend(request, path);
    const payload = await backendResponse.json() as unknown;
    if (!backendResponse.ok) throw new Error(`Backend respondió ${backendResponse.status} al consultar derivaciones.`);
    const records = payload && typeof payload === "object" && "data" in payload && Array.isArray(payload.data)
      ? payload.data
      : Array.isArray(payload) ? payload : [];
    return kind === "REPAIR_REQUEST"
      ? (records as RepairRequest[]).map(referralFromRepairRequest)
      : (records as StreetClosureRequest[]).map(referralFromStreetClosureRequest);
  }));

  return collections.flat().sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session.scenarioId);
    if (scenario.actor.kind !== "OFFICE" && scenario.actor.kind !== "FIELD") {
      return errorResponse(403, "Solo Oficina o Campo puede consultar derivaciones.", path);
    }

    const referrals = session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN
      ? await backendReferralCollection(request, scenario)
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
