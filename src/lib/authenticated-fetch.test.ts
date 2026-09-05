import { afterEach, describe, expect, it, vi } from "vitest";

import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";

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
