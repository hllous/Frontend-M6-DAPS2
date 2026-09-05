import type { OperationalScenario, ScenarioId } from "./scenarios";

export async function loadScenario(id: ScenarioId): Promise<OperationalScenario> {
  const response = await fetch(`/api/mock/scenarios/${id}`);
  if (!response.ok) throw new Error("Scenario request failed");
  return response.json() as Promise<OperationalScenario>;
}
