import { NextResponse } from "next/server";

import {
  AUTH_COOKIE_NAME,
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

  const activeSession = { ...session, lastActivityAt: now };
  const response = NextResponse.json({ session: publicSession(activeSession) });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: sealSession(activeSession),
    ...sessionCookieOptions(activeSession),
  });
  return response;
}
