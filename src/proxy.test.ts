import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { proxy } from "./proxy";

describe("optimistic session proxy", () => {
  it("redirects an anonymous request away from the shell, without a notice", () => {
    const response = proxy(new NextRequest("http://localhost/app"));

    expect(response?.status).toBe(307);
    expect(response?.headers.get("location")).toBe("http://localhost/login");
  });

  it.each(["work", "services", "referrals", "inventory", "environment", "map", "catalog", "dashboards"])(
    "preserves the %s destination across the signed-out redirect",
    (destination) => {
      const response = proxy(new NextRequest(`http://localhost/app?destination=${destination}`));

      expect(response?.headers.get("location")).toBe(`http://localhost/login?destination=${destination}`);
    },
  );

  it("drops an unknown destination", () => {
    expect(proxy(new NextRequest("http://localhost/app?destination=//evil.example"))?.headers.get("location")).toBe(
      "http://localhost/login",
    );
  });

  it("tells the person the session ended when the session cookie is gone but the signed-in marker is not", () => {
    const response = proxy(new NextRequest("http://localhost/app?destination=services", {
      headers: { cookie: "m6_signed_in=1" },
    }));

    expect(response?.headers.get("location")).toBe("http://localhost/login?expired=1&destination=services");
  });

  it("maps the catalog alias route to its destination", () => {
    const response = proxy(new NextRequest("http://localhost/app/catalog/zones", { headers: { cookie: "m6_signed_in=1" } }));

    expect(response?.headers.get("location")).toBe("http://localhost/login?expired=1&destination=catalog");
  });

  it("lets requests with a session cookie through and hands the requested screen to the layout", () => {
    const response = proxy(new NextRequest("http://localhost/app?destination=map", {
      headers: { cookie: "m6_session=opaque" },
    }));

    expect(response?.status).toBe(200);
    expect(response?.headers.get("x-middleware-override-headers")).toContain("x-m6-destination");
    expect(response?.headers.get("x-middleware-request-x-m6-destination")).toBe("map");
  });

  it("sends the nonce CSP on public pages without asking for a session", () => {
    const response = proxy(new NextRequest("http://localhost/login"));
    const csp = response?.headers.get("content-security-policy") ?? "";

    expect(response?.status).toBe(200);
    expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
    expect(response?.headers.get("x-middleware-request-x-nonce")).toBe(csp.match(/'nonce-([^']+)'/)?.[1]);
    expect(response?.headers.get("x-middleware-request-x-m6-destination")).toBeNull();
  });

  it("also sends the CSP on the signed-out redirect", () => {
    const response = proxy(new NextRequest("http://localhost/app"));

    expect(response?.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
  });
});
