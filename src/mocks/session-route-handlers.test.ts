import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { AUTH_COOKIE_NAME, getSessionFromCookieValue } from "@/lib/session";
import { SESSION_MUTATION_HEADERS } from "@/lib/session-request";
import { GET as sessionPulse } from "@/app/api/session/route";
import { sessionRouteHandlers } from "./session-route-handlers";

const M1_LOGIN = "https://m1.internal/api/v1/auth/usuario/login";
const M1_REFRESH = "https://m1.internal/api/v1/auth/refresh";
const BACKEND_ME = "http://backend.internal/me";
const BACKEND_HEALTH = "http://backend.internal/health";
const server = setupServer(
  ...sessionRouteHandlers(),
  http.get(BACKEND_HEALTH, () => HttpResponse.json({ status: "ok" })),
);
const originalEnvironment = {
  mode: process.env.M6_AUTH_MODE,
  m1BaseUrl: process.env.M1_BASE_URL,
  backendOrigin: process.env.M6_BACKEND_ORIGIN,
};

function jwt(claims: Record<string, unknown> = {}) {
  const payload = {
    iss: "modulo1-ciudadanos",
    sub: "42",
    sub_type: "EMPLEADO",
    rol: "ADMINISTRATIVO",
    typ: "access",
    actorType: "EMPLEADO",
    actorId: "00000000-0000-4000-8000-000000000042",
    exp: Math.floor(Date.now() / 1000) + 900,
    ...claims,
  };
  return `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
}

function m1Success(token = jwt(), refreshToken = "refresh-for-test") {
  return HttpResponse.json({ user_id: 42, dni: 0, role: "ADMINISTRATIVO", auth: true }, {
    status: 200,
    headers: {
      authorization: `Bearer ${token}`,
      "x-refresh-token": refreshToken,
      "x-token-expires-in": "900",
    },
  });
}

function meResponse(roles: string[] = ["M6_ADMIN"], body: Record<string, unknown> = {}) {
  return HttpResponse.json({ userId: "42", subType: "EMPLEADO", m1Role: "ADMINISTRATIVO", roles, ...body });
}

async function login(body: unknown, headers: Record<string, string> = SESSION_MUTATION_HEADERS) {
  return fetch("http://localhost/api/session/login", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function cookieSession(response: Response) {
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) return undefined;
  return getSessionFromCookieValue(cookie.slice(`${AUTH_COOKIE_NAME}=`.length));
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
  for (const [key, value] of Object.entries({ M6_AUTH_MODE: originalEnvironment.mode, M1_BASE_URL: originalEnvironment.m1BaseUrl, M6_BACKEND_ORIGIN: originalEnvironment.backendOrigin })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
beforeEach(() => {
  process.env.M6_AUTH_MODE = "real-m1";
  process.env.M1_BASE_URL = "https://m1.internal/api/v1/";
  process.env.M6_BACKEND_ORIGIN = "http://backend.internal";
});

describe("real M1 session login route through MSW", () => {
  it("creates a sealed M1 session from M1 and Backend identity without exposing tokens", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const token = jwt();
    let submitted: unknown;
    let backendAuthorization: string | null = null;
    server.use(
      http.post(M1_LOGIN, async ({ request }) => {
        submitted = await request.json();
        return m1Success(token);
      }),
      http.get(BACKEND_ME, ({ request }) => {
        backendAuthorization = request.headers.get("authorization");
        return meResponse();
      }),
    );

    const response = await login({ email: "persona@example.test", password: "clave de prueba" });
    const body = await response.json();
    const sealed = cookieSession(response);

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toMatch(new RegExp(`${AUTH_COOKIE_NAME}=.*HttpOnly`, "i"));
    expect(submitted).toEqual({ gmail: "persona@example.test", password: "clave de prueba" });
    expect(timeout).toHaveBeenCalledWith(90_000);
    expect(backendAuthorization).toBe(`Bearer ${token}`);
    expect(sealed).toMatchObject({ mode: "real-m1", source: "m1", identity: { userId: "42" }, roles: ["M6_ADMIN"] });
    expect(sealed?.scenarioId).toBe("office-duty-queue");
    expect(JSON.stringify(body)).not.toContain(token);
    expect(JSON.stringify(body)).not.toContain("refresh-for-test");
  });

  it("returns the generic credential message on M1 401 and never sets a cookie", async () => {
    server.use(http.post(M1_LOGIN, () => HttpResponse.json({ message: "user not found" }, { status: 401 })));

    const response = await login({ email: "persona@example.test", password: "incorrecta" });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "El correo o la contraseña no son correctos." });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("explains that an inactive M1 account needs support without setting a cookie", async () => {
    server.use(http.post(M1_LOGIN, () => new Response(null, { status: 403 })));

    const response = await login({ email: "inactiva@example.test", password: "cualquier clave" });

    expect(response.status).toBe(403);
    expect((await response.json()).message).toMatch(/contacte al soporte de M1/i);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("reports a distinct cold-start timeout after ninety seconds without setting a cookie", async () => {
    vi.spyOn(AbortSignal, "timeout").mockReturnValue(AbortSignal.abort(new DOMException("Timed out", "TimeoutError")));
    server.use(http.post(M1_LOGIN, () => m1Success()));

    const response = await login({ email: "persona@example.test", password: "clave" });

    expect(response.status).toBe(504);
    expect(await response.json()).toEqual({ message: "El servicio de ingreso no respondió dentro de un minuto y medio. Intente nuevamente." });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("refuses a citizen token before calling Backend or setting a cookie", async () => {
    let backendCalled = false;
    server.use(
      http.post(M1_LOGIN, () => m1Success(jwt({ sub_type: "CIUDADANO", rol: "CIUDADANO" }))),
      http.get(BACKEND_ME, () => {
        backendCalled = true;
        return meResponse();
      }),
    );

    const response = await login({ email: "vecino@example.test", password: "clave" });

    expect(response.status).toBe(403);
    expect((await response.json()).message).toMatch(/no tiene acceso a M6/i);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(backendCalled).toBe(false);
  });

  it("fails closed when M1 returns a malformed access token", async () => {
    server.use(http.post(M1_LOGIN, () => m1Success("not-a-jwt")));

    const response = await login({ email: "persona@example.test", password: "clave" });

    expect(response.status).toBe(502);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it.each([
    ["issuer", { iss: "another-issuer" }],
    ["token type", { typ: "refresh" }],
    ["subject", { sub: "not-numeric" }],
    ["subject type", { sub_type: "UNKNOWN" }],
    ["M1 role", { rol: "" }],
    ["expiration", { exp: Math.floor(Date.now() / 1000) - 1 }],
  ])("rejects an access token with an invalid %s claim", async (_label, claims) => {
    server.use(http.post(M1_LOGIN, () => m1Success(jwt(claims))));

    const response = await login({ email: "persona@example.test", password: "clave" });

    expect(response.status).toBe(502);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it.each([
    ["5xx", () => new Response(null, { status: 503 })],
    ["timeout or network failure", () => HttpResponse.error()],
  ])("reports M1 %s as unavailable without setting a cookie", async (_label, response) => {
    server.use(http.post(M1_LOGIN, response));

    const result = await login({ email: "persona@example.test", password: "clave" });

    expect(result.status).toBe(503);
    expect((await result.json()).message).toMatch(/servicio de ingreso/i);
    expect(result.headers.get("set-cookie")).toBeNull();
  });

  it.each([
    [401, "No se pudo validar el ingreso con Ambiente. Intente nuevamente."],
    [403, "Esta cuenta no tiene acceso a M6."],
    [503, "El servicio de Ambiente no está disponible. Intente nuevamente en unos minutos."],
  ])("does not create a session when Backend GET /me answers %i", async (status, message) => {
    server.use(
      http.post(M1_LOGIN, () => m1Success()),
      http.get(BACKEND_ME, () => new Response(null, { status })),
    );

    const response = await login({ email: "persona@example.test", password: "clave" });

    expect(response.status).toBe(status === 403 ? 403 : status === 401 ? 401 : 503);
    expect((await response.json()).message).toBe(message);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("creates a session for an employee without M6 roles", async () => {
    server.use(http.post(M1_LOGIN, () => m1Success()), http.get(BACKEND_ME, () => meResponse([])));

    const response = await login({ email: "sin-rol@example.test", password: "clave" });

    expect(response.status).toBe(200);
    expect(cookieSession(response)).toMatchObject({ mode: "real-m1", source: "m1", identity: { userId: "42" }, roles: [] });
    expect(cookieSession(response)).not.toHaveProperty("scenarioId");
  });

  it("rejects a Backend identity that does not match the M1 subject", async () => {
    server.use(
      http.post(M1_LOGIN, () => m1Success()),
      http.get(BACKEND_ME, () => meResponse(["M6_ADMIN"], { userId: "43" })),
    );

    const response = await login({ email: "persona@example.test", password: "clave" });

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects a non-employee identity returned by Backend", async () => {
    server.use(
      http.post(M1_LOGIN, () => m1Success()),
      http.get(BACKEND_ME, () => meResponse(["M6_ADMIN"], { subType: "CIUDADANO" })),
    );

    const response = await login({ email: "persona@example.test", password: "clave" });

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("renews a session created by real M1 login and seals the replacement token", async () => {
    const expiring = jwt({ exp: Math.floor(Date.now() / 1000) + 30 });
    const renewed = jwt({ exp: Math.floor(Date.now() / 1000) + 900 });
    server.use(
      http.post(M1_LOGIN, () => m1Success(expiring, "refresh-before")),
      http.post(M1_REFRESH, ({ request }) => {
        expect(request.headers.get("x-refresh-token")).toBe("refresh-before");
        return new Response(null, {
          status: 204,
          headers: {
            authorization: `Bearer ${renewed}`,
            "x-refresh-token": "refresh-after",
            "x-token-expires-in": "900",
          },
        });
      }),
      http.get(BACKEND_ME, () => meResponse()),
    );

    const loginResponse = await login({ email: "persona@example.test", password: "clave" });
    const loginCookie = loginResponse.headers.get("set-cookie")?.split(";")[0];
    expect(loginCookie).toBeTruthy();
    const request = new Request("http://localhost/api/session", { headers: { cookie: loginCookie! } });
    const response = await sessionPulse(request);
    const sealed = cookieSession(response);

    expect(response.status).toBe(200);
    expect(sealed?.accessToken).toBe(renewed);
    expect(sealed?.refreshToken).toBe("refresh-after");
    expect(JSON.stringify(await response.json())).not.toContain(renewed);
  });

  it("rejects the demo persona body in real-M1 mode and credentials in mock mode", async () => {
    const realMode = await login({ scenarioId: "office-duty-queue" });
    process.env.M6_AUTH_MODE = "mock";
    const mockMode = await login({ email: "persona@example.test", password: "clave" });

    expect(realMode.status).toBe(400);
    expect(realMode.headers.get("set-cookie")).toBeNull();
    expect(mockMode.status).toBe(400);
    expect(mockMode.headers.get("set-cookie")).toBeNull();
  });

  it("keeps the same-origin mutation check on real login", async () => {
    const response = await login({ email: "persona@example.test", password: "clave" }, { "content-type": "application/json" });

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
