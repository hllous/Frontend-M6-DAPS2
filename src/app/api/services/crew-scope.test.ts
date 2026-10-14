import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as completeInspection } from "@/app/api/environmental-inspections/[id]/complete/route";
import { GET as listReports } from "@/app/api/environmental-reports/route";
import { GET as getReport } from "@/app/api/environmental-reports/[id]/route";
import { GET as listCrews } from "@/app/api/crews/route";
import { GET as listClosures } from "@/app/api/street-closure-requests/route";
import { GET as getService } from "@/app/api/services/[id]/route";
import { GET as getZoneResults, POST as postZoneResult } from "@/app/api/services/[id]/zone-results/route";
import { POST as startService } from "@/app/api/services/[id]/start/route";
import { POST as completeService } from "@/app/api/services/[id]/complete/route";
import { POST as suspendService } from "@/app/api/services/[id]/suspend/route";
import { POST as resumeService } from "@/app/api/services/[id]/resume/route";
import { AUTH_COOKIE_NAME, createSession, sealSession } from "@/lib/session";

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.M6_AUTH_MODE;
  delete process.env.M6_DEV_JWT;
  delete process.env.M6_BACKEND_ORIGIN;
});

function fieldCookie(crewId = "crew-own") {
  process.env.M6_AUTH_MODE = "backend-development";
  process.env.M6_DEV_JWT = "header.eyJleHAiOjE4MDAwMDAwMDB9.signature";
  process.env.M6_BACKEND_ORIGIN = "https://backend.internal";
  const session = createSession("field-crew-leader-route", {
    mode: "backend-development",
    devJwt: process.env.M6_DEV_JWT,
    backendOrigin: process.env.M6_BACKEND_ORIGIN,
  });
  session.crew = { id: crewId, name: "Cuadrilla de la sesión" };
  return `${AUTH_COOKIE_NAME}=${sealSession(session)}`;
}

function foreignServiceFetch() {
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
    if ((init?.method ?? "GET") === "GET" && String(url).includes("/services/")) {
      return Response.json({ id: "service-real", crewId: "crew-other" });
    }
    return Response.json({ id: "unexpected-forward" }, { status: 201 });
  });
}

async function expectForeignServiceDenied(cookie: string, call: () => Promise<Response>) {
  const backendFetch = foreignServiceFetch();
  const response = await call();
  expect(response.status).toBe(403);
  expect(backendFetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(0);
  expect(backendFetch.mock.calls.some(([url]) => String(url) === "https://backend.internal/services/service-real")).toBe(true);
  return cookie;
}

const serviceId = "service-real";
const inspectionId = "inspection-real";
const reportId = "report-real";
const params = (id: string) => ({ params: Promise.resolve({ id }) });

describe("backend Field crew scope before forwarding", () => {
  it.each([
    ["detail", (cookie: string) => getService(new Request(`http://localhost/api/services/${serviceId}`, { headers: { cookie } }), params(serviceId))],
    ["zone results", (cookie: string) => getZoneResults(new Request(`http://localhost/api/services/${serviceId}/zone-results`, { headers: { cookie } }), params(serviceId))],
  ])("denies a foreign crew Service read (%s)", async (_family, call) => {
    const cookie = fieldCookie();
    await expectForeignServiceDenied(cookie, async () => call(cookie));
  });

  it.each([
    ["start", startService, undefined],
    ["complete", completeService, undefined],
    ["record zone result", postZoneResult, { zoneId: "zone-real", status: "SERVICED" }],
    ["suspend", suspendService, { reason: "OTHER", note: "Acceso bloqueado." }],
    ["resume", resumeService, undefined],
  ] as const)("does not forward %s for another crew's Service", async (action, handler, body) => {
    const cookie = fieldCookie();
    const call = () => handler(new Request(`http://localhost/api/services/${serviceId}/${action}`, {
      method: "POST",
      headers: { cookie, ...(body ? { "content-type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }), params(serviceId));
    await expectForeignServiceDenied(cookie, call);
  });

  it("does not request a street closure for a Service assigned to another crew", async () => {
    const cookie = fieldCookie();
    const backendFetch = foreignServiceFetch();
    const response = await listClosures(new Request(`http://localhost/api/street-closure-requests?sourceId=${serviceId}`, { headers: { cookie } }));
    expect(response.status).toBe(403);
    expect(backendFetch.mock.calls.some(([url]) => String(url).includes("/street-closure-requests"))).toBe(false);
  });

  it("returns only the authenticated crew from the backend crew collection", async () => {
    const cookie = fieldCookie();
    const backendFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      expect(String(url)).toBe("https://backend.internal/crews/crew-own");
      return Response.json({ id: "crew-own", name: "Cuadrilla de la sesión", crewType: "MUNICIPAL", leaderUserId: "user-own", memberUserIds: ["user-own"], organizationId: "org-own", defaultShift: "MORNING", active: true });
    });
    const response = await listCrews(new Request("http://localhost/api/crews", { headers: { cookie } }));
    expect(response.status).toBe(200);
    expect((await response.json()).data.map((crew: { id: string }) => crew.id)).toEqual(["crew-own"]);
    expect(backendFetch).toHaveBeenCalledTimes(1);
  });

  it("filters backend EnvironmentalReports across pages without exposing unscoped totals", async () => {
    const cookie = fieldCookie();
    const foreignReport = { id: reportId, reportType: "AIR_EMISSION", address: null, description: null, ticketId: null, status: "RECEIVED", priority: "LOW", assignedCrewId: "crew-other", createdAt: "2026-10-01T12:00:00.000Z", updatedAt: "2026-10-01T12:00:00.000Z" };
    const ownReport = { ...foreignReport, id: "report-own", assignedCrewId: "crew-own" };
    const backendFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const page = new URL(String(url)).searchParams.get("page");
      return page === "1"
        ? Response.json({ data: [foreignReport], meta: { total: 2, page: 1, pageSize: 100, totalPages: 2 } })
        : Response.json({ data: [ownReport], meta: { total: 2, page: 2, pageSize: 100, totalPages: 2 } });
    });
    const response = await listReports(new Request("http://localhost/api/environmental-reports?page=1&pageSize=1", { headers: { cookie } }));
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result.data.map((report: { id: string }) => report.id)).toEqual(["report-own"]);
    expect(result.meta).toEqual({ total: 1, page: 1, pageSize: 1, totalPages: 1 });
    expect(backendFetch).toHaveBeenCalledTimes(2);
    expect(backendFetch.mock.calls.map(([url]) => String(url))).toEqual([
      "https://backend.internal/environmental-reports?page=1&pageSize=100",
      "https://backend.internal/environmental-reports?page=2&pageSize=100",
    ]);
  });

  it("hides a foreign EnvironmentalReport detail", async () => {
    const cookie = fieldCookie();
    const foreignReport = { id: reportId, reportType: "AIR_EMISSION", address: null, description: null, ticketId: null, status: "RECEIVED", priority: "LOW", assignedCrewId: "crew-other", createdAt: "2026-10-01T12:00:00.000Z", updatedAt: "2026-10-01T12:00:00.000Z" };
    const backendFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(foreignReport));
    const response = await getReport(new Request(`http://localhost/api/environmental-reports/${reportId}`, { headers: { cookie } }), params(reportId));
    expect(response.status).toBe(404);
    expect(backendFetch).toHaveBeenCalledTimes(1);
  });

  it("does not complete an inspection whose linked Service belongs to another crew", async () => {
    const cookie = fieldCookie();
    const backendFetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (url, init) => {
      if ((init?.method ?? "GET") === "GET" && String(url).includes(`/environmental-inspections/${inspectionId}`)) {
        return Response.json({ id: inspectionId, reportId, serviceId, createdAt: "2026-10-01T12:00:00.000Z", updatedAt: "2026-10-01T12:00:00.000Z" });
      }
      if ((init?.method ?? "GET") === "GET" && String(url).endsWith(`/services/${serviceId}`)) {
        return Response.json({ id: serviceId, crewId: "crew-other" });
      }
      return Response.json({ id: "unexpected-forward" }, { status: 201 });
    });
    const response = await completeInspection(new Request(`http://localhost/api/environmental-inspections/${inspectionId}/complete`, {
      method: "POST", headers: { cookie, "content-type": "application/json" },
      body: JSON.stringify({ inspectedAt: "2026-10-01T12:00:00.000Z", outcome: "NO_VIOLATION", conclusion: "No se observaron infracciones.", checklist: [{ id: "source", label: "Verificar la fuente", completed: true }] }),
    }), params(inspectionId));
    expect(response.status).toBe(403);
    expect(backendFetch.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });
});
