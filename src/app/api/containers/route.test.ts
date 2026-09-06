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
  const response = await login(
    new Request("http://localhost/api/session/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId }),
    }),
  );
  return response.headers.get("set-cookie") ?? "";
}

describe("containers BFF route", () => {
  it("requires an active session for list", async () => {
    const response = await GET(new Request("http://localhost/api/containers"));

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({
      statusCode: 401,
      error: "Unauthorized",
      path: "/api/containers",
    });
  });

  it("lists Containers for any authenticated actor with documented filters", async () => {
    const cookie = await authenticatedCookie("field-crew-member-route");
    const response = await GET(
      new Request(
        "http://localhost/api/containers?status=ACTIVE&containerType=HOUSEHOLD&zoneId=zone-1",
        { headers: { cookie } },
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "cont-1",
          status: "ACTIVE",
          containerType: "HOUSEHOLD",
          zoneId: "zone-1",
        }),
      ]),
    );
  });

  it("keeps Container registration Office-only", async () => {
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await POST(
      new Request("http://localhost/api/containers", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          code: "CONT-DENIED",
          containerType: "HOUSEHOLD",
          zoneId: "zone-1",
          address: "Calle Falsa 123",
          lat: -34.6,
          lng: -58.4,
          capacityLiters: 1100,
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect((await response.json()).message).toMatch(/Oficina/i);
  });

  it("creates a Container for Office with code, type, zone, capacity, location starting in ACTIVE", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/containers", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          code: "CONT-BFF-NEW",
          containerType: "RECYCLABLE",
          zoneId: "zone-2",
          address: "Av. Belgrano 1000",
          lat: -34.61,
          lng: -58.38,
          capacityLiters: 2400,
        }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toMatchObject({
      code: "CONT-BFF-NEW",
      containerType: "RECYCLABLE",
      zoneId: "zone-2",
      address: "Av. Belgrano 1000",
      lat: -34.61,
      lng: -58.38,
      capacityLiters: 2400,
      status: "ACTIVE",
    });
  });

  it("validates creation inputs", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const response = await POST(
      new Request("http://localhost/api/containers", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          code: "",
          containerType: "INVALID",
        }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
