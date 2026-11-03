import { afterEach, describe, expect, it, vi } from "vitest";

import { TEST_ACCESS_TOKEN, loginWithMe as login } from "@/test/session";
import { POST as realLogin } from "./login/route";
import { fetchMeWithToken, sessionFromMe } from "@/lib/me";
import { CitizenForbiddenError, InvalidSessionError, createM1Session, publicSession, sealSession } from "@/lib/session";
import { getSessionFromRequest } from "@/lib/session";
import { getScenario, type ScenarioId } from "@/lib/scenarios";
import { GET as session } from "./route";
import { POST as logout } from "./logout/route";
import { GET as scenarioRoute } from "../mock/scenarios/[scenarioId]/route";

const originalEnvironment = {
  authMode: process.env.M6_AUTH_MODE,
};

afterEach(() => {
  if (originalEnvironment.authMode === undefined) delete process.env.M6_AUTH_MODE;
  else process.env.M6_AUTH_MODE = originalEnvironment.authMode;
  delete process.env.M6_BACKEND_ORIGIN;
  delete process.env.M1_BASE_URL;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function meResponse(roles: string[], init: { subType?: string } = {}) {
  return Response.json({ userId: "42", subType: init.subType ?? "EMPLEADO", m1Role: "ADMINISTRATIVO", roles });
}

/** Login real de M1 ya resuelto (el POST a M1 está probado en login/route.test.ts): el GET /me que sigue lo sirve el mock de fetch del test. */
async function loginRoute(request: Request): Promise<Response> {
  const { scenarioId } = (await request.clone().json()) as { scenarioId: ScenarioId };
  try {
    const me = await fetchMeWithToken(process.env.M6_BACKEND_ORIGIN ?? "", TEST_ACCESS_TOKEN);
    const created = createM1Session({
      accessToken: TEST_ACCESS_TOKEN,
      refreshToken: "refresh-test",
      jwtExpiresAt: Date.now() + 15 * 60 * 1000,
      identity: { userId: me.userId, subType: "EMPLEADO", m1Role: me.m1Role },
    });
    const session = sessionFromMe({ ...created, scenarioId }, me);
    return Response.json({ session: publicSession(session) }, { headers: { "set-cookie": `m6_session=${sealSession(session)}; Path=/; HttpOnly` } });
  } catch (error) {
    if (error instanceof CitizenForbiddenError) return Response.json({ message: error.message }, { status: 403 });
    if (error instanceof InvalidSessionError) return Response.json({ message: error.message }, { status: 401 });
    throw error;
  }
}

function backendSessionEnv() {
  process.env.M6_AUTH_MODE = "real-m1";
  process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
}

function loginRequest(
  scenarioId: string,
  headers: Record<string, string> = { "content-type": "application/json", "x-requested-with": "XMLHttpRequest" },
) {
  return new Request("http://localhost/api/session/login", {
    method: "POST",
    headers,
    body: JSON.stringify({ scenarioId }),
  });
}

function realM1LoginRequest(email: string, password: string) {
  return new Request("http://localhost/api/session/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-requested-with": "XMLHttpRequest" },
    body: JSON.stringify({ email, password }),
  });
}

function logoutRequest(
  headers: Record<string, string> = { "content-type": "application/json", "x-requested-with": "XMLHttpRequest" },
  body = "{}",
) {
  return new Request("http://localhost/api/session/logout", { method: "POST", headers, body });
}

describe("session route handlers", () => {
  it("rejects login without the custom CSRF header", async () => {
    process.env.M6_AUTH_MODE = "mock";
    const response = await login(loginRequest("office-duty-queue", { "content-type": "application/json" }));

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects login with a non-JSON content type", async () => {
    process.env.M6_AUTH_MODE = "mock";
    const response = await login(loginRequest("office-duty-queue", {
      "content-type": "text/plain",
      "x-requested-with": "XMLHttpRequest",
    }));

    expect(response.status).toBe(415);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects logout without the custom CSRF header", async () => {
    const response = await logout(logoutRequest({ "content-type": "application/json" }));

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects logout with a non-JSON content type", async () => {
    const response = await logout(logoutRequest({
      "content-type": "text/plain",
      "x-requested-with": "XMLHttpRequest",
    }));

    expect(response.status).toBe(415);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects logout with an invalid JSON body", async () => {
    const response = await logout(logoutRequest(undefined, "{"));

    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it.each(["constructor", "__proto__"])("rejects inherited scenario key %s without setting a session cookie", async (scenarioId) => {
    process.env.M6_AUTH_MODE = "mock";
    const response = await login(loginRequest(scenarioId));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "Seleccione un escenario operativo válido." });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("creates an opaque cookie for a mock scenario", async () => {
    process.env.M6_AUTH_MODE = "mock";
    const response = await login(loginRequest("office-duty-queue"));
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(200);
    expect(setCookie).toMatch(/m6_session=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(setCookie).not.toContain("office-duty-queue");
  });

  it("does not mark the cookie Secure outside production, so LAN/HTTP access works in dev", async () => {
    process.env.M6_AUTH_MODE = "mock";
    vi.stubEnv("NODE_ENV", "development");
    const response = await login(loginRequest("office-duty-queue"));
    expect(response.headers.get("set-cookie") ?? "").not.toMatch(/Secure/i);
  });

  describe("Crew from GET /me (#469)", () => {
    it.each([
      [[{ id: "a", name: "Otra", role: "MEMBER" }, { id: "b", name: "Cuadrilla Belgrano — Recolección", role: "MEMBER" }], "b", "CREW_MEMBER"],
      [[{ id: "a", name: "Otra", role: "LEADER" }, { id: "b", name: "Distinta", role: "LEADER" }], "a", "CREW_LEADER"],
      [[], undefined, undefined],
    ])("selects the expected crew among memberships", async (crews, id, fieldRole) => {
      backendSessionEnv();
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ userId: "42", subType: "EMPLEADO", m1Role: "ADMINISTRATIVO", roles: ["M6_CAMPO_CUADRILLA"], crews }));
      const response = await loginRoute(loginRequest("field-crew-leader-route"));
      expect(response.status).toBe(200);
      const value = (await response.json()).session;
      expect(value.crew?.id).toBe(id);
      expect(value.fieldRole).toBe(fieldRole);
      const scenario = getScenario({ ...value, mode: "real-m1" });
      expect(scenario.capabilities.includes("service:execute")).toBe(fieldRole !== "CREW_MEMBER");
    });

    it("keeps membership on outage and accepts older backend responses without crews", async () => {
      backendSessionEnv();
      const backend = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ userId: "42", subType: "EMPLEADO", m1Role: "ADMINISTRATIVO", roles: ["M6_CAMPO_CUADRILLA"], crews: [{ id: "a", name: "Una", role: "MEMBER" }] }));
      const cookie = (await loginRoute(loginRequest("field-crew-leader-route"))).headers.get("set-cookie") ?? "";
      backend.mockRejectedValueOnce(new TypeError("offline"));
      const pulse = await session(new Request("http://localhost/api/session", { headers: { cookie } }));
      expect((await pulse.json()).session).toMatchObject({ crew: { id: "a" }, fieldRole: "CREW_MEMBER" });
      backend.mockResolvedValueOnce(meResponse(["M6_CAMPO_CUADRILLA"]));
      const old = await loginRoute(loginRequest("field-crew-leader-route"));
      expect(old.status).toBe(200);
      expect((await old.json()).session.crew).toBeUndefined();
    });

    it("uses backend membership and role at login and refreshes both on the activity pulse", async () => {
      backendSessionEnv();
      const backend = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ userId: "42", subType: "EMPLEADO", m1Role: "ADMINISTRATIVO", roles: ["M6_CAMPO_CUADRILLA"], crews: [{ id: "a", name: "Primera", role: "MEMBER" }, { id: "b", name: "Segunda", role: "LEADER" }] }));
      const loginResponse = await loginRoute(loginRequest("field-crew-member-route"));
      const cookie = loginResponse.headers.get("set-cookie") ?? "";
      expect((await loginResponse.json()).session).toMatchObject({ crew: { id: "b", name: "Segunda" }, fieldRole: "CREW_LEADER" });
      backend.mockResolvedValueOnce(Response.json({ userId: "42", subType: "EMPLEADO", m1Role: "ADMINISTRATIVO", roles: ["M6_CAMPO_CUADRILLA"], crews: [{ id: "a", name: "Primera", role: "MEMBER" }] }));
      const pulse = await session(new Request("http://localhost/api/session", { headers: { cookie } }));
      expect((await pulse.json()).session).toMatchObject({ crew: { id: "a", name: "Primera" }, fieldRole: "CREW_MEMBER" });
      expect(backend.mock.calls.every(([input]) => new URL(String(input)).pathname === "/me")).toBe(true);
    });
  });

  it("refreshes a valid session and can leave it", async () => {
    process.env.M6_AUTH_MODE = "mock";
    const loginResponse = await login(loginRequest("office-duty-queue"));
    const cookie = loginResponse.headers.get("set-cookie") ?? "";
    const sessionResponse = await session(new Request("http://localhost/api/session", { headers: { cookie } }));
    const sessionBody = await sessionResponse.json();

    expect(sessionResponse.status).toBe(200);
    expect(sessionBody.session).not.toHaveProperty("accessToken");

    const logoutResponse = await logout(new Request("http://localhost/api/session/logout", {
      method: "POST",
      headers: { cookie, "content-type": "application/json", "x-requested-with": "XMLHttpRequest" },
      body: "{}",
    }));
    expect(logoutResponse.headers.get("set-cookie")).toMatch(/Max-Age=0/i);
  });

  it("does not fall back when real M1 mode is requested", async () => {
    process.env.M6_AUTH_MODE = "real-m1";
    delete process.env.M1_BASE_URL;
    const response = await realLogin(realM1LoginRequest("persona@example.test", "clave"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ message: "El servicio de ingreso no está disponible. Intente nuevamente en unos minutos." });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  describe("M6 roles come from GET /me (#657)", () => {
    const bearer = (call: unknown[]) => new Headers((call[1] as RequestInit).headers).get("authorization");

    it("seals the effective roles of GET /me, not the ones of the chosen scenario", async () => {
      backendSessionEnv();
      const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(meResponse(["M6_OFICINA_AMBIENTAL"]));

      const response = await loginRoute(loginRequest("office-duty-queue"));
      const cookie = response.headers.get("set-cookie") ?? "";

      expect(response.status).toBe(200);
      expect(String(backendFetch.mock.calls[0]?.[0])).toBe("https://backend.internal/me");
      expect(bearer(backendFetch.mock.calls[0] ?? [])).toMatch(/^Bearer /);
      expect((await response.json()).session.roles).toEqual(["M6_OFICINA_AMBIENTAL"]);
      expect(getSessionFromRequest(new Request("http://localhost", { headers: { cookie } }))?.roles).toEqual(["M6_OFICINA_AMBIENTAL"]);
    });

    it("does not open a session for a citizen token: 403 without a role code and without a cookie", async () => {
      backendSessionEnv();
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        Response.json({ statusCode: 403, message: "Este sistema es solo para personal municipal" }, { status: 403 }),
      );

      const response = await loginRoute(loginRequest("office-duty-queue"));

      expect(response.status).toBe(403);
      expect((await response.json()).message).toMatch(/personal municipal/);
      expect(response.headers.get("set-cookie")).toBeNull();
    });

    it("does not open a session when the backend rejects the M1 token", async () => {
      backendSessionEnv();
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ statusCode: 401, message: "Unauthorized" }, { status: 401 }));

      const response = await loginRoute(loginRequest("office-duty-queue"));

      expect(response.status).toBe(401);
      expect(response.headers.get("set-cookie")).toBeNull();
    });

    it("opens a session with no roles and serves the scenario with no capabilities, so the UI can explain it", async () => {
      backendSessionEnv();
      const backendFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async () => meResponse([]));

      const login_ = await loginRoute(loginRequest("office-duty-queue"));
      const cookie = login_.headers.get("set-cookie") ?? "";
      const response = await scenarioRoute(new Request("http://localhost/api/mock/scenarios/office-duty-queue", { headers: { cookie } }), {
        params: Promise.resolve({ scenarioId: "office-duty-queue" }),
      });

      expect(login_.status).toBe(200);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ roles: [], capabilities: [] });
      expect(backendFetch).toHaveBeenCalledTimes(2);
    });

    it("recomputes the scenario and reseals the cookie when an administrator changed the roles", async () => {
      backendSessionEnv();
      const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(meResponse(["M6_OFICINA_OPERACIONES"]));
      const cookie = (await loginRoute(loginRequest("office-duty-queue"))).headers.get("set-cookie") ?? "";

      backendFetch.mockResolvedValueOnce(meResponse(["M6_AUDITOR"]));
      const response = await scenarioRoute(new Request("http://localhost/api/mock/scenarios/office-duty-queue", { headers: { cookie } }), {
        params: Promise.resolve({ scenarioId: "office-duty-queue" }),
      });
      const resealed = response.headers.get("set-cookie") ?? "";

      expect(await response.json()).toMatchObject({ roles: ["M6_AUDITOR"] });
      expect(getSessionFromRequest(new Request("http://localhost", { headers: { cookie: resealed } }))?.roles).toEqual(["M6_AUDITOR"]);
    });

    it("answers a citizen 403 from the scenario with the same message and no role code", async () => {
      backendSessionEnv();
      const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(meResponse(["M6_ADMIN"]));
      const cookie = (await loginRoute(loginRequest("office-duty-queue"))).headers.get("set-cookie") ?? "";

      backendFetch.mockResolvedValueOnce(Response.json({ statusCode: 403, message: "x" }, { status: 403 }));
      const response = await scenarioRoute(new Request("http://localhost/api/mock/scenarios/office-duty-queue", { headers: { cookie } }), {
        params: Promise.resolve({ scenarioId: "office-duty-queue" }),
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.message).toMatch(/personal municipal/);
      expect(body).not.toHaveProperty("code");
    });

    it("refreshes the roles on the activity pulse and ends the session when the backend answers 401", async () => {
      backendSessionEnv();
      const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(meResponse(["M6_ADMIN"]));
      const cookie = (await loginRoute(loginRequest("office-duty-queue"))).headers.get("set-cookie") ?? "";

      backendFetch.mockResolvedValueOnce(meResponse([]));
      const pulse = await session(new Request("http://localhost/api/session", { headers: { cookie } }));
      expect((await pulse.json()).session.roles).toEqual([]);

      backendFetch.mockResolvedValueOnce(Response.json({ statusCode: 401, message: "Unauthorized" }, { status: 401 }));
      const rejected = await session(new Request("http://localhost/api/session", { headers: { cookie } }));
      expect(rejected.status).toBe(401);
      expect(rejected.headers.get("set-cookie")).toMatch(/m6_session=;|Max-Age=0/i);
    });

    it("keeps the sealed roles when the pulse cannot reach the backend", async () => {
      backendSessionEnv();
      const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(meResponse(["M6_ADMIN"]));
      const cookie = (await loginRoute(loginRequest("office-duty-queue"))).headers.get("set-cookie") ?? "";

      backendFetch.mockRejectedValueOnce(new TypeError("fetch failed"));
      const pulse = await session(new Request("http://localhost/api/session", { headers: { cookie } }));

      expect(pulse.status).toBe(200);
      expect((await pulse.json()).session.roles).toEqual(["M6_ADMIN"]);
    });
  });
});
