import { NextResponse, type NextRequest } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/session-config";

export function proxy(request: NextRequest) {
  if (!request.cookies.has(AUTH_COOKIE_NAME)) {
    const loginUrl = new URL("/login", request.url);
    const destination = request.nextUrl.searchParams.get("destination");
    const variant = request.nextUrl.searchParams.get("variant");

    if (destination === "services") {
      loginUrl.searchParams.set("destination", destination);
      if (["a", "b", "c", "d", "e", "f"].includes(variant ?? "")) {
        loginUrl.searchParams.set("variant", variant!);
      }
    }

    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/app/:path*"],
};
