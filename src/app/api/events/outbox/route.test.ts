import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { GET as getList } from "./route";
import { GET as getDetail } from "./[id]/route";
import { POST as retryOne } from "./[id]/retry/route";
import { POST as retryFailed } from "./retry-failed/route";
import {
  configureIntegrationMonitorBackend,
  integrationMonitorBackend as server,
  integrationMonitorCookie,
  integrationMonitorRequest as request,
  OUTBOX_EVENT_ID,
  outboxDetail,
  outboxEvent,
  paginatedResponse,
} from "@/test/integration-monitor-backend";

let restoreEnvironment: () => void;

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => { restoreEnvironment = configureIntegrationMonitorBackend(); });
afterEach(() => {
  server.resetHandlers();
  restoreEnvironment();
});
afterAll(() => server.close());

const adminCookie = () => integrationMonitorCookie();
const auditorCookie = () => integrationMonitorCookie("office-limited-intake", ["M6_AUDITOR"]);
const deniedCookie = () => integrationMonitorCookie("field-crew-leader-route", ["M6_CAMPO_CUADRILLA"]);
const context = (id: string) => ({ params: Promise.resolve({ id }) });

describe("outbox list BFF route", () => {
  it("requires a session", async () => {
    const response = await getList(request("/api/events/outbox"));
    expect(response.status).toBe(401);
  });

  it("allows auditors and forwards documented filters to the backend", async () => {
    let forwardedUrl = "";
    let authorization = "";
    server.use(http.get("https://backend.internal/events/outbox", ({ request: backendRequest }) => {
      forwardedUrl = backendRequest.url;
      authorization = backendRequest.headers.get("authorization") ?? "";
      return HttpResponse.json(paginatedResponse([outboxEvent]));
    }));

    const response = await getList(request(
      "/api/events/outbox?status=FAILED&eventType=containerDamaged&from=2026-10-01&to=2026-10-31&page=2&pageSize=10",
      auditorCookie(),
    ));

    expect(response.status).toBe(200);
    expect(new URL(forwardedUrl).searchParams.get("status")).toBe("FAILED");
    expect(new URL(forwardedUrl).searchParams.get("eventType")).toBe("containerDamaged");
    expect(new URL(forwardedUrl).searchParams.get("from")).toBe("2026-10-01");
    expect(new URL(forwardedUrl).searchParams.get("to")).toBe("2026-10-31");
    expect(new URL(forwardedUrl).searchParams.get("pageSize")).toBe("10");
    expect(authorization).toMatch(/^Bearer /);
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("rejects an invalid status or reversed date range before calling the backend", async () => {
    const invalidStatus = await getList(request("/api/events/outbox?status=REJECTED", adminCookie()));
    const invalidRange = await getList(request("/api/events/outbox?from=2026-10-31&to=2026-10-01", adminCookie()));
    expect(invalidStatus.status).toBe(400);
    expect(invalidRange.status).toBe(400);
  });

  it("denies roles without monitor access", async () => {
    const response = await getList(request("/api/events/outbox", deniedCookie()));
    expect(response.status).toBe(403);
  });
});

describe("outbox detail BFF route", () => {
  it("requires a session and rejects an invalid event id", async () => {
    const noSession = await getDetail(request(`/api/events/outbox/${OUTBOX_EVENT_ID}`), context(OUTBOX_EVENT_ID));
    const invalidId = await getDetail(request("/api/events/outbox/not-a-uuid", adminCookie()), context("not-a-uuid"));

    expect(noSession.status).toBe(401);
    expect(invalidId.status).toBe(400);
  });

  it("returns payload details only to an administrator and never caches them", async () => {
    server.use(http.get(`https://backend.internal/events/outbox/${OUTBOX_EVENT_ID}`, () => HttpResponse.json(outboxDetail)));
    const response = await getDetail(request(`/api/events/outbox/${OUTBOX_EVENT_ID}`, adminCookie()), context(OUTBOX_EVENT_ID));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ payload: outboxDetail.payload, retries: [] });
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("denies an auditor and forwards a backend 404", async () => {
    const denied = await getDetail(request(`/api/events/outbox/${OUTBOX_EVENT_ID}`, auditorCookie()), context(OUTBOX_EVENT_ID));
    server.use(http.get(`https://backend.internal/events/outbox/${OUTBOX_EVENT_ID}`, () => HttpResponse.json({ statusCode: 404, message: "No existe", error: "Not Found", timestamp: "2026-10-28T14:30:00.000Z", path: `/events/outbox/${OUTBOX_EVENT_ID}` }, { status: 404 })));
    const missing = await getDetail(request(`/api/events/outbox/${OUTBOX_EVENT_ID}`, adminCookie()), context(OUTBOX_EVENT_ID));

    expect(denied.status).toBe(403);
    expect(missing.status).toBe(404);
  });
});

describe("single outbox retry BFF route", () => {
  it("requires a session and rejects an invalid event id", async () => {
    const noSession = await retryOne(request(`/api/events/outbox/${OUTBOX_EVENT_ID}/retry`, undefined, { method: "POST" }), context(OUTBOX_EVENT_ID));
    const invalidId = await retryOne(request("/api/events/outbox/not-a-uuid/retry", adminCookie(), { method: "POST" }), context("not-a-uuid"));

    expect(noSession.status).toBe(401);
    expect(invalidId.status).toBe(400);
  });

  it("retries a failed event for an administrator", async () => {
    let method = "";
    server.use(http.post(`https://backend.internal/events/outbox/${OUTBOX_EVENT_ID}/retry`, ({ request: backendRequest }) => {
      method = backendRequest.method;
      return HttpResponse.json({ ...outboxEvent, status: "PENDING", attempts: 0, lastError: null });
    }));
    const response = await retryOne(request(`/api/events/outbox/${OUTBOX_EVENT_ID}/retry`, adminCookie(), { method: "POST" }), context(OUTBOX_EVENT_ID));

    expect(response.status).toBe(200);
    expect(method).toBe("POST");
    expect(await response.json()).toMatchObject({ status: "PENDING", attempts: 0 });
  });

  it("denies an auditor and preserves a backend conflict", async () => {
    const denied = await retryOne(request(`/api/events/outbox/${OUTBOX_EVENT_ID}/retry`, auditorCookie(), { method: "POST" }), context(OUTBOX_EVENT_ID));
    server.use(http.post(`https://backend.internal/events/outbox/${OUTBOX_EVENT_ID}/retry`, () => HttpResponse.json({ statusCode: 409, message: "El evento ya cambió", error: "Conflict", timestamp: "2026-10-28T14:30:00.000Z", path: `/events/outbox/${OUTBOX_EVENT_ID}/retry` }, { status: 409 })));
    const conflict = await retryOne(request(`/api/events/outbox/${OUTBOX_EVENT_ID}/retry`, adminCookie(), { method: "POST" }), context(OUTBOX_EVENT_ID));

    expect(denied.status).toBe(403);
    expect(conflict.status).toBe(409);
  });
});

describe("bulk outbox retry BFF route", () => {
  it("requires a session", async () => {
    const response = await retryFailed(request("/api/events/outbox/retry-failed", undefined, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: true, limit: 20 }),
    }));
    expect(response.status).toBe(401);
  });

  it("forwards explicit confirmation and a bounded limit", async () => {
    let body: unknown;
    server.use(http.post("https://backend.internal/events/outbox/retry-failed", async ({ request: backendRequest }) => {
      body = await backendRequest.json();
      return HttpResponse.json({ requeued: 12, remainingFailed: 3 });
    }));
    const response = await retryFailed(request("/api/events/outbox/retry-failed", adminCookie(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ confirm: true, limit: 20 }),
    }));

    expect(response.status).toBe(200);
    expect(body).toEqual({ confirm: true, limit: 20 });
    expect(await response.json()).toEqual({ requeued: 12, remainingFailed: 3 });
  });

  it("rejects invalid confirmation and denies an auditor", async () => {
    const invalid = await retryFailed(request("/api/events/outbox/retry-failed", adminCookie(), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: false, limit: 101 }),
    }));
    const denied = await retryFailed(request("/api/events/outbox/retry-failed", auditorCookie(), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: true, limit: 20 }),
    }));

    expect(invalid.status).toBe(400);
    expect(denied.status).toBe(403);
  });

  it("preserves a backend conflict when another retry is in progress", async () => {
    server.use(http.post("https://backend.internal/events/outbox/retry-failed", () => HttpResponse.json({
      statusCode: 409,
      message: "Ya hay un reintento en curso",
      error: "Conflict",
      timestamp: "2026-10-28T14:30:00.000Z",
      path: "/events/outbox/retry-failed",
    }, { status: 409 })));
    const response = await retryFailed(request("/api/events/outbox/retry-failed", adminCookie(), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ confirm: true, limit: 20 }),
    }));

    expect(response.status).toBe(409);
  });
});
