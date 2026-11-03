import { getScenario, type ScenarioId } from "./scenarios";
import { DEMO_IDENTITIES } from "./demo-identities";
import type { Session } from "./session";

export type SessionActor = {
  scenarioId: ScenarioId;
  userId: string;
  displayName: string;
  m1Identity?: { userId: string; label: string };
};

/** M1 supplies its confirmed user id; demo and mock sessions use their seeded M1 subject. */
export function sessionUserId(session: Session): string | undefined {
  if (session.identity) return session.identity.userId;
  return session.scenarioId ? DEMO_IDENTITIES[session.scenarioId].sub : undefined;
}

/** One presentation actor for both demo sessions and identity confirmed by Backend GET /me. */
export function sessionActor(session: Session): SessionActor {
  const scenarioId = session.scenarioId ?? "employee-no-role";
  const scenario = getScenario({ ...session, scenarioId });
  if (session.identity) {
    return {
      scenarioId,
      userId: session.identity.userId,
      displayName: `Empleado M1 · ${session.identity.userId}`,
      m1Identity: { userId: session.identity.userId, label: "Empleado M1" },
    };
  }
  return {
    scenarioId,
    userId: sessionUserId(session) ?? scenario.actor.userId,
    displayName: scenario.actor.name,
  };
}
