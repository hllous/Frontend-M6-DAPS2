import { afterEach, expect, it, vi } from "vitest";
import { AUTH_COOKIE_NAME, createSession, sealSession } from "@/lib/session";
import { leaveApplication } from "./actions";

const cookieStore = vi.hoisted(() => ({ get: vi.fn(), delete: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));
afterEach(() => vi.clearAllMocks());

it.each(["valid", "expired", "invalid", "missing"])("clears the cookie for a %s session without rejecting logout", async (state) => {
  const value = state === "valid" || state === "expired"
    ? sealSession(createSession("office-duty-queue", { mode: "mock", now: Date.now() - (state === "expired" ? 9 * 60 * 60 * 1000 : 0) }))
    : state === "invalid" ? "invalid-cookie" : undefined;
  cookieStore.get.mockReturnValue(value ? { value } : undefined);
  await expect(leaveApplication(new FormData())).resolves.toBeUndefined();
  expect(cookieStore.delete).toHaveBeenCalledWith(AUTH_COOKIE_NAME);
});
