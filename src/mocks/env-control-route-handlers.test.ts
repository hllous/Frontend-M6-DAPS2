import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";

import { resetEnvironmentalReportFixtures, ingestSanctionOutcomeFixture, getEnvironmentalReportFixture, environmentalReportFixtures } from "@/lib/environmental-report-fixtures";
import { SESSION_MUTATION_HEADERS } from "@/lib/session-request";
import { createSessionCookie } from "@/test/session";

import { handlers } from "./handlers";

const server = setupServer(...handlers);

const officeCookie = createSessionCookie("office-duty-queue", { mode: "mock" });
const crewCookie = createSessionCookie("field-crew-leader-route", { mode: "mock" });
const limitedOfficeCookie = createSessionCookie("office-limited-intake", { mode: "mock" });

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

  it("rejects an Office session without the capability on the indicator dashboards with the real 403", async () => {
    const response = await call("GET", "/api/indicators/coverage", limitedOfficeCookie);

    expect(response.status).toBe(403);
  });

  it("serves the referral list and a real 404 for an unknown referral", async () => {
    const list = await (await call("GET", "/api/referrals")).json();
    expect(list.meta.total).toBe(list.data.length);
    const missing = await call("GET", "/api/referrals/REF-UNKNOWN");
    expect(missing.status).toBe(404);
  });
});
