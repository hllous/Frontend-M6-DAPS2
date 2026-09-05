import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, sessionCookieRemovalOptions } from "@/lib/session";

export async function POST(_request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE_NAME, "", sessionCookieRemovalOptions());
  return response;
}
