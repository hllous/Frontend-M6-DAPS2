import { NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as sessionPulse } from "@/app/api/session/route";
import { POST as logout } from "@/app/api/session/logout/route";
import { fetchBackend } from "./bff-backend";
import { errorResponse, forwardResponse, mapSessionError } from "./bff-route";
import { FAILURE_MEMO_MS, MEMO_MS } from "./m1-refresh";
import { fetchMe, sealRolesIfChanged } from "./me";
import { SESSION_MUTATION_HEADERS } from "./session-request";
import {
  AUTH_COOKIE_NAME,
  BackendUnavailableError,
  InvalidSessionError,
  createSession,
  getSessionFromCookieValue,
  getSessionFromRequest,
  publicSession,
  sealSession,
  type Session,
} from "./session";

// Todo el contrato de refresh es «no verificado contra M1»: estos tests fijan los supuestos documentados en m1-refresh.ts.
const cookieStore = vi.hoisted(() => ({ set: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

const BACKEND = "https://backend.internal";
const M1 = "https://m1.internal/api/v1";
let n = 0;

function jwt(expSeconds: number, sub: string | number = 42) {
  return `h.${Buffer.from(JSON.stringify({ exp: expSeconds, sub })).toString("base64url")}.s`;
}
const inSeconds = (seconds: number) => Math.floor(Date.now() / 1000) + seconds;

type Overrides = Partial<Session>;
function build(expSeconds: number, overrides: Overrides = {}) {
  const accessToken = jwt(expSeconds);
  const session: Session = {
    ...createSession("office-duty-queue", { mode: "backend-development", devJwt: accessToken, backendOrigin: BACKEND }),
    source: "m1",
    refreshToken: `refresh-${++n}`,
    ...overrides,
  };
  const request = new Request("http://localhost/api/services", { headers: { cookie: `${AUTH_COOKIE_NAME}=${sealSession(session)}` } });
  return { request, session, accessToken, refreshToken: session.refreshToken! };
}
const near = (overrides?: Overrides) => build(inSeconds(30), overrides);
const healthy = (overrides?: Overrides) => build(inSeconds(600), overrides);

function m1Refresh(newAccess: string, init: { refresh?: string | null } = {}) {
  const headers: Record<string, string> = { authorization: `Bearer ${newAccess}`, "x-token-expires-in": "900" };
  if (init.refresh !== null) headers["x-refresh-token"] = init.refresh ?? "refresh-next";
  return new Response(null, { status: 204, headers });
}
const ok = () => Response.json({ data: [] });
const authOf = (call: unknown[]) => new Headers((call[1] as RequestInit).headers).get("authorization");
const isM1 = (input: unknown) => String(input).endsWith("/auth/refresh");
const m1Calls = (spy: { mock: { calls: unknown[][] } }) => spy.mock.calls.filter(([input]) => isM1(input));
const sealedOf = (response: Response) => getSessionFromCookieValue(response.headers.get("set-cookie")!.split(";")[0].split("=")[1]);
const me = (roles: string[]) => Response.json({ userId: "42", subType: "EMPLEADO", m1Role: "ADMINISTRATIVO", roles });
const twinOf = (request: Request) => new Request(request.url, { headers: request.headers });

beforeEach(() => {
  process.env.M6_AUTH_MODE = "backend-development";
  process.env.M6_BACKEND_ORIGIN = BACKEND;
  process.env.M1_BASE_URL = M1;
  cookieStore.set.mockReset();
});
afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_BACKEND_ORIGIN;
  delete process.env.M1_BASE_URL;
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("renovación contra M1", () => {
  it("renueva antes del vencimiento, manda a M6 solo el access token nuevo y resella la cookie", async () => {
    const { request, accessToken, refreshToken } = near();
    const fresh = jwt(inSeconds(900));
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(m1Refresh(fresh)).mockResolvedValueOnce(ok());

    const response = forwardResponse(await fetchBackend(request, "/services"));

    expect(String(fetchSpy.mock.calls[0][0])).toBe(`${M1}/auth/refresh`);
    const refreshInit = fetchSpy.mock.calls[0][1] as RequestInit;
    expect(new Headers(refreshInit.headers).get("x-refresh-token")).toBe(refreshToken);
    expect(refreshInit.redirect).toBe("error");
    expect(authOf(fetchSpy.mock.calls[1])).toBe(`Bearer ${fresh}`);
    expect(authOf(fetchSpy.mock.calls[1])).not.toContain(accessToken);
    expect(sealedOf(response)).toMatchObject({ accessToken: fresh, refreshToken: "refresh-next" });
  });

  it("deja la cookie renovada en el store de Next aunque la ruta arme su propia respuesta o un error", async () => {
    const { request } = near();
    const fresh = jwt(inSeconds(900));
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(m1Refresh(fresh)).mockResolvedValueOnce(ok());

    await fetchBackend(request, "/services");
    expect(NextResponse.json({ propio: true }).status).toBe(200);
    expect(errorResponse(500, "falló después de renovar", "/api/x").status).toBe(500);

    expect(cookieStore.set).toHaveBeenCalledTimes(1);
    const cookie = cookieStore.set.mock.calls[0][0] as { name: string; value: string };
    expect(cookie.name).toBe(AUTH_COOKIE_NAME);
    expect(getSessionFromCookieValue(cookie.value)).toMatchObject({ accessToken: fresh, refreshToken: "refresh-next" });
  });

  it("fetchMe seguido de sealRolesIfChanged resella con la sesión renovada, no con la vieja", async () => {
    const { request } = near();
    const fresh = jwt(inSeconds(900));
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(m1Refresh(fresh)).mockResolvedValueOnce(me(["M6_CAMPO_INSPECTOR"]));

    const result = await fetchMe(request);
    const response = NextResponse.json(result);
    sealRolesIfChanged(response, request, result.roles);

    expect(sealedOf(response)).toMatchObject({ accessToken: fresh, roles: ["M6_CAMPO_INSPECTOR"] });
  });

  it("el pulso de /api/session resella la cookie con los tokens renovados", async () => {
    const { request } = near();
    const fresh = jwt(inSeconds(900));
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(m1Refresh(fresh)).mockResolvedValueOnce(me(["M6_ADMIN"]));

    const response = await sessionPulse(request);

    expect(response.status).toBe(200);
    expect(sealedOf(response)).toMatchObject({ accessToken: fresh, refreshToken: "refresh-next" });
  });

  it("ante un 401 de M6 renueva una vez y reintenta con el token nuevo", async () => {
    const { request } = healthy();
    const fresh = jwt(inSeconds(900));
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(m1Refresh(fresh))
      .mockResolvedValueOnce(ok());

    expect((await fetchBackend(request, "/services")).status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(authOf(fetchSpy.mock.calls[2])).toBe(`Bearer ${fresh}`);
  });

  it("si el reintento también da 401 no renueva de nuevo", async () => {
    const { request } = healthy();
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(m1Refresh(jwt(inSeconds(900))))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));

    expect((await fetchBackend(request, "/services")).status).toBe(401);
    expect(m1Calls(fetchSpy)).toHaveLength(1);
  });

  it("llamadas paralelas del mismo pedido con 401: una sola renovación y ninguna devuelve un 401 espurio", async () => {
    const { request } = healthy();
    const fresh = jwt(inSeconds(900));
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (isM1(input)) return m1Refresh(fresh);
      return new Headers(init?.headers).get("authorization") === `Bearer ${fresh}` ? ok() : new Response(null, { status: 401 });
    });

    const statuses = (await Promise.all([fetchBackend(request, "/a"), fetchBackend(request, "/b"), fetchBackend(request, "/c")])).map((r) => r.status);

    expect(statuses).toEqual([200, 200, 200]);
    expect(m1Calls(fetchSpy)).toHaveLength(1);
  });

  it.each([400, 401, 403])("M1 responde %s al refresh: la sesión termina", async (status) => {
    const { request } = healthy();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(new Response(null, { status }));

    await expect(fetchBackend(request, "/services")).rejects.toBeInstanceOf(InvalidSessionError);
  });

  it.each([404, 408, 429, 500, 503])("M1 responde %s: no desloguea; preventivo sigue con el token vigente y reactivo da 503", async (status) => {
    const preventive = near();
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status })).mockResolvedValueOnce(ok());
    expect((await fetchBackend(preventive.request, "/services")).status).toBe(200);
    expect(authOf(spy.mock.calls[1])).toBe(`Bearer ${preventive.accessToken}`);
    spy.mockRestore();

    const reactive = healthy();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(new Response(null, { status }));
    await expect(fetchBackend(reactive.request, "/services")).rejects.toBeInstanceOf(BackendUnavailableError);
  });

  it("M1 responde 204 sin access token: la sesión termina", async () => {
    const { request } = healthy();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(fetchBackend(request, "/services")).rejects.toBeInstanceOf(InvalidSessionError);
  });

  it("si M1 no responde en la renovación preventiva sigue con el token vigente", async () => {
    const { request, accessToken } = near();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce(ok());

    expect((await fetchBackend(request, "/services")).status).toBe(200);
    expect(authOf(fetchSpy.mock.calls[1])).toBe(`Bearer ${accessToken}`);
  });

  it("acepta tokens en un JSON y conserva el refresh anterior si M1 no manda uno nuevo", async () => {
    const { request, refreshToken } = near();
    const fresh = jwt(inSeconds(900));
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ accessToken: fresh })).mockResolvedValueOnce(ok());

    await fetchBackend(request, "/services");

    expect(getSessionFromRequest(request)).toMatchObject({ accessToken: fresh, refreshToken });
  });

  it("acepta también refreshToken en el JSON", async () => {
    const { request } = near();
    const fresh = jwt(inSeconds(900));
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ accessToken: fresh, refreshToken: "desde-json" })).mockResolvedValueOnce(ok());

    await fetchBackend(request, "/services");

    expect(getSessionFromRequest(request)).toMatchObject({ refreshToken: "desde-json" });
  });
});

describe("memo de renovaciones", () => {
  it("pedidos en paralelo comparten una renovación y ambos terminan con el token nuevo", async () => {
    const { request } = near();
    const twin = twinOf(request);
    const fresh = jwt(inSeconds(900));
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => (isM1(input) ? m1Refresh(fresh) : ok()));

    await Promise.all([fetchBackend(request, "/services"), fetchBackend(twin, "/services")]);

    expect(m1Calls(fetchSpy)).toHaveLength(1);
    for (const r of [request, twin]) expect(getSessionFromRequest(r)).toMatchObject({ accessToken: fresh, refreshToken: "refresh-next" });
  });

  it("un rechazo se comparte entre los esperadores", async () => {
    const { request } = near();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => (isM1(input) ? new Response(null, { status: 401 }) : ok()));

    const results = await Promise.allSettled([fetchBackend(request, "/a"), fetchBackend(twinOf(request), "/a")]);

    expect(results.map((r) => r.status)).toEqual(["rejected", "rejected"]);
    expect(m1Calls(fetchSpy)).toHaveLength(1);
  });

  it("el memo expira a los 10 s y se poda", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-27T12:00:00Z"));
    const first = near();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => (isM1(input) ? m1Refresh(jwt(inSeconds(900))) : ok()));

    await fetchBackend(first.request, "/a");
    vi.setSystemTime(Date.now() + MEMO_MS - 1_000);
    await fetchBackend(twinOf(first.request), "/a");
    expect(m1Calls(fetchSpy)).toHaveLength(1);

    vi.setSystemTime(Date.now() + 2_000);
    await fetchBackend(twinOf(first.request), "/a");
    expect(m1Calls(fetchSpy)).toHaveLength(2);
  });

  it("memoriza un fallo de red solo 5 s", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-27T12:00:00Z"));
    const first = near();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (isM1(input)) throw new Error("down");
      return ok();
    });

    await fetchBackend(first.request, "/a");
    vi.setSystemTime(Date.now() + FAILURE_MEMO_MS - 1_000);
    await fetchBackend(twinOf(first.request), "/a");
    expect(m1Calls(fetchSpy)).toHaveLength(1);

    vi.setSystemTime(Date.now() + 2_000);
    await fetchBackend(twinOf(first.request), "/a");
    expect(m1Calls(fetchSpy)).toHaveLength(2);
  });
});

describe("cuándo se renueva", () => {
  it.each([
    ["con 61 s de vida no renueva", 61, false],
    ["con 59 s de vida renueva", 59, true],
  ])("%s", async (_name, seconds, renews) => {
    const { request } = build(inSeconds(seconds));
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => (isM1(input) ? m1Refresh(jwt(inSeconds(900))) : ok()));

    await fetchBackend(request, "/services");

    expect(m1Calls(fetchSpy)).toHaveLength(renews ? 1 : 0);
  });

  it("un access token ya vencido no se puede renovar: la sesión no está activa y va al login", async () => {
    const { request } = build(inSeconds(600), { jwtExpiresAt: Date.now() - 5_000 });
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(fetchBackend(request, "/services")).rejects.toBeInstanceOf(InvalidSessionError);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    ["sin refresh token", () => near({ refreshToken: undefined })],
    ["sin origen m1 (camino M6_DEV_JWT)", () => near({ source: undefined })],
  ])("%s: no llama a M1 y deja pasar el 401", async (_name, setup) => {
    const { request } = setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 401 }));

    expect((await fetchBackend(request, "/services")).status).toBe(401);
    expect(m1Calls(fetchSpy)).toHaveLength(0);
  });

  it.each([
    ["sin M1_BASE_URL", undefined],
    ["URL inválida", "no es una url"],
    ["protocolo ftp", "ftp://m1.internal"],
    ["credenciales embebidas", "https://user:secretpw@m1.internal"],
  ])("%s: no renueva y avisa sin interpolar el valor", async (_name, value) => {
    if (value === undefined) delete process.env.M1_BASE_URL;
    else process.env.M1_BASE_URL = value;
    const warn = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { request } = near();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 401 }));

    expect((await fetchBackend(request, "/services")).status).toBe(401);
    expect(m1Calls(fetchSpy)).toHaveLength(0);
    for (const call of warn.mock.calls) expect(JSON.stringify(call)).not.toMatch(/secretpw|no es una url|ftp:/);
  });

  it("en producción exige https", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("M6_SESSION_SECRET", "test-secret");
    const { request } = near();
    process.env.M1_BASE_URL = "http://m1.internal";
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 401 }));

    await fetchBackend(request, "/services");
    expect(m1Calls(fetchSpy)).toHaveLength(0);
  });

  it("un POST con body de texto sí se reintenta con el mismo body", async () => {
    const { request } = healthy();
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(m1Refresh(jwt(inSeconds(900))))
      .mockResolvedValueOnce(ok());

    const response = await fetchBackend(request, "/services", undefined, { method: "POST", body: JSON.stringify({ a: 1 }) });

    expect(response.status).toBe(200);
    expect((fetchSpy.mock.calls[2][1] as RequestInit).body).toBe('{"a":1}');
  });

  it("un body en stream no se reintenta tras el 401", async () => {
    const { request } = healthy();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 401 }));
    const body = new ReadableStream({ start: (c) => c.close() });

    const response = await fetchBackend(request, "/evidence", undefined, { method: "POST", body, duplex: "half" } as RequestInit);

    expect(response.status).toBe(401);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe("límites sobre la respuesta de M1", () => {
  const big = "x".repeat(2_100);
  const cases: [string, () => Response][] = [
    ["body de más de 8 KB", () => new Response("x".repeat(9_000), { status: 200, headers: { authorization: `Bearer ${jwt(inSeconds(900))}` } })],
    ["content-length declarado enorme", () => new Response(null, { status: 200, headers: { "content-length": "99999", authorization: `Bearer ${jwt(inSeconds(900))}` } })],
    ["access token de más de 2 KB", () => m1Refresh(`${big}.${big}.${big}`)],
    ["access token sin forma de JWT", () => m1Refresh("no-es-un-jwt")],
    ["sub distinto al de la sesión", () => m1Refresh(jwt(inSeconds(900), 99))],
    ["vencimiento más allá de 24 h", () => m1Refresh(jwt(inSeconds(25 * 3600)))],
    ["token ya vencido", () => m1Refresh(jwt(inSeconds(-10)))],
    ["refresh token de más de 2 KB", () => m1Refresh(jwt(inSeconds(900)), { refresh: big + big })],
    ["refresh token vacío", () => m1Refresh(jwt(inSeconds(900)), { refresh: "" })],
  ];

  it.each(cases)("rechaza la renovación: %s", async (_name, m1Response) => {
    const { request } = near();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(m1Response()).mockResolvedValue(ok());

    await expect(fetchBackend(request, "/services")).rejects.toBeInstanceOf(InvalidSessionError);
  });

  it("falla en voz alta si la cookie sellada supera el límite", () => {
    const { session } = near();
    expect(() => sealSession({ ...session, refreshToken: "r".repeat(4_000) })).toThrow(/límite de la cookie/);
  });
});

describe("errores de sesión y cierre", () => {
  it("InvalidSessionError borra la cookie en la respuesta", () => {
    const response = mapSessionError(new InvalidSessionError(), "/api/x", "x");
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toMatch(new RegExp(`${AUTH_COOKIE_NAME}=;.*Max-Age=0`, "i"));
  });

  it("el refresh token y el origen nunca salen en la sesión pública", () => {
    const { session } = near();
    expect(JSON.stringify(publicSession(session))).not.toMatch(/refresh-|"source"/);
  });

  it("cerrar sesión descarta la cookie sellada y no llama a M1 (no tiene logout)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await logout(new Request("http://localhost/api/session/logout", {
      method: "POST",
      headers: SESSION_MUTATION_HEADERS,
      body: "{}",
    }));

    expect(response.headers.get("set-cookie")).toMatch(new RegExp(`${AUTH_COOKIE_NAME}=;.*Max-Age=0`, "i"));
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
