import { NextResponse } from "next/server";

import { fetchMe, sameRoles } from "@/lib/me";
import {
  AUTH_COOKIE_NAME,
  InvalidSessionError,
  getSessionFromRequest,
  publicSession,
  sealSession,
  sessionCookieOptions,
  sessionCookieRemovalOptions,
} from "@/lib/session";

export async function GET(request: Request) {
  const now = Date.now();
  const session = getSessionFromRequest(request, undefined, now);
  if (!session) {
    const response = NextResponse.json({ message: "La sesión no está activa." }, { status: 401 });
    response.cookies.set(AUTH_COOKIE_NAME, "", sessionCookieRemovalOptions());
    return response;
  }

  // En modo backend el pulso de actividad también releé los roles de M6: un cambio de asignación rige sin volver a ingresar.
  let roles = session.roles;
  if (session.mode === "backend-development") {
    try {
      roles = (await fetchMe(request)).roles;
    } catch (error) {
      if (error instanceof InvalidSessionError) {
        const rejected = NextResponse.json({ message: "La sesión no está activa." }, { status: 401 });
        rejected.cookies.set(AUTH_COOKIE_NAME, "", sessionCookieRemovalOptions());
        return rejected;
      }
      // Indisponibilidad o ciudadano: se conservan los roles de la cookie; el backend sigue siendo la autoridad.
    }
  }

  // fetchMe pudo renovar los tokens contra M1: la cookie resellada lleva el material nuevo.
  const current = getSessionFromRequest(request, undefined, now) ?? session;
  const activeSession = { ...current, lastActivityAt: now, roles: sameRoles(session.roles, roles) ? session.roles : roles };
  const response = NextResponse.json({ session: publicSession(activeSession) });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: sealSession(activeSession),
    ...sessionCookieOptions(activeSession),
  });
  return response;
}
