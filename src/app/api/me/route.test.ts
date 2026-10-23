import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { backendEnv, createSessionCookie } from "@/test/session";

import { GET } from "./route";

let restoreEnv: () => void;
beforeEach(() => { restoreEnv = backendEnv(); });
afterEach(() => { restoreEnv(); vi.restoreAllMocks(); });

const me = (roles: string[]) => ({ userId: "42", subType: "EMPLEADO", m1Role: "ADMINISTRATIVO", roles });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const call = (cookie?: string) => GET(new Request("http://localhost/api/me", { headers: cookie ? { cookie } : {} }));

describe("GET /api/me", () => {
  it("requires a session", async () => {
    expect((await call()).status).toBe(401);
  });

  it("returns the effective roles from the backend and reseals the session when they changed", async () => {
    const cookie = createSessionCookie("office-duty-queue", { mode: "backend-development" });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(json(me(["M6_OFICINA_AMBIENTAL"])));

    const response = await call(cookie);

    expect(response.status).toBe(200);
    expect((await response.json()).roles).toEqual(["M6_OFICINA_AMBIENTAL"]);
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe("https://backend.internal/me");
    expect(response.headers.get("set-cookie")).toContain("m6_session=");
  });

  it("leaves the cookie alone when the roles did not change", async () => {
    const cookie = createSessionCookie("office-duty-queue", { mode: "backend-development" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(me(["M6_ADMIN"])));

    expect((await call(cookie)).headers.get("set-cookie")).toBeNull();
  });

  it("passes an employee without roles through: that is a state to explain, not an error", async () => {
    const cookie = createSessionCookie("office-duty-queue", { mode: "backend-development" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json(me([])));

    const response = await call(cookie);

    expect(response.status).toBe(200);
    expect((await response.json()).roles).toEqual([]);
  });

  it("answers a citizen 403 without a role code, so it is not mistaken for a missing role", async () => {
    const cookie = createSessionCookie("office-duty-queue", { mode: "backend-development" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ statusCode: 403, message: "Este sistema es solo para personal municipal" }, 403));

    const response = await call(cookie);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.message).toMatch(/personal municipal/);
    expect(body).not.toHaveProperty("code");
  });

  it("clears nothing itself but relays a backend 401 as 401 so the client ends the session", async () => {
    const cookie = createSessionCookie("office-duty-queue", { mode: "backend-development" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ statusCode: 401, message: "Unauthorized" }, 401));

    expect((await call(cookie)).status).toBe(401);
  });

  it("rejects a response outside the documented contract", async () => {
    const cookie = createSessionCookie("office-duty-queue", { mode: "backend-development" });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(json({ userId: "42", roles: ["M6_SUPERUSER"] }));

    expect((await call(cookie)).status).toBe(503);
  });

  it("serves the scenario fixture roles in mock mode", async () => {
    restoreEnv();
    process.env.M6_AUTH_MODE = "mock";
    const cookie = createSessionCookie("field-crew-leader-route", { mode: "mock" });

    const response = await call(cookie);

    expect((await response.json()).roles).toEqual(["M6_CAMPO_CUADRILLA", "M6_CAMPO_INSPECTOR"]);
  });
});
