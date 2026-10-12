import { afterEach, describe, expect, it, vi } from "vitest";

import { AUTH_COOKIE_NAME, createSession, sealSession } from "./session";
import { fetchBackend, pathId } from "./bff-backend";

const backendOrigin = "https://backend.internal";
const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";

function backendRequest() {
  process.env.M6_BACKEND_ORIGIN = backendOrigin;
  const session = createSession("office-duty-queue", { mode: "backend-development", devJwt, backendOrigin });
  const cookie = `${AUTH_COOKIE_NAME}=${sealSession(session)}`;
  return new Request("http://localhost/api/services/service-1/start", { headers: { cookie } });
}

afterEach(() => {
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});

describe("pathId", () => {
  it.each(["crew-b", "RR-0001", "a_b", "a~b", "a.b"]) ("keeps valid fixture id %s safe", (id) => {
    expect(pathId(id)).toBe(encodeURIComponent(id));
  });

  it.each(["..", "a/b", "a?b=c", "a#b", "%2e%2e"])("returns a 400 without fetching for invalid id %s", async (id) => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("unused"));
    const response = await fetchBackend(backendRequest(), `/services/${pathId(id)}/start`);

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: "Bad Request",
      message: "Identificador inválido.",
      path: "/api/services/service-1/start",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a normalized path that differs from the supplied backend path", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("unused"));

    await expect(fetchBackend(backendRequest(), "/services/../containers/container-1/remove")).rejects.toThrow(
      "El recurso backend debe ser una ruta interna.",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
