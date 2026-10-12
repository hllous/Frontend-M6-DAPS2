import { NextResponse } from "next/server";
import { z } from "zod";

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
import { repairRequestSchema } from "@/lib/repair-requests";
import { streetClosureRequestSchema } from "@/lib/street-closure-requests";
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
    return kind === "REPAIR_REQUEST"
      ? (await backendCollection(request, path, repairRequestSchema)).map(referralFromRepairRequest)
      : (await backendCollection(request, path, streetClosureRequestSchema)).map(referralFromStreetClosureRequest);
  }));

  return collections.flat().sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session);
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
