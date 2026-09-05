import { NextResponse } from "next/server";

import {
  AUTH_COOKIE_NAME,
  getSessionFromRequest,
  publicSession,
  refreshSession,
  sealSession,
  sessionCookieOptions,
  sessionCookieRemovalOptions,
} from "@/lib/session";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    const response = NextResponse.json({ message: "La sesión no está activa." }, { status: 401 });
    response.cookies.set(AUTH_COOKIE_NAME, "", sessionCookieRemovalOptions());
    return response;
  }

  const activeSession = refreshSession(session);
  if (!activeSession) {
    return NextResponse.json({ message: "La sesión expiró." }, { status: 401 });
  }

  const response = NextResponse.json({ session: publicSession(activeSession) });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: sealSession(activeSession),
    ...sessionCookieOptions(activeSession),
  });
  return response;
}
