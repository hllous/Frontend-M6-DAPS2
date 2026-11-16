import { describe, expect, it } from "vitest";

import { buildContentSecurityPolicy, newNonce } from "./security-headers";

const directive = (csp: string, name: string) => csp.split("; ").find((part) => part.startsWith(`${name} `));

describe("buildContentSecurityPolicy", () => {
  const production = buildContentSecurityPolicy({ nonce: "abc", isDev: false });

  it("keeps the closed defaults", () => {
    expect(directive(production, "default-src")).toBe("default-src 'self'");
    expect(directive(production, "frame-ancestors")).toBe("frame-ancestors 'none'");
    expect(directive(production, "object-src")).toBe("object-src 'none'");
    expect(directive(production, "base-uri")).toBe("base-uri 'self'");
    expect(directive(production, "form-action")).toBe("form-action 'self'");
  });

  it("allows scripts only with the request nonce and never eval in production", () => {
    expect(directive(production, "script-src")).toBe("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(production).not.toContain("unsafe-eval");
    expect(directive(production, "connect-src")).toBe("connect-src 'self'");
  });

  it("allows only the map tiles as an external origin", () => {
    expect(directive(production, "img-src")).toBe("img-src 'self' data: blob: https://*.tile.openstreetmap.org");
    expect(production.match(/https?:\/\/[^\s;]+/g)).toEqual(["https://*.tile.openstreetmap.org"]);
  });

  it("only widens script-src and connect-src for the dev server", () => {
    const dev = buildContentSecurityPolicy({ nonce: "abc", isDev: true });

    expect(directive(dev, "script-src")).toContain("'unsafe-eval'");
    expect(directive(dev, "connect-src")).toBe("connect-src 'self' ws: wss:");
  });

  it("generates a different nonce each time", () => {
    expect(newNonce()).not.toBe(newNonce());
  });
});
