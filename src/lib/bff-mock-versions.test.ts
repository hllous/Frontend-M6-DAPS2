import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as getContainer, PATCH as patchContainer } from "@/app/api/containers/[id]/route";
import { POST as reportOverflow } from "@/app/api/containers/[id]/report-overflow/route";
import { POST as startReview } from "@/app/api/environmental-reports/[id]/start-review/route";
import { ifMatchSatisfied, MOCK_SEED_UPDATED_AT } from "./bff-mock-versions";
import { getContainerFixture, resetContainerFixtures } from "./containers-fixtures";
import { resetEnvironmentalReportFixtures } from "./environmental-report-fixtures";
import { STALE_RECORD_MESSAGE } from "./record-versions";
import type { ScenarioId } from "./scenarios";
import { AUTH_COOKIE_NAME, createSession, sealSession } from "./session";

const seedEtag = `W/"${Date.parse(MOCK_SEED_UPDATED_AT)}"`;

function mockCookie(scenarioId: ScenarioId) {
  return `${AUTH_COOKIE_NAME}=${sealSession(createSession(scenarioId, { mode: "mock" }))}`;
}

function call(
  handler: (request: Request, context: { params: Promise<{ id: string }> }) => Promise<Response>,
  url: string,
  id: string,
  init: { method?: string; scenario?: ScenarioId; ifMatch?: string; body?: unknown } = {},
) {
  const headers: Record<string, string> = { cookie: mockCookie(init.scenario ?? "office-duty-queue") };
  if (init.ifMatch) headers["if-match"] = init.ifMatch;
  if (init.body !== undefined) headers["content-type"] = "application/json";
  return handler(
    new Request(`http://localhost${url}`, { method: init.method ?? "GET", headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) }),
    { params: Promise.resolve({ id }) },
  );
}

afterEach(() => {
  delete process.env.M6_AUTH_MODE;
  resetContainerFixtures();
  resetEnvironmentalReportFixtures();
  vi.restoreAllMocks();
});

describe("ifMatchSatisfied", () => {
  it.each([
    ['W/"1"', 'W/"1"', true],
    ['"1"', 'W/"1"', true],
    ['W/"2", W/"1"', 'W/"1"', true],
    ["*", 'W/"1"', true],
    ['W/"2"', 'W/"1"', false],
    ['W/"2"', undefined, false],
  ] as const)("If-Match %s against %s is %s", (ifMatch, etag, expected) => {
    expect(ifMatchSatisfied(ifMatch, etag)).toBe(expected);
  });
});

describe("mock-mode optimistic concurrency", () => {
  it("returns the ETag on GET /:id, derived from updatedAt like the backend", async () => {
    process.env.M6_AUTH_MODE = "mock";
    const response = await call(getContainer, "/api/containers/cont-1", "cont-1");
    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toBe(seedEtag);
    expect(await response.json()).toMatchObject({ id: "cont-1", updatedAt: MOCK_SEED_UPDATED_AT });
  });

  it("a second session with the old ETag gets 412 and nothing is written", async () => {
    process.env.M6_AUTH_MODE = "mock";
    const first = await call(reportOverflow, "/api/containers/cont-1/report-overflow", "cont-1", { method: "POST", scenario: "field-crew-leader-route", ifMatch: seedEtag });
    expect(first.status).toBe(200);
    const newEtag = first.headers.get("etag");
    expect(newEtag).not.toBe(seedEtag);
    const body = await first.json() as { updatedAt: string; status: string };
    expect(`W/"${Date.parse(body.updatedAt)}"`).toBe(newEtag);
    expect(body.status).toBe("OVERFLOWED");

    const before = structuredClone(getContainerFixture("cont-1"));
    const second = await call(patchContainer, "/api/containers/cont-1", "cont-1", { method: "PATCH", ifMatch: seedEtag, body: { address: "Otra dirección 123" } });
    expect(second.status).toBe(412);
    expect(await second.json()).toMatchObject({ statusCode: 412, code: "STALE_RECORD", message: STALE_RECORD_MESSAGE, error: "Precondition Failed" });
    expect(getContainerFixture("cont-1")).toEqual(before);

    const fresh = await call(patchContainer, "/api/containers/cont-1", "cont-1", { method: "PATCH", ifMatch: newEtag ?? "", body: { address: "Otra dirección 123" } });
    expect(fresh.status).toBe(200);
    expect(fresh.headers.get("etag")).not.toBe(newEtag);
  });

  it("without If-Match the write behaves as before", async () => {
    process.env.M6_AUTH_MODE = "mock";
    const response = await call(startReview, "/api/environmental-reports/ER-1001/start-review", "ER-1001", { method: "POST" });
    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toMatch(/^W\/"\d+"$/);
  });

  it("does not bump the version when the write fails", async () => {
    process.env.M6_AUTH_MODE = "mock";
    // ER-1004 está desestimado: start-review es una transición inválida (409).
    const response = await call(startReview, "/api/environmental-reports/ER-1004/start-review", "ER-1004", { method: "POST", ifMatch: `W/"${Date.parse("2026-09-05T14:20:00.000Z")}"` });
    expect(response.status).toBe(409);
    expect(response.headers.get("etag")).toBeNull();
  });
});
