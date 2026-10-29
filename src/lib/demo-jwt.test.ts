import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

import { DEMO_IDENTITIES } from "./demo-identities";
import { DEMO_TOKEN_TTL_SECONDS, demoSigningConfigured, signDemoJwt } from "./demo-jwt";
import { isScenarioId } from "./scenarios";

// Clave de prueba (no es la de ningún entorno): 32 bytes en base64, como el JWT_SECRET del backend.
const environment = { M6_JWT_SECRET: Buffer.alloc(32, 7).toString("base64") };

function decode(token: string) {
  const [header, payload, signature] = token.split(".");
  return {
    header: JSON.parse(Buffer.from(header, "base64url").toString()),
    payload: JSON.parse(Buffer.from(payload, "base64url").toString()),
    signature,
    unsigned: `${header}.${payload}`,
  };
}

describe("demo JWT signing (contract of scripts/generate-demo-jwt.mjs)", () => {
  it("signs HS256 with the base64-decoded key and the claims the backend validates", () => {
    const token = signDemoJwt("office-operations", { now: 1_000_000_000_000, environment });
    const { header, payload, signature, unsigned } = decode(token);

    expect(header).toEqual({ alg: "HS256", typ: "JWT" });
    expect(payload).toEqual({
      iss: "modulo1-ciudadanos",
      sub: "3",
      sub_type: "EMPLEADO",
      rol: "ADMINISTRATIVO",
      typ: "access",
      iat: 1_000_000_000,
      exp: 1_000_000_000 + DEMO_TOKEN_TTL_SECONDS,
    });
    expect(signature).toBe(createHmac("sha256", Buffer.alloc(32, 7)).update(unsigned).digest("base64url"));
  });

  it("uses the configured issuer and gives every profile its own seed identity", () => {
    const subs = (Object.keys(DEMO_IDENTITIES) as (keyof typeof DEMO_IDENTITIES)[]).map((id) => {
      expect(isScenarioId(id)).toBe(true);
      return decode(signDemoJwt(id, { environment: { ...environment, M6_JWT_ISSUER: "otro-emisor" } })).payload;
    });
    expect(new Set(subs.map((claims) => claims.sub)).size).toBe(9);
    expect(subs.every((claims) => claims.iss === "otro-emisor")).toBe(true);
  });

  it("marks the citizen profile with sub_type CIUDADANO so the backend rejects it", () => {
    const { payload } = decode(signDemoJwt("citizen", { environment }));
    expect(payload).toMatchObject({ sub_type: "CIUDADANO", rol: "CIUDADANO" });
  });

  it("refuses to sign without the server-only secret", () => {
    expect(demoSigningConfigured({})).toBe(false);
    expect(demoSigningConfigured(environment)).toBe(true);
    expect(() => signDemoJwt("citizen", { environment: {} })).toThrow("M6_JWT_SECRET");
  });
});
