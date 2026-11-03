import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetEnvironmentalInspectionFixtures } from "@/lib/environmental-report-fixtures";
import { resetRepairRequestFixtures, repairRequestFixtures } from "@/lib/repair-request-fixtures";
import { resetServiceFixtures } from "@/lib/services-fixtures";
import { GET, POST } from "./route";
import { createSessionCookie, loginAs } from "@/test/session";

beforeEach(() => {
  resetRepairRequestFixtures();
  resetEnvironmentalInspectionFixtures();
  resetServiceFixtures();
});
afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_AUTH_MODE;
  resetEnvironmentalInspectionFixtures();
  resetServiceFixtures();
  delete process.env.M6_BACKEND_ORIGIN;
});



function createRequest(cookie: string, body: unknown) {
  return new Request("http://localhost/api/repair-requests", {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("repair request BFF collection routes", () => {
  describe("creación desde orígenes reales", () => {
    const serviceId = "ceec08ae-67e7-4739-9677-150f5085bb1a";
    const inspectionId = "4d5683b8-d493-43bb-83ce-071bd074fe19";
    const crewId = "c1ba1a57-6f23-4871-b6b3-1d7ce231a516";
    const body = {
      damageType: "BROKEN_SIDEWALK", address: "Av. Rivadavia 2200", severity: "LOW",
      publicSafetyRisk: true, detectedInType: "SERVICE", detectedInId: serviceId,
    };

    beforeEach(() => {
      process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
      process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    });

    it.each(["SERVICE", "INSPECTION"])("conserva el 404 local para un origen %s desconocido", async (detectedInType) => {
      const backendFetch = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(Response.json({ message: "Not found" }, { status: 404 }));
      const cookie = await loginAs("office-duty-queue", { mode: "backend-development" });
      const response = await POST(createRequest(cookie, { ...body, detectedInType }));

      expect(response.status).toBe(404);
      expect(await response.json()).toMatchObject({
        statusCode: 404, error: "Not Found", path: "/api/repair-requests",
        message: detectedInType === "SERVICE" ? `Servicio ${serviceId} no encontrado.` : `Inspección ${serviceId} no encontrada.`,
      });
      expect(backendFetch).toHaveBeenCalledTimes(1);
      expect(String(backendFetch.mock.calls[0]?.[0])).toBe(
        `https://backend.internal/${detectedInType === "SERVICE" ? "services" : "environmental-inspections"}/${serviceId}`,
      );
    });

    it.each([401, 403, 500, 503])("conserva el error %s del origen sin crear la derivación", async (status) => {
      const error = { statusCode: status, message: "No se pudo consultar el origen." };
      const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(error, { status }));
      const cookie = await loginAs("office-duty-queue", { mode: "backend-development" });
      const response = await POST(createRequest(cookie, body));

      expect(response.status).toBe(status);
      expect(await response.json()).toEqual(error);
      expect(backendFetch).toHaveBeenCalledTimes(1);
      expect(backendFetch.mock.calls[0]?.[1]?.method ?? "GET").toBe("GET");
    });

    it("rechaza payloads del origen sin el contrato mínimo", async () => {
      const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({ crewId: 42 }));
      const cookie = await loginAs("office-duty-queue", { mode: "backend-development" });
      const response = await POST(createRequest(cookie, body));

      expect(response.status).toBe(500);
      expect(backendFetch).toHaveBeenCalledTimes(1);
    });

    it("Campo no crea derivaciones: el rol de Campo no alcanza y no se consulta el origen (Backend #161)", async () => {
      const cookie = createSessionCookie("field-crew-leader-route", { mode: "backend-development" });
      const backendFetch = vi.spyOn(globalThis, "fetch");
      const response = await POST(createRequest(cookie, body));

      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ code: "ROLE_REQUIRED" });
      expect(backendFetch).not.toHaveBeenCalled();
    });
  });

  it("Oficina crea una derivación desde un servicio real tras consultar su origen", async () => {
    process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const body = {
      damageType: "BROKEN_SIDEWALK", address: "Av. Rivadavia 2200", severity: "LOW",
      publicSafetyRisk: true, detectedInType: "SERVICE",
      detectedInId: "ceec08ae-67e7-4739-9677-150f5085bb1a",
    };
    const backendFetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({ crewId: "c1ba1a57-6f23-4871-b6b3-1d7ce231a516" }))
      .mockResolvedValueOnce(Response.json({ id: "derivacion-real", ...body }, { status: 201 }));
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development" });

    const response = await POST(createRequest(cookie, { ...body, ignored: "not forwarded" }));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "derivacion-real", ...body });
    expect(backendFetch.mock.calls.map(([url, init]) => [String(url), init?.method ?? "GET"])).toEqual([
      ["https://backend.internal/services/ceec08ae-67e7-4739-9677-150f5085bb1a", "GET"],
      ["https://backend.internal/repair-requests", "POST"],
    ]);
    expect(JSON.parse(String(backendFetch.mock.calls[1]?.[1]?.body))).toEqual(body);
  });

  it("permite consultar derivaciones de un servicio real de la cuadrilla de Campo", async () => {
    process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const backendFetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json({
        id: "ceec08ae-67e7-4739-9677-150f5085bb1a",
        serviceTypeId: "6e704e6e-8884-48f3-a930-4138703613c0",
        mode: "ROUTE", status: "COMPLETED", origin: "PLANNED",
        scheduledDate: "2026-09-22T00:00:00.000Z",
        crewId: "c1ba1a57-6f23-4871-b6b3-1d7ce231a516",
        vehicleId: null, windowFrom: "08:00", windowTo: "12:00",
      }))
      .mockResolvedValueOnce(Response.json({ data: [], meta: { total: 0, page: 1, pageSize: 20 } }));
    const cookie = await loginAs("field-crew-leader-route", { mode: "backend-development", crew: { id: "c1ba1a57-6f23-4871-b6b3-1d7ce231a516", name: "Cuadrilla Belgrano — Recolección", role: "LEADER" } });

    const response = await GET(new Request("http://localhost/api/repair-requests?detectedInId=ceec08ae-67e7-4739-9677-150f5085bb1a", { headers: { cookie } }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: [], meta: { total: 0, page: 1, pageSize: 20 } });
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe("https://backend.internal/services/ceec08ae-67e7-4739-9677-150f5085bb1a");
    expect(String(backendFetch.mock.calls[1]?.[0])).toBe("https://backend.internal/repair-requests?detectedInId=ceec08ae-67e7-4739-9677-150f5085bb1a");
    expect(new Headers(backendFetch.mock.calls[0]?.[1]?.headers).get("authorization")).toMatch(/^Bearer /);
  });

  it.each(["901159c1-3230-440a-ba3d-d7baf55fab24", "crew-b", null])(
    "rechaza servicios reales sin la cuadrilla de la sesión (%s)", async (crewId) => {
      process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
      process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
      const backendFetch = vi.spyOn(globalThis, "fetch")
        .mockResolvedValueOnce(Response.json({ id: "ceec08ae-67e7-4739-9677-150f5085bb1a", crewId }));
      const cookie = await loginAs("field-crew-leader-route", { mode: "backend-development", crew: { id: "c1ba1a57-6f23-4871-b6b3-1d7ce231a516", name: "Cuadrilla Belgrano — Recolección", role: "LEADER" } });

      const response = await GET(new Request("http://localhost/api/repair-requests?detectedInId=ceec08ae-67e7-4739-9677-150f5085bb1a", { headers: { cookie } }));

      expect(response.status).toBe(403);
      expect((await response.json()).message).toBe("Solo puede consultar derivaciones de su cuadrilla.");
      expect(backendFetch).toHaveBeenCalledTimes(1);
    },
  );

  it.each([401, 404, 503])("conserva el error %s al consultar el servicio real", async (status) => {
    process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const error = { statusCode: status, message: "No se pudo consultar el servicio." };
    const backendFetch = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(Response.json(error, { status }));
    const cookie = await loginAs("field-crew-leader-route", { mode: "backend-development", crew: { id: "c1ba1a57-6f23-4871-b6b3-1d7ce231a516", name: "Cuadrilla Belgrano — Recolección", role: "LEADER" } });

    const response = await GET(new Request("http://localhost/api/repair-requests?detectedInId=ceec08ae-67e7-4739-9677-150f5085bb1a", { headers: { cookie } }));

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual(error);
    expect(backendFetch).toHaveBeenCalledTimes(1);
  });

  it("Oficina consulta el backend sin validar la cuadrilla del servicio", async () => {
    process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
    process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
    const payload = { data: [{ id: "derivacion-real", detectedInId: "servicio-real" }], meta: { total: 1 } };
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json(payload));
    const cookie = await loginAs("office-duty-queue", { mode: "backend-development" });

    const response = await GET(new Request("http://localhost/api/repair-requests?detectedInId=servicio-real", { headers: { cookie } }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(payload);
    expect(backendFetch).toHaveBeenCalledTimes(1);
    expect(String(backendFetch.mock.calls[0]?.[0])).toBe("https://backend.internal/repair-requests?detectedInId=servicio-real");
  });

  it("requires a session", async () => {
    const response = await GET(new Request("http://localhost/api/repair-requests"));
    expect(response.status).toBe(401);
  });

  it("scopes the Field list to the actor's assigned crew and denies creating", async () => {
    const fieldCookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const assigned = await GET(new Request("http://localhost/api/repair-requests?detectedInId=SVC-1050", { headers: { cookie: fieldCookie } }));
    expect(assigned.status).toBe(200);
    expect((await assigned.json()).data).toEqual([
      expect.objectContaining({ detectedInId: "SVC-1050" }),
    ]);

    const otherCrew = await GET(new Request("http://localhost/api/repair-requests?detectedInId=SVC-1042", { headers: { cookie: fieldCookie } }));
    expect(otherCrew.status).toBe(403);

    const unscoped = await GET(new Request("http://localhost/api/repair-requests", { headers: { cookie: fieldCookie } }));
    expect(unscoped.status).toBe(403);


    const created = await POST(createRequest(fieldCookie, {
      damageType: "BROKEN_SIDEWALK",
      address: "Av. Rivadavia 2200",
      severity: "LOW",
      publicSafetyRisk: true,
      detectedInType: "SERVICE",
      detectedInId: "SVC-1050",
    }));
    expect(created.status).toBe(403);
    expect(await created.json()).toMatchObject({ code: "ROLE_REQUIRED" });
  });

  it("lists fixtures and creates a pending Service-sourced referral", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const list = await GET(new Request("http://localhost/api/repair-requests", { headers: { cookie } }));
    expect((await list.json()).meta).toMatchObject({ total: 1, page: 1 });

    const response = await POST(createRequest(cookie, {
      damageType: "BROKEN_SIDEWALK",
      address: "Av. Rivadavia 2200",
      severity: "LOW",
      publicSafetyRisk: true,
      detectedInType: "SERVICE",
      detectedInId: "SVC-1043",
    }));

    expect(response.status).toBe(201);
    expect((await response.json())).toMatchObject({ status: "REQUESTED", detectedInId: "SVC-1043" });
    expect(repairRequestFixtures).toHaveLength(2);
  });

  it("lets Office create a pending referral from an EnvironmentalInspection", async () => {
    const cookie = await loginAs("office-duty-queue", { mode: "mock" });
    const response = await POST(createRequest(cookie, {
      damageType: "BLOCKED_DRAIN",
      address: "Av. Brasil 2450",
      severity: "LOW",
      publicSafetyRisk: true,
      detectedInType: "INSPECTION",
      detectedInId: "INS-1012",
    }));
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      status: "REQUESTED",
      detectedInType: "INSPECTION",
      detectedInId: "INS-1012",
      severity: "LOW",
      publicSafetyRisk: true,
      sourceContext: { type: "INSPECTION", id: "INS-1012", href: expect.stringContaining("destination=environment") },
    });
  });

  it("Campo no crea derivaciones desde una inspección: solo Oficina de Operaciones o Admin", async () => {
    const cookie = await loginAs("field-crew-leader-route", { mode: "mock" });
    const denied = await POST(createRequest(cookie, {
      damageType: "BLOCKED_DRAIN",
      address: "Av. Brasil 2450",
      severity: "LOW",
      publicSafetyRisk: false,
      detectedInType: "INSPECTION",
      detectedInId: "INS-1012",
    }));
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ code: "ROLE_REQUIRED" });
  });
});
