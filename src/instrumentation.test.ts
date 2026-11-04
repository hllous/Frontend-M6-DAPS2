import { afterEach, describe, expect, it, vi } from "vitest";

import { register } from "./instrumentation";

afterEach(() => vi.unstubAllEnvs());

describe("registro del servidor", () => {
  it.each(["mock", "backend-development"])("rechaza el modo %s en producción antes de servir", (mode) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("M6_AUTH_MODE", mode);

    expect(() => register()).toThrow("M6_AUTH_MODE debe ser real-m1 en producción.");
  });

  it("acepta real-m1 en producción", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("M6_AUTH_MODE", "real-m1");

    expect(() => register()).not.toThrow();
  });

  it("permite mock durante el desarrollo local", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("M6_AUTH_MODE", "mock");

    expect(() => register()).not.toThrow();
  });
});
