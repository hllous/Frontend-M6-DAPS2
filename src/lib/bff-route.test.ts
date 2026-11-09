import { afterEach, describe, expect, it } from "vitest";

import { AuthUnavailableError, BackendUnavailableError, ForbiddenSessionError, InvalidSessionError } from "./session";
import { backendMode, backendQuery, errorResponse, forwardResponse, mapSessionError } from "./bff-route";

describe("backendMode", () => {
  afterEach(() => {
    delete process.env.M6_BACKEND_ORIGIN;
  });

  it("rejects an unset backend origin in real-m1 mode", () => {
    delete process.env.M6_BACKEND_ORIGIN;

    expect(() => backendMode({ mode: "real-m1" })).toThrow(
      "La autenticación solicitada no está disponible.",
    );
  });

  it("rejects an empty backend origin in real-m1 mode", () => {
    process.env.M6_BACKEND_ORIGIN = "";

    expect(() => backendMode({ mode: "real-m1" })).toThrow(
      "La autenticación solicitada no está disponible.",
    );
  });

  it("returns false in mock mode even when the origin is absent", () => {
    delete process.env.M6_BACKEND_ORIGIN;

    expect(backendMode({ mode: "mock" })).toBe(false);
  });

  it("returns true in real-m1 mode when the origin is set", () => {
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";

    expect(backendMode({ mode: "real-m1" })).toBe(true);
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
    [new AuthUnavailableError("Sin backend."), 503, "La autenticación solicitada no está disponible."],
    [new BackendUnavailableError(503, "El sistema no responde. Reintente en unos segundos."), 503, "El sistema no responde. Reintente en unos segundos."],
    [new Error("detalle interno"), 500, "No se pudo completar la solicitud."],
  ])("maps %s to its shared status and safe message", async (error, status, message) => {
    const response = mapSessionError(error, "/api/test", "No se pudo completar la solicitud.");

    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ message, path: "/api/test" });
  });

  it("wraps an upstream content type outside JSON in the standard error envelope", async () => {
    const response = await forwardResponse(new Response("upstream body", {
      status: 409,
      headers: { "content-type": "text/html" },
    }));

    expect(response.status).toBe(409);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(await response.json()).toMatchObject({ statusCode: 409, error: "Conflict" });
  });

  it("relays a Backend application/problem+json error (RFC 9457) with its status and body intact", async () => {
    const body = {
      type: "about:blank",
      title: "Conflict",
      status: 409,
      detail: "La transición no es válida para el estado actual.",
      instance: "/services/service-1/start",
      statusCode: 409,
      message: "La transición no es válida para el estado actual.",
      error: "Conflict",
      timestamp: "2026-11-09T12:00:00.000Z",
      path: "/services/service-1/start",
    };
    const response = forwardResponse(new Response(JSON.stringify(body), {
      status: 409,
      headers: { "content-type": "application/problem+json; charset=utf-8" },
    }));

    expect(response.status).toBe(409);
    expect(response.headers.get("content-type")).toContain("application/problem+json");
    expect(await response.json()).toEqual(body);
  });

  it("relays bodyless upstream responses", async () => {
    const response = forwardResponse(new Response(null, { status: 204 }));

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });
});

describe("backendQuery", () => {
  it("serializes only allowed keys in the declared order", () => {
    expect(backendQuery(
      { active: false, page: 0, search: "Av. San Martín 12", internal: "omit" },
      ["active", "page", "search"],
    )).toBe("?active=false&page=0&search=Av.+San+Mart%C3%ADn+12");
  });

  it("repeats array values and omits empty or missing values", () => {
    expect(backendQuery(
      { status: ["SCHEDULED", "IN_PROGRESS"], mode: "", page: undefined },
      ["status", "mode", "page"],
    )).toBe("?status=SCHEDULED&status=IN_PROGRESS");
  });
});
