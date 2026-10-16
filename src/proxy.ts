import { NextResponse, type NextRequest } from "next/server";

import { readPrototypeParams } from "@/components/prototype-529/preserve-params";
import { AUTH_COOKIE_NAME } from "@/lib/session-config";

export function proxy(request: NextRequest) {
  if (!request.cookies.has(AUTH_COOKIE_NAME)) {
    const loginUrl = new URL("/login", request.url);
    const destination = request.nextUrl.searchParams.get("destination");

    if (destination === "services") {
      loginUrl.searchParams.set("destination", destination);
    }
    // PROTOTYPE #529 (throwaway): keep the pattern params across the login redirect.
    for (const [key, value] of Object.entries(readPrototypeParams((k) => request.nextUrl.searchParams.get(k)))) {
      loginUrl.searchParams.set(key, value);
    }

    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/app/:path*"],
};
