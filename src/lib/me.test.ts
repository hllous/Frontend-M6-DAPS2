import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { BackendUnavailableError } from "./session";
import { LOGIN_TIMEOUT_MS } from "./m1-auth";
import { fetchMeWithToken, ME_TIMEOUT_MS } from "./me";

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("GET /me during login", () => {
  it("uses the same 90-second budget as the M1 login request", () => {
    expect(ME_TIMEOUT_MS).toBe(LOGIN_TIMEOUT_MS);
    expect(ME_TIMEOUT_MS).toBe(90_000);
  });

  it("maps a timed-out backend identity response to an unavailable error", async () => {
    server.use(http.get("https://backend.test/me", async () => {
      await delay(50);
      return HttpResponse.json({ userId: "42", subType: "EMPLEADO", m1Role: "ADMINISTRATIVO", roles: [] });
    }));

    await expect(fetchMeWithToken("https://backend.test", "token", { timeoutMs: 5 }))
      .rejects.toBeInstanceOf(BackendUnavailableError);
  });
});
