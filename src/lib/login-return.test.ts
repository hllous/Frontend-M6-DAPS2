import { describe, expect, it } from "vitest";

import { expiredLoginUrl, returnPathFor, safeDestination } from "./login-return";

describe("login return path", () => {
  it("only accepts known shell destinations, never an arbitrary URL", () => {
    expect(safeDestination("services")).toBe("services");
    expect(safeDestination(["referrals", "x"])).toBe("referrals");
    expect(safeDestination("https://evil.example")).toBeUndefined();
    expect(safeDestination("//evil.example")).toBeUndefined();
    expect(safeDestination(null)).toBeUndefined();
  });

  it("returns to the screen of origin, or to the start when it is unknown", () => {
    expect(returnPathFor("inventory")).toBe("/app?destination=inventory");
    expect(returnPathFor("nope")).toBe("/app");
    expect(returnPathFor(undefined)).toBe("/app");
  });

  it("builds the expired-session login URL from the current screen", () => {
    expect(expiredLoginUrl({ pathname: "/app", search: "?destination=services&detail=SRV-1" })).toBe("/login?expired=1&destination=services");
    expect(expiredLoginUrl({ pathname: "/app/catalog/zones", search: "" })).toBe("/login?expired=1&destination=catalog");
    expect(expiredLoginUrl({ pathname: "/app/dashboard", search: "" })).toBe("/login?expired=1&destination=dashboards");
    for (const id of ["work", "services", "referrals", "inventory", "environment", "map", "catalog", "dashboards"]) {
      expect(expiredLoginUrl({ pathname: "/app", search: `?destination=${id}` })).toBe(`/login?expired=1&destination=${id}`);
    }
    expect(expiredLoginUrl({ pathname: "/app", search: "" })).toBe("/login?expired=1");
    expect(expiredLoginUrl({})).toBe("/login?expired=1");
  });
});
