import { backendMode } from "./bff-route";
import {
  AuthUnavailableError,
  BackendUnavailableError,
  ForbiddenSessionError,
  InvalidSessionError,
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

  if (backendMode(session)) {
    let backendResponse: Response;
    try {
      backendResponse = await fetchBackend(request, "/service-types", "service:view");
    } catch (error) {
      if (error instanceof AuthUnavailableError) throw error;
      throw new BackendUnavailableError(503, "No se pudo conectar con el backend.");
    }
    if (backendResponse.status === 401) {
      throw new InvalidSessionError("El backend rechazó la sesión de desarrollo.");
    }
    if (backendResponse.status === 403) {
      throw new ForbiddenSessionError("El backend no permite consultar este recurso.");
    }
    if (!backendResponse.ok) {
      throw new BackendUnavailableError(
        backendResponse.status,
        `El backend respondió con un error (HTTP ${backendResponse.status}).`,
      );
    }
  }

  return getScenario(session);
}
