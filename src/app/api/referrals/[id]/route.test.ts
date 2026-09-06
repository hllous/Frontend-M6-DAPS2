import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST as login } from "@/app/api/session/login/route";
import { addRepairRequestFixture, resetRepairRequestFixtures } from "@/lib/repair-request-fixtures";
import { resetStreetClosureRequestFixtures } from "@/lib/street-closure-request-fixtures";
import { resetServiceFixtures } from "@/lib/services-fixtures";
import { GET } from "./route";

beforeEach(() => {
  process.env.M6_AUTH_MODE = "mock";
  resetRepairRequestFixtures();
  resetStreetClosureRequestFixtures();
  resetServiceFixtures();
});

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
});

async function authenticatedCookie(scenarioId: string) {
  const response = await login(
    new Request("http://localhost/api/session/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId }),
    }),
  );
  return response.headers.get("set-cookie") ?? "";
}

describe("referral detail BFF", () => {
  it("lets Field open an assigned StreetClosureRequest detail", async () => {
    const cookie = await authenticatedCookie("field-crew-leader-route");
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
    const cookie = await authenticatedCookie("field-crew-leader-route");
    const response = await GET(
      new Request("http://localhost/api/referrals/RR-OTHER", { headers: { cookie } }),
      { params: Promise.resolve({ id: "RR-OTHER" }) },
    );

    expect(response.status).toBe(404);
  });
});
