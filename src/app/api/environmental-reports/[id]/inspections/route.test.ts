import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { GET, POST } from "./route";
import { loginAs } from "@/test/session";

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});



const params = { params: Promise.resolve({ id: "REP-1" }) };
const inspection = { id: "INS-1", reportId: "REP-1", serviceId: null, checklistItems: [] };

describe("GET /api/environmental-reports/:id/inspections", () => {
  it("adds each inspection's evidence from GET /evidence (InspectionResponseDto does not carry it)", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature", backendOrigin: "https://backend.internal" });
    const attachment = { id: "att-1", url: "https://r2/att-1.jpg", filename: "acta.jpg", contentType: "image/jpeg", uploadedAt: "2026-09-21T10:00:00.000Z" };
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const body = String(input).includes("/evidence?ownerType=INSPECTION&ownerId=INS-1") ? [attachment] : [inspection];
      return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });
    });

    const response = await GET(new Request("http://localhost/api/environmental-reports/REP-1/inspections", { headers: { cookie } }), params);

    expect(await response.json()).toEqual([{ ...inspection, attachments: [attachment] }]);
  });

  it("returns the inspections without attachments when the evidence cannot be read", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature", backendOrigin: "https://backend.internal" });
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) =>
      String(input).includes("/evidence")
        ? new Response("{}", { status: 503 })
        : new Response(JSON.stringify([inspection]), { status: 200, headers: { "content-type": "application/json" } }));

    const response = await GET(new Request("http://localhost/api/environmental-reports/REP-1/inspections", { headers: { cookie } }), params);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([inspection]);
  });

  it("keeps the shared 503 and 409 error labels on a route with status-specific envelopes", async () => {
    const backendSession = await loginAs("office-duty-queue", { mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature", backendOrigin: "https://backend.internal" });
    delete process.env.M6_BACKEND_ORIGIN;
    const unavailable = await GET(
      new Request("http://localhost/api/environmental-reports/REP-1/inspections", { headers: { cookie: backendSession } }),
      params,
    );

    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toMatchObject({ error: "Service Unavailable" });

    process.env.M6_AUTH_MODE = "mock";
    const mockLogin = await login(new Request("http://localhost/api/session/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId: "office-duty-queue" }),
    }));
    const mockCookie = mockLogin.headers.get("set-cookie") ?? "";
    const conflict = await POST(new Request("http://localhost/api/environmental-reports/ER-1007/inspections", {
      method: "POST",
      headers: { cookie: mockCookie, "content-type": "application/json" },
      body: JSON.stringify({
        scheduledDate: "2026-10-13",
        timeWindow: { start: "08:00", end: "12:00" },
        checklistVersion: "v1",
        checklist: [{ id: "item-1", label: "Revisar", required: true }],
      }),
    }), { params: Promise.resolve({ id: "ER-1007" }) });

    expect(conflict.status).toBe(409);
    expect(await conflict.json()).toMatchObject({ error: "Conflict" });
  });
});
