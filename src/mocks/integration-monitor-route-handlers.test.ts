import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";

import { resetIntegrationMonitorFixtures } from "./integration-monitor-fixtures";
import { handlers } from "./handlers";
import { createSessionCookie } from "@/test/session";

const server = setupServer(...handlers);
const auditorCookie = createSessionCookie("office-limited-intake", { mode: "mock", roles: ["M6_AUDITOR"] });
const originalAuthMode = process.env.M6_AUTH_MODE;

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  process.env.M6_AUTH_MODE = "mock";
  resetIntegrationMonitorFixtures();
});
afterEach(() => server.resetHandlers());
afterAll(() => {
  server.close();
  if (originalAuthMode === undefined) delete process.env.M6_AUTH_MODE;
  else process.env.M6_AUTH_MODE = originalAuthMode;
});

async function call(path: string, options: { method?: string; cookie?: string; body?: unknown } = {}) {
  const headers = new Headers();
  if (options.cookie) headers.set("cookie", options.cookie);
  if (options.body !== undefined) headers.set("content-type", "application/json");
  return fetch(`http://localhost${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

describe("integration monitor mock handlers", () => {
  it("serves a paginated event list without payload and lets an administrator inspect and retry a failed event", async () => {
    const list = await call("/api/events/outbox?status=FAILED");
    const listBody = await list.json();
    expect(list.status).toBe(200);
    expect(listBody.data).toHaveLength(2);
    expect(listBody.data[0]).not.toHaveProperty("payload");

    const eventId = listBody.data.find((event: { eventType: string }) => event.eventType === "containerDamaged").id as string;
    const detail = await call(`/api/events/outbox/${eventId}`);
    expect(detail.status).toBe(200);
    expect(await detail.json()).toMatchObject({ payload: { containerId: expect.any(String) }, retries: [] });

    const retried = await call(`/api/events/outbox/${eventId}/retry`, { method: "POST" });
    expect(retried.status).toBe(200);
    expect(await retried.json()).toMatchObject({ status: "PENDING", attempts: 0, lastError: null });
    const refreshed = await call(`/api/events/outbox/${eventId}`);
    expect(await refreshed.json()).toMatchObject({ retries: [expect.objectContaining({ actorUserId: "user-lucia", previousAttempts: 5 })] });
  });

  it("keeps payload and retry controls unavailable to an auditor", async () => {
    const list = await call("/api/events/outbox", { cookie: auditorCookie });
    const [event] = (await list.json()).data as Array<{ id: string }>;
    const detail = await call(`/api/events/outbox/${event.id}`, { cookie: auditorCookie });
    const retry = await call(`/api/events/outbox/${event.id}/retry`, { method: "POST", cookie: auditorCookie });

    expect(list.status).toBe(200);
    expect(detail.status).toBe(403);
    expect(retry.status).toBe(403);
  });

  it("returns the bulk retry result and filters the activity log by entity", async () => {
    const bulk = await call("/api/events/outbox/retry-failed", {
      method: "POST", body: { confirm: true, limit: 1 },
    });
    expect(bulk.status).toBe(200);
    expect(await bulk.json()).toEqual({ requeued: 1, remainingFailed: 1 });

    const activity = await call("/api/audit?entityType=CONTAINER&entityId=550e8400-e29b-41d4-a716-446655440001");
    expect(activity.status).toBe(200);
    expect((await activity.json()).data).toEqual([
      expect.objectContaining({ entityType: "CONTAINER", entityId: "550e8400-e29b-41d4-a716-446655440001" }),
    ]);
  });
});
