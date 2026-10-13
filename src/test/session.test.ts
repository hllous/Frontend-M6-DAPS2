import { afterEach, describe, expect, it, vi } from "vitest";

import { getRequiredSession } from "@/lib/session";
import { backendEnv, loginAs } from "./session";

afterEach(() => vi.unstubAllEnvs());

describe("test session helpers", () => {
  it("logs in through the real handler and returns a usable cookie header", async () => {
    vi.stubEnv("M6_AUTH_MODE", "mock");
    const cookie = await loginAs("office-duty-queue");
    const session = getRequiredSession(new Request("http://localhost/api/test", { headers: { cookie } }));

    expect(session.scenarioId).toBe("office-duty-queue");
    expect(cookie).not.toContain(";");
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
