import { NextResponse } from "next/server";

import { getSessionMutationRejection } from "@/lib/session-request";
import { AUTH_COOKIE_NAME, SESSION_MARKER_COOKIE_NAME, sessionCookieRemovalOptions } from "@/lib/session";

export async function POST(request: Request) {
  const rejection = getSessionMutationRejection(request);
  if (rejection) return NextResponse.json({ message: rejection.message }, { status: rejection.status });

  try {
    await request.json();
  } catch {
    return NextResponse.json({ message: "La solicitud JSON no es válida." }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, "", sessionCookieRemovalOptions());
  response.cookies.set(SESSION_MARKER_COOKIE_NAME, "", sessionCookieRemovalOptions());
  return response;
}
