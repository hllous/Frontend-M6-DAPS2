import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";

import { resetEnvironmentalReportFixtures, ingestSanctionOutcomeFixture } from "@/lib/environmental-report-fixtures";
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
