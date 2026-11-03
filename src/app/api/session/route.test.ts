import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { createM1Session, sealSession, AUTH_COOKIE_NAME } from "@/lib/session";
import type { M6Role } from "@/lib/m6-roles";
import { GET as pulse } from "./route";

const server = setupServer();
const secret = "test-session-secret-that-is-long-enough";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

function signedSessionCookie(options: { roles: readonly M6Role[]; expiresInMs?: number } = { roles: [] }) {
  vi.stubEnv("M6_AUTH_MODE", "real-m1");
  vi.stubEnv("M6_SESSION_SECRET", secret);
  const now = Date.now();
  const exp = Math.floor((now + (options.expiresInMs ?? 15 * 60_000)) / 1000);
  const payload = Buffer.from(JSON.stringify({ sub: "42", exp })).toString("base64url");
  const accessToken = `header.${payload}.signature`;
  const session = createM1Session({
    accessToken,
    refreshToken: "refresh-token",
    jwtExpiresAt: exp * 1000,
    identity: { userId: "42", subType: "EMPLEADO", m1Role: "ADMINISTRATIVO" },
    roles: options.roles,
    now,
  });
  return `${AUTH_COOKIE_NAME}=${sealSession(session, secret)}`;
}

function pulseRequest(cookie: string) {
  return new Request("http://localhost/api/session", { headers: { cookie } });
}

describe("GET /api/session with a roleless M1 session", () => {
  it("seals newly assigned roles and scenario on the activity pulse", async () => {
    vi.stubEnv("M6_BACKEND_ORIGIN", "https://backend.test");
    vi.stubEnv("M1_BASE_URL", "https://m1.test/api/v1/");
    server.use(http.get("https://backend.test/me", () => HttpResponse.json({
      userId: "42",
      subType: "EMPLEADO",
      m1Role: "ADMINISTRATIVO",
      roles: ["M6_ADMIN"],
    })));

    const response = await pulse(pulseRequest(signedSessionCookie()));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.session.roles).toEqual(["M6_ADMIN"]);
    expect(body.session.scenarioId).toBe("office-duty-queue");
    expect(response.headers.get("set-cookie")).toContain("m6_session=");
  });

  it("clears the auth cookie when M1 rejects refresh during the pulse", async () => {
    vi.stubEnv("M6_BACKEND_ORIGIN", "https://backend.test");
    vi.stubEnv("M1_BASE_URL", "https://m1.test/api/v1/");
    server.use(http.post("https://m1.test/api/v1/auth/refresh", () => HttpResponse.json({}, { status: 401 })));

    const response = await pulse(pulseRequest(signedSessionCookie({ roles: [], expiresInMs: 30_000 })));

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toMatch(/m6_session=;.*Max-Age=0/i);
  });
});
