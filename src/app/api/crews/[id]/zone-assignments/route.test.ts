import { afterEach, describe, expect, it, vi } from "vitest";

import { resetCrewFixtures } from "@/lib/crew-fixtures";
import { loginAs } from "@/test/session";
import { GET, POST } from "./route";

afterEach(() => { delete process.env.M6_AUTH_MODE; delete process.env.M6_BACKEND_ORIGIN; resetCrewFixtures(); vi.restoreAllMocks(); });

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const move = { zoneId: "zone-2", validFrom: "2099-03-01", validTo: "2099-03-10", reason: "Refuerzo por evento" };
const post = (cookie: string, body: unknown, id = "crew-a") => POST(new Request(`http://localhost/api/crews/${id}/zone-assignments`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(body) }), ctx(id));
const get = (cookie: string, id: string) => GET(new Request(`http://localhost/api/crews/${id}/zone-assignments`, { headers: { cookie } }), ctx(id));

describe("crew zone-assignments BFF route", () => {
  it("lists the fixture moves newest first for any Office actor", async () => {
    const response = await get(await loginAs("office-environmental", { mode: "mock" }), "crew-c");
    expect(response.status).toBe(200);
    expect((await response.json()).data.map((item: { id: string }) => item.id)).toEqual(["move-crew-c-active", "move-crew-c-past"]);
  });

  it("scopes Field reads to the actor's own crew", async () => {
    const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
    expect((await get(cookie, "crew-b")).status).toBe(200);
    expect((await get(cookie, "crew-a")).status).toBe(403);
  });

  it("lets Operaciones create a move and shows it in the list", async () => {
    const cookie = await loginAs("office-operations", { mode: "mock" });
    const created = await post(cookie, move);
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({ crewId: "crew-a", ...move });
    expect((await (await get(cookie, "crew-a")).json()).data).toHaveLength(1);
  });

  it("denies the action to actors without the operations capability", async () => {
    expect((await post(await loginAs("office-environmental", { mode: "mock" }), move)).status).toBe(403);
    expect((await post(await loginAs("field-crew-member-route", { mode: "mock" }), move, "crew-b")).status).toBe(403);
  });

  it("maps an overlap to a readable Spanish 409 in mock mode", async () => {
    const response = await post(await loginAs("office-operations", { mode: "mock" }), { ...move, validFrom: "2000-01-01", validTo: null }, "crew-c");
    expect(response.status).toBe(409);
    expect((await response.json()).message).toMatch(/se superpone/);
  });

  it("rejects a missing reason and an end before the start with 400", async () => {
    const cookie = await loginAs("office-operations", { mode: "mock" });
    expect((await post(cookie, { ...move, reason: " " })).status).toBe(400);
    expect((await post(cookie, { ...move, validTo: "2099-02-01" })).status).toBe(400);
  });

  it("forwards both calls in backend mode and maps the backend 409", async () => {
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = await loginAs("office-operations", { mode: "backend-development", devJwt, backendOrigin: "https://backend.internal" });
    const backendFetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json([]))
      .mockResolvedValueOnce(Response.json({ statusCode: 409, message: "Conflict", error: "Conflict" }, { status: 409 }));
    expect((await get(cookie, "crew-a")).status).toBe(200);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe("https://backend.internal/crews/crew-a/zone-assignments");
    const conflict = await post(cookie, move);
    expect(String(backendFetch.mock.calls[1]?.[0])).toBe("https://backend.internal/crews/crew-a/zone-assignments");
    expect(backendFetch.mock.calls[1]?.[1]?.method).toBe("POST");
    expect(conflict.status).toBe(409);
    expect((await conflict.json()).message).toMatch(/se superpone/);
  });
});
