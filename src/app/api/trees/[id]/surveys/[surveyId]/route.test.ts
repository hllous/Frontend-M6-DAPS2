import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetTreeSurveyFixtures } from "@/lib/tree-survey-fixtures";
import { GET } from "./route";
import { loginAs } from "@/test/session";

beforeEach(() => resetTreeSurveyFixtures());
afterEach(() => { delete process.env.M6_AUTH_MODE; delete process.env.M6_DEV_JWT; delete process.env.M6_BACKEND_ORIGIN; vi.restoreAllMocks(); });



describe("/api/trees/[id]/surveys/[surveyId]", () => {
  it("returns an immutable survey detail and a stable not-found error", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await GET(new Request("http://localhost/api/trees/tree-2/surveys/survey-2", { headers: { cookie } }), { params: Promise.resolve({ id: "tree-2", surveyId: "survey-2" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "survey-2", treeId: "tree-2" });

    const missing = await GET(new Request("http://localhost/api/trees/tree-2/surveys/missing", { headers: { cookie } }), { params: { id: "tree-2", surveyId: "missing" } });
    expect(missing.status).toBe(404);
  });

  it("forwards backend survey detail with both path ids and the session bearer token", async () => {
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt, backendOrigin: "https://backend.internal" });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "survey-backend-1", treeId: "tree-backend-1" }));

    const response = await GET(new Request("http://localhost/api/trees/tree-backend-1/surveys/survey-backend-1", { headers: { cookie } }), {
      params: { id: "tree-backend-1", surveyId: "survey-backend-1" },
    });

    expect(response.status).toBe(200);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe("https://backend.internal/trees/tree-backend-1/surveys/survey-backend-1");
    expect(backendFetch.mock.calls[0]?.[1]?.method ?? "GET").toBe("GET");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
  });
});
