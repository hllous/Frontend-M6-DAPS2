import { getScenario } from "@/lib/scenarios";
import { fetchBackend } from "@/lib/bff-backend";
import { repairRequestSchema } from "@/lib/repair-requests";
import { referralFromRepairRequest, referralFromStreetClosureRequest, isReferralVisibleToScenario } from "@/lib/referrals";
import { streetClosureRequestSchema } from "@/lib/street-closure-requests";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";

import { errorResponse, findFixtureReferral } from "../route";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const { id } = await context.params;
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const scenario = getScenario(session.scenarioId);
    if (scenario.actor.kind !== "OFFICE" && scenario.actor.kind !== "FIELD") {
      return errorResponse(403, "Solo Oficina o Campo puede consultar derivaciones.", path);
    }

    let referral = findFixtureReferral(id);
    if (!referral && session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const endpoint = id.startsWith("RR-") ? `/repair-requests/${encodeURIComponent(id)}` : `/street-closure-requests/${encodeURIComponent(id)}`;
      const backendResponse = await fetchBackend(request, endpoint);
      const payload = await backendResponse.text();
      if (!backendResponse.ok) return new Response(payload, { status: backendResponse.status, headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" } });
      const backendPayload = JSON.parse(payload) as unknown;
      if (id.startsWith("RR-")) {
        const parsedRepair = repairRequestSchema.safeParse(backendPayload);
        if (parsedRepair.success) referral = referralFromRepairRequest(parsedRepair.data);
      } else {
        const parsedClosure = streetClosureRequestSchema.safeParse(backendPayload);
        if (parsedClosure.success) referral = referralFromStreetClosureRequest(parsedClosure.data);
      }
    }
    if (!referral || !isReferralVisibleToScenario(referral, scenario)) {
      return errorResponse(404, "La derivación no existe o no está disponible para esta sesión.", path);
    }
    return Response.json(referral);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo cargar la derivación.", path);
  }
}
