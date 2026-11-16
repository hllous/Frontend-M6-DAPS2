import { describe, expect, it } from "vitest";

import nextConfig, { API_CSP, resolveNextDistDir, typescriptConfigPathForDistDir } from "./next.config.mjs";

describe("M6_NEXT_DIST_DIR", () => {
  it.each([undefined, "", "../outside", "C:\\outside", ".next/subdir", "."])("falls back to .next for unsafe value %s", (value) => {
    expect(resolveNextDistDir(value)).toBe(".next");
  });

  it.each([".next", ".next-real-m1", ".next-e2e-real-m1"])("accepts a dedicated Next build directory: %s", (value) => {
    expect(resolveNextDistDir(value)).toBe(value);
  });

  it("uses the root TypeScript config only for the default dist directory", () => {
    expect(typescriptConfigPathForDistDir(".next")).toBe("tsconfig.json");
    expect(typescriptConfigPathForDistDir(".next-real-m1")).toBe("tsconfig.next-dist.json");
  });
});

describe("security headers (#956)", () => {
  it("applies the hardening headers to every route", async () => {
    const rules = await nextConfig.headers();
    const all = rules.find((rule) => rule.source === "/:path*");
    const byKey = Object.fromEntries(all.headers.map((header) => [header.key, header.value]));

    expect(byKey["X-Content-Type-Options"]).toBe("nosniff");
    expect(byKey["X-Frame-Options"]).toBe("DENY");
    expect(byKey["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    expect(byKey["Permissions-Policy"]).toContain("camera=()");
  });

  it("closes the CSP of the BFF routes and hides X-Powered-By", async () => {
    const rules = await nextConfig.headers();
    const api = rules.find((rule) => rule.source === "/api/:path*");

    expect(api.headers).toEqual([{ key: "Content-Security-Policy", value: API_CSP }]);
    expect(nextConfig.poweredByHeader).toBe(false);
  });
});
