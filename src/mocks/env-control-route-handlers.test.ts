import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";

import { resetEnvironmentalReportFixtures, ingestSanctionOutcomeFixture, getEnvironmentalReportFixture, environmentalReportFixtures, updateEnvironmentalInspectionFixture, updateEnvironmentalReportFixture } from "@/lib/environmental-report-fixtures";
import type { EnvironmentalReportType } from "@/lib/environmental-reports";
import { resetServiceFixtures, updateServiceFixture } from "@/lib/services-fixtures";
import { SESSION_MUTATION_HEADERS } from "@/lib/session-request";
import { createSessionCookie } from "@/test/session";

import { handlers } from "./handlers";

const server = setupServer(...handlers);

const officeCookie = createSessionCookie("office-duty-queue", { mode: "mock" });
const crewCookie = createSessionCookie("field-crew-leader-route", { mode: "mock" });
const noRolesCookie = createSessionCookie("office-limited-intake", { mode: "mock", roles: [] });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => { server.resetHandlers(); resetEnvironmentalReportFixtures(); });
afterAll(() => server.close());

function call(method: string, path: string, cookie?: string, body?: unknown) {
  return fetch(`http://localhost${path}`, {
    method,
    headers: { ...(method === "GET" ? {} : SESSION_MUTATION_HEADERS), ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

describe("environmental control handlers delegate to the real BFF routes", () => {
  it.each([
    ["from=2026-09-06", ["ER-1001", "ER-1002", "ER-1003", "ER-1012"]],
    ["to=2026-08-31", ["ER-1011"]],
    ["from=2026-09-07&to=2026-09-08", []],
  ])("supports open and empty ranges: %s", async (query, ids) => {
    const response = await call("GET", `/api/environmental-reports?${query}`, officeCookie);
    const payload = await response.json();
    expect(payload.data.map((report: { id: string }) => report.id)).toEqual(ids);
    expect(payload.meta.total).toBe(ids.length);
  });

  it.each([
    "from=2026-09-07&to=2026-09-06",
    "from=2026-02-30",
    "to=06/09/2026",
  ])("rejects invalid calendar ranges: %s", async (query) => {
    const response = await call("GET", `/api/environmental-reports?${query}`, officeCookie);
    expect(response.status).toBe(400);
  });

  it("filters by inclusive Argentine updatedAt days before pagination", async () => {
    for (const report of environmentalReportFixtures) report.updatedAt = "2026-09-01T12:00:00Z";
    Object.assign(getEnvironmentalReportFixture("ER-1001")!, { createdAt: "2026-09-01T12:00:00Z", updatedAt: "2026-09-07T02:59:59.999Z" });
    Object.assign(getEnvironmentalReportFixture("ER-1002")!, { updatedAt: "2026-09-06T02:59:59.999Z" });
    Object.assign(getEnvironmentalReportFixture("ER-1003")!, { updatedAt: "2026-09-06T03:00:00.000Z" });
    const response = await call("GET", "/api/environmental-reports?from=2026-09-06&to=2026-09-06&pageSize=1", officeCookie);
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.meta).toMatchObject({ total: 2, totalPages: 2 });
    expect(payload.data.map((report: { id: string }) => report.id)).toEqual(["ER-1001"]);
    const second = await (await call("GET", "/api/environmental-reports?from=2026-09-06&to=2026-09-06&pageSize=1&page=2", officeCookie)).json();
    expect(second.data.map((report: { id: string }) => report.id)).toEqual(["ER-1003"]);
  });

  it("filters by several statuses as OR before pagination", async () => {
    const first = await call("GET", "/api/environmental-reports?status=RECEIVED&status=UNDER_REVIEW&pageSize=2", officeCookie);
    const payload = await first.json();
    expect(payload.data.map((report: { id: string }) => report.id)).toEqual(["ER-1001", "ER-1002"]);
    expect(payload.meta).toMatchObject({ total: 3, pageSize: 2, totalPages: 2 });

    const second = await call("GET", "/api/environmental-reports?status=RECEIVED&status=UNDER_REVIEW&pageSize=2&page=2", officeCookie);
    expect((await second.json()).data.map((report: { id: string }) => report.id)).toEqual(["ER-1013"]);
  });

  it("lists reports for Office with the M4 integration exceptions, and not for a crew session", async () => {
    ingestSanctionOutcomeFixture({
      violationNoticeId: "NOTICE-UNKNOWN",
      decision: "CLOSURE_ORDERED",
      decidedAt: "2026-09-08T10:00:00.000Z",
      externalRef: "M4-CLOSURE-UNKNOWN",
    });

    const office = await (await call("GET", "/api/environmental-reports")).json();
    expect(office.sanctionOutcomeIntegrationExceptions).toEqual([
      expect.objectContaining({ violationNoticeId: "NOTICE-UNKNOWN", externalRef: "M4-CLOSURE-UNKNOWN" }),
    ]);

    const crew = await (await call("GET", "/api/environmental-reports", crewCookie)).json();
    expect(crew.sanctionOutcomeIntegrationExceptions).toBeUndefined();
  });

  it("rejects a Field crew session starting a report review with the real 403", async () => {
    const response = await call("POST", "/api/environmental-reports/ER-1001/start-review", crewCookie);

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ statusCode: 403 });
  });

  it("rejects Office completing an inspection with the real 403", async () => {
    const response = await call("POST", "/api/environmental-inspections/INS-1005/complete", officeCookie, {});

    expect(response.status).toBe(403);
  });

  it("rejects a Field crew session issuing a violation notice with the real 403", async () => {
    const response = await call("POST", "/api/environmental-inspections/INS-1005/violation-notice", crewCookie, {});

    expect(response.status).toBe(403);
  });

  it("rejects a session with no M6 role on the indicator dashboards with the real 403", async () => {
    const response = await call("GET", "/api/indicators/coverage", noRolesCookie);

    expect(response.status).toBe(403);
  });

  it("serves the referral list and a real 404 for an unknown referral", async () => {
    const list = await (await call("GET", "/api/referrals")).json();
    expect(list.meta.total).toBe(list.data.length);
    const missing = await call("GET", "/api/referrals/REF-UNKNOWN");
    expect(missing.status).toBe(404);
  });
});

// #733: the mock mirrors the backend matrix (Backend-M6-DAPS2#451) when an inspection is completed.
describe("completing an inspection recomputes its allowed actions like the backend", () => {
  const evidence = [{ id: "att-t", url: "/mock/evidence/t.jpg", filename: "t.jpg", contentType: "image/jpeg", uploadedAt: "2026-09-05T10:00:00.000Z" }];
  const checklist = [
    { id: "emission-source", label: "Identificar la fuente de emisión", completed: true },
    { id: "visible-impact", label: "Registrar el impacto visible", completed: true },
  ];
  const violation = { outcome: "VIOLATION_FOUND", nextStep: "NOTICE_TO_BE_ISSUED", findings: "Hallazgo.", violationType: "ILLEGAL_DUMPING", severity: "HIGH", suggestedAction: "FORMAL_NOTICE" };

  afterEach(() => resetServiceFixtures());

  async function complete(reportType: EnvironmentalReportType, body: Record<string, unknown>) {
    updateEnvironmentalReportFixture("ER-1005", { reportType });
    updateServiceFixture("SVC-1072", { crewId: "crew-b", status: "IN_PROGRESS" });
    updateEnvironmentalInspectionFixture("INS-1005", { attachments: evidence });
    const response = await call("POST", "/api/environmental-inspections/INS-1005/complete", crewCookie, { inspectedAt: new Date().toISOString(), checklist, ...body });
    expect(response.status).toBe(200);
    return (await response.json()).allowedActions;
  }

  it.each([
    ["ILLEGAL_DUMPSITE", violation, { repair: true, notice: true, suggestedViolationType: "ILLEGAL_DUMPING" }],
    ["ODOR", violation, { repair: false, notice: true, suggestedViolationType: null }],
    ["ILLEGAL_DUMPSITE", { outcome: "INCONCLUSIVE", conclusion: "No se pudo constatar." }, { repair: true, notice: false, suggestedViolationType: null }],
    ["ILLEGAL_DUMPSITE", { outcome: "NO_VIOLATION", conclusion: "Sin infracción." }, { repair: false, notice: false, suggestedViolationType: null }],
  ] as const)("%s with %j gives %j", async (reportType, body, expected) => {
    expect(await complete(reportType, body)).toEqual(expected);
  });
});
