import { describe, expect, it } from "vitest";

import { readM1AccessClaims } from "./m1-auth";

function token(sub: string | number, exp: number) {
  const payload = Buffer.from(JSON.stringify({
    iss: "modulo1-ciudadanos",
    typ: "access",
    sub,
    sub_type: "EMPLEADO",
    rol: "ADMINISTRATIVO",
    exp,
  })).toString("base64url");
  return `header.${payload}.signature`;
}

describe("M1 access-token claims", () => {
  it("normalizes a numeric subject to the backend's canonical user id", () => {
    const now = Date.parse("2026-01-01T00:00:00.000Z");

    expect(readM1AccessClaims(token("042", now / 1000 + 900), now)?.subject).toBe("42");
  });

  it("rejects a login token whose lifetime exceeds 24 hours", () => {
    const now = Date.parse("2026-01-01T00:00:00.000Z");

    expect(readM1AccessClaims(token("42", now / 1000 + 86_401), now)).toBeUndefined();
  });
});
