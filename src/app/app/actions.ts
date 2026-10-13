"use server";

import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/session";

export async function leaveApplication(_formData: FormData) {
  const cookieStore = await cookies();
  // Logout is idempotent, including expired or invalid cookies.
  cookieStore.delete(AUTH_COOKIE_NAME);
}
