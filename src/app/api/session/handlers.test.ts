import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "./login/route";
import { GET as session } from "./route";
import { POST as logout } from "./logout/route";

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
    const response = await login(realM1LoginRequest("persona@example.test", "clave"));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ message: "El servicio de ingreso no está disponible. Intente nuevamente en unos minutos." });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

});
