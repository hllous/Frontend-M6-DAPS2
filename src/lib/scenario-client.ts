import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import type { OperationalScenario, ScenarioId } from "./scenarios";
import { recordTelemetryEvent } from "./telemetry";

export class ScenarioRequestError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ScenarioRequestError";
    this.status = status;
  }
}

export async function loadScenario(id: ScenarioId): Promise<OperationalScenario> {
  let response: Response;
  try {
    response = await authenticatedFetch(`/api/mock/scenarios/${id}`);
  } catch (cause) {
    if (cause instanceof NetworkFailureError) {
      recordTelemetryEvent({ name: "request_network_failure", resource: "scenario" });
    }
    throw cause;
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => undefined)) as { message?: string } | undefined;
    throw new ScenarioRequestError(response.status, body?.message ?? "Scenario request failed");
  }
  return response.json() as Promise<OperationalScenario>;
}
