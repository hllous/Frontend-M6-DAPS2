import { randomUUID } from "node:crypto";

import { argentineDate, pageSlice, type AuditEntry, type OutboxDetail, type OutboxEvent, type OutboxQuery, type AuditQuery, type InboxEvent, type InboxQuery } from "@/lib/integration-monitor";

const initialEvents: OutboxDetail[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440000",
    eventType: "containerDamaged",
    aggregateType: "CONTAINER",
    aggregateId: "550e8400-e29b-41d4-a716-446655440001",
    status: "FAILED",
    attempts: 5,
    lastError: "connect ECONNREFUSED 127.0.0.1:5672",
    occurredAt: "2026-10-28T14:30:00.000Z",
    publishedAt: null,
    correlationId: "550e8400-e29b-41d4-a716-446655440002",
    causationId: null,
    payload: { containerId: "550e8400-e29b-41d4-a716-446655440001", damageType: "STRUCTURAL", severity: "HIGH" },
    retries: [],
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440010",
    eventType: "streetClosureRequested",
    aggregateType: "STREET_CLOSURE_REQUEST",
    aggregateId: "550e8400-e29b-41d4-a716-446655440011",
    status: "PENDING",
    attempts: 1,
    lastError: null,
    occurredAt: "2026-10-29T13:10:00.000Z",
    publishedAt: null,
    correlationId: "550e8400-e29b-41d4-a716-446655440012",
    causationId: null,
    payload: { requestId: "550e8400-e29b-41d4-a716-446655440011", sourceModule: "M6" },
    retries: [],
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440020",
    eventType: "serviceCompleted",
    aggregateType: "SERVICE",
    aggregateId: "550e8400-e29b-41d4-a716-446655440021",
    status: "SENT",
    attempts: 1,
    lastError: null,
    occurredAt: "2026-10-30T15:45:00.000Z",
    publishedAt: "2026-10-30T15:45:02.000Z",
    correlationId: "550e8400-e29b-41d4-a716-446655440022",
    causationId: null,
    payload: { serviceId: "550e8400-e29b-41d4-a716-446655440021", status: "COMPLETED" },
    retries: [],
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440030",
    eventType: "environmentalReportReceived",
    aggregateType: "ENVIRONMENTAL_REPORT",
    aggregateId: "550e8400-e29b-41d4-a716-446655440031",
    status: "FAILED",
    attempts: 5,
    lastError: "El receptor rechazó el contenido del evento.",
    occurredAt: "2026-10-31T12:05:00.000Z",
    publishedAt: null,
    correlationId: "550e8400-e29b-41d4-a716-446655440032",
    causationId: null,
    payload: { reportId: "550e8400-e29b-41d4-a716-446655440031", reportType: "NOISE" },
    retries: [
      {
        id: "550e8400-e29b-41d4-a716-446655440033",
        actorUserId: "42",
        at: "2026-10-31T12:30:00.000Z",
        previousAttempts: 5,
        previousError: "El receptor rechazó el contenido del evento.",
      },
    ],
  },
];

const initialAudit: AuditEntry[] = [
  {
    id: "650e8400-e29b-41d4-a716-446655440000",
    entityType: "CONTAINER",
    entityId: "550e8400-e29b-41d4-a716-446655440001",
    action: "REPORT_DAMAGE",
    fromStatus: "ACTIVE",
    toStatus: "DAMAGED",
    actorUserId: "42",
    actorRoles: ["M6_ADMIN"],
    note: "Se informó un daño estructural.",
    occurredAt: "2026-10-31T12:00:00.000Z",
  },
  {
    id: "650e8400-e29b-41d4-a716-446655440010",
    entityType: "SERVICE",
    entityId: "550e8400-e29b-41d4-a716-446655440021",
    action: "COMPLETE_SERVICE",
    fromStatus: "IN_PROGRESS",
    toStatus: "COMPLETED",
    actorUserId: "73",
    actorRoles: ["M6_CAMPO_CUADRILLA"],
    note: null,
    occurredAt: "2026-10-30T15:45:00.000Z",
  },
  {
    id: "650e8400-e29b-41d4-a716-446655440020",
    entityType: "ENVIRONMENTAL_REPORT",
    entityId: "550e8400-e29b-41d4-a716-446655440031",
    action: "START_REVIEW",
    fromStatus: "RECEIVED",
    toStatus: "UNDER_REVIEW",
    actorUserId: "42",
    actorRoles: ["M6_ADMIN"],
    note: "Revisión inicial.",
    occurredAt: "2026-10-29T13:10:00.000Z",
  },
  {
    id: "650e8400-e29b-41d4-a716-446655440030",
    entityType: "CONTAINER",
    entityId: "550e8400-e29b-41d4-a716-446655440002",
    action: "CREATE",
    fromStatus: null,
    toStatus: "ACTIVE",
    actorUserId: "42",
    actorRoles: ["M6_ADMIN"],
    note: null,
    occurredAt: "2026-10-28T10:00:00.000Z",
  },
  {
    id: "650e8400-e29b-41d4-a716-446655440040",
    entityType: "STREET_CLOSURE_REQUEST",
    entityId: "550e8400-e29b-41d4-a716-446655440041",
    action: "ARCHIVE_RECORD",
    fromStatus: "REQUESTED",
    toStatus: "PAUSED_BY_CITY",
    actorUserId: "42",
    actorRoles: ["M6_ADMIN"],
    note: null,
    occurredAt: "2026-10-27T10:00:00.000Z",
  },
  {
    id: "650e8400-e29b-41d4-a716-446655440050",
    entityType: "REPAIR_REQUEST",
    entityId: "550e8400-e29b-41d4-a716-446655440051",
    action: "CLOSE",
    fromStatus: "IN_PROGRESS",
    toStatus: "CLOSED",
    actorUserId: "system:m3",
    actorRoles: [],
    note: null,
    occurredAt: "2026-11-05T18:20:01.000Z",
  },
];

const initialInbox: InboxEvent[] = [
  {
    messageId: "750e8400-e29b-41d4-a716-446655440000",
    eventType: "workOrderCompleted",
    sourceModule: "obras",
    status: "processed",
    receivedAt: "2026-11-05T18:20:00.000Z",
    processedAt: "2026-11-05T18:20:01.000Z",
    occurredAt: "2026-11-05T18:19:58.000Z",
    correlationId: "550e8400-e29b-41d4-a716-446655440102",
    error: null,
  },
  {
    messageId: "750e8400-e29b-41d4-a716-446655440010",
    eventType: "streetClosureApproved",
    sourceModule: "transito",
    status: "failed",
    receivedAt: "2026-11-05T16:05:00.000Z",
    processedAt: null,
    occurredAt: "2026-11-05T16:04:55.000Z",
    correlationId: "550e8400-e29b-41d4-a716-446655440112",
    error: "closureRequestId inexistente",
  },
  {
    messageId: "750e8400-e29b-41d4-a716-446655440020",
    eventType: "ticketUpdated",
    sourceModule: "tickets",
    status: "pending",
    receivedAt: "2026-11-04T12:00:00.000Z",
    processedAt: null,
    occurredAt: null,
    correlationId: null,
    error: null,
  },
];

let eventDetails: OutboxDetail[] = structuredClone(initialEvents);
let auditEntries: AuditEntry[] = structuredClone(initialAudit);

export function resetIntegrationMonitorFixtures() {
  eventDetails = structuredClone(initialEvents);
  auditEntries = structuredClone(initialAudit);
}

export function listOutboxFixtures(query: OutboxQuery) {
  const filtered = eventDetails
    .filter((event) => !query.status || event.status === query.status)
    .filter((event) => !query.eventType || event.eventType === query.eventType)
    .filter((event) => !query.from || argentineDate(event.occurredAt) >= query.from)
    .filter((event) => !query.to || argentineDate(event.occurredAt) <= query.to)
    .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt))
    .map(({ payload: _payload, retries: _retries, ...event }) => event);
  return pageSlice(filtered, query.page, query.pageSize);
}

export function getOutboxFixture(id: string): OutboxDetail | null {
  const event = eventDetails.find((candidate) => candidate.id === id);
  return event ? structuredClone(event) : null;
}

export function retryOutboxFixture(id: string, actorUserId: string, at = new Date().toISOString()): OutboxEvent | null {
  const detail = eventDetails.find((candidate) => candidate.id === id);
  if (!detail || detail.status !== "FAILED") return null;

  detail.retries.push({
    id: randomUUID(),
    actorUserId,
    at,
    previousAttempts: detail.attempts,
    previousError: detail.lastError,
  });
  detail.status = "PENDING";
  detail.attempts = 0;
  detail.lastError = null;
  detail.publishedAt = null;
  const { payload: _payload, retries: _retries, ...event } = detail;
  return structuredClone(event);
}

export function retryFailedOutboxFixtures(limit: number, actorUserId: string) {
  const oldestFailed = eventDetails
    .filter((event) => event.status === "FAILED")
    .sort((left, right) => Date.parse(left.occurredAt) - Date.parse(right.occurredAt))
    .slice(0, limit);
  for (const event of oldestFailed) retryOutboxFixture(event.id, actorUserId);
  return {
    requeued: oldestFailed.length,
    remainingFailed: eventDetails.filter((event) => event.status === "FAILED").length,
  };
}

export function listAuditFixtures(query: AuditQuery) {
  const filtered = auditEntries
    .filter((entry) => !query.entityType || entry.entityType === query.entityType)
    .filter((entry) => !query.entityId || entry.entityId === query.entityId)
    .sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt));
  return pageSlice(filtered, query.page, query.pageSize);
}

export function listInboxFixtures(query: InboxQuery) {
  const filtered = initialInbox
    .filter((event) => !query.status || event.status === query.status)
    .filter((event) => !query.eventType || event.eventType === query.eventType)
    .filter((event) => !query.sourceModule || event.sourceModule === query.sourceModule)
    .filter((event) => !query.from || argentineDate(event.receivedAt) >= query.from)
    .filter((event) => !query.to || argentineDate(event.receivedAt) <= query.to)
    .sort((left, right) => Date.parse(right.receivedAt) - Date.parse(left.receivedAt));
  return pageSlice(filtered, query.page, query.pageSize);
}
