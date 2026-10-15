import { NextResponse, type NextRequest } from "next/server";

import { AUTH_COOKIE_NAME } from "@/lib/session-config";

export function proxy(request: NextRequest) {
  if (!request.cookies.has(AUTH_COOKIE_NAME)) {
    const loginUrl = new URL("/login", request.url);
    const destination = request.nextUrl.searchParams.get("destination");
    const variant = request.nextUrl.searchParams.get("variant");

    if (destination === "services" && ["a", "b", "c", "d", "e", "f", "1", "2", "3"].includes(variant ?? "")) {
      loginUrl.searchParams.set("destination", destination);
      loginUrl.searchParams.set("variant", variant!);
    }

    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/app/:path*"],
};
