import { describe, expect, it } from "vitest";

import {
  AUTH_COOKIE_NAME,
  createSession,
  effectiveSessionExpiry,
  getAuthMode,
  getSessionFromCookieValue,
  isSessionActive,
  publicSession,
  sealSession,
  type Session,
} from "./session";

const now = Date.parse("2026-09-05T15:00:00.000Z");
const secret = "test-session-secret-that-is-long-enough";

describe("owned BFF session", () => {
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
    const token = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const session = createSession("field-crew-leader-route", {
      mode: "backend-development",
      now,
      devJwt: token,
    });
    const cookie = sealSession(session, secret);
    const unsealed = getSessionFromCookieValue(cookie, secret, now);

    expect(unsealed?.accessToken).toBe(token);
    expect(cookie).not.toContain(token);
  });

  it("fails closed for real M1 authentication", () => {
    expect(() => createSession("office-duty-queue", { mode: "real-m1", now })).toThrow(
      /bloqueada|unavailable/i,
    );
  });

  it("never enables development credentials in a production runtime", () => {
    expect(getAuthMode({ NODE_ENV: "production", M6_AUTH_MODE: "mock" })).toBe("real-m1");
    expect(getAuthMode({ NODE_ENV: "production", M6_AUTH_MODE: "backend-development" })).toBe("real-m1");
  });
});
