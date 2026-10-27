import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";
import { loginAs } from "@/test/session";

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
  vi.restoreAllMocks();
});



describe("POST /api/environmental-inspections/:id/complete", () => {
  it("translates the form command to the documented backend DTO", async () => {
    let backendBody: unknown;
    const urls: string[] = [];
    // El mock va antes del login: en modo backend, Campo resuelve su cuadrilla real contra GET /crews (#293).
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.includes("/crews")) {
        return new Response(JSON.stringify({ data: [{ id: "11111111-1111-4111-8111-111111111111", name: "Cuadrilla Belgrano — Recolección" }] }), { status: 200, headers: { "content-type": "application/json" } });
      }
      urls.push(url);
      if (url.endsWith("/environmental-inspections/INS-TEST-1")) {
        return new Response(JSON.stringify({
          id: "INS-TEST-1",
          reportId: "RPT-TEST-1",
          serviceId: "SVC-TEST-1",
          createdAt: "2026-09-20T14:00:00.000Z",
          updatedAt: "2026-09-20T14:00:00.000Z",
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (url.endsWith("/services/SVC-TEST-1")) {
        return new Response(JSON.stringify({ id: "SVC-TEST-1", crewId: "11111111-1111-4111-8111-111111111111" }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (url.includes("/evidence")) {
        return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
      }
      if (init?.body) backendBody = JSON.parse(String(init.body));
      return new Response(JSON.stringify({ id: "INS-TEST-1" }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const cookie = await loginAs("field-crew-leader-route", { mode: "backend-development", devJwt: "header.eyJleHAiOjE4MDAwMDAwMDB9.signature", backendOrigin: "https://backend.internal" });

    const response = await POST(new Request("http://localhost/api/environmental-inspections/INS-TEST-1/complete", {
      method: "POST",
      headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({
        inspectedAt: "2026-09-20T14:55:00.000Z",
        outcome: "VIOLATION_FOUND",
        nextStep: "NOTICE_TO_BE_ISSUED",
        checklist: [{ id: "source", label: "Verificar la fuente observada", completed: true }],
        findings: "Emisión visible",
        violationType: "AIR_EMISSION",
        severity: "HIGH",
        suggestedAction: "FORMAL_NOTICE",
      }),
    }), { params: Promise.resolve({ id: "INS-TEST-1" }) });

    expect(response.status).toBe(200);
    expect(backendBody).toEqual({
      inspectedAt: "2026-09-20T14:55:00.000Z",
      outcome: "VIOLATION_FOUND",
      nextStep: "NOTICE_TO_BE_ISSUED",
      findings: "Emisión visible",
      violationType: "AIR_EMISSION",
      severity: "HIGH",
      suggestedAction: "FORMAL_NOTICE",
      checklist: [{ itemCode: "source", label: "Verificar la fuente observada", result: true }],
    });
    // Campo lee la inspección y el servicio asignado antes de reenviar; la respuesta agrega evidencia.
    expect(urls).toEqual([
      "https://backend.internal/environmental-inspections/INS-TEST-1",
      "https://backend.internal/services/SVC-TEST-1",
      "https://backend.internal/environmental-inspections/INS-TEST-1/complete",
      "https://backend.internal/evidence?ownerType=INSPECTION&ownerId=INS-TEST-1",
    ]);
    expect(await response.json()).toEqual({ id: "INS-TEST-1", attachments: [] });
  });
});
