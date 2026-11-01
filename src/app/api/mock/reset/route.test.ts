import { afterEach, describe, expect, it } from "vitest";

import { SESSION_MUTATION_HEADERS } from "@/lib/session-request";
import { addZoneFixture, getZoneFixture, resetZoneFixtures } from "@/lib/zones-fixtures";

import { POST } from "./route";

const env = process.env as Record<string, string | undefined>;
const originalNodeEnv = env.NODE_ENV;

function resetRequest(headers: Record<string, string> = SESSION_MUTATION_HEADERS) {
  return new Request("http://localhost/api/mock/reset", { method: "POST", headers, body: "{}" });
}

function addProbeZone() {
  addZoneFixture({ ...getZoneFixture("zone-1")!, id: "zone-probe" });
}

afterEach(() => {
  delete env.M6_AUTH_MODE;
  env.NODE_ENV = originalNodeEnv;
  resetZoneFixtures();
});

describe("mock data reset route", () => {
  it("restores the seeded fixtures after a test changed them", async () => {
    env.M6_AUTH_MODE = "mock";
    addProbeZone();

    const response = await POST(resetRequest());

    expect(response.status).toBe(200);
    expect(getZoneFixture("zone-probe")).toBeNull();
  });

  it("does not exist outside mock mode", async () => {
    env.M6_AUTH_MODE = "backend-development";
    addProbeZone();

    expect((await POST(resetRequest())).status).toBe(404);
    expect(getZoneFixture("zone-probe")).not.toBeNull();
  });

  it("does not exist in a production build even with mock mode set", async () => {
    env.M6_AUTH_MODE = "mock";
    env.NODE_ENV = "production";

    expect((await POST(resetRequest())).status).toBe(404);
  });

  it("rejects a request without the mutation headers", async () => {
    env.M6_AUTH_MODE = "mock";

    expect((await POST(resetRequest({ "content-type": "application/json" }))).status).toBe(403);
  });
});
