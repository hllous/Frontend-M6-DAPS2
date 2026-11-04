import { isDeployedAuthModeMisconfigured } from "@/lib/session-config";

/** Un build desplegado solo arranca con `M6_AUTH_MODE=real-m1`: mock y cualquier otro valor no pueden atender pedidos. */
export function register(): void {
  if (isDeployedAuthModeMisconfigured()) {
    throw new Error("M6_AUTH_MODE debe ser real-m1 en un entorno desplegado (mock es solo para desarrollo local y tests).");
  }
}
