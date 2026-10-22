import { backendMode } from "./bff-route";
import { fetchMe } from "./me";
import type { M6Role } from "./m6-roles";
import { getScenario, type OperationalScenario, type ScenarioId } from "./scenarios";
import { ForbiddenSessionError, getRequiredSession, type Session } from "./session";

/**
 * El escenario de la sesión con los roles de M6 al día. En modo backend salen de GET /me (única fuente);
 * un usuario sin roles recibe el escenario igual, con `capabilities` vacías: la UI explica que falta asignarle uno.
 */
export async function loadAuthorizedScenario(
  request: Request,
  scenarioId: ScenarioId,
): Promise<{ session: Session; roles: M6Role[]; scenario: OperationalScenario }> {
  const session = getRequiredSession(request);
  if (session.scenarioId !== scenarioId) throw new ForbiddenSessionError();

  const roles = backendMode(session) ? (await fetchMe(request)).roles : session.roles;
  return { session, roles, scenario: getScenario({ ...session, roles }) };
}
