import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";

import { handlers } from "@/mocks/handlers";
import { resetCrewFixtures } from "@/lib/crew-fixtures";
import { resetServiceFrequencyFixtures } from "@/lib/service-frequency-fixtures";
import { resetVehicleFixtures } from "@/lib/vehicles-fixtures";
import { createSessionCookie } from "@/test/session";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetCrewFixtures();
  resetVehicleFixtures();
  resetServiceFrequencyFixtures();
});
afterAll(() => server.close());

function send(method: string, path: string, cookie?: string, body?: unknown) {
  return fetch(`http://localhost${path}`, {
    method,
    headers: { ...(cookie ? { cookie } : {}), "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("Crew, vehicle and service frequency MSW handlers delegate to the real BFF routes", () => {
  it("lists and reads crews, vehicles and frequencies as Office, with the route 404 envelope", async () => {
    for (const path of ["/api/crews", "/api/vehicles", "/api/service-frequencies"]) {
      const list = await send("GET", path);
      expect(list.status).toBe(200);
      expect((await list.json()).data.length).toBeGreaterThan(0);
    }

    for (const path of ["/api/crews/nope", "/api/vehicles/nope", "/api/service-frequencies/nope"]) {
      const missing = await send("GET", path);
      expect(missing.status).toBe(404);
      expect(await missing.json()).toMatchObject({ statusCode: 404, error: "Not Found" });
    }
  });

  it("rejects invalid payloads with the route 400", async () => {
    for (const path of ["/api/crews", "/api/vehicles", "/api/service-frequencies"]) {
      const response = await send("POST", path, undefined, {});
      expect(response.status).toBe(400);
    }
  });

  it("returns the real 403 when a Field crew manages crews, vehicles or frequencies", async () => {
    const fieldCookie = createSessionCookie("field-crew-leader-route", { mode: "mock" });

    for (const path of ["/api/crews", "/api/vehicles", "/api/service-frequencies"]) {
      const response = await send("POST", path, fieldCookie, {});
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ statusCode: 403, error: "Forbidden", path });
    }

    const removeMember = await send("DELETE", "/api/crews/crew-1/members/user-1", fieldCookie);
    expect(removeMember.status).toBe(403);
  });
});
