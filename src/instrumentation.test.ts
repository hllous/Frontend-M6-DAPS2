import { afterEach, describe, expect, it, vi } from "vitest";

import { register } from "./instrumentation";

describe("register (arranque del servidor)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("aborta el arranque de un build desplegado sin M6_AUTH_MODE=real-m1", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("M6_AUTH_MODE", "");
    expect(() => register()).toThrow(/real-m1/);

    vi.stubEnv("M6_AUTH_MODE", "mock");
    expect(() => register()).toThrow(/real-m1/);
  });

  it("deja arrancar un build desplegado con real-m1", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("M6_AUTH_MODE", "real-m1");
    expect(() => register()).not.toThrow();
  });

  it("no restringe el desarrollo local", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("M6_AUTH_MODE", "mock");
    expect(() => register()).not.toThrow();
  });
});
