import { backendMode, errorResponse, mapSessionError } from "@/lib/bff-route";
import { getScenario } from "@/lib/scenarios";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { repairRequestSchema } from "@/lib/repair-requests";
import { referralFromBackendRepairRequest, referralFromStreetClosureRequest, isReferralVisibleToScenario, isReferralVisibleToBackendSources } from "@/lib/referrals";
import { streetClosureRequestSchema } from "@/lib/street-closure-requests";
import { AuthUnavailableError, getRequiredSession, InvalidSessionError } from "@/lib/session";

import { backendReferralSourceIds, findFixtureReferral } from "../route";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
) {
  const { id } = await context.params;
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
    let referral = useBackend ? null : findFixtureReferral(id);
    if (useBackend) {
      for (const kind of ["repair-requests", "street-closure-requests"] as const) {
        const backendResponse = await fetchBackend(request, `/${kind}/${pathId(id)}`);
        if (backendResponse.status === 404) continue;
        const payload = await backendResponse.text();
        if (!backendResponse.ok) return new Response(payload, { status: backendResponse.status, headers: { "content-type": backendResponse.headers.get("content-type") ?? "application/json" } });
        let backendPayload: unknown;
        try {
          backendPayload = JSON.parse(payload) as unknown;
        } catch {
          return errorResponse(502, "El backend devolvió una respuesta inválida.", path);
        }
        referral = kind === "repair-requests"
          ? referralFromBackendRepairRequest(repairRequestSchema.parse(backendPayload))
          : referralFromStreetClosureRequest(streetClosureRequestSchema.parse(backendPayload));
        break;
      }
    }
    const sourceIds = useBackend && referral && scenario.actor.kind === "FIELD"
      ? await backendReferralSourceIds(request, session.crew!.id)
      : undefined;
    const visible = referral && (useBackend
      ? isReferralVisibleToBackendSources(referral, sourceIds)
      : isReferralVisibleToScenario(referral, scenario));
    if (!referral || !visible) {
      return errorResponse(404, "La derivación no existe o no está disponible para esta sesión.", path);
    }
    return Response.json(referral);
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudo cargar la derivación.");
  }
}
