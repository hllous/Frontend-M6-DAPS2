import { afterEach, describe, expect, it, vi } from "vitest";

import { authenticatedFetch, NetworkFailureError, ROLES_STALE_EVENT } from "./authenticated-fetch";

afterEach(() => {
  vi.restoreAllMocks();
});

function mockLocationAssign() {
  const assign = vi.fn();
  Object.defineProperty(window, "location", { value: { assign }, writable: true, configurable: true });
  return assign;
}

describe("authenticatedFetch", () => {
  it("wraps a transport failure in a typed, retryable network error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(authenticatedFetch("/api/zones")).rejects.toBeInstanceOf(NetworkFailureError);
  });

  it("clears the session and redirects the tab on a 401 before returning the response", async () => {
    const assignMock = mockLocationAssign();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input).includes("/api/session/logout")) return new Response(null, { status: 200 });
      return new Response(JSON.stringify({ message: "unauthorized" }), { status: 401 });
    });

    const response = await authenticatedFetch("/api/zones");

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledWith("/api/session/logout", expect.objectContaining({ method: "POST" }));
    expect(assignMock).toHaveBeenCalledWith("/login");
  });

  it("leaves the session untouched on a 403", async () => {
    const assignMock = mockLocationAssign();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "forbidden" }), { status: 403 }),
    );

    const response = await authenticatedFetch("/api/zones");

    expect(response.status).toBe(403);
    expect(assignMock).not.toHaveBeenCalled();
  });
});


describe("403 classification", () => {
  it("explains ROLE_REQUIRED in Spanish and requests a role refresh without retry or logout", async () => {
    const listener = vi.fn();
    window.addEventListener(ROLES_STALE_EVENT, listener);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      statusCode: 403, message: "Forbidden resource", code: "ROLE_REQUIRED", error: "Forbidden", timestamp: "2026-10-23T12:00:00Z", path: "/api/services",
    }), { status: 403 }));
    try {
      const response = await authenticatedFetch("/api/services", { method: "POST" });
      expect(await response.json()).toMatchObject({ code: "ROLE_REQUIRED", message: "No tenés el rol necesario para realizar esta acción en Ambiente. Solicitá acceso a un administrador." });
      expect(listener).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally { window.removeEventListener(ROLES_STALE_EVENT, listener); }
  });
});
