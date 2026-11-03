import { setupServer } from "msw/node";

import { createSessionCookie } from "@/test/session";
import type { M6Role } from "@/lib/m6-roles";
import type { ScenarioId } from "@/lib/scenarios";

export const integrationMonitorBackend = setupServer();

const backendOrigin = "https://backend.internal";

export function configureIntegrationMonitorBackend(): () => void {
  const keys = ["M6_AUTH_MODE", "M6_BACKEND_ORIGIN"] as const;
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.M6_AUTH_MODE = "real-m1";
  process.env.M6_BACKEND_ORIGIN = backendOrigin;

  return () => {
    for (const key of keys) {
      const value = previous[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
}

export function integrationMonitorCookie(
  scenarioId: ScenarioId = "office-duty-queue",
  roles?: readonly M6Role[],
): string {
  return createSessionCookie(scenarioId, {
    mode: "real-m1",
    backendOrigin,
    roles,
  });
}

export function integrationMonitorRequest(
  path: string,
  cookie?: string,
  init: RequestInit = {},
): Request {
  const headers = new Headers(init.headers);
  if (cookie) headers.set("cookie", cookie);
  return new Request(`http://localhost${path}`, { ...init, headers });
}

export function paginatedResponse(data: unknown[] = []) {
  return {
    data,
    meta: { total: data.length, page: 1, pageSize: 20, totalPages: data.length ? 1 : 0 },
  };
}

export const OUTBOX_EVENT_ID = "550e8400-e29b-41d4-a716-446655440000";
export const AGGREGATE_ID = "550e8400-e29b-41d4-a716-446655440001";

export const outboxEvent = {
  id: OUTBOX_EVENT_ID,
  eventType: "containerDamaged",
  aggregateType: "CONTAINER",
  aggregateId: AGGREGATE_ID,
  status: "FAILED",
  attempts: 5,
  lastError: "connect ECONNREFUSED 127.0.0.1:5672",
  occurredAt: "2026-10-28T14:30:00.000Z",
  publishedAt: null,
  correlationId: "550e8400-e29b-41d4-a716-446655440002",
  causationId: null,
};

export const outboxDetail = {
  ...outboxEvent,
  payload: { containerId: AGGREGATE_ID, severity: "HIGH" },
  retries: [],
};

export const auditEntry = {
  id: "550e8400-e29b-41d4-a716-446655440003",
  entityType: "CONTAINER",
  entityId: AGGREGATE_ID,
  action: "REPORT_DAMAGE",
  fromStatus: "ACTIVE",
  toStatus: "DAMAGED",
  actorUserId: "42",
  actorRoles: ["M6_ADMIN"],
  note: "Se informó un daño estructural.",
  occurredAt: "2026-10-28T14:30:00.000Z",
};
