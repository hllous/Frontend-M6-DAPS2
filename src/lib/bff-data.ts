import {
  AuthUnavailableError,
  ForbiddenSessionError,
  getRequiredSession,
  requireCapability,
} from "./session";
import { fetchBackend } from "./bff-backend";
import { getScenario, type OperationalScenario, type ScenarioId } from "./scenarios";

export async function loadAuthorizedScenario(
  request: Request,
  scenarioId: ScenarioId,
): Promise<OperationalScenario> {
  const session = getRequiredSession(request);
  if (session.scenarioId !== scenarioId) throw new ForbiddenSessionError();
  requireCapability(session, "service:view");

  if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
    const backendResponse = await fetchBackend(request, "/service-types", "service:view");
    if (!backendResponse.ok) {
      throw new AuthUnavailableError("El backend rechazó la sesión de desarrollo.");
    }
  }

  return getScenario(scenarioId);
}
