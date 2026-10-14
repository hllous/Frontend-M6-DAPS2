import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resetTreeSurveyFixtures } from "@/lib/tree-survey-fixtures";
import { GET } from "./route";
import { loginAs } from "@/test/session";

beforeEach(() => resetTreeSurveyFixtures());
afterEach(() => { delete process.env.M6_AUTH_MODE; delete process.env.M6_DEV_JWT; delete process.env.M6_BACKEND_ORIGIN; });



describe("/api/trees/[id]/surveys/[surveyId]", () => {
  it("returns an immutable survey detail and a stable not-found error", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await GET(new Request("http://localhost/api/trees/tree-2/surveys/survey-2", { headers: { cookie } }), { params: Promise.resolve({ id: "tree-2", surveyId: "survey-2" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: "survey-2", treeId: "tree-2" });

    const missing = await GET(new Request("http://localhost/api/trees/tree-2/surveys/missing", { headers: { cookie } }), { params: { id: "tree-2", surveyId: "missing" } });
    expect(missing.status).toBe(404);
  });
});
