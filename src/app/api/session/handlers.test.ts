import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "./login/route";
import { GET as session } from "./route";
import { POST as logout } from "./logout/route";
import { GET as listServices } from "../services/route";
import { GET as scenarioRoute } from "../mock/scenarios/[scenarioId]/route";

const originalEnvironment = {
  authMode: process.env.M6_AUTH_MODE,
  devJwt: process.env.M6_DEV_JWT,
};

afterEach(() => {
  if (originalEnvironment.authMode === undefined) delete process.env.M6_AUTH_MODE;
  else process.env.M6_AUTH_MODE = originalEnvironment.authMode;
  if (originalEnvironment.devJwt === undefined) delete process.env.M6_DEV_JWT;
  else process.env.M6_DEV_JWT = originalEnvironment.devJwt;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const REAL_CREW_ID = "d907516e-ddb7-46d4-a7d4-cd235cbb1529";

function backendCrews(crews: { id: string; name: string }[]) {
  return new Response(JSON.stringify({ data: crews, meta: { total: crews.length, page: 1, pageSize: 100, totalPages: 1 } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function loginRequest(scenarioId: string) {
  return new Request("http://localhost/api/session/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenarioId }),
  });
}

describe("session route handlers", () => {
  it("creates an opaque cookie for a mock scenario", async () => {
    process.env.M6_AUTH_MODE = "mock";
    const response = await login(loginRequest("office-duty-queue"));
    const setCookie = response.headers.get("set-cookie") ?? "";

    expect(response.status).toBe(200);
    expect(setCookie).toMatch(/m6_session=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    expect(setCookie).not.toContain("office-duty-queue");
  });

  it("does not mark the cookie Secure outside production, so LAN/HTTP access works in dev", async () => {
    process.env.M6_AUTH_MODE = "mock";
    vi.stubEnv("NODE_ENV", "development");
    const response = await login(loginRequest("office-duty-queue"));
    expect(response.headers.get("set-cookie") ?? "").not.toMatch(/Secure/i);
  });

  it("forwards the server-provided development JWT without returning it", async () => {
    process.env.M6_AUTH_MODE = "backend-development";
    const token = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    process.env.M6_DEV_JWT = token;
    const response = await login(loginRequest("field-crew-leader-route"));
    const cookie = response.headers.get("set-cookie") ?? "";
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(cookie).not.toContain(token);
    expect(JSON.stringify(body)).not.toContain(token);
  });

  describe("Field crew in backend-development mode (#293)", () => {
    function backendMode() {
      process.env.M6_AUTH_MODE = "backend-development";
      process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
      process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    }

    it.each(["field-crew-leader-route", "field-crew-member-route"])(
      "%s resolves its crew by name against GET /crews and filters services by the real UUID",
      async (scenarioId) => {
        backendMode();
        const backendFetch = vi
          .spyOn(globalThis, "fetch")
          .mockResolvedValueOnce(
            backendCrews([
              { id: "901159c1-3230-440a-ba3d-d7baf55fab24", name: "Cuadrilla Palermo — Recolección" },
              { id: REAL_CREW_ID, name: "Cuadrilla Belgrano — Recolección" },
            ]),
          )
          .mockResolvedValue(new Response(JSON.stringify({ data: [], meta: {} }), { status: 200 }));

        const response = await login(loginRequest(scenarioId));
        expect(response.status).toBe(200);
        expect(String(backendFetch.mock.calls[0]?.[0])).toBe("https://backend.internal/crews?active=true&pageSize=100");
        expect(new Headers((backendFetch.mock.calls[0]?.[1] as RequestInit).headers).get("authorization")).toMatch(/^Bearer /);
        const cookie = response.headers.get("set-cookie") ?? "";

        await listServices(new Request("http://localhost/api/services", { headers: { cookie } }));
        const servicesUrl = new URL(String(backendFetch.mock.calls[1]?.[0]));
        expect(servicesUrl.searchParams.get("crewId")).toBe(REAL_CREW_ID);
        expect(servicesUrl.searchParams.get("crewId")).not.toBe("crew-b");

        const scenarioResponse = await scenarioRoute(new Request(`http://localhost/api/mock/scenarios/${scenarioId}`, { headers: { cookie } }), {
          params: Promise.resolve({ scenarioId }),
        });
        const scenario = await scenarioResponse.json();
        expect(scenario.actor).toMatchObject({ crewId: REAL_CREW_ID, crewName: "Cuadrilla Belgrano — Recolección" });
      },
    );

    it("rejects the Field login with a clear message when the crew is not in the backend", async () => {
      backendMode();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(backendCrews([{ id: "901159c1-3230-440a-ba3d-d7baf55fab24", name: "Otra cuadrilla" }]));

      const response = await login(loginRequest("field-crew-leader-route"));

      expect(response.status).toBe(503);
      expect(response.headers.get("set-cookie")).toBeNull();
      expect((await response.json()).message).toMatch(/Cuadrilla Belgrano — Recolección.*no existe o está inactiva/);
    });

    it("rejects the Field login with a clear message when GET /crews fails", async () => {
      backendMode();
      vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 500 }));

      const response = await login(loginRequest("field-crew-leader-route"));

      expect(response.status).toBe(503);
      expect((await response.json()).message).toMatch(/No se pudo resolver la cuadrilla.*HTTP 500/);
    });

    it("does not look up crews for Office nor in mock mode", async () => {
      const backendFetch = vi.spyOn(globalThis, "fetch");
      backendMode();
      expect((await login(loginRequest("office-duty-queue"))).status).toBe(200);

      process.env.M6_AUTH_MODE = "mock";
      const response = await login(loginRequest("field-crew-leader-route"));
      expect(response.status).toBe(200);
      expect(backendFetch).not.toHaveBeenCalled();
      expect((await response.json()).session).not.toHaveProperty("crew");
    });
  });

  it("returns only the public session and can leave it", async () => {
    process.env.M6_AUTH_MODE = "mock";
    const loginResponse = await login(loginRequest("office-duty-queue"));
    const cookie = loginResponse.headers.get("set-cookie") ?? "";
    const sessionResponse = await session(new Request("http://localhost/api/session", { headers: { cookie } }));
    const sessionBody = await sessionResponse.json();

    expect(sessionResponse.status).toBe(200);
    expect(sessionBody.session).not.toHaveProperty("accessToken");

    const logoutResponse = await logout(new Request("http://localhost/api/session/logout", { method: "POST", headers: { cookie } }));
    expect(logoutResponse.headers.get("set-cookie")).toMatch(/Max-Age=0/i);
  });

  it("does not fall back when real M1 mode is requested", async () => {
    process.env.M6_AUTH_MODE = "real-m1";
    const response = await login(loginRequest("office-duty-queue"));

    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
