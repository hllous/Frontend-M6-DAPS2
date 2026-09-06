import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { GET, POST } from "./route";

afterEach(() => { delete process.env.M6_AUTH_MODE; delete process.env.M6_BACKEND_ORIGIN; vi.restoreAllMocks(); });

async function cookie(scenarioId: string) {
  process.env.M6_AUTH_MODE = "mock";
  const response = await login(new Request("http://localhost/api/session/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ scenarioId }) }));
  return response.headers.get("set-cookie") ?? "";
}

describe("crews BFF route", () => {
  it("scopes Field list reads to the actor's own crew", async () => {
    const response = await GET(new Request("http://localhost/api/crews", { headers: { cookie: await cookie("field-crew-member-route") } }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toEqual([expect.objectContaining({ id: "crew-b" })]);
  });

  it("keeps creation Office-only and requires the hypothesis capability", async () => {
    const response = await POST(new Request("http://localhost/api/crews", { method: "POST", headers: { cookie: await cookie("field-crew-leader-route"), "content-type": "application/json" }, body: JSON.stringify({ name: "Nueva", crewType: "MUNICIPAL", leaderUserId: "user-maria", organizationId: "org-municipal", defaultShift: "MORNING" }) }));
    expect(response.status).toBe(403);
  });
});
