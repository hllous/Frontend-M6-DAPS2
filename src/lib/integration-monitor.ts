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
  "SANCTION_OUTCOME",
] as const;

export const INBOX_STATUSES = ["processed", "failed", "pending"] as const;

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

export const inboxEventSchema = z.object({
  messageId: z.string(),
  eventType: z.string(),
  sourceModule: z.string().nullable().optional(),
  status: z.enum(INBOX_STATUSES),
  receivedAt: dateTimeSchema,
  processedAt: dateTimeSchema.nullable().optional(),
  occurredAt: dateTimeSchema.nullable().optional(),
  correlationId: z.string().nullable().optional(),
  error: z.string().nullable().optional(),
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

export const inboxPageSchema = z.object({ data: z.array(inboxEventSchema), meta: paginationMetaSchema });

export const inboxQuerySchema = z.object({
  status: z.enum(INBOX_STATUSES).optional(),
  eventType: z.string().max(100).optional(),
  sourceModule: z.string().max(100).optional(),
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
export type InboxEvent = z.infer<typeof inboxEventSchema>;
export type InboxPage = z.infer<typeof inboxPageSchema>;
export type InboxQuery = z.infer<typeof inboxQuerySchema>;
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

// Áreas que escriben en el registro o emiten eventos a M6, nombradas por lo que hacen (DESIGN.md: sin códigos de módulo en pantalla).
// `system:<módulo>` es el actor de sistema de Backend #516; `sourceModule` es el nombre del módulo en el sobre del Core.
const SYSTEM_ACTOR_AREAS: Record<string, string> = {
  m2: "Reclamos",
  m3: "Obras Públicas",
  m4: "Faltas",
  m7: "Tránsito",
  weather: "Alerta meteorológica",
};

const SOURCE_MODULE_AREAS: Record<string, string> = {
  tickets: "Reclamos",
  obras: "Obras Públicas",
  transito: "Tránsito",
  ambiente: "Control ambiental",
  m6: "Control ambiental",
};

export const UNKNOWN_AREA_LABEL = "Otra área";

/** "Sistema · Obras Públicas" para un actor `system:m3`; `null` si el actor es una persona. */
export function systemActorLabel(actorUserId: string): string | null {
  if (!actorUserId.startsWith("system:")) return null;
  const key = actorUserId.slice("system:".length);
  return `Sistema · ${Object.hasOwn(SYSTEM_ACTOR_AREAS, key) ? SYSTEM_ACTOR_AREAS[key] : UNKNOWN_AREA_LABEL}`;
}

export function sourceModuleLabel(sourceModule: string | null | undefined): string {
  if (!sourceModule) return "—";
  const key = sourceModule.toLowerCase();
  return Object.hasOwn(SOURCE_MODULE_AREAS, key) ? SOURCE_MODULE_AREAS[key] : UNKNOWN_AREA_LABEL;
}
