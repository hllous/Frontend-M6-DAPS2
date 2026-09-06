import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { resetStreetClosureRequestFixtures, streetClosureRequestFixtures } from "@/lib/street-closure-request-fixtures";
import { resetServiceFixtures } from "@/lib/services-fixtures";
import { GET, POST } from "./route";

beforeEach(() => {
  resetServiceFixtures();
  resetStreetClosureRequestFixtures();
});

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
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

function requestBody() {
  return {
    reason: "El recorrido requiere trabajar con circulación reducida.",
    sourceType: "SERVICE",
    sourceId: "SVC-1050",
    sourceModule: "M6",
    closureType: "PARTIAL",
    requestedFrom: "2026-09-10T08:00",
    requestedTo: "2026-09-10T12:00",
    affectedSections: [
      { streetName: "Bulevar Costero", fromCross: "Av. Belgrano", toCross: "Calle 12" },
    ],
  };
}

describe("street closure request BFF routes", () => {
  it("keeps creation Office-only", async () => {
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await POST(
      new Request("http://localhost/api/street-closure-requests", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(requestBody()),
      }),
    );

    expect(response.status).toBe(403);
    expect(streetClosureRequestFixtures).toHaveLength(1);
  });

  it("rejects empty sections and creates a pending Service-linked record for Office", async () => {
    const cookie = await authenticatedCookie("office-duty-queue");
    const emptyResponse = await POST(
      new Request("http://localhost/api/street-closure-requests", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify({ ...requestBody(), affectedSections: [] }),
      }),
    );
    expect(emptyResponse.status).toBe(400);

    const response = await POST(
      new Request("http://localhost/api/street-closure-requests", {
        method: "POST",
        headers: { "content-type": "application/json", cookie },
        body: JSON.stringify(requestBody()),
      }),
    );
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body).toMatchObject({ status: "REQUESTED", sourceType: "SERVICE", sourceId: "SVC-1050" });
    expect(body.sourceContext.title).toContain("Barrido");
  });

  it("requires an Office session for list and detail views", async () => {
    const fieldCookie = await authenticatedCookie("field-crew-leader-route");
    const response = await GET(
      new Request("http://localhost/api/street-closure-requests", { headers: { cookie: fieldCookie } }),
    );
    expect(response.status).toBe(403);

    const officeCookie = await authenticatedCookie("office-duty-queue");
    const list = await GET(
      new Request("http://localhost/api/street-closure-requests", { headers: { cookie: officeCookie } }),
    );
    expect(list.status).toBe(200);
    expect((await list.json()).data).toHaveLength(1);
  });

  it("allows Field to read only the closure context for its assigned Service", async () => {
    const fieldCookie = await authenticatedCookie("field-crew-leader-route");
    const response = await GET(
      new Request("http://localhost/api/street-closure-requests?sourceId=SVC-1050", {
        headers: { cookie: fieldCookie },
      }),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual([
      expect.objectContaining({ sourceId: "SVC-1050", status: "REQUESTED" }),
    ]);
  });
});
