// @ts-nocheck
import { NextResponse, type NextRequest } from "next/server";

import { DESTINATION_HEADER, destinationOf, loginUrl } from "@/lib/login-return";
import { buildContentSecurityPolicy, newNonce } from "@/lib/security-headers";
import { AUTH_COOKIE_NAME, SESSION_MARKER_COOKIE_NAME } from "@/lib/session-config";

const isAppRoute = (pathname: string) => pathname === "/app" || pathname.startsWith("/app/");

export function proxy(request: NextRequest) {
  // CSP con nonce por pedido (#956): Next lo toma del header del pedido y lo copia a sus scripts.
  const nonce = newNonce();
  const csp = buildContentSecurityPolicy({ nonce, isDev: process.env.NODE_ENV === "development" });

  const respond = (response: NextResponse) => {
    response.headers.set("Content-Security-Policy", csp);
    return response;
  };

  const destination = destinationOf({ pathname: request.nextUrl.pathname, search: request.nextUrl.search });

  if (isAppRoute(request.nextUrl.pathname) && !request.cookies.has(AUTH_COOKIE_NAME)) {
    // Sin cookie de sesión pero con la marca: la sesión venció y el navegador la borró, no es alguien que nunca ingresó.
    const expired = request.cookies.has(SESSION_MARKER_COOKIE_NAME);
    return respond(NextResponse.redirect(new URL(loginUrl({ expired, destination }), request.url)));
  }

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  // El layout no ve la URL: si la sesión de la cookie resulta inválida, redirige al login con esta pantalla.
  if (destination && isAppRoute(request.nextUrl.pathname)) headers.set(DESTINATION_HEADER, destination);
  else headers.delete(DESTINATION_HEADER);
  return respond(NextResponse.next({ request: { headers } }));
}

export const config = {
  // Todas las páginas (para la CSP) salvo el BFF, los estáticos y los archivos de /public que no son documentos.
  // La verificación de sesión sigue acotada a /app dentro de proxy().
  matcher: ["/((?!api/|_next/static|_next/image|favicon\\.ico|geo/|fonts/|mockServiceWorker\\.js).*)"],
};
