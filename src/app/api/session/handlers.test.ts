import { afterEach, describe, expect, it } from "vitest";

import { POST as login } from "./login/route";
import { GET as session } from "./route";
import { POST as logout } from "./logout/route";

const originalEnvironment = {
  authMode: process.env.M6_AUTH_MODE,
  devJwt: process.env.M6_DEV_JWT,
};

afterEach(() => {
  if (originalEnvironment.authMode === undefined) delete process.env.M6_AUTH_MODE;
  else process.env.M6_AUTH_MODE = originalEnvironment.authMode;
  if (originalEnvironment.devJwt === undefined) delete process.env.M6_DEV_JWT;
  else process.env.M6_DEV_JWT = originalEnvironment.devJwt;
});

function loginRequest(scenarioId: string) {
  return new Request("http://localhost/api/session/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenarioId }),
  });
}

describe("session route handlers", () => {
  it("creates an opaque, secure cookie for a mock scenario", async () => {
    process.env.M6_AUTH_MODE = "mock";
    const response = await login(loginRequest("office-duty-queue"));
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(200);
    expect(setCookie).toMatch(/m6_session=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/Secure/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(setCookie).not.toContain("office-duty-queue");
  });

  it("forwards the server-provided development JWT without returning it", async () => {
    process.env.M6_AUTH_MODE = "backend-development";
    const token = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    process.env.M6_DEV_JWT = token;
    const response = await login(loginRequest("field-crew-leader-route"));
    const cookie = response.headers.get("set-cookie") ?? "";
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(cookie).not.toContain(token);
    expect(JSON.stringify(body)).not.toContain(token);
  });

  it("returns only the public session and can leave it", async () => {
    process.env.M6_AUTH_MODE = "mock";
    const loginResponse = await login(loginRequest("office-duty-queue"));
    const cookie = loginResponse.headers.get("set-cookie") ?? "";
    const sessionResponse = await session(new Request("http://localhost/api/session", { headers: { cookie } }));
    const sessionBody = await sessionResponse.json();

    expect(sessionResponse.status).toBe(200);
    expect(sessionBody.session).not.toHaveProperty("accessToken");

    const logoutResponse = await logout(new Request("http://localhost/api/session/logout", { method: "POST", headers: { cookie } }));
    expect(logoutResponse.headers.get("set-cookie")).toMatch(/Max-Age=0/i);
  });

  it("does not fall back when real M1 mode is requested", async () => {
    process.env.M6_AUTH_MODE = "real-m1";
    const response = await login(loginRequest("office-duty-queue"));

    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
