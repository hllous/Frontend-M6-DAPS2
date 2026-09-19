import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { treeFixtures, resetTreeFixtures } from "@/lib/tree-fixtures";
import { DELETE, GET, PATCH } from "./route";

beforeEach(() => resetTreeFixtures());
afterEach(() => { delete process.env.M6_AUTH_MODE; delete process.env.M6_DEV_JWT; delete process.env.M6_BACKEND_ORIGIN; });

async function authenticatedCookie(scenarioId: string) {
  process.env.M6_AUTH_MODE = "mock";
  const response = await login(new Request("http://localhost/api/session/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenarioId }) }));
  return response.headers.get("set-cookie") ?? "";
}

describe("/api/trees/[id]", () => {
  it("allows any authenticated actor to read detail", async () => {
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await GET(new Request("http://localhost/api/trees/tree-1", { headers: { cookie } }), { params: { id: "tree-1" } });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ surveyCode: "ARB-00442", species: "Jacarandá" });
  });

  it("updates mutable fields, rejects immutable surveyCode, and logically deletes", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await PATCH(new Request("http://localhost/api/trees/tree-1", { method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ species: "Tipa", heightM: 14.2 }) }), { params: Promise.resolve({ id: "tree-1" }) });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ species: "Tipa", heightM: 14.2, surveyCode: "ARB-00442" });
    const immutable = await PATCH(new Request("http://localhost/api/trees/tree-1", { method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ surveyCode: "ARB-99999" }) }), { params: { id: "tree-1" } });
    expect(immutable.status).toBe(400);
    const deleteResponse = await DELETE(new Request("http://localhost/api/trees/tree-1", { method: "DELETE", headers: { cookie } }), { params: { id: "tree-1" } });
    expect(deleteResponse.status).toBe(204);
    expect(treeFixtures.find((tree) => tree.id === "tree-1")).toMatchObject({ active: false, species: "Tipa" });
  });

  it("does not allow Field actors to edit or deactivate", async () => {
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await PATCH(new Request("http://localhost/api/trees/tree-1", { method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ species: "Ceibo" }) }), { params: { id: "tree-1" } });
    expect(response.status).toBe(403);
    const deleteResponse = await DELETE(new Request("http://localhost/api/trees/tree-1", { method: "DELETE", headers: { cookie } }), { params: { id: "tree-1" } });
    expect(deleteResponse.status).toBe(403);
  });
});
