import { afterEach, describe, expect, it, vi } from "vitest";

import { createTestSession } from "@/test/session";

import {
  AUTH_COOKIE_NAME,
  AuthUnavailableError,
  SESSION_ABSOLUTE_MS,
  SESSION_IDLE_MS,
  createM1Session,
  createSession,
  effectiveSessionExpiry,
  getAuthMode,
  isDeployedAuthModeMisconfigured,
  getRequiredSession,
  getSessionFromCookieValue,
  isSessionActive,
  publicSession,
  sealSession,
  sessionCookieOptions,
  type Session,
} from "./session";

const now = Date.parse("2026-09-05T15:00:00.000Z");
const secret = "test-session-secret-that-is-long-enough";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("owned BFF session", () => {
  it("marks the session cookie Secure only in production, so LAN/HTTP access works in dev", () => {
    const session = createSession("office-duty-queue", { mode: "mock", now });

    vi.stubEnv("NODE_ENV", "development");
    expect(sessionCookieOptions(session).secure).toBe(false);

    vi.stubEnv("NODE_ENV", "production");
    expect(sessionCookieOptions(session).secure).toBe(true);
  });

  it("keeps session cookies Secure on non-loopback hosts even outside production", () => {
    const session = createSession("office-duty-queue", { mode: "mock", now });
    vi.stubEnv("NODE_ENV", "development");

    expect(sessionCookieOptions(session, new Request("http://localhost:3000/login")).secure).toBe(false);
    expect(sessionCookieOptions(session, new Request("http://m6.example.test/login")).secure).toBe(true);
    expect(sessionCookieOptions(session, new Request("https://m6.example.test/login")).secure).toBe(true);
  });

  it("seals a mock Office session without exposing its token-shaped contents", () => {
    const session = createSession("office-duty-queue", { mode: "mock", now });
    const cookie = sealSession(session, secret);
    const publicValue = publicSession(session);

    expect(cookie).not.toContain("office-duty-queue");
    expect(publicValue).not.toHaveProperty("accessToken");
    expect(publicValue.scenarioId).toBe("office-duty-queue");
    expect(AUTH_COOKIE_NAME).toBe("m6_session");
  });

  it("bounds activity by JWT, idle, and absolute expiry", () => {
    const session: Session = {
      mode: "real-m1",
      scenarioId: "field-crew-leader-route",
      issuedAt: now,
      lastActivityAt: now,
      absoluteExpiresAt: now + 8 * 60 * 60 * 1000,
      jwtExpiresAt: now + 20 * 60 * 1000,
      accessToken: "header.payload.signature",
      roles: ["M6_CAMPO_CUADRILLA"],
    };

    expect(effectiveSessionExpiry(session)).toBe(now + 20 * 60 * 1000);
    expect(isSessionActive(session, now + 19 * 60 * 1000)).toBe(true);
    expect(isSessionActive(session, now + 21 * 60 * 1000)).toBe(false);
  });

  it("keeps an M1 session alive past the access JWT expiry, bounded by idle and absolute expiry", () => {
    const session = createM1Session({
      accessToken: "header.payload.signature",
      refreshToken: "refresh-test",
      jwtExpiresAt: now + 15 * 60 * 1000,
      identity: { userId: "42", subType: "EMPLEADO", m1Role: "ADMINISTRATIVO" },
      roles: ["M6_ADMIN"],
      now,
    });

    expect(effectiveSessionExpiry(session)).toBe(now + SESSION_IDLE_MS);
    expect(isSessionActive(session, now + 16 * 60 * 1000)).toBe(true);
    expect(isSessionActive(session, now + SESSION_IDLE_MS)).toBe(false);
    expect(isSessionActive(session, session.absoluteExpiresAt)).toBe(false);
  });

  it("accepts a roleless M1 session without a demo scenario at the BFF session boundary", () => {
    vi.stubEnv("M6_AUTH_MODE", "real-m1");
    vi.stubEnv("M6_SESSION_SECRET", secret);
    const sessionNow = Date.now();
    const session = createM1Session({
      accessToken: "header.payload.signature",
      refreshToken: "refresh-test",
      jwtExpiresAt: sessionNow + 15 * 60 * 1000,
      identity: { userId: "42", subType: "EMPLEADO", m1Role: "ADMINISTRATIVO" },
      roles: [],
      now: sessionNow,
    });
    const request = new Request("http://localhost/api/session", {
      headers: { cookie: `${AUTH_COOKIE_NAME}=${sealSession(session, secret)}` },
    });

    expect(getRequiredSession(request)).toMatchObject({ mode: "real-m1", roles: [] });
  });

  it("round-trips the server-only M1 credential through the sealed value", () => {
    vi.stubEnv("M6_AUTH_MODE", "real-m1");
    const token = "header.eyJleHAiOjQxMDAwMDAwMDB9.signature";
    const session = createTestSession("field-crew-leader-route", { accessToken: token });
    const cookie = sealSession(session, secret);
    const unsealed = getSessionFromCookieValue(cookie, secret, Date.now());

    expect(unsealed?.accessToken).toBe(token);
    expect(cookie).not.toContain(token);
  });

  it.each([
    { sessionMode: "mock", runtimeMode: "real-m1" },
    { sessionMode: "real-m1", runtimeMode: "mock" },
  ] as const)("rejects a $sessionMode cookie after switching to $runtimeMode mode", ({ sessionMode, runtimeMode }) => {
    vi.stubEnv("M6_AUTH_MODE", sessionMode);
    const session = sessionMode === "mock"
      ? createSession("office-duty-queue", { mode: "mock", now })
      : { ...createTestSession("office-duty-queue"), issuedAt: now, lastActivityAt: now };
    const cookie = sealSession(session, secret);

    vi.stubEnv("M6_AUTH_MODE", runtimeMode);

    expect(getSessionFromCookieValue(cookie, secret, now)).toBeUndefined();
  });

  it("rejects a sealed cookie with a tampered authentication tag", () => {
    const session = createSession("office-duty-queue", { mode: "mock", now });
    const [iv, authTag, ciphertext] = sealSession(session, secret).split(".");
    const changedTag = authTag?.startsWith("A") ? `B${authTag.slice(1)}` : `A${authTag?.slice(1)}`;

    expect(getSessionFromCookieValue(`${iv}.${changedTag}.${ciphertext}`, secret, now)).toBeUndefined();
  });

  it("rejects a cookie sealed with a different M6_SESSION_SECRET", () => {
    const session = createSession("office-duty-queue", { mode: "mock", now });
    const cookie = sealSession(session, secret);

    expect(getSessionFromCookieValue(cookie, "a-different-session-secret", now)).toBeUndefined();
  });

  it("rejects an idle-expired cookie", () => {
    const session = createSession("office-duty-queue", { mode: "mock", now });
    const cookie = sealSession(session, secret);

    expect(getSessionFromCookieValue(cookie, secret, now + SESSION_IDLE_MS)).toBeUndefined();
  });

  it("rejects an absolute-expired cookie even when its idle deadline matches", () => {
    const created = createSession("office-duty-queue", { mode: "mock", now });
    const session = { ...created, lastActivityAt: created.absoluteExpiresAt - SESSION_IDLE_MS };
    const cookie = sealSession(session, secret);

    expect(session.absoluteExpiresAt).toBe(now + SESSION_ABSOLUTE_MS);
    expect(getSessionFromCookieValue(cookie, secret, session.absoluteExpiresAt)).toBeUndefined();
  });

  it("fails closed for real M1 authentication", () => {
    expect(() => createSession("office-duty-queue", { mode: "real-m1", now })).toThrow(
      "La autenticación solicitada no está disponible.",
    );
  });

  it("keeps authentication diagnostics in the server log and exposes a generic message", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const error = new AuthUnavailableError("El backend no está configurado.");

    expect(error.message).toBe("La autenticación solicitada no está disponible.");
    expect(log).toHaveBeenCalledWith("[m6-auth-unavailable]", "El backend no está configurado.");
  });

  it("forces real M1 in deployed builds and falls back to mock only outside production", () => {
    expect(getAuthMode({ NODE_ENV: "production", M6_AUTH_MODE: "real-m1" })).toBe("real-m1");
    expect(getAuthMode({ NODE_ENV: "production", M6_AUTH_MODE: "mock" })).toBe("real-m1");
    expect(getAuthMode({ NODE_ENV: "production", M6_AUTH_MODE: "backend-development" })).toBe("real-m1");
    expect(getAuthMode({ NODE_ENV: "development", M6_AUTH_MODE: "backend-development" })).toBe("mock");
    expect(getAuthMode({ NODE_ENV: "development", M6_AUTH_MODE: "real-m1" })).toBe("real-m1");
  });

  it("flags a deployed build whose M6_AUTH_MODE is not real-m1 so start-up fails closed", () => {
    expect(isDeployedAuthModeMisconfigured({ NODE_ENV: "production", M6_AUTH_MODE: "real-m1" })).toBe(false);
    expect(isDeployedAuthModeMisconfigured({ NODE_ENV: "production", M6_AUTH_MODE: "mock" })).toBe(true);
    expect(isDeployedAuthModeMisconfigured({ NODE_ENV: "production", M6_AUTH_MODE: "backend-development" })).toBe(true);
    expect(isDeployedAuthModeMisconfigured({ NODE_ENV: "production" })).toBe(true);
    expect(isDeployedAuthModeMisconfigured({ NODE_ENV: "development", M6_AUTH_MODE: "mock" })).toBe(false);
    expect(isDeployedAuthModeMisconfigured({ NODE_ENV: "test" })).toBe(false);
  });

  it("fails closed to real M1 in production when M6_AUTH_MODE is unset", () => {
    expect(getAuthMode({ NODE_ENV: "production" })).toBe("real-m1");
    expect(getAuthMode({ NODE_ENV: "development" })).toBe("mock");
  });
});
