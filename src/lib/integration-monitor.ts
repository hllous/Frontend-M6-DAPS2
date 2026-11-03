import { z } from "zod";

export const OUTBOX_STATUSES = ["PENDING", "SENT", "FAILED"] as const;

export const AUDIT_ENTITY_TYPES = [
  "CONTAINER",
  "ENVIRONMENTAL_REPORT",
  "ENVIRONMENTAL_INSPECTION",
  "VIOLATION_NOTICE",
  "REPAIR_REQUEST",
  "STREET_CLOSURE_REQUEST",
  "TREE_INTERVENTION",
  "SERVICE",
  "CREW",
  "ZONE",
  "VEHICLE",
  "ROUTE",
] as const;

const dateTimeSchema = z.string().datetime({ offset: true });
const dateOnlySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(`${value}T`);
}, "La fecha debe ser válida y usar el formato AAAA-MM-DD.");

export const outboxEventSchema = z.object({
  id: z.string().uuid(),
  eventType: z.string(),
  aggregateType: z.string(),
  aggregateId: z.string().uuid(),
  status: z.enum(OUTBOX_STATUSES),
  attempts: z.number().int().nonnegative(),
  lastError: z.string().nullable(),
  occurredAt: dateTimeSchema,
  publishedAt: dateTimeSchema.nullable(),
  correlationId: z.string().uuid(),
  causationId: z.string().uuid().nullable(),
});

export const outboxDetailSchema = outboxEventSchema.extend({
  payload: z.record(z.string(), z.unknown()),
  retries: z.array(z.object({
    id: z.string().uuid(),
    actorUserId: z.string(),
    at: dateTimeSchema,
    previousAttempts: z.number().int().nonnegative(),
    previousError: z.string().nullable(),
  })),
});

const paginationMetaSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive().max(100),
  totalPages: z.number().int().nonnegative(),
});

export const outboxPageSchema = z.object({ data: z.array(outboxEventSchema), meta: paginationMetaSchema });
export const auditEntrySchema = z.object({
  id: z.string().uuid(),
  entityType: z.enum(AUDIT_ENTITY_TYPES),
  entityId: z.string().uuid(),
  action: z.string(),
  fromStatus: z.string().nullable(),
  toStatus: z.string().nullable(),
  actorUserId: z.string(),
  actorRoles: z.array(z.string()),
  note: z.string().nullable(),
  occurredAt: dateTimeSchema,
});
export const auditPageSchema = z.object({ data: z.array(auditEntrySchema), meta: paginationMetaSchema });
export const retryFailedResponseSchema = z.object({
  requeued: z.number().int().nonnegative(),
  remainingFailed: z.number().int().nonnegative(),
});

export const outboxQuerySchema = z.object({
  status: z.enum(OUTBOX_STATUSES).optional(),
  eventType: z.string().max(100).optional(),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
}).refine(({ from, to }) => !from || !to || from <= to, {
  message: "La fecha inicial no puede ser posterior a la fecha final.",
  path: ["to"],
});

export const auditQuerySchema = z.object({
  entityType: z.enum(AUDIT_ENTITY_TYPES).optional(),
  entityId: z.string().uuid().optional(),
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

export const retryFailedInputSchema = z.object({
  confirm: z.literal(true),
  limit: z.number().int().min(1).max(100).optional(),
});

export type OutboxEvent = z.infer<typeof outboxEventSchema>;
export type OutboxDetail = z.infer<typeof outboxDetailSchema>;
export type AuditEntry = z.infer<typeof auditEntrySchema>;
export type OutboxPage = z.infer<typeof outboxPageSchema>;
export type AuditPage = z.infer<typeof auditPageSchema>;
export type OutboxQuery = z.infer<typeof outboxQuerySchema>;
export type AuditQuery = z.infer<typeof auditQuerySchema>;

/** El backend compara días inclusivos en hora argentina. */
export function argentineDate(value: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function pageSlice<T>(records: readonly T[], page = 1, pageSize = 20) {
  const start = (page - 1) * pageSize;
  return {
    data: records.slice(start, start + pageSize),
    meta: {
      total: records.length,
      page,
      pageSize,
      totalPages: Math.ceil(records.length / pageSize),
    },
  };
}
