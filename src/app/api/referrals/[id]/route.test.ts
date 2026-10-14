import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { addRepairRequestFixture, resetRepairRequestFixtures } from "@/lib/repair-request-fixtures";
import { resetStreetClosureRequestFixtures } from "@/lib/street-closure-request-fixtures";
import { resetServiceFixtures } from "@/lib/services-fixtures";
import { GET } from "./route";
import { loginAs } from "@/test/session";

beforeEach(() => {
  process.env.M6_AUTH_MODE = "mock";
  resetRepairRequestFixtures();
  resetStreetClosureRequestFixtures();
  resetServiceFixtures();
});

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});



describe("referral detail BFF", () => {
  it("lets Field open an assigned StreetClosureRequest detail", async () => {
    const cookie = await loginAs("field-crew-leader-route");
    const response = await GET(
      new Request("http://localhost/api/referrals/SCR-1001", { headers: { cookie } }),
      { params: Promise.resolve({ id: "SCR-1001" }) },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ kind: "STREET_CLOSURE_REQUEST", sourceServiceId: "SVC-1050" });
  });

  it("does not disclose an out-of-scope referral detail to Field", async () => {
    addRepairRequestFixture({
      id: "RR-OTHER",
      damageType: "BROKEN_SIDEWALK",
      address: "Av. de los Trabajadores 100",
      severity: "LOW",
      publicSafetyRisk: false,
      detectedInType: "SERVICE",
      detectedInId: "SVC-1042",
      sourceContext: {
        type: "SERVICE",
        id: "SVC-1042",
        label: "Recolección de residuos — Recorrido 4",
        href: "/app?destination=services&detail=SVC-1042",
      },
      status: "REQUESTED",
      workOrderId: null,
      requestedAt: "2026-09-05T08:00:00.000Z",
    });
    const cookie = await loginAs("field-crew-leader-route");
    const response = await GET(
      new Request("http://localhost/api/referrals/RR-OTHER", { headers: { cookie } }),
      { params: Promise.resolve({ id: "RR-OTHER" }) },
    );

    expect(response.status).toBe(404);
  });

  it("returns a safe 502 when the backend success body is not JSON", async () => {
    process.env.M6_AUTH_MODE = "backend-development";
    process.env.M6_DEV_JWT = "header.eyJleHAiOjQxMDAwMDAwMDB9.signature";
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<!doctype html><title>Proxy error</title>", {
      status: 200,
      headers: { "content-type": "text/html" },
    }));
    const cookie = await loginAs("office-duty-queue");

    const response = await GET(
      new Request("http://localhost/api/referrals/RR-NONJSON", { headers: { cookie } }),
      { params: Promise.resolve({ id: "RR-NONJSON" }) },
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toMatchObject({
      message: "El backend devolvió una respuesta inválida.",
      path: "/api/referrals/RR-NONJSON",
    });
  });
});
