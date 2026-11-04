import { isProductionAuthModeMisconfigured } from "./lib/auth-mode";

export function register() {
  if (!isProductionAuthModeMisconfigured()) return;

  console.error("[m6-auth-mode-misconfigured]", process.env.M6_AUTH_MODE);
  throw new Error("M6_AUTH_MODE debe ser real-m1 en producción.");
}
