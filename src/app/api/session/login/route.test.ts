import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { POST as login } from "./route";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

function request(body: unknown) {
  return new Request("http://localhost/api/session/login", {
    method: "POST",
    headers: { "content-type": "application/json", "x-requested-with": "XMLHttpRequest" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/session/login", () => {
  it("fails closed for a production demo mode unless the override is explicit", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("M6_AUTH_MODE", "mock");
    vi.stubEnv("M6_ALLOW_DEMO", "false");
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const rejected = await login(request({ scenarioId: "office-duty-queue" }));

    expect(rejected.status).toBe(503);
    expect(rejected.headers.get("cache-control")).toBe("no-store");
    expect(rejected.headers.get("set-cookie")).toBeNull();
    expect(log).toHaveBeenCalledWith("[m6-auth-mode-misconfigured]", "mock");

    vi.stubEnv("M6_ALLOW_DEMO", "true");
    vi.stubEnv("M6_SESSION_SECRET", "production-test-session-secret");
    const allowed = await login(request({ scenarioId: "office-duty-queue" }));

    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("cache-control")).toBe("no-store");
    expect(allowed.headers.get("set-cookie")).toMatch(/Secure/i);
  });

  it("rejects a body over the request-size limit before validating credentials", async () => {
    vi.stubEnv("M6_AUTH_MODE", "real-m1");

    const response = await login(request({ email: "a".repeat(5_000), password: "secret" }));

    expect(response.status).toBe(413);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("caps concurrent login attempts for this instance", async () => {
    vi.stubEnv("M6_AUTH_MODE", "real-m1");
    vi.stubEnv("M1_BASE_URL", "https://m1.test/api/v1/");
    vi.stubEnv("M6_BACKEND_ORIGIN", "https://backend.test");
    const token = `h.${Buffer.from(JSON.stringify({
      iss: "modulo1-ciudadanos",
      typ: "access",
      sub: "42",
      sub_type: "EMPLEADO",
      rol: "ADMINISTRATIVO",
      exp: Math.floor(Date.now() / 1000) + 900,
    })).toString("base64url")}.s`;
    let accepted = 0;
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    server.use(
      http.post("https://m1.test/api/v1/auth/usuario/login", async () => {
        accepted += 1;
        await gate;
        return new HttpResponse("{}", {
          status: 200,
          headers: {
            authorization: `Bearer ${token}`,
            "x-refresh-token": "refresh-token",
            "x-token-expires-in": "900",
            "content-type": "application/json",
          },
        });
      }),
      http.get("https://backend.test/me", () => HttpResponse.json({
        userId: "42",
        subType: "EMPLEADO",
        m1Role: "ADMINISTRATIVO",
        roles: ["M6_ADMIN"],
      })),
    );

    const attempts = Array.from({ length: 5 }, (_, index) => login(request({ email: `${index}@example.test`, password: "secret" })));
    await vi.waitFor(() => expect(accepted).toBe(5));
    const sixthAttempt = login(request({ email: "sixth@example.test", password: "secret" }));
    const immediateSixthResponse = await Promise.race([
      sixthAttempt,
      new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 100)),
    ]);
    release();
    const [firstFive, excess] = await Promise.all([Promise.all(attempts), sixthAttempt]);

    expect(firstFive.every((response) => response.status === 200)).toBe(true);
    expect(immediateSixthResponse?.status).toBe(429);
    expect(excess.status).toBe(429);
    expect(excess.headers.get("cache-control")).toBe("no-store");
    expect(excess.headers.get("retry-after")).toBe("5");
  });

  it("does not hold a login slot while a client is still sending its body", async () => {
    vi.stubEnv("M6_AUTH_MODE", "real-m1");
    vi.stubEnv("M1_BASE_URL", "https://m1.test/api/v1/");
    vi.stubEnv("M6_BACKEND_ORIGIN", "https://backend.test");
    server.use(
      http.get("https://backend.test/health", () => HttpResponse.json({ status: "ok" })),
      http.post("https://m1.test/api/v1/auth/usuario/login", () => HttpResponse.json({ message: "No autorizado" }, { status: 401 })),
    );
    const controllers: ReadableStreamDefaultController<Uint8Array>[] = [];
    const stalled = Array.from({ length: 5 }, () => login(new Request("http://localhost/api/session/login", {
      method: "POST",
      headers: { "content-type": "application/json", "x-requested-with": "XMLHttpRequest" },
      body: new ReadableStream<Uint8Array>({ start: (controller) => { controllers.push(controller); } }),
      duplex: "half",
    } as RequestInit)));
    await new Promise((resolve) => setTimeout(resolve, 50));

    const response = await login(request({ email: "persona@example.test", password: "incorrecta" }));

    controllers.forEach((controller) => controller.error(new Error("closed")));
    await Promise.allSettled(stalled);
    expect(response.status).toBe(401);
  });

  it("starts the backend health wake-up alongside M1 and does not wait for it", async () => {
    vi.stubEnv("M6_AUTH_MODE", "real-m1");
    vi.stubEnv("M1_BASE_URL", "https://m1.test/api/v1/");
    vi.stubEnv("M6_BACKEND_ORIGIN", "https://backend.test");
    const token = `h.${Buffer.from(JSON.stringify({
      iss: "modulo1-ciudadanos",
      typ: "access",
      sub: "42",
      sub_type: "EMPLEADO",
      rol: "ADMINISTRATIVO",
      exp: Math.floor(Date.now() / 1000) + 900,
    })).toString("base64url")}.s`;
    let healthStarted = false;
    let finishHealth: () => void = () => undefined;
    const healthResponse = new Promise<void>((resolve) => { finishHealth = resolve; });
    server.use(
      http.get("https://backend.test/health", async () => {
        healthStarted = true;
        await healthResponse;
        return HttpResponse.json({ status: "ok" });
      }),
      http.post("https://m1.test/api/v1/auth/usuario/login", () => new HttpResponse("{}", {
        status: 200,
        headers: {
          authorization: `Bearer ${token}`,
          "x-refresh-token": "refresh-token",
          "x-token-expires-in": "900",
          "content-type": "application/json",
        },
      })),
      http.get("https://backend.test/me", () => HttpResponse.json({
        userId: "42",
        subType: "EMPLEADO",
        m1Role: "ADMINISTRATIVO",
        roles: [],
      })),
    );

    const responsePromise = login(request({ email: "persona@example.test", password: "secret" }));
    const earlyResponse = await Promise.race([
      responsePromise,
      new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 100)),
    ]);
    finishHealth();

    expect(earlyResponse?.status).toBe(200);
    expect(healthStarted).toBe(true);
    expect((await responsePromise).status).toBe(200);
  });

  it.each([400, 404, 422])("shows M1 HTTP %i as rejected credentials", async (status) => {
    vi.stubEnv("M6_AUTH_MODE", "real-m1");
    vi.stubEnv("M1_BASE_URL", "https://m1.test/api/v1/");
    vi.stubEnv("M6_BACKEND_ORIGIN", "https://backend.test");
    server.use(
      http.get("https://backend.test/health", () => HttpResponse.json({ status: "ok" })),
      http.post("https://m1.test/api/v1/auth/usuario/login", () => HttpResponse.json({ message: "No autorizado" }, { status })),
    );

    const response = await login(request({ email: "persona@example.test", password: "incorrecta" }));

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "El correo o la contraseña no son correctos." });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("accepts a numeric M1 sub with leading zeroes when /me returns its canonical id", async () => {
    vi.stubEnv("M6_AUTH_MODE", "real-m1");
    vi.stubEnv("M1_BASE_URL", "https://m1.test/api/v1/");
    vi.stubEnv("M6_BACKEND_ORIGIN", "https://backend.test");
    const payload = Buffer.from(JSON.stringify({
      iss: "modulo1-ciudadanos",
      typ: "access",
      sub: "042",
      sub_type: "EMPLEADO",
      rol: "ADMINISTRATIVO",
      exp: Math.floor(Date.now() / 1000) + 900,
    })).toString("base64url");
    const token = `header.${payload}.signature`;
    server.use(
      http.get("https://backend.test/health", () => HttpResponse.json({ status: "ok" })),
      http.post("https://m1.test/api/v1/auth/usuario/login", () => new HttpResponse("{}", {
        status: 200,
        headers: {
          authorization: `Bearer ${token}`,
          "x-refresh-token": "refresh-token",
          "x-token-expires-in": "900",
          "content-type": "application/json",
        },
      })),
      http.get("https://backend.test/me", () => HttpResponse.json({
        userId: "42",
        subType: "EMPLEADO",
        m1Role: "ADMINISTRATIVO",
        roles: ["M6_ADMIN"],
      })),
    );

    const response = await login(request({ email: "persona@example.test", password: "secret" }));

    expect(response.status).toBe(200);
    expect((await response.json()).session.identity.userId).toBe("42");
  });
});
