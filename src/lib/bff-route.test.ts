import { afterEach, describe, expect, it } from "vitest";

import { AuthUnavailableError, BackendUnavailableError, ForbiddenSessionError, InvalidSessionError } from "./session";
import { backendMode, errorResponse, forwardResponse, mapSessionError } from "./bff-route";

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

  it("builds the shared error envelope with complete 503 and 409 labels", async () => {
    const unavailable = errorResponse(503, "Backend offline.", "/api/test");
    const conflict = errorResponse(409, "Conflict.", "/api/test");

    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toMatchObject({ error: "Service Unavailable", path: "/api/test" });
    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({ error: "Conflict", path: "/api/test" });
  });

  it.each([
    [new InvalidSessionError(), 401, "La sesión no está activa."],
    [new ForbiddenSessionError("Acceso denegado."), 403, "Acceso denegado."],
    [new AuthUnavailableError("Sin backend."), 503, "Sin backend."],
    [new BackendUnavailableError(503, "El backend no responde. Reintente en unos segundos."), 503, "El backend no responde. Reintente en unos segundos."],
    [new Error("detalle interno"), 500, "No se pudo completar la solicitud."],
  ])("maps %s to its shared status and safe message", async (error, status, message) => {
    const response = mapSessionError(error, "/api/test", "No se pudo completar la solicitud.");

    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ message, path: "/api/test" });
  });

  it("wraps an upstream content type outside application/json in the standard error envelope", async () => {
    const response = await forwardResponse(new Response("upstream body", {
      status: 409,
      headers: { "content-type": "application/problem+json" },
    }));

    expect(response.status).toBe(409);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.json()).toMatchObject({ statusCode: 409, error: "Conflict" });
  });

  it("relays bodyless upstream responses", async () => {
    const response = forwardResponse(new Response(null, { status: 204 }));

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });
});
