import { NextResponse, type NextRequest } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/session-config";

export function proxy(request: NextRequest) {
  if (!request.cookies.has(AUTH_COOKIE_NAME)) {
    const loginUrl = new URL("/login", request.url);
    const destination = request.nextUrl.searchParams.get("destination");

    if (destination === "services") {
      loginUrl.searchParams.set("destination", destination);
    }

    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/app/:path*"],
};
