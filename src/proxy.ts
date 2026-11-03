import { NextResponse, type NextRequest } from "next/server";

import { DESTINATION_HEADER, destinationOf, loginUrl } from "@/lib/login-return";
import { AUTH_COOKIE_NAME, SESSION_MARKER_COOKIE_NAME } from "@/lib/session-config";

export function proxy(request: NextRequest) {
  const destination = destinationOf({ pathname: request.nextUrl.pathname, search: request.nextUrl.search });

  if (!request.cookies.has(AUTH_COOKIE_NAME)) {
    // Sin cookie de sesión pero con la marca: la sesión venció y el navegador la borró, no es alguien que nunca ingresó.
    const expired = request.cookies.has(SESSION_MARKER_COOKIE_NAME);
    return NextResponse.redirect(new URL(loginUrl({ expired, destination }), request.url));
  }

  // El layout no ve la URL: si la sesión de la cookie resulta inválida, redirige al login con esta pantalla.
  const headers = new Headers(request.headers);
  if (destination) headers.set(DESTINATION_HEADER, destination);
  else headers.delete(DESTINATION_HEADER);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/app/:path*"],
};
