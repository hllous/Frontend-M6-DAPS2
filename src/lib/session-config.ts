export const AUTH_COOKIE_NAME = "m6_session";

/** Marca liviana, sin datos: "esta persona ya ingresó". Permite avisar "tu sesión terminó" cuando la cookie de sesión venció y el navegador la borró. */
export const SESSION_MARKER_COOKIE_NAME = "m6_signed_in";

/** Un build desplegado (producción/preview) con `M6_AUTH_MODE` distinto de `real-m1`, o sin definir, no debe atender pedidos. */
export function isDeployedAuthModeMisconfigured(environment: { NODE_ENV?: string; M6_AUTH_MODE?: string } = process.env): boolean {
  return environment.NODE_ENV === "production" && environment.M6_AUTH_MODE !== "real-m1";
}
