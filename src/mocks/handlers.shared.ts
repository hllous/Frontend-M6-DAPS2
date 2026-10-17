import { HttpResponse, http } from "msw";

import { getScenario, scenarios, type ScenarioId } from "@/lib/scenarios";

const scenarioIds = new Set(Object.values(scenarios).map((scenario) => scenario.id));

// Session and mock-scenario handlers only (#430). They stay handwritten so the browser
// worker and component tests answer them without a cookie or the BFF; every domain
// handler lives in a *-route-handlers.ts module that delegates to the real route.
export const handlers = [
  http.get("*/api/mock/scenarios", () => HttpResponse.json(Object.values(scenarios))),
  http.get("*/api/mock/scenarios/:scenarioId", ({ params }) => {
    const scenarioId = params.scenarioId;
    if (typeof scenarioId !== "string" || !scenarioIds.has(scenarioId as ScenarioId)) {
      return HttpResponse.json({ message: "Escenario no encontrado." }, { status: 404 });
    }
    return HttpResponse.json(getScenario(scenarioId as ScenarioId));
  }),
  http.post("*/api/session/logout", () => new HttpResponse(null, { status: 200 })),
];
