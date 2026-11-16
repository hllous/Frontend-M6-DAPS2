import { expect, test, type Page } from "@playwright/test";

import { loginViaApi } from "./support/auth";

// #956: cabeceras de seguridad del Frontend y ausencia de violaciones de CSP en las pantallas principales.

test.describe("security headers @smoke", () => {
  test("pages send the CSP and the hardening headers", async ({ request }) => {
    const response = await request.get("/login");
    const headers = response.headers();

    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["x-powered-by"]).toBeUndefined();

    const csp = headers["content-security-policy"];
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  });

  test("each request gets a fresh nonce", async ({ request }) => {
    const nonceOf = async () => (await request.get("/login")).headers()["content-security-policy"]?.match(/'nonce-([^']+)'/)?.[1];

    const [first, second] = [await nonceOf(), await nonceOf()];
    expect(first).toBeTruthy();
    expect(first).not.toBe(second);
  });

  test("the BFF answers with a closed CSP", async ({ request }) => {
    const response = await request.get("/api/health");

    expect(response.headers()["content-security-policy"]).toBe("default-src 'none'; frame-ancestors 'none'");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  });
});

test.describe("headers on every kind of response @smoke", () => {
  const expectHardened = (headers: Record<string, string>) => {
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  };

  test("a 404 page", async ({ request }) => {
    const response = await request.get("/no-existe-esta-pagina");
    expect(response.status()).toBe(404);
    expectHardened(response.headers());
  });

  test("the redirect of a protected page without a session", async ({ request }) => {
    const response = await request.get("/app", { maxRedirects: 0 });
    expect([302, 307, 308]).toContain(response.status());
    expectHardened(response.headers());
  });

  test("a BFF error response", async ({ request }) => {
    const response = await request.get("/api/zones");
    expect(response.status()).toBe(401);
    expectHardened(response.headers());
  });

  test("HSTS is not sent over plain-HTTP development (it is unit-tested for production in next.config.test.mjs)", async ({ request, baseURL }) => {
    test.skip(baseURL?.startsWith("https://") ?? false, "contra HTTPS se espera HSTS");
    expect((await request.get("/login")).headers()["strict-transport-security"]).toBeUndefined();
  });
});

test.describe("BFF CORS and error hygiene @smoke", () => {
  test("never answers with a wildcard or reflected CORS origin, even with credentials", async ({ request }) => {
    for (const path of ["/api/health", "/api/zones", "/api/session"]) {
      const response = await request.get(path, { headers: { origin: "https://evil.example" } });
      const headers = response.headers();
      expect(headers["access-control-allow-origin"], path).toBeUndefined();
      expect(headers["access-control-allow-credentials"], path).toBeUndefined();
    }
  });

  test("a cross-origin preflight is not approved", async ({ request }) => {
    const response = await request.fetch("/api/session/login", {
      method: "OPTIONS",
      headers: { origin: "https://evil.example", "access-control-request-method": "POST", "access-control-request-headers": "content-type" },
    });
    expect(response.headers()["access-control-allow-origin"]).toBeUndefined();
    expect(response.headers()["access-control-allow-methods"]).toBeUndefined();
  });

  test("errors carry no stack trace or internal detail", async ({ request }) => {
    const unauthenticated = await request.get("/api/zones");
    const malformed = await request.post("/api/session/login", {
      data: "{no es json",
      headers: { "content-type": "application/json", "x-requested-with": "XMLHttpRequest" },
    });

    for (const response of [unauthenticated, malformed]) {
      const text = await response.text();
      expect(text).not.toMatch(/at [\w.<>]+ \(|node_modules|\.tsx?:\d+|stack|ECONN|prisma/i);
      expect(text).not.toMatch(/[A-Za-z]:\\|\/home\/|\/app\/src/);
    }
  });
});

test.describe("session cookies @smoke", () => {
  test("are HttpOnly and SameSite=Lax; Secure is added on every non-loopback host and in production", async ({ page, context }) => {
    await loginViaApi(page, "office-duty-queue");
    await page.goto("/login");
    const cookies = await context.cookies();
    const session = cookies.find((cookie) => cookie.name === "m6_session");

    expect(session).toBeDefined();
    expect(session?.httpOnly).toBe(true);
    expect(session?.sameSite).toBe("Lax");
    // La marca de "ya ingresó" tampoco es legible desde scripts.
    expect(cookies.find((cookie) => cookie.name === "m6_signed_in")?.httpOnly ?? true).toBe(true);
    expect(await page.evaluate(() => document.cookie)).not.toContain("m6_session");
  });
});

async function collectCspViolations(page: Page) {
  const violations: string[] = [];
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      (window as unknown as { __csp: string[] }).__csp ??= [];
      (window as unknown as { __csp: string[] }).__csp.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  page.on("console", (message) => {
    if (/content security policy/i.test(message.text())) violations.push(message.text());
  });
  return async () => [...violations, ...((await page.evaluate(() => (window as unknown as { __csp?: string[] }).__csp)) ?? [])];
}

test.describe("no CSP violations on the main screens @smoke", () => {
  for (const path of ["/login", "/consulta", "/consulta/puntos-verdes"]) {
    test(`public page ${path}`, async ({ page }) => {
      const violations = await collectCspViolations(page);
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      expect(await violations()).toEqual([]);
    });
  }

  for (const path of ["/app", "/app/dashboard", "/app/catalog/zones", "/app/catalog/containers"]) {
    test(`signed-in screen ${path}`, async ({ page }) => {
      await loginViaApi(page, "office-duty-queue");
      const violations = await collectCspViolations(page);
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      expect(await violations()).toEqual([]);
    });
  }
});
