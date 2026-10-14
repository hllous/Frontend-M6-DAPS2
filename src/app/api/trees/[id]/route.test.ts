import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { treeFixtures, resetTreeFixtures } from "@/lib/tree-fixtures";
import { DELETE, GET, PATCH } from "./route";
import { loginAs } from "@/test/session";

beforeEach(() => resetTreeFixtures());
afterEach(() => { delete process.env.M6_AUTH_MODE; delete process.env.M6_DEV_JWT; delete process.env.M6_BACKEND_ORIGIN; vi.restoreAllMocks(); });



describe("/api/trees/[id]", () => {
  it("allows any authenticated actor to read detail", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await GET(new Request("http://localhost/api/trees/tree-1", { headers: { cookie } }), { params: { id: "tree-1" } });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ surveyCode: "ARB-00442", species: "Jacarandá" });
  });

  it("updates mutable fields, rejects immutable surveyCode, and logically deletes", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
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
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const response = await PATCH(new Request("http://localhost/api/trees/tree-1", { method: "PATCH", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ species: "Ceibo" }) }), { params: { id: "tree-1" } });
    expect(response.status).toBe(403);
    const deleteResponse = await DELETE(new Request("http://localhost/api/trees/tree-1", { method: "DELETE", headers: { cookie } }), { params: { id: "tree-1" } });
    expect(deleteResponse.status).toBe(403);
  });

  it("forwards backend tree detail with the session bearer token", async () => {
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt, backendOrigin: "https://backend.internal" });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "tree-backend-1", surveyCode: "ARB-1000" }));

    const response = await GET(new Request("http://localhost/api/trees/tree-backend-1", { headers: { cookie } }), { params: { id: "tree-backend-1" } });

    expect(response.status).toBe(200);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe("https://backend.internal/trees/tree-backend-1");
    expect(backendFetch.mock.calls[0]?.[1]?.method ?? "GET").toBe("GET");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
  });

  it("forwards backend tree updates with the validated body and session bearer token", async () => {
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt, backendOrigin: "https://backend.internal" });
    const input = { species: "Ceibo", heightM: 14.5 };
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "tree-backend-1", ...input }));

    const response = await PATCH(new Request("http://localhost/api/trees/tree-backend-1", {
      method: "PATCH",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify(input),
    }), { params: { id: "tree-backend-1" } });

    expect(response.status).toBe(200);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe("https://backend.internal/trees/tree-backend-1");
    expect(backendFetch.mock.calls[0]?.[1]?.method).toBe("PATCH");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
    expect(JSON.parse(String(backendFetch.mock.calls[0]?.[1]?.body))).toEqual(input);
  });

  it("forwards backend tree deactivation with DELETE and the session bearer token", async () => {
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt, backendOrigin: "https://backend.internal" });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));

    const response = await DELETE(new Request("http://localhost/api/trees/tree-backend-1", { method: "DELETE", headers: { cookie } }), { params: { id: "tree-backend-1" } });

    expect(response.status).toBe(204);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe("https://backend.internal/trees/tree-backend-1");
    expect(backendFetch.mock.calls[0]?.[1]?.method).toBe("DELETE");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
  });
});
