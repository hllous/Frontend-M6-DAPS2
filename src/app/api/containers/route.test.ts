import { afterEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "./route";
import { loginAs } from "@/test/session";

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});



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
    const cookie = await loginAs("field-crew-member-route", { mode: "mock" });
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
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
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
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
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
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
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

  it("forwards an authenticated backend Container list request", async () => {
    const devJwt = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    const cookie = await loginAs("office-duty-queue", {
      mode: "backend-development",
      devJwt,
      backendOrigin: "https://backend.internal",
    });
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ data: [] }));

    const response = await GET(new Request("http://localhost/api/containers", { headers: { cookie } }));

    expect(response.status).toBe(200);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe("https://backend.internal/containers");
    expect(backendFetch.mock.calls[0]?.[1]?.method ?? "GET").toBe("GET");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toBe(`Bearer ${devJwt}`);
  });
});
