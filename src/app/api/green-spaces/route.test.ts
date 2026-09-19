import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { GET, POST } from "./route";

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});

async function authenticatedCookie(scenarioId: string) {
  process.env.M6_AUTH_MODE = "mock";
  const response = await login(new Request("http://localhost/api/session/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenarioId }),
  }));
  return response.headers.get("set-cookie") ?? "";
}

describe("green spaces BFF route", () => {
  it("requires an active session", async () => {
    const response = await GET(new Request("http://localhost/api/green-spaces"));

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ statusCode: 401, error: "Unauthorized", path: "/api/green-spaces" });
  });

  it("lists GreenSpaces for an authenticated Field actor with the documented filters", async () => {
    const cookie = await authenticatedCookie("field-crew-member-route");
    const response = await GET(new Request("http://localhost/api/green-spaces?active=true&spaceType=PARK&zoneId=zone-1", { headers: { cookie } }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([expect.objectContaining({ id: "green-space-108-1", spaceType: "PARK", zoneId: "zone-1", active: true })]);
  });

  it("keeps GreenSpace management Office-only", async () => {
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await POST(new Request("http://localhost/api/green-spaces", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ name: "No permitido", spaceType: "PARK", areaM2: 20, zoneId: "zone-1" }),
    }));

    expect(response.status).toBe(403);
    expect((await response.json()).message).toMatch(/Oficina/i);
  });

  it("creates a GreenSpace for Office with the documented response", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(new Request("http://localhost/api/green-spaces", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ name: "Plaza nueva #108", spaceType: "SQUARE", areaM2: 250, zoneId: "zone-2" }),
    }));
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({ name: "Plaza nueva #108", spaceType: "SQUARE", areaM2: 250, zoneId: "zone-2", active: true });
  });
});
