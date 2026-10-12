import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { GET as getContainer } from "@/app/api/containers/[id]/route";
import { GET as getCrew } from "@/app/api/crews/[id]/route";
import { DELETE as deleteCrewMember } from "@/app/api/crews/[id]/members/[userId]/route";
import { GET as getDisposalSite } from "@/app/api/disposal-sites/[id]/route";
import { GET as getEnvironmentalInspection } from "@/app/api/environmental-inspections/[id]/route";
import { GET as getEnvironmentalReport } from "@/app/api/environmental-reports/[id]/route";
import { GET as getGreenPoint } from "@/app/api/green-points/[id]/route";
import { GET as getGreenSpace } from "@/app/api/green-spaces/[id]/route";
import { GET as getReferral } from "@/app/api/referrals/[id]/route";
import { GET as getRepairRequest } from "@/app/api/repair-requests/[id]/route";
import { GET as getRoute } from "@/app/api/routes/[id]/route";
import { GET as getServiceFrequency } from "@/app/api/service-frequencies/[id]/route";
import { GET as getServiceType } from "@/app/api/service-types/[id]/route";
import { GET as getService } from "@/app/api/services/[id]/route";
import { GET as getStreetClosureRequest } from "@/app/api/street-closure-requests/[id]/route";
import { GET as getTreeIntervention } from "@/app/api/tree-interventions/[id]/route";
import { GET as getTree } from "@/app/api/trees/[id]/route";
import { GET as getTreeSurvey } from "@/app/api/trees/[id]/surveys/[surveyId]/route";
import { GET as getVehicle } from "@/app/api/vehicles/[id]/route";
import { GET as getZone } from "@/app/api/zones/[id]/route";
import { DELETE as deleteZoneNeighborhood } from "@/app/api/zones/[id]/neighborhoods/[neighborhoodId]/route";

const invalidIds = ["..", "a/b", "a?b=c", "a#b", "%2e%2e"];
const backendOrigin = "https://backend.internal";
const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";

type RouteContext = { params: Promise<Record<string, string>> };
type RouteHandler = (request: Request, context: RouteContext) => Promise<Response>;
type RouteCase = {
  family: string;
  handler: RouteHandler;
  method?: "GET" | "DELETE";
  idParams: string[];
};

const routeCases: RouteCase[] = [
  { family: "containers", handler: getContainer as unknown as RouteHandler, idParams: ["id"] },
  { family: "crews", handler: getCrew as unknown as RouteHandler, idParams: ["id"] },
  { family: "crew members", handler: deleteCrewMember as unknown as RouteHandler, method: "DELETE", idParams: ["id", "userId"] },
  { family: "disposal sites", handler: getDisposalSite as unknown as RouteHandler, idParams: ["id"] },
  { family: "environmental inspections", handler: getEnvironmentalInspection as unknown as RouteHandler, idParams: ["id"] },
  { family: "environmental reports", handler: getEnvironmentalReport as unknown as RouteHandler, idParams: ["id"] },
  { family: "green points", handler: getGreenPoint as unknown as RouteHandler, idParams: ["id"] },
  { family: "green spaces", handler: getGreenSpace as unknown as RouteHandler, idParams: ["id"] },
  { family: "referrals", handler: getReferral as unknown as RouteHandler, idParams: ["id"] },
  { family: "repair requests", handler: getRepairRequest as unknown as RouteHandler, idParams: ["id"] },
  { family: "routes", handler: getRoute as unknown as RouteHandler, idParams: ["id"] },
  { family: "service frequencies", handler: getServiceFrequency as unknown as RouteHandler, idParams: ["id"] },
  { family: "service types", handler: getServiceType as unknown as RouteHandler, idParams: ["id"] },
  { family: "services", handler: getService as unknown as RouteHandler, idParams: ["id"] },
  { family: "street closure requests", handler: getStreetClosureRequest as unknown as RouteHandler, idParams: ["id"] },
  { family: "tree interventions", handler: getTreeIntervention as unknown as RouteHandler, idParams: ["id"] },
  { family: "trees", handler: getTree as unknown as RouteHandler, idParams: ["id"] },
  { family: "tree surveys", handler: getTreeSurvey as unknown as RouteHandler, idParams: ["id", "surveyId"] },
  { family: "vehicles", handler: getVehicle as unknown as RouteHandler, idParams: ["id"] },
  { family: "zones", handler: getZone as unknown as RouteHandler, idParams: ["id"] },
  { family: "zone neighborhoods", handler: deleteZoneNeighborhood as unknown as RouteHandler, method: "DELETE", idParams: ["id", "neighborhoodId"] },
];

async function backendCookie() {
  process.env.M6_AUTH_MODE = "backend-development";
  process.env.M6_DEV_JWT = devJwt;
  process.env.M6_BACKEND_ORIGIN = backendOrigin;
  const response = await login(new Request("http://localhost/api/session/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenarioId: "office-duty-queue" }),
  }));
  return response.headers.get("set-cookie") ?? "";
}

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});

describe("backend path ids", () => {
  it.each(routeCases)("rejects invalid ids for $family before a backend call", async ({ handler, method, idParams }) => {
    const cookie = await backendCookie();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("unexpected backend call"));

    for (const idParam of idParams) {
      for (const id of invalidIds) {
        const params = Object.fromEntries(idParams.map((key) => [key, key === idParam ? id : `valid-${key}`]));
        const response = await handler(
          new Request("http://localhost/api/path-id-test", {
            method: method ?? "GET",
            headers: { cookie },
          }),
          { params: Promise.resolve(params) },
        );

        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({
          error: "Bad Request",
          message: "Identificador inválido.",
          path: "/api/path-id-test",
        });
        expect(fetchSpy).not.toHaveBeenCalled();
      }
    }
  });
});
