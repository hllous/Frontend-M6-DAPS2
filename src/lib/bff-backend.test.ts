import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { fetchBackend } from "./bff-backend";

const originalMode = process.env.M6_AUTH_MODE;
const originalJwt = process.env.M6_DEV_JWT;
const originalOrigin = process.env.M6_BACKEND_ORIGIN;

afterEach(() => {
  if (originalMode === undefined) delete process.env.M6_AUTH_MODE;
  else process.env.M6_AUTH_MODE = originalMode;
  if (originalJwt === undefined) delete process.env.M6_DEV_JWT;
  else process.env.M6_DEV_JWT = originalJwt;
  if (originalOrigin === undefined) delete process.env.M6_BACKEND_ORIGIN;
  else process.env.M6_BACKEND_ORIGIN = originalOrigin;
  vi.restoreAllMocks();
});

describe("server-owned backend adapter", () => {
  it("adds the pre-signed development JWT only on the server-to-server request", async () => {
    process.env.M6_AUTH_MODE = "backend-development";
    process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const loginResponse = await login(new Request("http://localhost/api/session/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId: "office-duty-queue" }),
    }));
    const cookie = loginResponse.headers.get("set-cookie")?.split(";")[0] ?? "";
    const backendResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(backendResponse);

    await expect(fetchBackend(
      new Request("http://localhost/api/services", { headers: { cookie } }),
      "/api/services",
      "service:view",
    )).resolves.toBe(backendResponse);

    expect(fetchMock).toHaveBeenCalledWith(
      new URL("/api/services", "https://backend.internal"),
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).get("Authorization")).toBe(
      "Bearer header.eyJleHAiOjE4MDAwMDAwMDB9.signature",
    );
  });

  it("never uses a real backend in mock mode", async () => {
    process.env.M6_AUTH_MODE = "mock";
    const loginResponse = await login(new Request("http://localhost/api/session/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId: "office-duty-queue" }),
    }));
    const cookie = loginResponse.headers.get("set-cookie")?.split(";")[0] ?? "";

    await expect(fetchBackend(
      new Request("http://localhost/api/services", { headers: { cookie } }),
      "/api/services",
      "service:view",
    )).rejects.toThrow(/modo mock/i);
  });
});
