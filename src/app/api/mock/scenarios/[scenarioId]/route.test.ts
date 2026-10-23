import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";
import { loginAs } from "@/test/session";

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});



describe("authorized scenario BFF route", () => {
  it("requires an active session", async () => {
    const response = await GET(new Request("http://localhost/api/mock/scenarios/office-duty-queue"), {
      params: Promise.resolve({ scenarioId: "office-duty-queue" }),
    });

    expect(response.status).toBe(401);
  });

  it("only returns the scenario owned by the active session", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await GET(new Request("http://localhost/api/mock/scenarios/office-duty-queue", { headers: { cookie } }), {
      params: Promise.resolve({ scenarioId: "office-duty-queue" }),
    });

    expect(response.status).toBe(200);
    expect((await response.json()).actor.kind).toBe("OFFICE");
  });

  it("rejects a different scenario even when the actor is authenticated", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await GET(new Request("http://localhost/api/mock/scenarios/field-crew-leader-route", { headers: { cookie } }), {
      params: Promise.resolve({ scenarioId: "field-crew-leader-route" }),
    });

    expect(response.status).toBe(403);
  });

  it("forwards a backend-development session before serving its fixture", async () => {
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      Response.json({ userId: "42", subType: "EMPLEADO", m1Role: "RESPONSABLE_AREA", roles: ["M6_ADMIN"] }));
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature" });
    const response = await GET(new Request("http://localhost/api/mock/scenarios/office-duty-queue", { headers: { cookie } }), {
      params: Promise.resolve({ scenarioId: "office-duty-queue" }),
    });

    expect(response.status).toBe(200);
    expect(backendFetch).toHaveBeenCalledWith(
      new URL("/me", "https://backend.internal"),
      expect.objectContaining({ headers: expect.any(Headers) }),
    );
    const requestInit = backendFetch.mock.calls[0]?.[1] as RequestInit;
    expect(new Headers(requestInit.headers).get("Authorization")).toMatch(/^Bearer /);
  });

  describe("backend failures while validating the session (#240)", () => {
    async function getWithBackend(respond: () => Promise<Response>) {
      process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
      const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature" });
      vi.spyOn(globalThis, "fetch").mockImplementation(respond);
      return GET(new Request("http://localhost/api/mock/scenarios/office-duty-queue", { headers: { cookie } }), {
        params: Promise.resolve({ scenarioId: "office-duty-queue" }),
      });
    }

    it("maps a backend 401 to an invalid session", async () => {
      const response = await getWithBackend(async () => new Response(null, { status: 401 }));

      expect(response.status).toBe(401);
      expect((await response.json()).message).toBe("La sesión no está activa.");
    });

    it("preserves the session on a backend 403 (a citizen token) and says why, without a role code", async () => {
      const response = await getWithBackend(async () => new Response(null, { status: 403 }));
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(body).toMatchObject({ message: "Este sistema es solo para personal municipal.", error: "Forbidden" });
      expect(body).not.toHaveProperty("code");
    });

    it("keeps the real status of a backend 500 and does not blame the session", async () => {
      const response = await getWithBackend(async () => new Response(null, { status: 500 }));
      const body = await response.json();

      expect(response.status).toBe(500);
      expect(body.message).toBe("El backend respondió con un error (HTTP 500).");
      expect(body.message).not.toContain("sesión");
    });

    it("answers 503 with its own message when the backend is unreachable", async () => {
      const response = await getWithBackend(async () => {
        throw new TypeError("fetch failed");
      });
      const body = await response.json();

      expect(response.status).toBe(503);
      expect(body.message).toBe("El backend no responde. Reintente en unos segundos.");
    });
  });
});
