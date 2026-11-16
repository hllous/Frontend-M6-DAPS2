import { afterEach, describe, expect, it, vi } from "vitest";

import { BackendUnavailableError } from "./session";
import { BACKEND_TIMEOUT_MS, STALE_RECORD_MESSAGE, fetchBackend, isJsonMediaType, pathId } from "./bff-backend";
import { forwardResponse, mapSessionError } from "./bff-route";
import { createSessionCookie } from "@/test/session";

const backendOrigin = "https://backend.internal";
const devJwt = "header.eyJleHAiOjQxMDAwMDAwMDB9.signature";

function backendRequest() {
  const cookie = createSessionCookie("office-duty-queue", { mode: "real-m1", accessToken: devJwt, backendOrigin });
  return new Request("http://localhost/api/services/service-1/start", { headers: { cookie } });
}

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
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
      "La autenticación solicitada no está disponible.",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each(["//evil.com", "/\\evil.com", "https://evil.com/path"])(
    "rejects external resource path %s without fetching",
    async (resourcePath) => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("unused"));

      await expect(fetchBackend(backendRequest(), resourcePath)).rejects.toThrow(
        "La autenticación solicitada no está disponible.",
      );
      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );
});

describe("backend error copy", () => {
  it.each([
    ["GET", 422, "El backend de M4 rechazó el pedido.", "No se pudo obtener la información. Reintente en unos segundos."],
    ["POST", 422, ["Error de M4", "Otro error"], "No se pudo realizar la operación. Revise los datos e inténtelo nuevamente."],
    ["POST", 400, "El backend rechazó el pedido.", "No se pudo realizar la operación. Revise los datos e inténtelo nuevamente."],
    ["POST", 500, "Error de M4", "No se pudo confirmar el resultado de la operación. Verifique si se completó antes de reintentar."],
    ["POST", 422, "La fecha es obligatoria.", "La fecha es obligatoria."],
  ])("preserves status and code for %s errors", async (method, status, message, expected) => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ statusCode: status, message, code: "INVALID", error: "Error" }, { status }));
    const response = await fetchBackend(backendRequest(), "/services", undefined, { method });
    expect(response.status).toBe(status);
    expect(await response.json()).toMatchObject({ message: expected, code: "INVALID", statusCode: status });
  });

  it("applies the same copy to an application/problem+json error and rewrites detail as well", async () => {
    const original = "El backend de M4 rechazó el pedido.";
    const copy = "No se pudo realizar la operación. Revise los datos e inténtelo nuevamente.";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      type: "about:blank",
      title: "Unprocessable Entity",
      status: 422,
      detail: original,
      instance: "/services",
      statusCode: 422,
      message: original,
      error: "Unprocessable Entity",
      code: "INVALID",
    }), { status: 422, headers: { "content-type": "application/problem+json; charset=utf-8" } }));

    const response = await fetchBackend(backendRequest(), "/services", undefined, { method: "POST" });
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body).toMatchObject({ message: copy, detail: copy, code: "INVALID", statusCode: 422, status: 422, title: "Unprocessable Entity" });
    expect(JSON.stringify(body)).not.toContain("M4");
  });

  it("leaves a problem+json error without internal terms untouched", async () => {
    const payload = {
      type: "about:blank",
      title: "Unprocessable Entity",
      status: 422,
      detail: "La fecha es obligatoria.",
      instance: "/services",
      statusCode: 422,
      message: "La fecha es obligatoria.",
      error: "Unprocessable Entity",
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(payload), {
      status: 422,
      headers: { "content-type": "application/problem+json" },
    }));

    const response = await fetchBackend(backendRequest(), "/services", undefined, { method: "POST" });

    expect(await response.json()).toEqual(payload);
  });

  it.each(["application/json", "application/problem+json"])(
    "shows a Spanish message for a 429 delivered as %s and keeps Retry-After",
    async (contentType) => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
        statusCode: 429,
        message: "ThrottlerException: Too Many Requests",
        detail: "ThrottlerException: Too Many Requests",
        error: "Too Many Requests",
      }), { status: 429, headers: { "content-type": contentType, "retry-after": "12" } }));

      const response = await fetchBackend(backendRequest(), "/services", undefined, { method: "GET" });
      const body = await response.json();

      expect(response.status).toBe(429);
      expect(response.headers.get("retry-after")).toBe("12");
      expect(body).toMatchObject({
        statusCode: 429,
        message: "Hay demasiados pedidos en curso. Espere unos segundos e intente de nuevo.",
        detail: "Hay demasiados pedidos en curso. Espere unos segundos e intente de nuevo.",
      });
      expect(JSON.stringify(body)).not.toContain("Throttler");
    },
  );
});

describe("isJsonMediaType", () => {
  it.each(["application/json", "application/json; charset=utf-8", "application/problem+json", "Application/Problem+JSON; charset=UTF-8"])(
    "accepts %s",
    (contentType) => {
      expect(isJsonMediaType(contentType)).toBe(true);
    },
  );

  it.each(["text/html", "application/xml", "text/plain; charset=utf-8", "application/jsonp", "application/vnd.api+json", "application/problem+xml", "", null, undefined])(
    "rejects %s",
    (contentType) => {
      expect(isJsonMediaType(contentType)).toBe(false);
    },
  );
});

function hangingFetch() {
  return vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
    const signal = init?.signal;
    if (!signal) return Promise.reject(new TypeError("missing timeout signal"));
    return new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
  });
}

describe("fetchBackend availability", () => {
  it.each([[200, 502], [201, 502], [503, 503]])(
    "wraps non-JSON upstream %s as status %s and uses the calling BFF path",
    async (upstreamStatus, expectedStatus) => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>gateway</html>", {
        status: upstreamStatus,
        headers: { "content-type": "text/html" },
      }));
      const request = backendRequest();
      const upstream = await fetchBackend(request, "/services/service-1/start");

      const response = forwardResponse(upstream);
      expect(response.status).toBe(expectedStatus);
      expect(await response.json()).toMatchObject({ statusCode: expectedStatus, path: "/api/services/service-1/start" });
    },
  );

  it("translates network failures into BackendUnavailableError after one bounded GET retry", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));

    await expect(fetchBackend(backendRequest(), "/services/service-1")).rejects.toMatchObject({
      name: "BackendUnavailableError",
      status: 503,
      message: "El sistema no responde. Reintente en unos segundos.",
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("recovers a GET when the single retry succeeds", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("socket hang up"))
      .mockResolvedValueOnce(Response.json({ id: "service-1" }));

    const response = await fetchBackend(backendRequest(), "/services/service-1");

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it.each(["POST", "PATCH", "PUT", "DELETE"])("never retries a %s write after a network failure", async (method) => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));

    await expect(fetchBackend(backendRequest(), "/services/service-1/start", undefined, { method })).rejects.toBeInstanceOf(BackendUnavailableError);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("aborts the backend fetch at the 5-second default and answers 503 without retrying", async () => {
    vi.useFakeTimers();
    try {
      expect(BACKEND_TIMEOUT_MS).toBe(5_000);
      const fetchSpy = hangingFetch();

      const rejection = fetchBackend(backendRequest(), "/services/service-1").then(() => undefined, (error: unknown) => error);
      await vi.advanceTimersByTimeAsync(4_999);
      const signal = fetchSpy.mock.calls[0]?.[1]?.signal;
      expect(signal?.aborted).toBe(false);

      await vi.advanceTimersByTimeAsync(1);
      const error = await rejection;
      expect(error).toBeInstanceOf(BackendUnavailableError);
      expect(error).toMatchObject({ status: 503, message: "El sistema no responde. Reintente en unos segundos." });
      expect(signal?.aborted).toBe(true);
      expect((signal?.reason as DOMException).name).toBe("TimeoutError");
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("releases the timer when the request fails before the deadline", async () => {
    vi.useFakeTimers();
    try {
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));
      await expect(fetchBackend(backendRequest(), "/services/service-1/start", undefined, { method: "POST" })).rejects.toBeInstanceOf(BackendUnavailableError);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("turns the timeout into the 503 fallback the screen shows", async () => {
    vi.useFakeTimers();
    try {
      hangingFetch();
      const pending = fetchBackend(backendRequest(), "/services/service-1").then(() => undefined, (error: unknown) => error);
      await vi.advanceTimersByTimeAsync(5_000);
      const response = mapSessionError(await pending, "/api/services/service-1", "fallback");
      expect(response.status).toBe(503);
      expect(await response.json()).toMatchObject({ statusCode: 503, message: "El sistema no responde. Reintente en unos segundos." });
    } finally {
      vi.useRealTimers();
    }
  });

  it("composes a caller signal with the timeout and preserves caller cancellation", async () => {
    const caller = new AbortController();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      const signal = init?.signal;
      if (!signal) return Promise.reject(new TypeError("missing timeout signal"));
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    });

    const response = fetchBackend(backendRequest(), "/services/service-1", undefined, { signal: caller.signal });
    const rejection = response.then(() => undefined, (error: unknown) => error);
    caller.abort(new DOMException("Client disconnected", "AbortError"));

    expect(await rejection).toMatchObject({ name: "AbortError", message: "Client disconnected" });
    expect(fetchSpy.mock.calls[0]?.[1]?.signal).not.toBe(caller.signal);
  });

  it("uses the configured timeout and relays upstream error responses unchanged", async () => {
    vi.useFakeTimers();
    try {
      const fetchSpy = hangingFetch();
      const pending = fetchBackend(backendRequest(), "/evidence", undefined, { method: "POST" }, { timeoutMs: 60_000 })
        .then(() => undefined, (error: unknown) => error);
      await vi.advanceTimersByTimeAsync(59_999);
      expect(fetchSpy.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(await pending).toBeInstanceOf(BackendUnavailableError);
    } finally {
      vi.useRealTimers();
    }

    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("upstream error", {
      status: 503,
      headers: { "content-type": "text/plain" },
    }));
    const response = await fetchBackend(backendRequest(), "/evidence", undefined, { method: "POST" }, { timeoutMs: 60_000 });
    expect(response.status).toBe(503);
    expect(response.headers.get("content-type")).toBe("text/plain");
    expect(await response.text()).toBe("upstream error");
  });
});

describe("optimistic concurrency (ADR-012 del backend)", () => {
  function writeRequest(headers: Record<string, string> = {}) {
    const cookie = createSessionCookie("office-duty-queue", { mode: "real-m1", accessToken: devJwt, backendOrigin });
    return new Request("http://localhost/api/containers/cont-1/empty", { method: "POST", headers: { cookie, ...headers } });
  }

  function sentHeaders(fetchSpy: { mock: { calls: unknown[][] } }) {
    return new Headers((fetchSpy.mock.calls[0]?.[1] as RequestInit | undefined)?.headers);
  }

  it("forwards the browser If-Match on a write", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "cont-1" }));
    await fetchBackend(writeRequest({ "if-match": 'W/"1731700000000"' }), "/containers/cont-1/empty", undefined, { method: "POST" });
    expect(sentHeaders(fetchSpy).get("if-match")).toBe('W/"1731700000000"');
  });

  it("does not send If-Match when the browser did not send one", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "cont-1" }));
    await fetchBackend(writeRequest(), "/containers/cont-1/empty", undefined, { method: "POST" });
    expect(sentHeaders(fetchSpy).has("if-match")).toBe(false);
  });

  it("does not forward If-Match on a GET the route makes to check scope", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "cont-1" }));
    await fetchBackend(writeRequest({ "if-match": 'W/"1"' }), "/containers/cont-1");
    expect(sentHeaders(fetchSpy).has("if-match")).toBe(false);
  });

  it("keeps an If-Match the route sets itself", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "cont-1" }));
    await fetchBackend(writeRequest({ "if-match": 'W/"1"' }), "/containers/cont-1/empty", undefined, { method: "POST", headers: { "if-match": 'W/"2"' } });
    expect(sentHeaders(fetchSpy).get("if-match")).toBe('W/"2"');
  });

  it.each(['W/"1", junk', "abc", `W/"${"9".repeat(600)}"`])("drops a malformed If-Match %s", async (value) => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "cont-1" }));
    await fetchBackend(writeRequest({ "if-match": value }), "/containers/cont-1/empty", undefined, { method: "POST" });
    expect(sentHeaders(fetchSpy).has("if-match")).toBe(false);
  });

  it.each(["*", 'W/"1", W/"2"', '"strong"'])("accepts If-Match %s", async (value) => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "cont-1" }));
    await fetchBackend(writeRequest({ "if-match": value }), "/containers/cont-1/empty", undefined, { method: "POST" });
    expect(sentHeaders(fetchSpy).get("if-match")).toBe(value);
  });

  it("returns the backend ETag to the browser through forwardResponse", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "cont-1" }, { headers: { etag: 'W/"1731700000123"' } }));
    const response = forwardResponse(await fetchBackend(backendRequest(), "/containers/cont-1"));
    expect(response.headers.get("etag")).toBe('W/"1731700000123"');
  });

  it("maps a 412 to the Spanish stale-record notice and keeps the Problem Details fields", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      type: "about:blank",
      title: "Precondition Failed",
      status: 412,
      detail: "Precondition Failed: resource was modified",
      instance: "/containers/cont-1/empty",
      statusCode: 412,
      message: "Precondition Failed: resource was modified",
      error: "Precondition Failed",
      path: "/containers/cont-1/empty",
    }), { status: 412, headers: { "content-type": "application/problem+json" } }));

    const response = forwardResponse(await fetchBackend(writeRequest({ "if-match": 'W/"1"' }), "/containers/cont-1/empty", undefined, { method: "POST" }));
    const body = await response.json();

    expect(response.status).toBe(412);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
    expect(body).toMatchObject({
      statusCode: 412,
      status: 412,
      code: "STALE_RECORD",
      message: STALE_RECORD_MESSAGE,
      detail: STALE_RECORD_MESSAGE,
      instance: "/containers/cont-1/empty",
    });
    expect(STALE_RECORD_MESSAGE).toBe("Otra persona modificó este registro. Recargue para ver los cambios.");
  });

  it("maps a 412 without a JSON body as well", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 412 }));
    const response = await fetchBackend(writeRequest(), "/containers/cont-1/empty", undefined, { method: "POST" });
    expect(response.status).toBe(412);
    expect(await response.json()).toMatchObject({ statusCode: 412, code: "STALE_RECORD", message: STALE_RECORD_MESSAGE });
  });
});
