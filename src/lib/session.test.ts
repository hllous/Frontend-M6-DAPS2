import { afterEach, describe, expect, it, vi } from "vitest";

import {
  AUTH_COOKIE_NAME,
  AuthUnavailableError,
  SESSION_ABSOLUTE_MS,
  SESSION_IDLE_MS,
  createSession,
  effectiveSessionExpiry,
  getAuthMode,
  getSessionFromCookieValue,
  isSessionActive,
  publicSession,
  sealSession,
  sessionCookieOptions,
  type Session,
} from "./session";
import { createLocalMockWarmupCookie } from "./session-cookie.cjs";

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

  it("seals a mock Office session without exposing its token-shaped contents", () => {
    const session = createSession("office-duty-queue", { mode: "mock", now });
    const cookie = sealSession(session, secret);
    const publicValue = publicSession(session);

    expect(cookie).not.toContain("office-duty-queue");
    expect(publicValue).not.toHaveProperty("accessToken");
    expect(publicValue.scenarioId).toBe("office-duty-queue");
    expect(AUTH_COOKIE_NAME).toBe("m6_session");
  });

  it("creates a local warm-up cookie with the runtime secret and the normal session reader", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("M6_AUTH_MODE", "mock");
    vi.stubEnv("M6_SESSION_SECRET", secret);

    const cookieHeader = createLocalMockWarmupCookie(process.env, now);
    const cookieValue = cookieHeader.slice(`${AUTH_COOKIE_NAME}=`.length);

    expect(getSessionFromCookieValue(cookieValue, secret, now)).toMatchObject({
      mode: "mock",
      scenarioId: "office-duty-queue",
    });
  });

  it.each([
    { NODE_ENV: "production", M6_AUTH_MODE: "mock" },
    { NODE_ENV: "development", M6_AUTH_MODE: "backend-development" },
    { NODE_ENV: "development", M6_AUTH_MODE: "real-m1" },
  ])("refuses a warm-up cookie for unsupported $NODE_ENV/$M6_AUTH_MODE auth", (environment) => {
    expect(() => createLocalMockWarmupCookie(environment, now)).toThrow();
  });

  it("bounds activity by JWT, idle, and absolute expiry", () => {
    const session: Session = {
      mode: "backend-development",
      scenarioId: "field-crew-leader-route",
      issuedAt: now,
      lastActivityAt: now,
      absoluteExpiresAt: now + 8 * 60 * 60 * 1000,
      jwtExpiresAt: now + 20 * 60 * 1000,
      accessToken: "header.payload.signature",
    };

    expect(effectiveSessionExpiry(session)).toBe(now + 20 * 60 * 1000);
    expect(isSessionActive(session, now + 19 * 60 * 1000)).toBe(true);
    expect(isSessionActive(session, now + 21 * 60 * 1000)).toBe(false);
  });

  it("round-trips the server-only development credential through the sealed value", () => {
    vi.stubEnv("M6_AUTH_MODE", "backend-development");
    const token = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const session = createSession("field-crew-leader-route", {
      mode: "backend-development",
      now,
      devJwt: token,
      backendOrigin: "https://backend.internal",
    });
    const cookie = sealSession(session, secret);
    const unsealed = getSessionFromCookieValue(cookie, secret, now);

    expect(unsealed?.accessToken).toBe(token);
    expect(cookie).not.toContain(token);
  });

  it.each([
    { sessionMode: "mock", runtimeMode: "backend-development" },
    { sessionMode: "backend-development", runtimeMode: "mock" },
  ] as const)("rejects a $sessionMode cookie after switching to $runtimeMode mode", ({ sessionMode, runtimeMode }) => {
    vi.stubEnv("M6_AUTH_MODE", sessionMode);
    const session = createSession("office-duty-queue", sessionMode === "mock"
      ? { mode: sessionMode, now }
      : {
          mode: sessionMode,
          now,
          devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature",
          backendOrigin: "https://backend.internal",
        });
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

  it("fails closed when backend-development has no backend origin", () => {
    expect(() => createSession("field-crew-leader-route", {
      mode: "backend-development",
      now,
      devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature",
    })).toThrow("La autenticación solicitada no está disponible.");
  });

  it("keeps authentication diagnostics in the server log and exposes a generic message", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});

    const error = new AuthUnavailableError("M6_DEV_JWT no tiene una expiración válida.");

    expect(error.message).toBe("La autenticación solicitada no está disponible.");
    expect(log).toHaveBeenCalledWith("[m6-auth-unavailable]", "M6_DEV_JWT no tiene una expiración válida.");
  });

  it("respects an explicit M6_AUTH_MODE override in production", () => {
    expect(getAuthMode({ NODE_ENV: "production", M6_AUTH_MODE: "backend-development" })).toBe("backend-development");
    expect(getAuthMode({ NODE_ENV: "production", M6_AUTH_MODE: "mock" })).toBe("mock");
  });

  it("fails closed to real M1 in production when M6_AUTH_MODE is unset", () => {
    expect(getAuthMode({ NODE_ENV: "production" })).toBe("real-m1");
    expect(getAuthMode({ NODE_ENV: "development" })).toBe("mock");
  });
});
