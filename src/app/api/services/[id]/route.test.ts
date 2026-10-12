import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { GET } from "./route";

const backendUnavailableMessage = "El backend no responde. Reintente en unos segundos.";

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function backendCookie() {
  process.env.M6_AUTH_MODE = "backend-development";
  process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
  process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
  const response = await login(new Request("http://localhost/api/session/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenarioId: "office-duty-queue" }),
  }));
  return response.headers.get("set-cookie") ?? "";
}

function serviceRequest(cookie: string) {
  return GET(
    new Request("http://localhost/api/services/service-1", { headers: { cookie } }),
    { params: Promise.resolve({ id: "service-1" }) },
  );
}

describe("GET /api/services/:id backend availability", () => {
  it("returns 503 when fetch rejects with a network error", async () => {
    const cookie = await backendCookie();
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));

    const response = await serviceRequest(cookie);

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ message: backendUnavailableMessage });
  });

  it("returns 503 when the backend does not respond before the timeout", async () => {
    const cookie = await backendCookie();
    vi.useFakeTimers();
    vi.spyOn(AbortSignal, "timeout").mockImplementation((timeoutMs) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException("Timed out", "TimeoutError")), timeoutMs);
      return controller.signal;
    });
    vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      const signal = init?.signal;
      if (!signal) return Promise.reject(new TypeError("missing timeout signal"));
      return new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      });
    });

    const responsePromise = serviceRequest(cookie);
    await vi.advanceTimersByTimeAsync(15_000);
    const response = await responsePromise;

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ message: backendUnavailableMessage });
  });
});
