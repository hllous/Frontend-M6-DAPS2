import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { GET } from "./route";

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});

async function authenticatedCookie(scenarioId: string, mode = "mock") {
  process.env.M6_AUTH_MODE = mode;
  if (mode === "backend-development") {
    process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
  }
  const response = await login(new Request("http://localhost/api/session/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenarioId }),
  }));
  return response.headers.get("set-cookie") ?? "";
}

describe("authorized scenario BFF route", () => {
  it("requires an active session", async () => {
    const response = await GET(new Request("http://localhost/api/mock/scenarios/office-duty-queue"), {
      params: Promise.resolve({ scenarioId: "office-duty-queue" }),
    });

    expect(response.status).toBe(401);
  });

  it("only returns the scenario owned by the active session", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await GET(new Request("http://localhost/api/mock/scenarios/office-duty-queue", { headers: { cookie } }), {
      params: Promise.resolve({ scenarioId: "office-duty-queue" }),
    });

    expect(response.status).toBe(200);
    expect((await response.json()).actor.kind).toBe("OFFICE");
  });

  it("rejects a different scenario even when the actor is authenticated", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await GET(new Request("http://localhost/api/mock/scenarios/field-crew-leader-route", { headers: { cookie } }), {
      params: Promise.resolve({ scenarioId: "field-crew-leader-route" }),
    });

    expect(response.status).toBe(403);
  });

  it("forwards a backend-development session before serving its fixture", async () => {
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
    const cookie = await authenticatedCookie("office-duty-queue", "backend-development");
    const response = await GET(new Request("http://localhost/api/mock/scenarios/office-duty-queue", { headers: { cookie } }), {
      params: Promise.resolve({ scenarioId: "office-duty-queue" }),
    });

    expect(response.status).toBe(200);
    expect(backendFetch).toHaveBeenCalledWith(
      new URL("/service-types", "https://backend.internal"),
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    const requestInit = backendFetch.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).get("Authorization")).toMatch(/^Bearer /);
  });
});
