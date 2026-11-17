import { afterEach, describe, expect, it, vi } from "vitest";

import { INDICATOR_FAMILIES } from "@/lib/indicators";
import { backendEnv, createSessionCookie } from "@/test/session";

type Handler = (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response> | Response;
type RouteModule = Partial<Record<"GET" | "POST" | "PUT" | "PATCH" | "DELETE", Handler>>;

const modules = import.meta.glob<RouteModule>("./**/route.ts", { eager: true });

// Rutas que no exigen sesión (públicas, de sesión, de salud o de mock): tienen sus propios tests.
const NO_SESSION_REQUIRED = /^\.\/(public|session|health|mock|address-search|address-suggest)\b/;
// Rutas de lectura que validan o transforman la respuesta del backend (esquemas zod, paginación
// propia, identidad): un cuerpo genérico no les alcanza y cada una tiene su propio test.
const SHAPED_RESPONSES = /^\.\/(audit|events|referrals|role-assignments|me|services\/route|environmental-inspections\/\[id\]\/route|routes\/\[id\]\/references|zones\/\[id\]\/references)/;
const UUID = "0b6f1c2e-7a41-4c1e-9d55-3f1f4a2d8e10";
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

const routes = Object.entries(modules)
  .filter(([path]) => !NO_SESSION_REQUIRED.test(path))
  .flatMap(([path, module]) => METHODS.filter((method) => typeof module[method] === "function").map((method) => ({ path, method, handler: module[method] as Handler })));

function paramsFor(path: string) {
  const names = [...path.matchAll(/\[(\w+)\]/g)].map((match) => match[1]);
  return Object.fromEntries(names.map((name) => [name, name === "family" ? INDICATOR_FAMILIES[0] : UUID]));
}

function urlFor(path: string) {
  const resolved = path.replace(/^\./, "/api").replace(/\/route\.ts$/, "").replace(/\[(\w+)\]/g, (_m, name: string) => (name === "family" ? INDICATOR_FAMILIES[0] : UUID));
  return `http://localhost${resolved}`;
}

function call(route: (typeof routes)[number], headers: Record<string, string> = {}, body?: unknown) {
  const init: RequestInit = { method: route.method, headers: { ...headers, ...(body === undefined ? {} : { "content-type": "application/json" }) } };
  if (body !== undefined && route.method !== "GET") init.body = JSON.stringify(body);
  return route.handler(new Request(urlFor(route.path), init), { params: Promise.resolve(paramsFor(route.path)) });
}

let restoreEnv: (() => void) | undefined;
afterEach(() => { restoreEnv?.(); restoreEnv = undefined; vi.restoreAllMocks(); });

describe("BFF routes that require a session", () => {
  it("discovers the route handlers under test", () => {
    expect(routes.length).toBeGreaterThan(100);
  });

  it.each(routes)("$method $path rejects a request without a session cookie with 401", async (route) => {
    const response = await call(route);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toMatchObject({ message: expect.any(String) });
  });

  it.each(routes)("$method $path rejects a tampered session cookie with 401", async (route) => {
    const response = await call(route, { cookie: "m6_session=esto.no.es.una.sesion" });
    expect(response.status).toBe(401);
  });
});

describe("BFF read routes in real-m1 mode", () => {
  const reads = routes.filter((route) => route.method === "GET" && !SHAPED_RESPONSES.test(route.path));

  it.each(reads)("$path forwards to the backend and relays its status and body", async (route) => {
    restoreEnv = backendEnv();
    const cookie = createSessionCookie("office-duty-queue", { mode: "real-m1" });
    const backend = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ data: [], marker: "from-backend" }, { status: 200 }));

    const response = await call(route, { cookie });

    if (backend.mock.calls.length === 0) {
      // Rutas que no hablan con el backend (por ejemplo, lecturas de la propia sesión) no deben fallar.
      expect(response.status).toBeLessThan(500);
      return;
    }
    expect(String(backend.mock.calls[0][0]).startsWith("https://backend.internal/")).toBe(true);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ marker: "from-backend" });
  });

  it.each(reads)("$path relays a backend 404 without turning it into a success", async (route) => {
    restoreEnv = backendEnv();
    const cookie = createSessionCookie("office-duty-queue", { mode: "real-m1" });
    const backend = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ message: "No existe." }, { status: 404 }));

    const response = await call(route, { cookie });

    if (backend.mock.calls.length === 0) return;
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ message: expect.any(String) });
  });

  it.each(reads)("$path answers with a server error (never a success) when the backend is unreachable", async (route) => {
    restoreEnv = backendEnv();
    const cookie = createSessionCookie("office-duty-queue", { mode: "real-m1" });
    const backend = vi.spyOn(globalThis, "fetch").mockImplementation(async () => { throw new TypeError("fetch failed"); });

    const response = await call(route, { cookie });

    if (backend.mock.calls.length === 0) return;
    expect(response.status).toBeGreaterThanOrEqual(500);
  });
});

describe("BFF write routes with a malformed body", () => {
  const writes = routes.filter((route) => route.method !== "GET" && route.method !== "DELETE");

  it.each(writes)("$method $path never answers 2xx to a body that is not JSON", async (route) => {
    const cookie = createSessionCookie("office-duty-queue", { mode: "mock" });
    const request = new Request(urlFor(route.path), { method: route.method, headers: { cookie, "content-type": "application/json" }, body: "{esto no es json" });
    const response = await route.handler(request, { params: Promise.resolve(paramsFor(route.path)) });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(600);
  });
});

describe("BFF DELETE routes in real-m1 mode", () => {
  const deletes = routes.filter((route) => route.method === "DELETE");

  it("discovers the DELETE handlers under test", () => {
    expect(deletes.length).toBeGreaterThan(3);
  });

  it.each(deletes)("$path forwards the deletion to the backend and relays its status", async (route) => {
    restoreEnv = backendEnv();
    const cookie = createSessionCookie("office-duty-queue", { mode: "real-m1" });
    const backend = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ marker: "from-backend" }, { status: 200 }));

    const response = await call(route, { cookie });

    if (backend.mock.calls.length === 0) return;
    expect(String(backend.mock.calls[0][0]).startsWith("https://backend.internal/")).toBe(true);
    expect((backend.mock.calls[0][1] as RequestInit | undefined)?.method).toBe("DELETE");
    expect(response.status).toBe(200);
  });

  it.each(deletes)("$path relays a backend 409 instead of reporting success", async (route) => {
    restoreEnv = backendEnv();
    const cookie = createSessionCookie("office-duty-queue", { mode: "real-m1" });
    const backend = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ message: "En uso." }, { status: 409 }));

    const response = await call(route, { cookie });

    if (backend.mock.calls.length === 0) return;
    expect(response.status).toBe(409);
  });

  it.each(deletes)("$path answers with a server error when the backend is unreachable", async (route) => {
    restoreEnv = backendEnv();
    const cookie = createSessionCookie("office-duty-queue", { mode: "real-m1" });
    const backend = vi.spyOn(globalThis, "fetch").mockImplementation(async () => { throw new TypeError("fetch failed"); });

    const response = await call(route, { cookie });

    if (backend.mock.calls.length === 0) return;
    expect(response.status).toBeGreaterThanOrEqual(500);
  });
});
