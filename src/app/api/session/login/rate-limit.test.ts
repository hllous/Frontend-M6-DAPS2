import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { LOGIN_FAILURE_WINDOW_MS, loginRateLimiter } from "@/lib/login-rate-limit";
import { POST as login } from "./route";

const server = setupServer();
const M1_LOGIN = "https://m1.test/api/v1/auth/usuario/login";
const accessToken = () => `h.${Buffer.from(JSON.stringify({
  iss: "modulo1-ciudadanos", typ: "access", sub: "42", sub_type: "EMPLEADO", rol: "ADMINISTRATIVO",
  exp: Math.floor(Date.now() / 1000) + 900,
})).toString("base64url")}.s`;

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  loginRateLimiter.reset();
  vi.stubEnv("M6_AUTH_MODE", "real-m1");
  vi.stubEnv("M1_BASE_URL", "https://m1.test/api/v1/");
  vi.stubEnv("M6_BACKEND_ORIGIN", "https://backend.test");
  vi.stubEnv("M6_SESSION_SECRET", "test-session-secret-that-is-long-enough");
});
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

function post(body: unknown) {
  return login(new Request("http://localhost/api/session/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-requested-with": "XMLHttpRequest" },
    body: JSON.stringify(body),
  }));
}

function attempt(email: string, password = "incorrecta") {
  return post({ email, password });
}

function rejectAll() {
  let m1Calls = 0;
  server.use(
    http.get("https://backend.test/health", () => HttpResponse.json({ status: "ok" })),
    http.post(M1_LOGIN, () => { m1Calls += 1; return HttpResponse.json({ message: "No autorizado" }, { status: 401 }); }),
  );
  return () => m1Calls;
}

describe("login brute-force limit", () => {
  it("answers 429 with Retry-After after 5 failures and stops calling M1", async () => {
    const m1Calls = rejectAll();
    for (let i = 0; i < 5; i += 1) expect((await attempt("ana@example.test")).status).toBe(401);

    const blocked = await attempt("ana@example.test");
    const body = await blocked.json();

    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(5);
    expect(blocked.headers.get("cache-control")).toBe("no-store");
    expect(blocked.headers.get("set-cookie")).toBeNull();
    expect(body.message).toMatch(/Demasiados intentos/);
    expect(m1Calls()).toBe(5);
  });

  it("treats case and whitespace variants of the email as the same account", async () => {
    rejectAll();
    for (let i = 0; i < 5; i += 1) await attempt(i % 2 ? " ANA@example.test " : "ana@example.test");

    expect((await attempt("Ana@Example.test")).status).toBe(429);
  });

  it("does not reveal whether the account exists: unknown and known emails behave identically", async () => {
    rejectAll();
    const known: number[] = [];
    const unknown: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      known.push((await attempt("existe@example.test")).status);
      unknown.push((await attempt("no-existe@example.test")).status);
    }

    expect(known).toEqual([401, 401, 401, 401, 401, 429]);
    expect(unknown).toEqual(known);
  });

  it("lets the account in again after the 15 minute window", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    rejectAll();
    for (let i = 0; i < 5; i += 1) await attempt("ana@example.test");
    expect((await attempt("ana@example.test")).status).toBe(429);

    vi.setSystemTime(Date.now() + LOGIN_FAILURE_WINDOW_MS + 1_000);

    expect((await attempt("ana@example.test")).status).toBe(401);
  });

  it("reports the remaining time, not the full window, in Retry-After", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    rejectAll();
    for (let i = 0; i < 5; i += 1) await attempt("ana@example.test");
    vi.setSystemTime(Date.now() + 10 * 60_000);

    const blocked = await attempt("ana@example.test");

    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeLessThanOrEqual(300);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(290);
  });

  it("resets the account counter after a successful login", async () => {
    let succeed = false;
    server.use(
      http.get("https://backend.test/health", () => HttpResponse.json({ status: "ok" })),
      http.post(M1_LOGIN, () => succeed
        ? new HttpResponse("{}", { status: 200, headers: { authorization: `Bearer ${accessToken()}`, "x-refresh-token": "r", "x-token-expires-in": "900", "content-type": "application/json" } })
        : HttpResponse.json({ message: "No autorizado" }, { status: 401 })),
      http.get("https://backend.test/me", () => HttpResponse.json({ userId: "42", subType: "EMPLEADO", m1Role: "ADMINISTRATIVO", roles: [] })),
    );
    for (let i = 0; i < 4; i += 1) await attempt("ana@example.test");
    succeed = true;
    expect((await attempt("ana@example.test", "correcta")).status).toBe(200);
    succeed = false;

    // Sin el reset, el siguiente fallo (el 5.º acumulado) ya dejaría la cuenta bloqueada.
    for (let i = 0; i < 5; i += 1) expect((await attempt("ana@example.test")).status).toBe(401);
    expect((await attempt("ana@example.test")).status).toBe(429);
  });

  it("blocks one IP that sprays many accounts, even with different emails", async () => {
    rejectAll();
    for (let i = 0; i < 20; i += 1) expect((await attempt(`user${i}@example.test`)).status).toBe(401);

    expect((await attempt("otro@example.test")).status).toBe(429);
  });

  it("does not count malformed requests as failed logins", async () => {
    rejectAll();
    for (let i = 0; i < 8; i += 1) expect((await post({ email: "ana@example.test" })).status).toBe(400);

    expect((await attempt("ana@example.test")).status).toBe(401);
  });

  it("logs no password, email or token while failing, being blocked and logging in", async () => {
    const spies = (["log", "info", "warn", "error"] as const).map((level) => vi.spyOn(console, level).mockImplementation(() => undefined));
    let succeed = false;
    server.use(
      http.get("https://backend.test/health", () => HttpResponse.json({ status: "ok" })),
      http.post(M1_LOGIN, () => succeed
        ? new HttpResponse("{}", { status: 200, headers: { authorization: `Bearer ${accessToken()}`, "x-refresh-token": "refresh-secreto", "x-token-expires-in": "900", "content-type": "application/json" } })
        : HttpResponse.json({ message: "No autorizado" }, { status: 401 })),
      http.get("https://backend.test/me", () => HttpResponse.json({ userId: "42", subType: "EMPLEADO", m1Role: "ADMINISTRATIVO", roles: [] })),
    );

    for (let i = 0; i < 6; i += 1) await attempt("dato.personal@example.test", "clave-ultra-secreta");
    succeed = true;
    await attempt("otra.persona@example.test", "clave-ultra-secreta");

    const output = JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
    expect(output).not.toMatch(/clave-ultra-secreta|dato\.personal|otra\.persona|refresh-secreto|Bearer|\.s"/);
    expect(output).toContain("auth_login_failed");
  });
});
