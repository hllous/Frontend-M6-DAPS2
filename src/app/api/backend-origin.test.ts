import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as repairContainer } from "@/app/api/containers/[id]/start-repair/route";
import { DELETE as deleteCrew } from "@/app/api/crews/[id]/route";
import { DELETE as deleteDisposalSite } from "@/app/api/disposal-sites/[id]/route";
import { DELETE as deleteGreenPoint } from "@/app/api/green-points/[id]/route";
import { DELETE as deleteGreenSpace } from "@/app/api/green-spaces/[id]/route";
import { POST as startRepairRequest } from "@/app/api/repair-requests/[id]/start/route";
import { DELETE as deleteRoute } from "@/app/api/routes/[id]/route";
import { DELETE as closeServiceFrequency } from "@/app/api/service-frequencies/[id]/route";
import { DELETE as deleteServiceType } from "@/app/api/service-types/[id]/route";
import { POST as cancelService } from "@/app/api/services/[id]/cancel/route";
import { POST as rejectStreetClosure } from "@/app/api/street-closure-requests/[id]/reject/route";
import { POST as submitTreeIntervention } from "@/app/api/tree-interventions/[id]/submit-for-authorization/route";
import { DELETE as deleteTree } from "@/app/api/trees/[id]/route";
import { DELETE as deleteVehicle } from "@/app/api/vehicles/[id]/route";
import { DELETE as deleteZone } from "@/app/api/zones/[id]/route";
import { POST as scheduleInspection } from "@/app/api/environmental-reports/[id]/inspections/route";
import { POST as uploadEvidence } from "@/app/api/evidence/route";
import * as containerFixtures from "@/lib/containers-fixtures";
import * as crewFixtures from "@/lib/crew-fixtures";
import * as disposalSiteFixtures from "@/lib/disposal-site-fixtures";
import * as greenPointFixtures from "@/lib/green-point-fixtures";
import * as greenSpaceFixtures from "@/lib/green-space-fixtures";
import * as repairRequestFixtures from "@/lib/repair-request-fixtures";
import * as routeFixtures from "@/lib/routes-fixtures";
import * as serviceFrequencyFixtures from "@/lib/service-frequency-fixtures";
import * as serviceTypeFixtures from "@/lib/service-type-fixtures";
import * as serviceFixtures from "@/lib/services-fixtures";
import * as streetClosureFixtures from "@/lib/street-closure-request-fixtures";
import * as treeInterventionFixtures from "@/lib/tree-intervention-fixtures";
import * as treeFixtures from "@/lib/tree-fixtures";
import * as vehicleFixtures from "@/lib/vehicles-fixtures";
import * as zoneFixtures from "@/lib/zones-fixtures";
import * as environmentalFixtures from "@/lib/environmental-report-fixtures";
import { createSessionCookie, loginWithMe as login } from "@/test/session";

const fixtureModules = [
  containerFixtures,
  crewFixtures,
  disposalSiteFixtures,
  greenPointFixtures,
  greenSpaceFixtures,
  repairRequestFixtures,
  routeFixtures,
  serviceFrequencyFixtures,
  serviceTypeFixtures,
  serviceFixtures,
  streetClosureFixtures,
  treeInterventionFixtures,
  treeFixtures,
  vehicleFixtures,
  zoneFixtures,
  environmentalFixtures,
];

function fixtureSnapshot() {
  return JSON.stringify(fixtureModules.flatMap((module) =>
    Object.entries(module)
      .filter(([, value]) => Array.isArray(value) || value instanceof Map)
      .map(([name, value]) => [name, value instanceof Map ? [...value.entries()] : value]),
  ));
}

function routeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

function jsonRequest(url: string, method: string, cookie: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: body === undefined
      ? { cookie }
      : { cookie, "content-type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

type MutationCase = {
  family: string;
  invoke(cookie: string): Promise<Response>;
};

const mutationCases: MutationCase[] = [
  {
    family: "containers",
    invoke: (cookie) => repairContainer(jsonRequest("http://localhost/api/containers/missing-origin-container/start-repair", "POST", cookie), routeContext("missing-origin-container")),
  },
  {
    family: "crews",
    invoke: (cookie) => deleteCrew(jsonRequest("http://localhost/api/crews/missing-origin-crew", "DELETE", cookie), routeContext("missing-origin-crew")),
  },
  {
    family: "disposal-sites",
    invoke: (cookie) => deleteDisposalSite(jsonRequest("http://localhost/api/disposal-sites/missing-origin-site", "DELETE", cookie), routeContext("missing-origin-site")),
  },
  {
    family: "green-points",
    invoke: (cookie) => deleteGreenPoint(jsonRequest("http://localhost/api/green-points/missing-origin-point", "DELETE", cookie), routeContext("missing-origin-point")),
  },
  {
    family: "green-spaces",
    invoke: (cookie) => deleteGreenSpace(jsonRequest("http://localhost/api/green-spaces/missing-origin-space", "DELETE", cookie), routeContext("missing-origin-space")),
  },
  {
    family: "repair-requests",
    invoke: (cookie) => startRepairRequest(jsonRequest("http://localhost/api/repair-requests/missing-origin-request/start", "POST", cookie, {}), routeContext("missing-origin-request")),
  },
  {
    family: "routes",
    invoke: (cookie) => deleteRoute(jsonRequest("http://localhost/api/routes/missing-origin-route", "DELETE", cookie), routeContext("missing-origin-route")),
  },
  {
    family: "service-frequencies",
    invoke: (cookie) => closeServiceFrequency(jsonRequest("http://localhost/api/service-frequencies/missing-origin-frequency", "DELETE", cookie), routeContext("missing-origin-frequency")),
  },
  {
    family: "service-types",
    invoke: (cookie) => deleteServiceType(jsonRequest("http://localhost/api/service-types/missing-origin-type", "DELETE", cookie), routeContext("missing-origin-type")),
  },
  {
    family: "services",
    invoke: (cookie) => cancelService(jsonRequest("http://localhost/api/services/missing-origin-service/cancel", "POST", cookie, { reason: "Prueba de origen faltante." }), routeContext("missing-origin-service")),
  },
  {
    family: "street-closure-requests",
    invoke: (cookie) => rejectStreetClosure(jsonRequest("http://localhost/api/street-closure-requests/missing-origin-closure/reject", "POST", cookie), routeContext("missing-origin-closure")),
  },
  {
    family: "tree-interventions",
    invoke: (cookie) => submitTreeIntervention(jsonRequest("http://localhost/api/tree-interventions/missing-origin-intervention/submit-for-authorization", "POST", cookie), routeContext("missing-origin-intervention")),
  },
  {
    family: "trees",
    invoke: (cookie) => deleteTree(jsonRequest("http://localhost/api/trees/missing-origin-tree", "DELETE", cookie), routeContext("missing-origin-tree")),
  },
  {
    family: "vehicles",
    invoke: (cookie) => deleteVehicle(jsonRequest("http://localhost/api/vehicles/missing-origin-vehicle", "DELETE", cookie), routeContext("missing-origin-vehicle")),
  },
  {
    family: "zones",
    invoke: (cookie) => deleteZone(jsonRequest("http://localhost/api/zones/missing-origin-zone", "DELETE", cookie), routeContext("missing-origin-zone")),
  },
  {
    family: "environmental-reports/inspections",
    invoke: (cookie) => scheduleInspection(
      jsonRequest("http://localhost/api/environmental-reports/missing-origin-report/inspections", "POST", cookie, {
        scheduledDate: "2026-10-13",
        timeWindow: { start: "08:00", end: "12:00" },
        checklistVersion: "v1",
        checklist: [{ id: "origin-check", label: "Verificar origen", required: true }],
      }),
      routeContext("missing-origin-report"),
    ),
  },
  {
    family: "evidence",
    // La evidencia de un contenedor solo la sube la cuadrilla (Backend #161): el Admin de `backendCookie` no puede.
    invoke: async () => {
      const cookie = createSessionCookie("field-crew-leader-route", {
        mode: "backend-development",
        devJwt: "header.eyJleHAiOjQxMDAwMDAwMDB9.signature",
        backendOrigin: "https://backend.internal",
      });
      delete process.env.M6_BACKEND_ORIGIN;
      const form = new FormData();
      form.append("file", new Blob(["evidence"], { type: "image/png" }), "origin.png");
      form.append("ownerType", "CONTAINER");
      form.append("ownerId", "missing-origin-container");
      return uploadEvidence(new Request("http://localhost/api/evidence", {
        method: "POST",
        headers: { cookie, "Idempotency-Key": "missing-origin-evidence" },
        body: form,
      }));
    },
  },
];

let backendCookie = "";

beforeEach(() => {
  delete process.env.M6_BACKEND_ORIGIN;
  backendCookie = createSessionCookie("office-duty-queue", {
    mode: "backend-development",
    devJwt: "header.eyJleHAiOjQxMDAwMDAwMDB9.signature",
    backendOrigin: "https://backend.internal",
  });
  delete process.env.M6_BACKEND_ORIGIN;
});

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});

describe("backend origin fail-closed behavior", () => {
  it.each(mutationCases)("returns 503 for a $family mutation without changing fixtures", async ({ invoke }) => {
    const before = fixtureSnapshot();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));

    const response = await invoke(backendCookie);

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ statusCode: 503, message: "La autenticación solicitada no está disponible." });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(fixtureSnapshot()).toBe(before);
  });

  it("fails backend-development login with 503 when the origin is missing", async () => {
    process.env.M6_AUTH_MODE = "backend-development";
    process.env.M6_DEV_JWT = "header.eyJleHAiOjQxMDAwMDAwMDB9.signature";

    const response = await login(new Request("http://localhost/api/session/login", {
      method: "POST",
      headers: { "content-type": "application/json", "x-requested-with": "XMLHttpRequest" },
      body: JSON.stringify({ scenarioId: "office-duty-queue" }),
    }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ message: "La autenticación solicitada no está disponible." });
  });
});
