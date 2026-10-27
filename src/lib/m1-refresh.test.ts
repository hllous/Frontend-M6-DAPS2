import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as logout } from "@/app/api/session/logout/route";
import { fetchBackend } from "./bff-backend";
import { forwardResponse } from "./bff-route";
import { SESSION_MUTATION_HEADERS } from "./session-request";
import {
  AUTH_COOKIE_NAME,
  InvalidSessionError,
  createSession,
  getSessionFromCookieValue,
  publicSession,
  sealSession,
} from "./session";

// Todo el contrato de refresh es «no verificado contra M1»: estos tests fijan los supuestos documentados en m1-refresh.ts.
const BACKEND = "https://backend.internal";
const M1 = "https://m1.internal/api/v1";
let n = 0;

function jwt(expSeconds: number) {
  return `h.${Buffer.from(JSON.stringify({ exp: expSeconds })).toString("base64url")}.s`;
}
const inMinutes = (minutes: number) => Math.floor(Date.now() / 1000) + minutes * 60;

function requestWith(expMinutes: number, refreshToken: string | null = `refresh-${++n}`) {
  const accessToken = jwt(inMinutes(expMinutes));
  const session = {
    ...createSession("office-duty-queue", { mode: "backend-development", devJwt: accessToken, backendOrigin: BACKEND }),
    refreshToken: refreshToken ?? undefined,
  };
  const cookie = `${AUTH_COOKIE_NAME}=${sealSession(session)}`;
  return { request: new Request("http://localhost/api/services", { headers: { cookie } }), accessToken, refreshToken };
}

function m1Refresh(newAccess: string, newRefresh = "refresh-next") {
  return new Response(null, { status: 204, headers: { authorization: `Bearer ${newAccess}`, "x-refresh-token": newRefresh, "x-token-expires-in": "900" } });
}
const ok = () => Response.json({ data: [] });
const authOf = (call: unknown[]) => new Headers((call[1] as RequestInit).headers).get("authorization");

beforeEach(() => {
  process.env.M6_AUTH_MODE = "backend-development";
  process.env.M6_BACKEND_ORIGIN = BACKEND;
  process.env.M1_BASE_URL = M1;
});
afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_BACKEND_ORIGIN;
  delete process.env.M1_BASE_URL;
  vi.restoreAllMocks();
});

describe("renovación contra M1", () => {
  it("renueva antes del vencimiento, manda a M6 solo el access token nuevo y resella la cookie", async () => {
    const { request, accessToken, refreshToken } = requestWith(0.5);
    const fresh = jwt(inMinutes(15));
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(m1Refresh(fresh)).mockResolvedValueOnce(ok());

    const response = forwardResponse(await fetchBackend(request, "/services"));

    expect(String(fetchSpy.mock.calls[0][0])).toBe(`${M1}/auth/refresh`);
    expect(new Headers((fetchSpy.mock.calls[0][1] as RequestInit).headers).get("x-refresh-token")).toBe(refreshToken);
    expect(authOf(fetchSpy.mock.calls[1])).toBe(`Bearer ${fresh}`);
    expect(authOf(fetchSpy.mock.calls[1])).not.toContain(accessToken);
    const sealed = response.cookies.get(AUTH_COOKIE_NAME)!.value;
    expect(getSessionFromCookieValue(sealed)).toMatchObject({ accessToken: fresh, refreshToken: "refresh-next" });
  });

  it("ante un 401 de M6 renueva una vez y reintenta con el token nuevo", async () => {
    const { request } = requestWith(10);
    const fresh = jwt(inMinutes(15));
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(m1Refresh(fresh))
      .mockResolvedValueOnce(ok());

    const response = await fetchBackend(request, "/services");

    expect(response.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(authOf(fetchSpy.mock.calls[2])).toBe(`Bearer ${fresh}`);
  });

  it("si el reintento también da 401 no renueva de nuevo", async () => {
    const { request } = requestWith(10);
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(m1Refresh(jwt(inMinutes(15))))
      .mockResolvedValueOnce(new Response(null, { status: 401 }));

    expect((await fetchBackend(request, "/services")).status).toBe(401);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });

  it.each([
    ["M1 rechaza el refresh", () => new Response(null, { status: 401 })],
    ["M1 responde sin access token", () => new Response(null, { status: 204 })],
  ])("%s: la sesión termina (401 hacia el login)", async (_name, m1Response) => {
    const { request } = requestWith(10);
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(m1Response());

    await expect(fetchBackend(request, "/services")).rejects.toBeInstanceOf(InvalidSessionError);
  });

  it("si M1 no responde en la renovación preventiva sigue con el token vigente", async () => {
    const { request, accessToken } = requestWith(0.5);
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("down")).mockResolvedValueOnce(ok());

    expect((await fetchBackend(request, "/services")).status).toBe(200);
    expect(authOf(fetchSpy.mock.calls[1])).toBe(`Bearer ${accessToken}`);
  });

  it("pedidos en paralelo comparten una sola renovación", async () => {
    const { request, refreshToken } = requestWith(0.5);
    const twin = new Request(request.url, { headers: request.headers });
    const fresh = jwt(inMinutes(15));
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input).endsWith("/auth/refresh") ? m1Refresh(fresh) : ok());

    await Promise.all([fetchBackend(request, "/services"), fetchBackend(twin, "/services")]);

    expect(fetchSpy.mock.calls.filter(([input]) => String(input).endsWith("/auth/refresh"))).toHaveLength(1);
    expect(refreshToken).toBeTruthy();
  });

  it("sin refresh token o sin M1_BASE_URL no llama a M1 y deja pasar el 401", async () => {
    for (const setup of [() => requestWith(0.5, null), () => { delete process.env.M1_BASE_URL; return requestWith(0.5); }]) {
      const { request } = setup();
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 401 }));
      expect((await fetchBackend(request, "/services")).status).toBe(401);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(String(fetchSpy.mock.calls[0][0])).toBe(`${BACKEND}/services`);
      vi.restoreAllMocks();
    }
  });

  it("el refresh token nunca sale en la sesión pública", () => {
    const { request } = requestWith(10);
    const session = getSessionFromCookieValue(request.headers.get("cookie")!.split("=")[1])!;
    expect(JSON.stringify(publicSession(session))).not.toContain("refresh-");
  });
});

describe("cerrar sesión", () => {
  it("descarta la cookie sellada y no llama a M1 (no tiene logout)", async () => {
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
