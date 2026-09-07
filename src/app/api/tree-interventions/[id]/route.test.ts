import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { resetTreeInterventionFixtures } from "@/lib/tree-intervention-fixtures";
import { GET } from "./route";

beforeEach(() => resetTreeInterventionFixtures());
afterEach(() => { delete process.env.M6_AUTH_MODE; delete process.env.M6_DEV_JWT; delete process.env.M6_BACKEND_ORIGIN; });

async function authenticatedCookie() {
  process.env.M6_AUTH_MODE = "mock";
  const response = await login(new Request("http://localhost/api/session/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenarioId: "office-duty-queue" }) }));
  return response.headers.get("set-cookie") ?? "";
}

describe("/api/tree-interventions/[id]", () => {
  it("returns detail with every linked tree", async () => {
    const cookie = await authenticatedCookie();
    const response = await GET(new Request("http://localhost/api/tree-interventions/intervention-1", { headers: { cookie } }), { params: Promise.resolve({ id: "intervention-1" }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.treeIds).toEqual(["tree-2", "tree-4"]);
    expect(body.trees).toHaveLength(2);
    expect(body.trees.map((tree: { id: string }) => tree.id)).toEqual(["tree-2", "tree-4"]);
  });

  it("returns not found for an unknown intervention", async () => {
    const cookie = await authenticatedCookie();
    const response = await GET(new Request("http://localhost/api/tree-interventions/missing", { headers: { cookie } }), { params: { id: "missing" } });
    expect(response.status).toBe(404);
  });
});
