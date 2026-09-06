import { describe, expect, it } from "vitest";

import { m1IdentityAdapter } from "./m1-identity";

describe("M1 identity fixture adapter", () => {
  it("resolves id-backed user and organization references without exposing M6-owned identity records", async () => {
    await expect(m1IdentityAdapter.getUser("user-maria")).resolves.toMatchObject({ id: "user-maria", displayName: expect.any(String), kind: "USER" });
    await expect(m1IdentityAdapter.getOrganization("org-municipal")).resolves.toMatchObject({ id: "org-municipal", displayName: expect.any(String), kind: "ORGANIZATION" });
    await expect(m1IdentityAdapter.listUsers()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ id: "user-maria" })]));
  });
});
