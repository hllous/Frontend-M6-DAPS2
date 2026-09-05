"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  AUTH_COOKIE_NAME,
  getSessionFromCookieValue,
  InvalidSessionError,
  requireSession,
} from "@/lib/session";

export async function leaveApplication(_formData: FormData) {
  const cookieStore = await cookies();
  try {
    requireSession(getSessionFromCookieValue(cookieStore.get(AUTH_COOKIE_NAME)?.value));
  } catch (error) {
    if (!(error instanceof InvalidSessionError)) throw error;
  }
  cookieStore.delete(AUTH_COOKIE_NAME);
  redirect("/login");
}
