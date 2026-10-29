import { afterEach, describe, expect, it, vi } from "vitest";

import { loginWithMe as login } from "@/test/session";
import { POST as loginRoute } from "./login/route";
import { getSessionFromCookieValue, getSessionFromRequest } from "@/lib/session";
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

function sessionCookieMaxAge(setCookie: string) {
  return Number(/Max-Age=(\d+)/i.exec(setCookie)?.[1]);
}

const REAL_CREW_ID = "d907516e-ddb7-46d4-a7d4-cd235cbb1529";

function backendCrews(crews: { id: string; name: string }[]) {
  return new Response(JSON.stringify({ data: crews, meta: { total: crews.length, page: 1, pageSize: 100, totalPages: 1 } }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function meResponse(roles: string[], init: { subType?: string } = {}) {
  return Response.json({ userId: "42", subType: init.subType ?? "EMPLEADO", m1Role: "ADMINISTRATIVO", roles });
}

function backendSessionEnv() {
  process.env.M6_AUTH_MODE = "backend-development";
  process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
  process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
}

function loginRequest(
  scenarioId: string,
  headers: Record<string, string> = { "content-type": "application/json", "x-requested-with": "XMLHttpRequest" },
) {
  return new Request("http://localhost/api/session/login", {
    method: "POST",
    headers,
    body: JSON.stringify({ scenarioId }),
  });
}

function logoutRequest(
  headers: Record<string, string> = { "content-type": "application/json", "x-requested-with": "XMLHttpRequest" },
  body = "{}",
) {
  return new Request("http://localhost/api/session/logout", { method: "POST", headers, body });
}

describe("session route handlers", () => {
  it("rejects login without the custom CSRF header", async () => {
    process.env.M6_AUTH_MODE = "mock";
    const response = await login(loginRequest("office-duty-queue", { "content-type": "application/json" }));

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects login with a non-JSON content type", async () => {
    process.env.M6_AUTH_MODE = "mock";
    const response = await login(loginRequest("office-duty-queue", {
      "content-type": "text/plain",
      "x-requested-with": "XMLHttpRequest",
    }));

    expect(response.status).toBe(415);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects logout without the custom CSRF header", async () => {
    const response = await logout(logoutRequest({ "content-type": "application/json" }));

    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects logout with a non-JSON content type", async () => {
    const response = await logout(logoutRequest({
      "content-type": "text/plain",
      "x-requested-with": "XMLHttpRequest",
    }));

    expect(response.status).toBe(415);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("rejects logout with an invalid JSON body", async () => {
    const response = await logout(logoutRequest(undefined, "{"));

    expect(response.status).toBe(400);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it.each(["constructor", "__proto__"])("rejects inherited scenario key %s without setting a session cookie", async (scenarioId) => {
    process.env.M6_AUTH_MODE = "mock";
    const response = await login(loginRequest(scenarioId));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ message: "Seleccione un escenario operativo válido." });
    expect(response.headers.get("set-cookie")).toBeNull();
  });

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
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(backendCrews([
      { id: REAL_CREW_ID, name: "Cuadrilla Belgrano — Recolección" },
    ]));
    const response = await login(loginRequest("field-crew-leader-route"));
    const cookie = response.headers.get("set-cookie") ?? "";
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(cookie).not.toContain(token);
    expect(JSON.stringify(body)).not.toContain(token);
  });

  it("does not expose the missing development JWT name in the BFF response", async () => {
    process.env.M6_AUTH_MODE = "backend-development";
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    delete process.env.M6_DEV_JWT;
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const response = await login(loginRequest("office-duty-queue"));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.message).toBe("La autenticación solicitada no está disponible.");
    expect(JSON.stringify(body)).not.toContain("M6_DEV_JWT");
    expect(fetchSpy).not.toHaveBeenCalled();
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

        backendFetch.mockResolvedValueOnce(meResponse(["M6_CAMPO_CUADRILLA"]));
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

    it("returns the shared unavailable response when the timed crew lookup rejects", async () => {
      backendMode();
      const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
      vi.spyOn(globalThis, "fetch").mockRejectedValue(new DOMException("Timed out", "TimeoutError"));

      const response = await login(loginRequest("field-crew-leader-route"));

      expect(timeoutSpy).toHaveBeenCalledWith(15_000);
      expect(response.status).toBe(503);
      expect((await response.json()).message).toBe("El backend no responde. Reintente en unos segundos.");
      expect(response.headers.get("set-cookie")).toBeNull();
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

  it("refreshes a valid session and can leave it", async () => {
    process.env.M6_AUTH_MODE = "mock";
    const loginResponse = await login(loginRequest("office-duty-queue"));
    const cookie = loginResponse.headers.get("set-cookie") ?? "";
    const sessionResponse = await session(new Request("http://localhost/api/session", { headers: { cookie } }));
    const sessionBody = await sessionResponse.json();

    expect(sessionResponse.status).toBe(200);
    expect(sessionBody.session).not.toHaveProperty("accessToken");

    const logoutResponse = await logout(new Request("http://localhost/api/session/logout", {
      method: "POST",
      headers: { cookie, "content-type": "application/json", "x-requested-with": "XMLHttpRequest" },
      body: "{}",
    }));
    expect(logoutResponse.headers.get("set-cookie")).toMatch(/Max-Age=0/i);
  });

  it("does not fall back when real M1 mode is requested", async () => {
    process.env.M6_AUTH_MODE = "real-m1";
    const response = await login(loginRequest("office-duty-queue"));

    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  describe("M6 roles come from GET /me (#657)", () => {
    const bearer = (call: unknown[]) => new Headers((call[1] as RequestInit).headers).get("authorization");

    it("seals the effective roles of GET /me, not the ones of the chosen scenario", async () => {
      backendSessionEnv();
      const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(meResponse(["M6_OFICINA_AMBIENTAL"]));

      const response = await loginRoute(loginRequest("office-duty-queue"));
      const cookie = response.headers.get("set-cookie") ?? "";

      expect(response.status).toBe(200);
      expect(String(backendFetch.mock.calls[0]?.[0])).toBe("https://backend.internal/me");
      expect(bearer(backendFetch.mock.calls[0] ?? [])).toMatch(/^Bearer /);
      expect((await response.json()).session.roles).toEqual(["M6_OFICINA_AMBIENTAL"]);
      expect(getSessionFromRequest(new Request("http://localhost", { headers: { cookie } }))?.roles).toEqual(["M6_OFICINA_AMBIENTAL"]);
    });

    it("does not open a session for a citizen token: 403 without a role code and without a cookie", async () => {
      backendSessionEnv();
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        Response.json({ statusCode: 403, message: "Este sistema es solo para personal municipal" }, { status: 403 }),
      );

      const response = await loginRoute(loginRequest("office-duty-queue"));

      expect(response.status).toBe(403);
      expect((await response.json()).message).toMatch(/personal municipal/);
      expect(response.headers.get("set-cookie")).toBeNull();
    });

    it("does not open a session when the backend rejects the development token", async () => {
      backendSessionEnv();
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ statusCode: 401, message: "Unauthorized" }, { status: 401 }));

      const response = await loginRoute(loginRequest("office-duty-queue"));

      expect(response.status).toBe(401);
      expect(response.headers.get("set-cookie")).toBeNull();
    });

    it("opens a session with no roles and serves the scenario with no capabilities, so the UI can explain it", async () => {
      backendSessionEnv();
      const backendFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async () => meResponse([]));

      const login_ = await loginRoute(loginRequest("office-duty-queue"));
      const cookie = login_.headers.get("set-cookie") ?? "";
      const response = await scenarioRoute(new Request("http://localhost/api/mock/scenarios/office-duty-queue", { headers: { cookie } }), {
        params: Promise.resolve({ scenarioId: "office-duty-queue" }),
      });

      expect(login_.status).toBe(200);
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ roles: [], capabilities: [] });
      expect(backendFetch).toHaveBeenCalledTimes(2);
    });

    it("recomputes the scenario and reseals the cookie when an administrator changed the roles", async () => {
      backendSessionEnv();
      const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(meResponse(["M6_OFICINA_OPERACIONES"]));
      const cookie = (await loginRoute(loginRequest("office-duty-queue"))).headers.get("set-cookie") ?? "";

      backendFetch.mockResolvedValueOnce(meResponse(["M6_AUDITOR"]));
      const response = await scenarioRoute(new Request("http://localhost/api/mock/scenarios/office-duty-queue", { headers: { cookie } }), {
        params: Promise.resolve({ scenarioId: "office-duty-queue" }),
      });
      const resealed = response.headers.get("set-cookie") ?? "";

      expect(await response.json()).toMatchObject({ roles: ["M6_AUDITOR"] });
      expect(getSessionFromRequest(new Request("http://localhost", { headers: { cookie: resealed } }))?.roles).toEqual(["M6_AUDITOR"]);
    });

    it("answers a citizen 403 from the scenario with the same message and no role code", async () => {
      backendSessionEnv();
      const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(meResponse(["M6_ADMIN"]));
      const cookie = (await loginRoute(loginRequest("office-duty-queue"))).headers.get("set-cookie") ?? "";

      backendFetch.mockResolvedValueOnce(Response.json({ statusCode: 403, message: "x" }, { status: 403 }));
      const response = await scenarioRoute(new Request("http://localhost/api/mock/scenarios/office-duty-queue", { headers: { cookie } }), {
        params: Promise.resolve({ scenarioId: "office-duty-queue" }),
      });
      const body = await response.json();

      expect(response.status).toBe(403);
      expect(body.message).toMatch(/personal municipal/);
      expect(body).not.toHaveProperty("code");
    });

    it("refreshes the roles on the activity pulse and ends the session when the backend answers 401", async () => {
      backendSessionEnv();
      const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(meResponse(["M6_ADMIN"]));
      const cookie = (await loginRoute(loginRequest("office-duty-queue"))).headers.get("set-cookie") ?? "";

      backendFetch.mockResolvedValueOnce(meResponse([]));
      const pulse = await session(new Request("http://localhost/api/session", { headers: { cookie } }));
      expect((await pulse.json()).session.roles).toEqual([]);

      backendFetch.mockResolvedValueOnce(Response.json({ statusCode: 401, message: "Unauthorized" }, { status: 401 }));
      const rejected = await session(new Request("http://localhost/api/session", { headers: { cookie } }));
      expect(rejected.status).toBe(401);
      expect(rejected.headers.get("set-cookie")).toMatch(/m6_session=;|Max-Age=0/i);
    });

    it("keeps the sealed roles when the pulse cannot reach the backend", async () => {
      backendSessionEnv();
      const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(meResponse(["M6_ADMIN"]));
      const cookie = (await loginRoute(loginRequest("office-duty-queue"))).headers.get("set-cookie") ?? "";

      backendFetch.mockRejectedValueOnce(new TypeError("fetch failed"));
      const pulse = await session(new Request("http://localhost/api/session", { headers: { cookie } }));

      expect(pulse.status).toBe(200);
      expect((await pulse.json()).session.roles).toEqual(["M6_ADMIN"]);
    });
  });
  describe("signed demo session: the session outlives the token (#745, #740)", () => {
    function signingEnv() {
      process.env.M6_AUTH_MODE = "backend-development";
      process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
      delete process.env.M6_DEV_JWT;
      vi.stubEnv("M6_JWT_SECRET", Buffer.alloc(32, 9).toString("base64"));
    }
    const claims = (call: unknown[]) => {
      const bearer = new Headers((call[1] as RequestInit).headers).get("authorization") ?? "";
      return JSON.parse(Buffer.from(bearer.replace("Bearer ", "").split(".")[1], "base64url").toString());
    };

    it("logs in as the seed person of the profile, keeps no token in the cookie and signs a fresh one per request", async () => {
      signingEnv();
      vi.useFakeTimers({ toFake: ["Date"] });
      try {
        const start = Date.now();
        const backendFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => String(input).endsWith("/me")
          ? meResponse(["M6_OFICINA_OPERACIONES"])
          : Response.json({ data: [], meta: { total: 0, page: 1, pageSize: 20, totalPages: 0 } }));
        const loginResponse = await loginRoute(loginRequest("office-operations"));
        const cookie = loginResponse.headers.get("set-cookie") ?? "";

        expect(loginResponse.status).toBe(200);
        expect(claims(backendFetch.mock.calls[0])).toMatchObject({ sub: "3", rol: "ADMINISTRATIVO", sub_type: "EMPLEADO", typ: "access" });
        const sealed = getSessionFromRequest(new Request("http://localhost", { headers: { cookie } }));
        expect(sealed).toMatchObject({ source: "demo", scenarioId: "office-operations" });
        expect(sealed).not.toHaveProperty("accessToken");
        expect(JSON.stringify(await loginResponse.json())).not.toMatch(/eyJ/);

        // 20 minutos después (el token del login ya habría vencido) la sesión sigue viva y el pedido lleva un token nuevo.
        vi.setSystemTime(start + 20 * 60 * 1000);
        const later = await listServices(new Request("http://localhost/api/services", { headers: { cookie } }));
        expect(later.status).toBe(200);
        const servicesCall = backendFetch.mock.calls.at(-1) as unknown[];
        expect(claims(servicesCall).exp).toBeGreaterThan(Math.floor((start + 20 * 60 * 1000) / 1000));
        expect(claims(servicesCall).exp).toBeGreaterThan(claims(backendFetch.mock.calls[0]).exp);
      } finally {
        vi.useRealTimers();
      }
    });

    it("ends a signed demo session only at the 8 hour cap: no 15 minute token expiry and no 30 minute idle cut", async () => {
      signingEnv();
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => meResponse(["M6_ADMIN"]));
      const cookie = (await loginRoute(loginRequest("office-duty-queue"))).headers.get("set-cookie") ?? "";
      const value = cookie.split(";")[0].replace("m6_session=", "");
      const now = Date.now();

      expect(getSessionFromCookieValue(value, undefined, now + 20 * 60 * 1000)).toBeDefined();
      expect(getSessionFromCookieValue(value, undefined, now + 7 * 60 * 60 * 1000)).toBeDefined();
      expect(getSessionFromCookieValue(value, undefined, now + 8 * 60 * 60 * 1000 + 1000)).toBeUndefined();
      expect(sessionCookieMaxAge(cookie)).toBeGreaterThan(7 * 60 * 60);
      expect(cookie).toMatch(/m6_signed_in=1/);
    });

    describe("Field crew by seed person", () => {
      const BEL = "11111111-1111-4111-8111-111111111111";
      const PAL = "22222222-2222-4222-8222-222222222222";
      const INSP = "33333333-3333-4333-8333-333333333333";
      const list = [
        { id: PAL, name: "Cuadrilla Municipal Palermo — Recolección y Barrido", leaderUserId: "111" },
        { id: BEL, name: "Cuadrilla Belgrano — Recolección", leaderUserId: "101" },
        { id: INSP, name: "Cuadrilla Municipal Control Ambiental — Inspección", leaderUserId: "601" },
      ];
      const members: Record<string, string[]> = { [BEL]: ["101", "102"], [PAL]: ["111", "102"], [INSP]: ["601"] };

      function stubBackend(roles: string[]) {
        return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
          const url = new URL(String(input));
          if (url.pathname === "/me") return meResponse(roles);
          if (url.pathname === "/crews") return Response.json({ data: list, meta: {} });
          const id = url.pathname.split("/")[2];
          return Response.json({ id, members: (members[id] ?? []).map((userId) => ({ userId })) });
        });
      }
      const crewOf = async (response: Response) => getSessionFromRequest(new Request("http://localhost", { headers: { cookie: response.headers.get("set-cookie") ?? "" } }))?.crew;

      it("resolves the leader from the list without asking for details", async () => {
        signingEnv();
        const backendFetch = stubBackend(["M6_CAMPO_CUADRILLA"]);
        const response = await loginRoute(loginRequest("field-crew-leader-route"));

        expect(response.status).toBe(200);
        expect((await crewOf(response))?.id).toBe(BEL);
        expect(backendFetch.mock.calls.some(([input]) => new URL(String(input)).pathname.startsWith("/crews/"))).toBe(false);
      });

      it("resolves a member through the crew detail, preferring the scenario crew name when he belongs to several", async () => {
        signingEnv();
        stubBackend(["M6_CAMPO_CUADRILLA"]);
        const response = await loginRoute(loginRequest("field-crew-member-route"));

        // El sub 102 integra Palermo y Belgrano: desempata el nombre del escenario (Belgrano).
        expect((await crewOf(response))?.id).toBe(BEL);
      });

      it("falls back to the first match of the list when no candidate has the scenario name", async () => {
        signingEnv();
        stubBackend(["M6_CAMPO_CUADRILLA"]);
        const original = list[1].name;
        list[1].name = "Otro nombre";
        try {
          const response = await loginRoute(loginRequest("field-crew-member-route"));
          expect((await crewOf(response))?.id).toBe(PAL);
        } finally {
          list[1].name = original;
        }
      });

      it("with the shared M6_DEV_JWT every Field profile resolves by the scenario name only", async () => {
        backendSessionEnv();
        const backendFetch = stubBackend(["M6_CAMPO_CUADRILLA"]);
        const response = await loginRoute(loginRequest("field-crew-member-route"));

        expect((await crewOf(response))?.id).toBe(BEL);
        expect(backendFetch.mock.calls.some(([input]) => new URL(String(input)).pathname.startsWith("/crews/"))).toBe(false);
      });

      it("rejects an unexpected crew list instead of guessing", async () => {
        signingEnv();
        vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
          new URL(String(input)).pathname === "/me" ? meResponse(["M6_CAMPO_CUADRILLA"]) : Response.json({ data: "nope" }));
        const response = await loginRoute(loginRequest("field-crew-leader-route"));

        expect(response.status).toBe(503);
      });
    });

    it("treats a live demo session as ended (401) when the signing secret was removed", async () => {
      signingEnv();
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => meResponse(["M6_ADMIN"]));
      const cookie = (await loginRoute(loginRequest("office-duty-queue"))).headers.get("set-cookie") ?? "";

      vi.stubEnv("M6_JWT_SECRET", "");
      const response = await listServices(new Request("http://localhost/api/services", { headers: { cookie } }));

      expect(response.status).toBe(401);
    });

    it("sends the citizen profile with a CIUDADANO token and opens no session when the backend rejects it", async () => {
      signingEnv();
      const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
        Response.json({ statusCode: 403, message: "Este sistema es solo para personal municipal" }, { status: 403 }),
      );

      const response = await loginRoute(loginRequest("citizen"));

      expect(claims(backendFetch.mock.calls[0])).toMatchObject({ sub: "901", sub_type: "CIUDADANO" });
      expect(response.status).toBe(403);
      expect(response.headers.get("set-cookie")).toBeNull();
    });

    it("opens the employee without a role with roles [] so the UI shows the no-access screen", async () => {
      signingEnv();
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => meResponse([]));

      const response = await loginRoute(loginRequest("employee-no-role"));
      const cookie = response.headers.get("set-cookie") ?? "";

      expect(response.status).toBe(200);
      expect(getSessionFromRequest(new Request("http://localhost", { headers: { cookie } }))).toMatchObject({ roles: [], source: "demo" });
    });
  });
});
