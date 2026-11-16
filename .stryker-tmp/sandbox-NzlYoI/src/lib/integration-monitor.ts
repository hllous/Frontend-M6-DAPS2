// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { z } from "zod";
export const OUTBOX_STATUSES = ["PENDING", "SENT", "FAILED"] as const;
export const AUDIT_ENTITY_TYPES = ["CONTAINER", "ENVIRONMENTAL_REPORT", "ENVIRONMENTAL_INSPECTION", "VIOLATION_NOTICE", "REPAIR_REQUEST", "STREET_CLOSURE_REQUEST", "TREE_INTERVENTION", "SERVICE", "CREW", "ZONE", "VEHICLE", "ROUTE", "SANCTION_OUTCOME", "INBOX_EVENT"] as const;
export const INBOX_STATUSES = ["processed", "failed", "pending"] as const;
const dateTimeSchema = z.string().datetime(stryMutAct_9fa48("10455") ? {} : (stryCov_9fa48("10455"), {
  offset: stryMutAct_9fa48("10456") ? false : (stryCov_9fa48("10456"), true)
}));
const dateOnlySchema = z.string().regex(stryMutAct_9fa48("10464") ? /^\d{4}-\d{2}-\D{2}$/ : stryMutAct_9fa48("10463") ? /^\d{4}-\d{2}-\d$/ : stryMutAct_9fa48("10462") ? /^\d{4}-\D{2}-\d{2}$/ : stryMutAct_9fa48("10461") ? /^\d{4}-\d-\d{2}$/ : stryMutAct_9fa48("10460") ? /^\D{4}-\d{2}-\d{2}$/ : stryMutAct_9fa48("10459") ? /^\d-\d{2}-\d{2}$/ : stryMutAct_9fa48("10458") ? /^\d{4}-\d{2}-\d{2}/ : stryMutAct_9fa48("10457") ? /\d{4}-\d{2}-\d{2}$/ : (stryCov_9fa48("10457", "10458", "10459", "10460", "10461", "10462", "10463", "10464"), /^\d{4}-\d{2}-\d{2}$/)).refine(value => {
  if (stryMutAct_9fa48("10465")) {
    {}
  } else {
    stryCov_9fa48("10465");
    const parsed = new Date(stryMutAct_9fa48("10466") ? `` : (stryCov_9fa48("10466"), `${value}T00:00:00.000Z`));
    return stryMutAct_9fa48("10469") ? !Number.isNaN(parsed.valueOf()) || parsed.toISOString().startsWith(`${value}T`) : stryMutAct_9fa48("10468") ? false : stryMutAct_9fa48("10467") ? true : (stryCov_9fa48("10467", "10468", "10469"), (stryMutAct_9fa48("10470") ? Number.isNaN(parsed.valueOf()) : (stryCov_9fa48("10470"), !Number.isNaN(parsed.valueOf()))) && (stryMutAct_9fa48("10471") ? parsed.toISOString().endsWith(`${value}T`) : (stryCov_9fa48("10471"), parsed.toISOString().startsWith(stryMutAct_9fa48("10472") ? `` : (stryCov_9fa48("10472"), `${value}T`)))));
  }
}, stryMutAct_9fa48("10473") ? "" : (stryCov_9fa48("10473"), "La fecha debe ser válida y usar el formato AAAA-MM-DD."));
export const outboxEventSchema = z.object(stryMutAct_9fa48("10474") ? {} : (stryCov_9fa48("10474"), {
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
  causationId: z.string().uuid().nullable()
}));
export const outboxDetailSchema = outboxEventSchema.extend(stryMutAct_9fa48("10475") ? {} : (stryCov_9fa48("10475"), {
  payload: z.record(z.string(), z.unknown()),
  retries: z.array(z.object(stryMutAct_9fa48("10476") ? {} : (stryCov_9fa48("10476"), {
    id: z.string().uuid(),
    actorUserId: z.string(),
    at: dateTimeSchema,
    previousAttempts: z.number().int().nonnegative(),
    previousError: z.string().nullable()
  })))
}));
const paginationMetaSchema = z.object(stryMutAct_9fa48("10477") ? {} : (stryCov_9fa48("10477"), {
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  pageSize: stryMutAct_9fa48("10478") ? z.number().int().positive().min(100) : (stryCov_9fa48("10478"), z.number().int().positive().max(100)),
  totalPages: z.number().int().nonnegative()
}));
export const inboxEventSchema = z.object(stryMutAct_9fa48("10479") ? {} : (stryCov_9fa48("10479"), {
  messageId: z.string(),
  eventType: z.string(),
  sourceModule: z.string().nullable().optional(),
  status: z.enum(INBOX_STATUSES),
  receivedAt: dateTimeSchema,
  processedAt: dateTimeSchema.nullable().optional(),
  occurredAt: dateTimeSchema.nullable().optional(),
  correlationId: z.string().nullable().optional(),
  error: z.string().nullable().optional()
}));
export const outboxPageSchema = z.object(stryMutAct_9fa48("10480") ? {} : (stryCov_9fa48("10480"), {
  data: z.array(outboxEventSchema),
  meta: paginationMetaSchema
}));
export const auditEntrySchema = z.object(stryMutAct_9fa48("10481") ? {} : (stryCov_9fa48("10481"), {
  id: z.string().uuid(),
  entityType: z.enum(AUDIT_ENTITY_TYPES),
  entityId: z.string().uuid(),
  action: z.string(),
  fromStatus: z.string().nullable(),
  toStatus: z.string().nullable(),
  actorUserId: z.string(),
  actorRoles: z.array(z.string()),
  note: z.string().nullable(),
  occurredAt: dateTimeSchema
}));
export const auditPageSchema = z.object(stryMutAct_9fa48("10482") ? {} : (stryCov_9fa48("10482"), {
  data: z.array(auditEntrySchema),
  meta: paginationMetaSchema
}));
export const retryFailedResponseSchema = z.object(stryMutAct_9fa48("10483") ? {} : (stryCov_9fa48("10483"), {
  requeued: z.number().int().nonnegative(),
  remainingFailed: z.number().int().nonnegative()
}));
export const outboxQuerySchema = z.object(stryMutAct_9fa48("10484") ? {} : (stryCov_9fa48("10484"), {
  status: z.enum(OUTBOX_STATUSES).optional(),
  eventType: stryMutAct_9fa48("10485") ? z.string().min(100).optional() : (stryCov_9fa48("10485"), z.string().max(100).optional()),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  page: z.number().int().positive().optional(),
  pageSize: stryMutAct_9fa48("10486") ? z.number().int().positive().min(100).optional() : (stryCov_9fa48("10486"), z.number().int().positive().max(100).optional())
})).refine(stryMutAct_9fa48("10487") ? () => undefined : (stryCov_9fa48("10487"), ({
  from,
  to
}) => stryMutAct_9fa48("10490") ? (!from || !to) && from <= to : stryMutAct_9fa48("10489") ? false : stryMutAct_9fa48("10488") ? true : (stryCov_9fa48("10488", "10489", "10490"), (stryMutAct_9fa48("10492") ? !from && !to : stryMutAct_9fa48("10491") ? false : (stryCov_9fa48("10491", "10492"), (stryMutAct_9fa48("10493") ? from : (stryCov_9fa48("10493"), !from)) || (stryMutAct_9fa48("10494") ? to : (stryCov_9fa48("10494"), !to)))) || (stryMutAct_9fa48("10497") ? from > to : stryMutAct_9fa48("10496") ? from < to : stryMutAct_9fa48("10495") ? false : (stryCov_9fa48("10495", "10496", "10497"), from <= to)))), stryMutAct_9fa48("10498") ? {} : (stryCov_9fa48("10498"), {
  message: stryMutAct_9fa48("10499") ? "" : (stryCov_9fa48("10499"), "La fecha inicial no puede ser posterior a la fecha final."),
  path: stryMutAct_9fa48("10500") ? [] : (stryCov_9fa48("10500"), [stryMutAct_9fa48("10501") ? "" : (stryCov_9fa48("10501"), "to")])
}));
export const inboxPageSchema = z.object(stryMutAct_9fa48("10502") ? {} : (stryCov_9fa48("10502"), {
  data: z.array(inboxEventSchema),
  meta: paginationMetaSchema
}));
export const inboxQuerySchema = z.object(stryMutAct_9fa48("10503") ? {} : (stryCov_9fa48("10503"), {
  status: z.enum(INBOX_STATUSES).optional(),
  eventType: stryMutAct_9fa48("10504") ? z.string().min(100).optional() : (stryCov_9fa48("10504"), z.string().max(100).optional()),
  sourceModule: stryMutAct_9fa48("10505") ? z.string().min(100).optional() : (stryCov_9fa48("10505"), z.string().max(100).optional()),
  from: dateOnlySchema.optional(),
  to: dateOnlySchema.optional(),
  page: z.number().int().positive().optional(),
  pageSize: stryMutAct_9fa48("10506") ? z.number().int().positive().min(100).optional() : (stryCov_9fa48("10506"), z.number().int().positive().max(100).optional())
})).refine(stryMutAct_9fa48("10507") ? () => undefined : (stryCov_9fa48("10507"), ({
  from,
  to
}) => stryMutAct_9fa48("10510") ? (!from || !to) && from <= to : stryMutAct_9fa48("10509") ? false : stryMutAct_9fa48("10508") ? true : (stryCov_9fa48("10508", "10509", "10510"), (stryMutAct_9fa48("10512") ? !from && !to : stryMutAct_9fa48("10511") ? false : (stryCov_9fa48("10511", "10512"), (stryMutAct_9fa48("10513") ? from : (stryCov_9fa48("10513"), !from)) || (stryMutAct_9fa48("10514") ? to : (stryCov_9fa48("10514"), !to)))) || (stryMutAct_9fa48("10517") ? from > to : stryMutAct_9fa48("10516") ? from < to : stryMutAct_9fa48("10515") ? false : (stryCov_9fa48("10515", "10516", "10517"), from <= to)))), stryMutAct_9fa48("10518") ? {} : (stryCov_9fa48("10518"), {
  message: stryMutAct_9fa48("10519") ? "" : (stryCov_9fa48("10519"), "La fecha inicial no puede ser posterior a la fecha final."),
  path: stryMutAct_9fa48("10520") ? [] : (stryCov_9fa48("10520"), [stryMutAct_9fa48("10521") ? "" : (stryCov_9fa48("10521"), "to")])
}));
export const auditQuerySchema = z.object(stryMutAct_9fa48("10522") ? {} : (stryCov_9fa48("10522"), {
  entityType: z.enum(AUDIT_ENTITY_TYPES).optional(),
  entityId: z.string().uuid().optional(),
  page: z.number().int().positive().optional(),
  pageSize: stryMutAct_9fa48("10523") ? z.number().int().positive().min(100).optional() : (stryCov_9fa48("10523"), z.number().int().positive().max(100).optional())
}));
export const retryFailedInputSchema = z.object(stryMutAct_9fa48("10524") ? {} : (stryCov_9fa48("10524"), {
  confirm: z.literal(stryMutAct_9fa48("10525") ? false : (stryCov_9fa48("10525"), true)),
  limit: stryMutAct_9fa48("10527") ? z.number().int().max(1).max(100).optional() : stryMutAct_9fa48("10526") ? z.number().int().min(1).min(100).optional() : (stryCov_9fa48("10526", "10527"), z.number().int().min(1).max(100).optional())
}));
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
  if (stryMutAct_9fa48("10528")) {
    {}
  } else {
    stryCov_9fa48("10528");
    const parts = new Intl.DateTimeFormat(stryMutAct_9fa48("10529") ? "" : (stryCov_9fa48("10529"), "en-US"), stryMutAct_9fa48("10530") ? {} : (stryCov_9fa48("10530"), {
      timeZone: stryMutAct_9fa48("10531") ? "" : (stryCov_9fa48("10531"), "America/Argentina/Buenos_Aires"),
      year: stryMutAct_9fa48("10532") ? "" : (stryCov_9fa48("10532"), "numeric"),
      month: stryMutAct_9fa48("10533") ? "" : (stryCov_9fa48("10533"), "2-digit"),
      day: stryMutAct_9fa48("10534") ? "" : (stryCov_9fa48("10534"), "2-digit")
    })).formatToParts(new Date(value));
    const part = stryMutAct_9fa48("10535") ? () => undefined : (stryCov_9fa48("10535"), (() => {
      const part = (type: Intl.DateTimeFormatPartTypes) => stryMutAct_9fa48("10536") ? parts.find(entry => entry.type === type)?.value && "" : (stryCov_9fa48("10536"), (stryMutAct_9fa48("10537") ? parts.find(entry => entry.type === type).value : (stryCov_9fa48("10537"), parts.find(stryMutAct_9fa48("10538") ? () => undefined : (stryCov_9fa48("10538"), entry => stryMutAct_9fa48("10541") ? entry.type !== type : stryMutAct_9fa48("10540") ? false : stryMutAct_9fa48("10539") ? true : (stryCov_9fa48("10539", "10540", "10541"), entry.type === type)))?.value)) ?? (stryMutAct_9fa48("10542") ? "Stryker was here!" : (stryCov_9fa48("10542"), "")));
      return part;
    })());
    return stryMutAct_9fa48("10543") ? `` : (stryCov_9fa48("10543"), `${part(stryMutAct_9fa48("10544") ? "" : (stryCov_9fa48("10544"), "year"))}-${part(stryMutAct_9fa48("10545") ? "" : (stryCov_9fa48("10545"), "month"))}-${part(stryMutAct_9fa48("10546") ? "" : (stryCov_9fa48("10546"), "day"))}`);
  }
}
export function pageSlice<T>(records: readonly T[], page = 1, pageSize = 20) {
  if (stryMutAct_9fa48("10547")) {
    {}
  } else {
    stryCov_9fa48("10547");
    const start = stryMutAct_9fa48("10548") ? (page - 1) / pageSize : (stryCov_9fa48("10548"), (stryMutAct_9fa48("10549") ? page + 1 : (stryCov_9fa48("10549"), page - 1)) * pageSize);
    return stryMutAct_9fa48("10550") ? {} : (stryCov_9fa48("10550"), {
      data: stryMutAct_9fa48("10551") ? records : (stryCov_9fa48("10551"), records.slice(start, stryMutAct_9fa48("10552") ? start - pageSize : (stryCov_9fa48("10552"), start + pageSize))),
      meta: stryMutAct_9fa48("10553") ? {} : (stryCov_9fa48("10553"), {
        total: records.length,
        page,
        pageSize,
        totalPages: Math.ceil(stryMutAct_9fa48("10554") ? records.length * pageSize : (stryCov_9fa48("10554"), records.length / pageSize))
      })
    });
  }
}

// Áreas que escriben en el registro o emiten eventos a M6, nombradas por lo que hacen (DESIGN.md: sin códigos de módulo en pantalla).
// `system:<módulo>` es el actor de sistema de Backend #516; `sourceModule` es el nombre del módulo en el sobre del Core.
const SYSTEM_ACTOR_AREAS: Record<string, string> = stryMutAct_9fa48("10555") ? {} : (stryCov_9fa48("10555"), {
  m2: stryMutAct_9fa48("10556") ? "" : (stryCov_9fa48("10556"), "Reclamos"),
  m3: stryMutAct_9fa48("10557") ? "" : (stryCov_9fa48("10557"), "Obras Públicas"),
  m4: stryMutAct_9fa48("10558") ? "" : (stryCov_9fa48("10558"), "Faltas"),
  m7: stryMutAct_9fa48("10559") ? "" : (stryCov_9fa48("10559"), "Tránsito"),
  weather: stryMutAct_9fa48("10560") ? "" : (stryCov_9fa48("10560"), "Alerta meteorológica")
});
const SOURCE_MODULE_AREAS: Record<string, string> = stryMutAct_9fa48("10561") ? {} : (stryCov_9fa48("10561"), {
  tickets: stryMutAct_9fa48("10562") ? "" : (stryCov_9fa48("10562"), "Reclamos"),
  obras: stryMutAct_9fa48("10563") ? "" : (stryCov_9fa48("10563"), "Obras Públicas"),
  transito: stryMutAct_9fa48("10564") ? "" : (stryCov_9fa48("10564"), "Tránsito"),
  ambiente: stryMutAct_9fa48("10565") ? "" : (stryCov_9fa48("10565"), "Control ambiental"),
  m6: stryMutAct_9fa48("10566") ? "" : (stryCov_9fa48("10566"), "Control ambiental")
});
export const UNKNOWN_AREA_LABEL = stryMutAct_9fa48("10567") ? "" : (stryCov_9fa48("10567"), "Otra área");

/** "Sistema · Obras Públicas" para un actor `system:m3`; `null` si el actor es una persona. */
export function systemActorLabel(actorUserId: string): string | null {
  if (stryMutAct_9fa48("10568")) {
    {}
  } else {
    stryCov_9fa48("10568");
    if (stryMutAct_9fa48("10571") ? false : stryMutAct_9fa48("10570") ? true : stryMutAct_9fa48("10569") ? actorUserId.startsWith("system:") : (stryCov_9fa48("10569", "10570", "10571"), !(stryMutAct_9fa48("10572") ? actorUserId.endsWith("system:") : (stryCov_9fa48("10572"), actorUserId.startsWith(stryMutAct_9fa48("10573") ? "" : (stryCov_9fa48("10573"), "system:")))))) return null;
    const key = stryMutAct_9fa48("10574") ? actorUserId : (stryCov_9fa48("10574"), actorUserId.slice((stryMutAct_9fa48("10575") ? "" : (stryCov_9fa48("10575"), "system:")).length));
    return stryMutAct_9fa48("10576") ? `` : (stryCov_9fa48("10576"), `Sistema · ${Object.hasOwn(SYSTEM_ACTOR_AREAS, key) ? SYSTEM_ACTOR_AREAS[key] : UNKNOWN_AREA_LABEL}`);
  }
}
export function sourceModuleLabel(sourceModule: string | null | undefined): string {
  if (stryMutAct_9fa48("10577")) {
    {}
  } else {
    stryCov_9fa48("10577");
    if (stryMutAct_9fa48("10580") ? false : stryMutAct_9fa48("10579") ? true : stryMutAct_9fa48("10578") ? sourceModule : (stryCov_9fa48("10578", "10579", "10580"), !sourceModule)) return stryMutAct_9fa48("10581") ? "" : (stryCov_9fa48("10581"), "—");
    const key = stryMutAct_9fa48("10582") ? sourceModule.toUpperCase() : (stryCov_9fa48("10582"), sourceModule.toLowerCase());
    return Object.hasOwn(SOURCE_MODULE_AREAS, key) ? SOURCE_MODULE_AREAS[key] : UNKNOWN_AREA_LABEL;
  }
}