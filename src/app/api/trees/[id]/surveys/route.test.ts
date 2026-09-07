import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { resetTreeSurveyFixtures, treeSurveyFixtures } from "@/lib/tree-survey-fixtures";
import { GET, POST } from "./route";

beforeEach(() => resetTreeSurveyFixtures());
afterEach(() => { delete process.env.M6_AUTH_MODE; delete process.env.M6_DEV_JWT; delete process.env.M6_BACKEND_ORIGIN; });

async function authenticatedCookie(scenarioId: string) {
  process.env.M6_AUTH_MODE = "mock";
  const response = await login(new Request("http://localhost/api/session/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenarioId }) }));
  return response.headers.get("set-cookie") ?? "";
}

const validInput = {
  surveyedAt: "2026-09-07T12:00:00.000Z",
  healthStatus: "HEALTHY",
  riskLevel: "LOW",
  requiresStreetClosure: false,
  requiresPublicWorks: false,
  notes: "Copa estable.",
};

describe("/api/trees/[id]/surveys", () => {
  it("lists newest-first history with documented filters for any authenticated actor", async () => {
    const cookie = await authenticatedCookie("field-crew-member-route");
    const response = await GET(new Request("http://localhost/api/trees/tree-2/surveys?healthStatus=WEAKENED&riskLevel=HIGH&pageSize=10", { headers: { cookie } }), { params: { id: "tree-2" } });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data[0]).toMatchObject({ id: "survey-2", riskLevel: "HIGH" });
    expect(body.meta.pageSize).toBe(10);
  });

  it("allows Field and Office with tree:survey to create an ambient record without a Service", async () => {
    const fieldCookie = await authenticatedCookie("field-crew-leader-route");
    const fieldResponse = await POST(new Request("http://localhost/api/trees/tree-2/surveys", { method: "POST", headers: { cookie: fieldCookie, "content-type": "application/json" }, body: JSON.stringify(validInput) }), { params: { id: "tree-2" } });
    expect(fieldResponse.status).toBe(201);
    expect(await fieldResponse.json()).toMatchObject({ treeId: "tree-2", riskLevel: "LOW" });
    expect(treeSurveyFixtures.every((survey) => !("serviceId" in survey))).toBe(true);

    const officeCookie = await authenticatedCookie("office-duty-queue");
    const officeResponse = await POST(new Request("http://localhost/api/trees/tree-1/surveys", { method: "POST", headers: { cookie: officeCookie, "content-type": "application/json" }, body: JSON.stringify({ ...validInput, surveyedAt: "2026-09-07T13:00:00.000Z" }) }), { params: Promise.resolve({ id: "tree-1" }) });
    expect(officeResponse.status).toBe(201);
  });

  it("rejects a high-risk submission without riskType at the route boundary", async () => {
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await POST(new Request("http://localhost/api/trees/tree-2/surveys", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ ...validInput, riskLevel: "CRITICAL" }) }), { params: { id: "tree-2" } });
    expect(response.status).toBe(400);
  });
});
