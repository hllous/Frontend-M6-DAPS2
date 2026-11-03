import { createHmac } from "node:crypto";

import { DEMO_IDENTITIES } from "./demo-identities";
import type { ScenarioId } from "./scenarios";

/**
 * Firma local de tokens de demo (#745, #740). M1 no está hosteado: el BFF firma un access token por pedido, de vida corta,
 * con el contrato de `scripts/generate-demo-jwt.mjs` del backend. Así la sesión (cookie de horas) no depende del
 * vencimiento del token. Cuando M1 emita el login real, se borra este módulo y la rama `source: "demo"` de session.ts.
 *
 * Solo servidor: `M6_JWT_SECRET` (el `JWT_SECRET` del backend, en base64) nunca lleva el prefijo NEXT_PUBLIC_.
 */
export const DEMO_TOKEN_TTL_SECONDS = 300;
const DEFAULT_ISSUER = "modulo1-ciudadanos";

export function demoSigningConfigured(environment: Record<string, string | undefined> = process.env): boolean {
  return Boolean(environment.M6_JWT_SECRET);
}

export function signDemoJwt(
  scenarioId: ScenarioId,
  { now = Date.now(), environment = process.env }: { now?: number; environment?: Record<string, string | undefined> } = {},
): string {
  const secret = environment.M6_JWT_SECRET;
  if (!secret) throw new Error("M6_JWT_SECRET no está configurado.");
  const { sub, m1Role } = DEMO_IDENTITIES[scenarioId];
  const iat = Math.floor(now / 1000);
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    iss: environment.M6_JWT_ISSUER || DEFAULT_ISSUER,
    sub,
    sub_type: m1Role === "CIUDADANO" ? "CIUDADANO" : "EMPLEADO",
    rol: m1Role,
    typ: "access",
    iat,
    exp: iat + DEMO_TOKEN_TTL_SECONDS,
  })}`;
  // Como el backend, la clave se usa decodificada de base64.
  return `${unsigned}.${createHmac("sha256", Buffer.from(secret, "base64")).update(unsigned).digest("base64url")}`;
}
