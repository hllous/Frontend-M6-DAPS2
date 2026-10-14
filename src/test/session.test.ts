import { afterEach, describe, expect, it, vi } from "vitest";

import { getRequiredSession } from "@/lib/session";
import { backendEnv, createSessionCookie, loginAs } from "./session";

afterEach(() => vi.unstubAllEnvs());

describe("test session helpers", () => {
  it("logs in through the real handler and returns a usable cookie header", async () => {
    vi.stubEnv("M6_AUTH_MODE", "mock");
    const cookie = await loginAs("office-duty-queue");
    const session = getRequiredSession(new Request("http://localhost/api/test", { headers: { cookie } }));

    expect(session.scenarioId).toBe("office-duty-queue");
    expect(cookie).not.toContain(";");
  });

  it("creates a session with the requested test auth settings", async () => {
    vi.stubEnv("M6_AUTH_MODE", "mock");
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = await loginAs("office-duty-queue", {
      mode: "backend-development",
      devJwt,
      backendOrigin: "https://backend.internal",
    });
    const session = getRequiredSession(new Request("http://localhost/api/test", { headers: { cookie } }));

    expect(session).toMatchObject({ mode: "backend-development", accessToken: devJwt });
  });

  it("seals a Field session with a test-resolved crew", () => {
    vi.stubEnv("M6_AUTH_MODE", "mock");
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const crew = { id: "c1ba1a57-6f23-4871-b6b3-1d7ce231a516", name: "Cuadrilla real" };
    const cookie = createSessionCookie("field-crew-leader-route", {
      mode: "backend-development",
      devJwt,
      backendOrigin: "https://backend.internal",
      crew,
    });
    const session = getRequiredSession(new Request("http://localhost/api/test", { headers: { cookie } }));

    expect(session).toMatchObject({ mode: "backend-development", accessToken: devJwt, crew });
  });

  it("configures backend login and restores both previous and absent env values", async () => {
    vi.stubEnv("M6_AUTH_MODE", "mock");
    vi.stubEnv("M6_DEV_JWT", "previous-token");
    vi.stubEnv("M6_BACKEND_ORIGIN", undefined);
    const teardown = backendEnv();
    try {
      const cookie = await loginAs("office-duty-queue");
      const session = getRequiredSession(new Request("http://localhost/api/test", { headers: { cookie } }));
      expect(session).toMatchObject({ mode: "backend-development", accessToken: process.env.M6_DEV_JWT });
      expect(session.jwtExpiresAt).toBeGreaterThan(Date.now());
      expect(process.env.M6_BACKEND_ORIGIN).toBe("https://backend.internal");
    } finally {
      teardown();
    }
    expect(process.env.M6_AUTH_MODE).toBe("mock");
    expect(process.env.M6_DEV_JWT).toBe("previous-token");
    expect(process.env.M6_BACKEND_ORIGIN).toBeUndefined();
  });

  it("rejects an invalid scenario instead of returning an empty cookie", async () => {
    vi.stubEnv("M6_AUTH_MODE", "mock");
    await expect(loginAs("unknown-scenario")).rejects.toThrow("HTTP 400");
  });
});
