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
