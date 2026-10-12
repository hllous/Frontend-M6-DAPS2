import { afterEach, describe, expect, it } from "vitest";

import { backendMode } from "./bff-route";

describe("backendMode", () => {
  afterEach(() => {
    delete process.env.M6_BACKEND_ORIGIN;
  });

  it("rejects an unset backend origin in backend-development mode", () => {
    delete process.env.M6_BACKEND_ORIGIN;

    expect(() => backendMode({ mode: "backend-development" })).toThrow(
      "El backend de desarrollo no está configurado.",
    );
  });

  it("rejects an empty backend origin in backend-development mode", () => {
    process.env.M6_BACKEND_ORIGIN = "";

    expect(() => backendMode({ mode: "backend-development" })).toThrow(
      "El backend de desarrollo no está configurado.",
    );
  });

  it("returns false in mock mode even when the origin is absent", () => {
    delete process.env.M6_BACKEND_ORIGIN;

    expect(backendMode({ mode: "mock" })).toBe(false);
  });

  it("returns true in backend-development mode when the origin is set", () => {
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";

    expect(backendMode({ mode: "backend-development" })).toBe(true);
  });
});
