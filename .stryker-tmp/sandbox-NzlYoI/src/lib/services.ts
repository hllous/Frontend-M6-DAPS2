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
import { formatCalendarDay, todayInArgentina } from "./argentina-date";
import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { streetClosureRequestsAdapter, type StreetClosureRequest } from "./street-closure-requests";
import { catalogoDeEtiquetas, componerTituloDeServicio } from "./service-labels";
import { serviceTypeCategorySchema } from "./service-types";
import { recordTelemetryEvent } from "./telemetry";
import { MAX_EXTERNAL_ID_LENGTH, MAX_NOTES_LENGTH, MAX_TICKET_ID_LENGTH, latitudeInput, longitudeInput, reasonInput } from "@/lib/input-limits";
import { droppedRecords, tolerantRecords } from "./tolerant-records";
export const serviceModeSchema = z.enum(stryMutAct_9fa48("14413") ? [] : (stryCov_9fa48("14413"), [stryMutAct_9fa48("14414") ? "" : (stryCov_9fa48("14414"), "ROUTE"), stryMutAct_9fa48("14415") ? "" : (stryCov_9fa48("14415"), "POINT")]));
export type ServiceMode = z.infer<typeof serviceModeSchema>;
export const serviceStatusSchema = z.enum(stryMutAct_9fa48("14416") ? [] : (stryCov_9fa48("14416"), [stryMutAct_9fa48("14417") ? "" : (stryCov_9fa48("14417"), "SCHEDULED"), stryMutAct_9fa48("14418") ? "" : (stryCov_9fa48("14418"), "RESCHEDULED"), stryMutAct_9fa48("14419") ? "" : (stryCov_9fa48("14419"), "IN_PROGRESS"), stryMutAct_9fa48("14420") ? "" : (stryCov_9fa48("14420"), "SUSPENDED"), stryMutAct_9fa48("14421") ? "" : (stryCov_9fa48("14421"), "COMPLETED"), stryMutAct_9fa48("14422") ? "" : (stryCov_9fa48("14422"), "PARTIALLY_COMPLETED"), stryMutAct_9fa48("14423") ? "" : (stryCov_9fa48("14423"), "CANCELLED")]));
export type ServiceStatus = z.infer<typeof serviceStatusSchema>;
export const serviceOriginSchema = z.enum(stryMutAct_9fa48("14424") ? [] : (stryCov_9fa48("14424"), [stryMutAct_9fa48("14425") ? "" : (stryCov_9fa48("14425"), "PLANNED"), stryMutAct_9fa48("14426") ? "" : (stryCov_9fa48("14426"), "TICKET"), stryMutAct_9fa48("14427") ? "" : (stryCov_9fa48("14427"), "WEATHER_ALERT"), stryMutAct_9fa48("14428") ? "" : (stryCov_9fa48("14428"), "INSPECTION"), stryMutAct_9fa48("14429") ? "" : (stryCov_9fa48("14429"), "MANUAL")]));
export type ServiceOrigin = z.infer<typeof serviceOriginSchema>;
export const statusEventSchema = z.object(stryMutAct_9fa48("14430") ? {} : (stryCov_9fa48("14430"), {
  label: z.string(),
  at: z.string(),
  done: z.boolean()
}));
export type StatusEvent = z.infer<typeof statusEventSchema>;
export const coordinatesSchema = z.object(stryMutAct_9fa48("14431") ? {} : (stryCov_9fa48("14431"), {
  x: z.number(),
  y: z.number()
}));
export type Coordinates = z.infer<typeof coordinatesSchema>;
export const attachmentSchema = z.object(stryMutAct_9fa48("14432") ? {} : (stryCov_9fa48("14432"), {
  id: z.string(),
  url: z.string(),
  filename: z.string(),
  contentType: z.string(),
  uploadedAt: z.string()
}));
export type Attachment = z.infer<typeof attachmentSchema>;
export const zoneResultStatusSchema = z.enum(stryMutAct_9fa48("14433") ? [] : (stryCov_9fa48("14433"), [stryMutAct_9fa48("14434") ? "" : (stryCov_9fa48("14434"), "SERVICED"), stryMutAct_9fa48("14435") ? "" : (stryCov_9fa48("14435"), "PARTIAL"), stryMutAct_9fa48("14436") ? "" : (stryCov_9fa48("14436"), "NOT_SERVICED")]));
export type ZoneResultStatus = z.infer<typeof zoneResultStatusSchema>;
export const notServicedReasonSchema = z.enum(stryMutAct_9fa48("14437") ? [] : (stryCov_9fa48("14437"), [stryMutAct_9fa48("14438") ? "" : (stryCov_9fa48("14438"), "VEHICLE_BREAKDOWN"), stryMutAct_9fa48("14439") ? "" : (stryCov_9fa48("14439"), "CREW_UNAVAILABLE"), stryMutAct_9fa48("14440") ? "" : (stryCov_9fa48("14440"), "BLOCKED_ACCESS"), stryMutAct_9fa48("14441") ? "" : (stryCov_9fa48("14441"), "STREET_CLOSURE"), stryMutAct_9fa48("14442") ? "" : (stryCov_9fa48("14442"), "WEATHER"), stryMutAct_9fa48("14443") ? "" : (stryCov_9fa48("14443"), "EXCESS_VOLUME"), stryMutAct_9fa48("14444") ? "" : (stryCov_9fa48("14444"), "SECURITY_INCIDENT"), stryMutAct_9fa48("14445") ? "" : (stryCov_9fa48("14445"), "OTHER")]));
export type NotServicedReason = z.infer<typeof notServicedReasonSchema>;
export const zoneResultSchema = z.object(stryMutAct_9fa48("14446") ? {} : (stryCov_9fa48("14446"), {
  id: z.string(),
  // El backend no repite el id del servicio dentro de cada resultado: ya esta en el
  // recurso padre o en la ruta con la que se pidio. Se completa cuando se conoce.
  serviceId: z.string().optional(),
  zoneId: z.string(),
  status: zoneResultStatusSchema,
  reason: notServicedReasonSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  proposedDate: z.string().nullable().optional(),
  attachments: z.array(attachmentSchema).optional().default(stryMutAct_9fa48("14447") ? ["Stryker was here"] : (stryCov_9fa48("14447"), [])),
  recordedAt: z.string()
}));
export type ZoneResult = z.infer<typeof zoneResultSchema>;
export const serviceSchema = z.object(stryMutAct_9fa48("14448") ? {} : (stryCov_9fa48("14448"), {
  id: z.string(),
  serviceTypeId: z.string(),
  serviceTypeName: z.string().optional().default(stryMutAct_9fa48("14449") ? "" : (stryCov_9fa48("14449"), "Servicio urbano")),
  serviceTypeCategory: serviceTypeCategorySchema.optional(),
  title: z.string(),
  mode: serviceModeSchema,
  status: serviceStatusSchema,
  statusReason: z.string().nullable().optional(),
  statusNote: z.string().nullable().optional(),
  origin: serviceOriginSchema,
  zoneIds: stryMutAct_9fa48("14450") ? z.array(z.string()).max(1) : (stryCov_9fa48("14450"), z.array(z.string()).min(1)),
  zoneNames: z.array(z.string()).optional().default(stryMutAct_9fa48("14451") ? ["Stryker was here"] : (stryCov_9fa48("14451"), [])),
  zoneResults: z.array(zoneResultSchema).optional(),
  routeId: z.string().nullable().optional(),
  routeName: z.string().nullable().optional(),
  targetType: z.string().nullable().optional(),
  targetId: z.string().nullable().optional(),
  targetRef: z.string().nullable().optional(),
  inspectionId: z.string().nullable().optional(),
  weatherAlertId: z.string().nullable().optional(),
  // El backend la serializa como ISO a medianoche UTC (`2026-12-07T00:00:00.000Z`); se
  // guarda como día (YYYY-MM-DD), que es lo que comparan los filtros, los choques de
  // agenda y la ventana horaria, y lo que se manda al reprogramar.
  scheduledDate: z.string().transform(stryMutAct_9fa48("14452") ? () => undefined : (stryCov_9fa48("14452"), value => stryMutAct_9fa48("14453") ? value : (stryCov_9fa48("14453"), value.slice(0, 10)))),
  windowFrom: z.string().nullable().optional(),
  windowTo: z.string().nullable().optional(),
  crewId: z.string().nullable().optional(),
  crewName: z.string().nullable().optional(),
  vehicleId: z.string().nullable().optional(),
  vehiclePlate: z.string().nullable().optional(),
  ticketId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  coordinates: coordinatesSchema.optional().default(stryMutAct_9fa48("14454") ? {} : (stryCov_9fa48("14454"), {
    x: 50,
    y: 50
  })),
  attachments: z.array(attachmentSchema).optional().default(stryMutAct_9fa48("14455") ? ["Stryker was here"] : (stryCov_9fa48("14455"), [])),
  history: z.array(statusEventSchema).optional().default(stryMutAct_9fa48("14456") ? ["Stryker was here"] : (stryCov_9fa48("14456"), [])),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
}));
export type Service = z.infer<typeof serviceSchema>;

/**
 * Lo que responde el backend: las zonas vienen como `zones: [{ zoneId, sequence }]`
 * y no hay `title`. Se aplanan los ids respetando el `sequence`, que es el orden en
 * que un recorrido recorre las zonas, y el título lo compone parseServicio() con los
 * catálogos. Las fixtures del modo mock ya traen `zoneIds` y `title`, y pasan igual.
 */
const serviceWireSchema = z.preprocess(value => {
  if (stryMutAct_9fa48("14457")) {
    {}
  } else {
    stryCov_9fa48("14457");
    if (stryMutAct_9fa48("14460") ? (!value || typeof value !== "object") && Array.isArray(value) : stryMutAct_9fa48("14459") ? false : stryMutAct_9fa48("14458") ? true : (stryCov_9fa48("14458", "14459", "14460"), (stryMutAct_9fa48("14462") ? !value && typeof value !== "object" : stryMutAct_9fa48("14461") ? false : (stryCov_9fa48("14461", "14462"), (stryMutAct_9fa48("14463") ? value : (stryCov_9fa48("14463"), !value)) || (stryMutAct_9fa48("14465") ? typeof value === "object" : stryMutAct_9fa48("14464") ? false : (stryCov_9fa48("14464", "14465"), typeof value !== (stryMutAct_9fa48("14466") ? "" : (stryCov_9fa48("14466"), "object")))))) || Array.isArray(value))) return value;
    const record = value as Record<string, unknown>;
    if (stryMutAct_9fa48("14469") ? "zoneIds" in record && !Array.isArray(record.zones) : stryMutAct_9fa48("14468") ? false : stryMutAct_9fa48("14467") ? true : (stryCov_9fa48("14467", "14468", "14469"), (stryMutAct_9fa48("14470") ? "" : (stryCov_9fa48("14470"), "zoneIds")) in record || (stryMutAct_9fa48("14471") ? Array.isArray(record.zones) : (stryCov_9fa48("14471"), !Array.isArray(record.zones))))) return value;
    const {
      zones,
      ...rest
    } = record;
    const ordenadas = stryMutAct_9fa48("14472") ? [...(zones as {
      zoneId?: unknown;
      sequence?: unknown;
    }[])] : (stryCov_9fa48("14472"), (stryMutAct_9fa48("14473") ? [] : (stryCov_9fa48("14473"), [...(zones as {
      zoneId?: unknown;
      sequence?: unknown;
    }[])])).sort(stryMutAct_9fa48("14474") ? () => undefined : (stryCov_9fa48("14474"), (a, b) => stryMutAct_9fa48("14475") ? Number(a?.sequence ?? 0) + Number(b?.sequence ?? 0) : (stryCov_9fa48("14475"), Number(stryMutAct_9fa48("14476") ? a?.sequence && 0 : (stryCov_9fa48("14476"), (stryMutAct_9fa48("14477") ? a.sequence : (stryCov_9fa48("14477"), a?.sequence)) ?? 0)) - Number(stryMutAct_9fa48("14478") ? b?.sequence && 0 : (stryCov_9fa48("14478"), (stryMutAct_9fa48("14479") ? b.sequence : (stryCov_9fa48("14479"), b?.sequence)) ?? 0))))));
    const zoneResults = Array.isArray(record.zoneResults) ? (record.zoneResults as Record<string, unknown>[]).map(stryMutAct_9fa48("14480") ? () => undefined : (stryCov_9fa48("14480"), resultado => stryMutAct_9fa48("14481") ? {} : (stryCov_9fa48("14481"), {
      serviceId: record.id,
      ...resultado
    }))) : record.zoneResults;
    return stryMutAct_9fa48("14482") ? {} : (stryCov_9fa48("14482"), {
      ...rest,
      zoneIds: ordenadas.map(stryMutAct_9fa48("14483") ? () => undefined : (stryCov_9fa48("14483"), zona => stryMutAct_9fa48("14484") ? zona.zoneId : (stryCov_9fa48("14484"), zona?.zoneId))),
      zoneResults
    });
  }
}, serviceSchema.extend(stryMutAct_9fa48("14485") ? {} : (stryCov_9fa48("14485"), {
  title: z.string().optional()
})));
export const OVERRIDE_NOTE_MIN = 10;
export const OVERRIDE_NOTE_MAX = 500;

// El backend la exige cuando la cuadrilla o el vehículo ya están tomados en esa franja (409 sin ella),
// tanto al programar con cuadrilla como en assign-crew.
const overrideNoteSchema = stryMutAct_9fa48("14488") ? z.string().min(OVERRIDE_NOTE_MIN, `La justificación debe tener al menos ${OVERRIDE_NOTE_MIN} caracteres.`).max(OVERRIDE_NOTE_MAX, `La justificación admite hasta ${OVERRIDE_NOTE_MAX} caracteres.`).optional() : stryMutAct_9fa48("14487") ? z.string().trim().max(OVERRIDE_NOTE_MIN, `La justificación debe tener al menos ${OVERRIDE_NOTE_MIN} caracteres.`).max(OVERRIDE_NOTE_MAX, `La justificación admite hasta ${OVERRIDE_NOTE_MAX} caracteres.`).optional() : stryMutAct_9fa48("14486") ? z.string().trim().min(OVERRIDE_NOTE_MIN, `La justificación debe tener al menos ${OVERRIDE_NOTE_MIN} caracteres.`).min(OVERRIDE_NOTE_MAX, `La justificación admite hasta ${OVERRIDE_NOTE_MAX} caracteres.`).optional() : (stryCov_9fa48("14486", "14487", "14488"), z.string().trim().min(OVERRIDE_NOTE_MIN, stryMutAct_9fa48("14489") ? `` : (stryCov_9fa48("14489"), `La justificación debe tener al menos ${OVERRIDE_NOTE_MIN} caracteres.`)).max(OVERRIDE_NOTE_MAX, stryMutAct_9fa48("14490") ? `` : (stryCov_9fa48("14490"), `La justificación admite hasta ${OVERRIDE_NOTE_MAX} caracteres.`)).optional());
export const createServiceInputSchema = z.object(stryMutAct_9fa48("14491") ? {} : (stryCov_9fa48("14491"), {
  title: z.string().optional(),
  serviceTypeId: stryMutAct_9fa48("14492") ? z.string().max(1, "Debe seleccionar un tipo de servicio") : (stryCov_9fa48("14492"), z.string().min(1, stryMutAct_9fa48("14493") ? "" : (stryCov_9fa48("14493"), "Debe seleccionar un tipo de servicio"))),
  origin: serviceOriginSchema,
  ticketId: stryMutAct_9fa48("14494") ? z.string().min(MAX_TICKET_ID_LENGTH, `El ticketId no puede superar los ${MAX_TICKET_ID_LENGTH} caracteres.`).optional() : (stryCov_9fa48("14494"), z.string().max(MAX_TICKET_ID_LENGTH, stryMutAct_9fa48("14495") ? `` : (stryCov_9fa48("14495"), `El ticketId no puede superar los ${MAX_TICKET_ID_LENGTH} caracteres.`)).optional()),
  inspectionId: z.string().optional(),
  weatherAlertId: stryMutAct_9fa48("14496") ? z.string().min(MAX_EXTERNAL_ID_LENGTH, `El weatherAlertId no puede superar los ${MAX_EXTERNAL_ID_LENGTH} caracteres.`).optional() : (stryCov_9fa48("14496"), z.string().max(MAX_EXTERNAL_ID_LENGTH, stryMutAct_9fa48("14497") ? `` : (stryCov_9fa48("14497"), `El weatherAlertId no puede superar los ${MAX_EXTERNAL_ID_LENGTH} caracteres.`)).optional()),
  routeId: z.string().optional(),
  zoneIds: stryMutAct_9fa48("14498") ? z.array(z.string()).max(1, "Debe incluir al menos una zona") : (stryCov_9fa48("14498"), z.array(z.string()).min(1, stryMutAct_9fa48("14499") ? "" : (stryCov_9fa48("14499"), "Debe incluir al menos una zona"))),
  targetType: z.enum(stryMutAct_9fa48("14500") ? [] : (stryCov_9fa48("14500"), [stryMutAct_9fa48("14501") ? "" : (stryCov_9fa48("14501"), "CONTAINER"), stryMutAct_9fa48("14502") ? "" : (stryCov_9fa48("14502"), "TREE"), stryMutAct_9fa48("14503") ? "" : (stryCov_9fa48("14503"), "GREEN_SPACE"), stryMutAct_9fa48("14504") ? "" : (stryCov_9fa48("14504"), "GREEN_POINT")])).optional(),
  targetId: z.string().optional(),
  targetRef: z.string().optional(),
  crewId: z.string().optional(),
  vehicleId: z.string().optional(),
  scheduledDate: z.string().regex(stryMutAct_9fa48("14512") ? /^\d{4}-\d{2}-\D{2}$/ : stryMutAct_9fa48("14511") ? /^\d{4}-\d{2}-\d$/ : stryMutAct_9fa48("14510") ? /^\d{4}-\D{2}-\d{2}$/ : stryMutAct_9fa48("14509") ? /^\d{4}-\d-\d{2}$/ : stryMutAct_9fa48("14508") ? /^\D{4}-\d{2}-\d{2}$/ : stryMutAct_9fa48("14507") ? /^\d-\d{2}-\d{2}$/ : stryMutAct_9fa48("14506") ? /^\d{4}-\d{2}-\d{2}/ : stryMutAct_9fa48("14505") ? /\d{4}-\d{2}-\d{2}$/ : (stryCov_9fa48("14505", "14506", "14507", "14508", "14509", "14510", "14511", "14512"), /^\d{4}-\d{2}-\d{2}$/), stryMutAct_9fa48("14513") ? "" : (stryCov_9fa48("14513"), "La fecha debe tener formato YYYY-MM-DD")),
  timeWindow: z.object(stryMutAct_9fa48("14514") ? {} : (stryCov_9fa48("14514"), {
    start: z.string().regex(stryMutAct_9fa48("14520") ? /^\d{2}:\D{2}$/ : stryMutAct_9fa48("14519") ? /^\d{2}:\d$/ : stryMutAct_9fa48("14518") ? /^\D{2}:\d{2}$/ : stryMutAct_9fa48("14517") ? /^\d:\d{2}$/ : stryMutAct_9fa48("14516") ? /^\d{2}:\d{2}/ : stryMutAct_9fa48("14515") ? /\d{2}:\d{2}$/ : (stryCov_9fa48("14515", "14516", "14517", "14518", "14519", "14520"), /^\d{2}:\d{2}$/), stryMutAct_9fa48("14521") ? "" : (stryCov_9fa48("14521"), "Hora de inicio inválida (HH:MM)")),
    end: z.string().regex(stryMutAct_9fa48("14527") ? /^\d{2}:\D{2}$/ : stryMutAct_9fa48("14526") ? /^\d{2}:\d$/ : stryMutAct_9fa48("14525") ? /^\D{2}:\d{2}$/ : stryMutAct_9fa48("14524") ? /^\d:\d{2}$/ : stryMutAct_9fa48("14523") ? /^\d{2}:\d{2}/ : stryMutAct_9fa48("14522") ? /\d{2}:\d{2}$/ : (stryCov_9fa48("14522", "14523", "14524", "14525", "14526", "14527"), /^\d{2}:\d{2}$/), stryMutAct_9fa48("14528") ? "" : (stryCov_9fa48("14528"), "Hora de fin inválida (HH:MM)"))
  })),
  notes: stryMutAct_9fa48("14529") ? z.string().min(MAX_NOTES_LENGTH, `Las notas no pueden superar los ${MAX_NOTES_LENGTH} caracteres.`).optional() : (stryCov_9fa48("14529"), z.string().max(MAX_NOTES_LENGTH, stryMutAct_9fa48("14530") ? `` : (stryCov_9fa48("14530"), `Las notas no pueden superar los ${MAX_NOTES_LENGTH} caracteres.`)).optional()),
  overrideNote: overrideNoteSchema
})).superRefine((data, ctx) => {
  if (stryMutAct_9fa48("14531")) {
    {}
  } else {
    stryCov_9fa48("14531");
    if (stryMutAct_9fa48("14534") ? data.origin === "TICKET" || !data.ticketId || !data.ticketId.trim() : stryMutAct_9fa48("14533") ? false : stryMutAct_9fa48("14532") ? true : (stryCov_9fa48("14532", "14533", "14534"), (stryMutAct_9fa48("14536") ? data.origin !== "TICKET" : stryMutAct_9fa48("14535") ? true : (stryCov_9fa48("14535", "14536"), data.origin === (stryMutAct_9fa48("14537") ? "" : (stryCov_9fa48("14537"), "TICKET")))) && (stryMutAct_9fa48("14539") ? !data.ticketId && !data.ticketId.trim() : stryMutAct_9fa48("14538") ? true : (stryCov_9fa48("14538", "14539"), (stryMutAct_9fa48("14540") ? data.ticketId : (stryCov_9fa48("14540"), !data.ticketId)) || (stryMutAct_9fa48("14541") ? data.ticketId.trim() : (stryCov_9fa48("14541"), !(stryMutAct_9fa48("14542") ? data.ticketId : (stryCov_9fa48("14542"), data.ticketId.trim())))))))) {
      if (stryMutAct_9fa48("14543")) {
        {}
      } else {
        stryCov_9fa48("14543");
        ctx.addIssue(stryMutAct_9fa48("14545") ? {} : (stryCov_9fa48("14545"), {
          code: z.ZodIssueCode.custom,
          path: stryMutAct_9fa48("14546") ? [] : (stryCov_9fa48("14546"), [stryMutAct_9fa48("14547") ? "" : (stryCov_9fa48("14547"), "ticketId")]),
          message: stryMutAct_9fa48("14548") ? "" : (stryCov_9fa48("14548"), "El ticketId es obligatorio para origen TICKET")
        }));
      }
    }
    if (stryMutAct_9fa48("14551") ? data.origin !== "TICKET" || data.ticketId : stryMutAct_9fa48("14550") ? false : stryMutAct_9fa48("14549") ? true : (stryCov_9fa48("14549", "14550", "14551"), (stryMutAct_9fa48("14553") ? data.origin === "TICKET" : stryMutAct_9fa48("14552") ? true : (stryCov_9fa48("14552", "14553"), data.origin !== (stryMutAct_9fa48("14554") ? "" : (stryCov_9fa48("14554"), "TICKET")))) && data.ticketId)) {
      if (stryMutAct_9fa48("14555")) {
        {}
      } else {
        stryCov_9fa48("14555");
        ctx.addIssue(stryMutAct_9fa48("14557") ? {} : (stryCov_9fa48("14557"), {
          code: z.ZodIssueCode.custom,
          path: stryMutAct_9fa48("14558") ? [] : (stryCov_9fa48("14558"), [stryMutAct_9fa48("14559") ? "" : (stryCov_9fa48("14559"), "ticketId")]),
          message: stryMutAct_9fa48("14560") ? "" : (stryCov_9fa48("14560"), "ticketId solo está permitido para origen TICKET")
        }));
      }
    }
    if (stryMutAct_9fa48("14563") ? data.origin === "INSPECTION" || !data.inspectionId || !data.inspectionId.trim() : stryMutAct_9fa48("14562") ? false : stryMutAct_9fa48("14561") ? true : (stryCov_9fa48("14561", "14562", "14563"), (stryMutAct_9fa48("14565") ? data.origin !== "INSPECTION" : stryMutAct_9fa48("14564") ? true : (stryCov_9fa48("14564", "14565"), data.origin === (stryMutAct_9fa48("14566") ? "" : (stryCov_9fa48("14566"), "INSPECTION")))) && (stryMutAct_9fa48("14568") ? !data.inspectionId && !data.inspectionId.trim() : stryMutAct_9fa48("14567") ? true : (stryCov_9fa48("14567", "14568"), (stryMutAct_9fa48("14569") ? data.inspectionId : (stryCov_9fa48("14569"), !data.inspectionId)) || (stryMutAct_9fa48("14570") ? data.inspectionId.trim() : (stryCov_9fa48("14570"), !(stryMutAct_9fa48("14571") ? data.inspectionId : (stryCov_9fa48("14571"), data.inspectionId.trim())))))))) {
      if (stryMutAct_9fa48("14572")) {
        {}
      } else {
        stryCov_9fa48("14572");
        ctx.addIssue(stryMutAct_9fa48("14574") ? {} : (stryCov_9fa48("14574"), {
          code: z.ZodIssueCode.custom,
          path: stryMutAct_9fa48("14575") ? [] : (stryCov_9fa48("14575"), [stryMutAct_9fa48("14576") ? "" : (stryCov_9fa48("14576"), "inspectionId")]),
          message: stryMutAct_9fa48("14577") ? "" : (stryCov_9fa48("14577"), "El inspectionId es obligatorio para origen INSPECTION")
        }));
      }
    } else if (stryMutAct_9fa48("14580") ? data.origin === "INSPECTION" || !z.uuid().safeParse(data.inspectionId?.trim()).success : stryMutAct_9fa48("14579") ? false : stryMutAct_9fa48("14578") ? true : (stryCov_9fa48("14578", "14579", "14580"), (stryMutAct_9fa48("14582") ? data.origin !== "INSPECTION" : stryMutAct_9fa48("14581") ? true : (stryCov_9fa48("14581", "14582"), data.origin === (stryMutAct_9fa48("14583") ? "" : (stryCov_9fa48("14583"), "INSPECTION")))) && (stryMutAct_9fa48("14584") ? z.uuid().safeParse(data.inspectionId?.trim()).success : (stryCov_9fa48("14584"), !z.uuid().safeParse(stryMutAct_9fa48("14586") ? data.inspectionId.trim() : stryMutAct_9fa48("14585") ? data.inspectionId : (stryCov_9fa48("14585", "14586"), data.inspectionId?.trim())).success)))) {
      if (stryMutAct_9fa48("14587")) {
        {}
      } else {
        stryCov_9fa48("14587");
        ctx.addIssue(stryMutAct_9fa48("14589") ? {} : (stryCov_9fa48("14589"), {
          code: z.ZodIssueCode.custom,
          path: stryMutAct_9fa48("14590") ? [] : (stryCov_9fa48("14590"), [stryMutAct_9fa48("14591") ? "" : (stryCov_9fa48("14591"), "inspectionId")]),
          message: stryMutAct_9fa48("14592") ? "" : (stryCov_9fa48("14592"), "El inspectionId debe ser el UUID de la inspección.")
        }));
      }
    }
    if (stryMutAct_9fa48("14595") ? data.origin === "WEATHER_ALERT" || !data.weatherAlertId || !data.weatherAlertId.trim() : stryMutAct_9fa48("14594") ? false : stryMutAct_9fa48("14593") ? true : (stryCov_9fa48("14593", "14594", "14595"), (stryMutAct_9fa48("14597") ? data.origin !== "WEATHER_ALERT" : stryMutAct_9fa48("14596") ? true : (stryCov_9fa48("14596", "14597"), data.origin === (stryMutAct_9fa48("14598") ? "" : (stryCov_9fa48("14598"), "WEATHER_ALERT")))) && (stryMutAct_9fa48("14600") ? !data.weatherAlertId && !data.weatherAlertId.trim() : stryMutAct_9fa48("14599") ? true : (stryCov_9fa48("14599", "14600"), (stryMutAct_9fa48("14601") ? data.weatherAlertId : (stryCov_9fa48("14601"), !data.weatherAlertId)) || (stryMutAct_9fa48("14602") ? data.weatherAlertId.trim() : (stryCov_9fa48("14602"), !(stryMutAct_9fa48("14603") ? data.weatherAlertId : (stryCov_9fa48("14603"), data.weatherAlertId.trim())))))))) {
      if (stryMutAct_9fa48("14604")) {
        {}
      } else {
        stryCov_9fa48("14604");
        ctx.addIssue(stryMutAct_9fa48("14606") ? {} : (stryCov_9fa48("14606"), {
          code: z.ZodIssueCode.custom,
          path: stryMutAct_9fa48("14607") ? [] : (stryCov_9fa48("14607"), [stryMutAct_9fa48("14608") ? "" : (stryCov_9fa48("14608"), "weatherAlertId")]),
          message: stryMutAct_9fa48("14609") ? "" : (stryCov_9fa48("14609"), "El weatherAlertId es obligatorio para origen WEATHER_ALERT")
        }));
      }
    }
  }
});
export type CreateServiceInput = z.infer<typeof createServiceInputSchema>;
export class BackendServiceZoneSelectionError extends Error {
  constructor() {
    if (stryMutAct_9fa48("14610")) {
      {}
    } else {
      stryCov_9fa48("14610");
      super(stryMutAct_9fa48("14611") ? "" : (stryCov_9fa48("14611"), "La programación sin recorrido ni objetivo admite exactamente una zona."));
      this.name = stryMutAct_9fa48("14612") ? "" : (stryCov_9fa48("14612"), "BackendServiceZoneSelectionError");
    }
  }
}
export function toCreateServiceBackendInput(input: CreateServiceInput) {
  if (stryMutAct_9fa48("14613")) {
    {}
  } else {
    stryCov_9fa48("14613");
    // El backend exige targetType y targetId juntos, e ignora zoneId cuando hay bien: un objetivo sin
    // targetId (p. ej. una dirección escrita a mano) se manda como ubicación suelta, con zoneId, y el
    // texto se conserva en las notas para no perderlo.
    const hasTarget = Boolean(stryMutAct_9fa48("14616") ? input.targetType || input.targetId : stryMutAct_9fa48("14615") ? false : stryMutAct_9fa48("14614") ? true : (stryCov_9fa48("14614", "14615", "14616"), input.targetType && input.targetId));
    const zoneIsDerived = stryMutAct_9fa48("14619") ? Boolean(input.routeId) && hasTarget : stryMutAct_9fa48("14618") ? false : stryMutAct_9fa48("14617") ? true : (stryCov_9fa48("14617", "14618", "14619"), Boolean(input.routeId) || hasTarget);
    if (stryMutAct_9fa48("14622") ? !zoneIsDerived || input.zoneIds.length !== 1 : stryMutAct_9fa48("14621") ? false : stryMutAct_9fa48("14620") ? true : (stryCov_9fa48("14620", "14621", "14622"), (stryMutAct_9fa48("14623") ? zoneIsDerived : (stryCov_9fa48("14623"), !zoneIsDerived)) && (stryMutAct_9fa48("14625") ? input.zoneIds.length === 1 : stryMutAct_9fa48("14624") ? true : (stryCov_9fa48("14624", "14625"), input.zoneIds.length !== 1)))) {
      if (stryMutAct_9fa48("14626")) {
        {}
      } else {
        stryCov_9fa48("14626");
        if (stryMutAct_9fa48("14627")) {
          ;
        } else {
          stryCov_9fa48("14627");
          throw new BackendServiceZoneSelectionError();
        }
      }
    }
    const looseTarget = (stryMutAct_9fa48("14630") ? !hasTarget || !input.routeId : stryMutAct_9fa48("14629") ? false : stryMutAct_9fa48("14628") ? true : (stryCov_9fa48("14628", "14629", "14630"), (stryMutAct_9fa48("14631") ? hasTarget : (stryCov_9fa48("14631"), !hasTarget)) && (stryMutAct_9fa48("14632") ? input.routeId : (stryCov_9fa48("14632"), !input.routeId)))) ? stryMutAct_9fa48("14634") ? input.targetRef.trim() : stryMutAct_9fa48("14633") ? input.targetRef : (stryCov_9fa48("14633", "14634"), input.targetRef?.trim()) : undefined;
    const notes = stryMutAct_9fa48("14637") ? [looseTarget ? `Objetivo: ${looseTarget}` : undefined, input.notes].filter(Boolean).join(" — ") && undefined : stryMutAct_9fa48("14636") ? false : stryMutAct_9fa48("14635") ? true : (stryCov_9fa48("14635", "14636", "14637"), (stryMutAct_9fa48("14638") ? [looseTarget ? `Objetivo: ${looseTarget}` : undefined, input.notes].join(" — ") : (stryCov_9fa48("14638"), (stryMutAct_9fa48("14639") ? [] : (stryCov_9fa48("14639"), [looseTarget ? stryMutAct_9fa48("14640") ? `` : (stryCov_9fa48("14640"), `Objetivo: ${looseTarget}`) : undefined, input.notes])).filter(Boolean).join(stryMutAct_9fa48("14641") ? "" : (stryCov_9fa48("14641"), " — ")))) || undefined);
    return stryMutAct_9fa48("14642") ? {} : (stryCov_9fa48("14642"), {
      serviceTypeId: input.serviceTypeId,
      scheduledDate: input.scheduledDate,
      origin: input.origin,
      routeId: input.routeId,
      targetType: hasTarget ? input.targetType : undefined,
      targetId: hasTarget ? input.targetId : undefined,
      ...((stryMutAct_9fa48("14643") ? zoneIsDerived : (stryCov_9fa48("14643"), !zoneIsDerived)) ? stryMutAct_9fa48("14644") ? {} : (stryCov_9fa48("14644"), {
        zoneId: input.zoneIds[0]
      }) : {}),
      crewId: stryMutAct_9fa48("14647") ? input.crewId && undefined : stryMutAct_9fa48("14646") ? false : stryMutAct_9fa48("14645") ? true : (stryCov_9fa48("14645", "14646", "14647"), input.crewId || undefined),
      vehicleId: stryMutAct_9fa48("14650") ? input.vehicleId && undefined : stryMutAct_9fa48("14649") ? false : stryMutAct_9fa48("14648") ? true : (stryCov_9fa48("14648", "14649", "14650"), input.vehicleId || undefined),
      windowFrom: input.timeWindow.start,
      windowTo: input.timeWindow.end,
      ticketId: input.ticketId,
      // El backend da 400 si el vínculo llega con otro origen, y guarda null si viene vacío.
      inspectionId: (stryMutAct_9fa48("14653") ? input.origin !== "INSPECTION" : stryMutAct_9fa48("14652") ? false : stryMutAct_9fa48("14651") ? true : (stryCov_9fa48("14651", "14652", "14653"), input.origin === (stryMutAct_9fa48("14654") ? "" : (stryCov_9fa48("14654"), "INSPECTION")))) ? stryMutAct_9fa48("14657") ? input.inspectionId?.trim() && undefined : stryMutAct_9fa48("14656") ? false : stryMutAct_9fa48("14655") ? true : (stryCov_9fa48("14655", "14656", "14657"), (stryMutAct_9fa48("14659") ? input.inspectionId.trim() : stryMutAct_9fa48("14658") ? input.inspectionId : (stryCov_9fa48("14658", "14659"), input.inspectionId?.trim())) || undefined) : undefined,
      weatherAlertId: (stryMutAct_9fa48("14662") ? input.origin !== "WEATHER_ALERT" : stryMutAct_9fa48("14661") ? false : stryMutAct_9fa48("14660") ? true : (stryCov_9fa48("14660", "14661", "14662"), input.origin === (stryMutAct_9fa48("14663") ? "" : (stryCov_9fa48("14663"), "WEATHER_ALERT")))) ? stryMutAct_9fa48("14666") ? input.weatherAlertId?.trim() && undefined : stryMutAct_9fa48("14665") ? false : stryMutAct_9fa48("14664") ? true : (stryCov_9fa48("14664", "14665", "14666"), (stryMutAct_9fa48("14668") ? input.weatherAlertId.trim() : stryMutAct_9fa48("14667") ? input.weatherAlertId : (stryCov_9fa48("14667", "14668"), input.weatherAlertId?.trim())) || undefined) : undefined,
      notes,
      overrideNote: input.overrideNote
    });
  }
}
export const containerLocationSchema = z.object(stryMutAct_9fa48("14669") ? {} : (stryCov_9fa48("14669"), {
  address: stryMutAct_9fa48("14671") ? z.string().min(1, "La nueva dirección es obligatoria.") : stryMutAct_9fa48("14670") ? z.string().trim().max(1, "La nueva dirección es obligatoria.") : (stryCov_9fa48("14670", "14671"), z.string().trim().min(1, stryMutAct_9fa48("14672") ? "" : (stryCov_9fa48("14672"), "La nueva dirección es obligatoria."))),
  lat: latitudeInput(),
  lng: longitudeInput(),
  zoneId: stryMutAct_9fa48("14674") ? z.string().min(1).optional() : stryMutAct_9fa48("14673") ? z.string().trim().max(1).optional() : (stryCov_9fa48("14673", "14674"), z.string().trim().min(1).optional())
}));
export type ContainerLocation = z.infer<typeof containerLocationSchema>;
export const completeServiceInputSchema = z.object(stryMutAct_9fa48("14675") ? {} : (stryCov_9fa48("14675"), {
  containerLocation: containerLocationSchema.optional()
}));
export type CompleteServiceInput = z.infer<typeof completeServiceInputSchema>;
export type ServiceTypeCatalogItem = {
  id: string;
  code: string;
  name: string;
  mode: ServiceMode;
  category: string;
  requiresVehicle?: boolean;
};
export const SERVICE_TYPE_CATALOG: ServiceTypeCatalogItem[] = stryMutAct_9fa48("14676") ? [] : (stryCov_9fa48("14676"), [stryMutAct_9fa48("14677") ? {} : (stryCov_9fa48("14677"), {
  id: stryMutAct_9fa48("14678") ? "" : (stryCov_9fa48("14678"), "st-waste-route"),
  code: stryMutAct_9fa48("14679") ? "" : (stryCov_9fa48("14679"), "ST-REC"),
  name: stryMutAct_9fa48("14680") ? "" : (stryCov_9fa48("14680"), "Recolección de residuos"),
  mode: stryMutAct_9fa48("14681") ? "" : (stryCov_9fa48("14681"), "ROUTE"),
  category: stryMutAct_9fa48("14682") ? "" : (stryCov_9fa48("14682"), "WASTE"),
  requiresVehicle: stryMutAct_9fa48("14683") ? false : (stryCov_9fa48("14683"), true)
}), stryMutAct_9fa48("14684") ? {} : (stryCov_9fa48("14684"), {
  id: stryMutAct_9fa48("14685") ? "" : (stryCov_9fa48("14685"), "st-street-cleaning"),
  code: stryMutAct_9fa48("14686") ? "" : (stryCov_9fa48("14686"), "ST-BAR"),
  name: stryMutAct_9fa48("14687") ? "" : (stryCov_9fa48("14687"), "Barrido mecánico"),
  mode: stryMutAct_9fa48("14688") ? "" : (stryCov_9fa48("14688"), "ROUTE"),
  category: stryMutAct_9fa48("14689") ? "" : (stryCov_9fa48("14689"), "CLEANING"),
  requiresVehicle: stryMutAct_9fa48("14690") ? false : (stryCov_9fa48("14690"), true)
}), stryMutAct_9fa48("14691") ? {} : (stryCov_9fa48("14691"), {
  id: stryMutAct_9fa48("14692") ? "" : (stryCov_9fa48("14692"), "st-tree-pruning"),
  code: stryMutAct_9fa48("14693") ? "" : (stryCov_9fa48("14693"), "ST-POD"),
  name: stryMutAct_9fa48("14694") ? "" : (stryCov_9fa48("14694"), "Poda y arbolado"),
  mode: stryMutAct_9fa48("14695") ? "" : (stryCov_9fa48("14695"), "POINT"),
  category: stryMutAct_9fa48("14696") ? "" : (stryCov_9fa48("14696"), "GREEN_SPACES"),
  requiresVehicle: stryMutAct_9fa48("14697") ? true : (stryCov_9fa48("14697"), false)
}), stryMutAct_9fa48("14698") ? {} : (stryCov_9fa48("14698"), {
  id: stryMutAct_9fa48("14699") ? "" : (stryCov_9fa48("14699"), "st-container-repair"),
  code: stryMutAct_9fa48("14700") ? "" : (stryCov_9fa48("14700"), "ST-CON-REP"),
  name: stryMutAct_9fa48("14701") ? "" : (stryCov_9fa48("14701"), "Mantenimiento de contenedores"),
  mode: stryMutAct_9fa48("14702") ? "" : (stryCov_9fa48("14702"), "POINT"),
  category: stryMutAct_9fa48("14703") ? "" : (stryCov_9fa48("14703"), "CONTAINERS"),
  requiresVehicle: stryMutAct_9fa48("14704") ? false : (stryCov_9fa48("14704"), true)
}), stryMutAct_9fa48("14705") ? {} : (stryCov_9fa48("14705"), {
  id: stryMutAct_9fa48("14706") ? "" : (stryCov_9fa48("14706"), "st-container-survey"),
  code: stryMutAct_9fa48("14707") ? "" : (stryCov_9fa48("14707"), "ST-CON-SRV"),
  name: stryMutAct_9fa48("14708") ? "" : (stryCov_9fa48("14708"), "Relevamiento de contenedores"),
  mode: stryMutAct_9fa48("14709") ? "" : (stryCov_9fa48("14709"), "POINT"),
  category: stryMutAct_9fa48("14710") ? "" : (stryCov_9fa48("14710"), "CONTAINERS"),
  requiresVehicle: stryMutAct_9fa48("14711") ? true : (stryCov_9fa48("14711"), false)
}), stryMutAct_9fa48("14712") ? {} : (stryCov_9fa48("14712"), {
  id: stryMutAct_9fa48("14713") ? "" : (stryCov_9fa48("14713"), "st-dump-clearing"),
  code: stryMutAct_9fa48("14714") ? "" : (stryCov_9fa48("14714"), "ST-BAS"),
  name: stryMutAct_9fa48("14715") ? "" : (stryCov_9fa48("14715"), "Limpieza de microbasural"),
  mode: stryMutAct_9fa48("14716") ? "" : (stryCov_9fa48("14716"), "POINT"),
  category: stryMutAct_9fa48("14717") ? "" : (stryCov_9fa48("14717"), "CLEANING"),
  requiresVehicle: stryMutAct_9fa48("14718") ? false : (stryCov_9fa48("14718"), true)
}), stryMutAct_9fa48("14719") ? {} : (stryCov_9fa48("14719"), {
  id: stryMutAct_9fa48("14720") ? "" : (stryCov_9fa48("14720"), "st-green-inspection"),
  code: stryMutAct_9fa48("14721") ? "" : (stryCov_9fa48("14721"), "ST-PV-INS"),
  name: stryMutAct_9fa48("14722") ? "" : (stryCov_9fa48("14722"), "Inspección de puntos verdes"),
  mode: stryMutAct_9fa48("14723") ? "" : (stryCov_9fa48("14723"), "POINT"),
  category: stryMutAct_9fa48("14724") ? "" : (stryCov_9fa48("14724"), "GREEN_SPACES"),
  requiresVehicle: stryMutAct_9fa48("14725") ? true : (stryCov_9fa48("14725"), false)
}), stryMutAct_9fa48("14726") ? {} : (stryCov_9fa48("14726"), {
  id: stryMutAct_9fa48("14727") ? "" : (stryCov_9fa48("14727"), "st-env-inspection"),
  code: stryMutAct_9fa48("14728") ? "" : (stryCov_9fa48("14728"), "ST-AMB-INS"),
  name: stryMutAct_9fa48("14729") ? "" : (stryCov_9fa48("14729"), "Inspección ambiental"),
  mode: stryMutAct_9fa48("14730") ? "" : (stryCov_9fa48("14730"), "POINT"),
  category: stryMutAct_9fa48("14731") ? "" : (stryCov_9fa48("14731"), "ENVIRONMENT"),
  requiresVehicle: stryMutAct_9fa48("14732") ? true : (stryCov_9fa48("14732"), false)
})]);
export type RouteCatalogItem = {
  id: string;
  code: string;
  name: string;
  zoneIds: string[];
  zoneNames: string[];
};
export const ROUTE_CATALOG: RouteCatalogItem[] = stryMutAct_9fa48("14733") ? [] : (stryCov_9fa48("14733"), [stryMutAct_9fa48("14734") ? {} : (stryCov_9fa48("14734"), {
  id: stryMutAct_9fa48("14735") ? "" : (stryCov_9fa48("14735"), "route-1"),
  code: stryMutAct_9fa48("14736") ? "" : (stryCov_9fa48("14736"), "R-01"),
  name: stryMutAct_9fa48("14737") ? "" : (stryCov_9fa48("14737"), "Recorrido 1 Centro"),
  zoneIds: stryMutAct_9fa48("14738") ? [] : (stryCov_9fa48("14738"), [stryMutAct_9fa48("14739") ? "" : (stryCov_9fa48("14739"), "zone-3")]),
  zoneNames: stryMutAct_9fa48("14740") ? [] : (stryCov_9fa48("14740"), [stryMutAct_9fa48("14741") ? "" : (stryCov_9fa48("14741"), "Zona Centro")])
}), stryMutAct_9fa48("14742") ? {} : (stryCov_9fa48("14742"), {
  id: stryMutAct_9fa48("14743") ? "" : (stryCov_9fa48("14743"), "route-2"),
  code: stryMutAct_9fa48("14744") ? "" : (stryCov_9fa48("14744"), "R-02"),
  name: stryMutAct_9fa48("14745") ? "" : (stryCov_9fa48("14745"), "Recorrido 2 Sur"),
  zoneIds: stryMutAct_9fa48("14746") ? [] : (stryCov_9fa48("14746"), [stryMutAct_9fa48("14747") ? "" : (stryCov_9fa48("14747"), "zone-2")]),
  zoneNames: stryMutAct_9fa48("14748") ? [] : (stryCov_9fa48("14748"), [stryMutAct_9fa48("14749") ? "" : (stryCov_9fa48("14749"), "Zona Sur")])
}), stryMutAct_9fa48("14750") ? {} : (stryCov_9fa48("14750"), {
  id: stryMutAct_9fa48("14751") ? "" : (stryCov_9fa48("14751"), "route-3"),
  code: stryMutAct_9fa48("14752") ? "" : (stryCov_9fa48("14752"), "R-03"),
  name: stryMutAct_9fa48("14753") ? "" : (stryCov_9fa48("14753"), "Recorrido 3 Norte"),
  zoneIds: stryMutAct_9fa48("14754") ? [] : (stryCov_9fa48("14754"), [stryMutAct_9fa48("14755") ? "" : (stryCov_9fa48("14755"), "zone-1")]),
  zoneNames: stryMutAct_9fa48("14756") ? [] : (stryCov_9fa48("14756"), [stryMutAct_9fa48("14757") ? "" : (stryCov_9fa48("14757"), "Zona Norte")])
}), stryMutAct_9fa48("14758") ? {} : (stryCov_9fa48("14758"), {
  id: stryMutAct_9fa48("14759") ? "" : (stryCov_9fa48("14759"), "route-4"),
  code: stryMutAct_9fa48("14760") ? "" : (stryCov_9fa48("14760"), "R-04"),
  name: stryMutAct_9fa48("14761") ? "" : (stryCov_9fa48("14761"), "Recorrido 4 Norte"),
  zoneIds: stryMutAct_9fa48("14762") ? [] : (stryCov_9fa48("14762"), [stryMutAct_9fa48("14763") ? "" : (stryCov_9fa48("14763"), "zone-1")]),
  zoneNames: stryMutAct_9fa48("14764") ? [] : (stryCov_9fa48("14764"), [stryMutAct_9fa48("14765") ? "" : (stryCov_9fa48("14765"), "Zona Norte")])
})]);
export const assignCrewInputSchema = z.object(stryMutAct_9fa48("14766") ? {} : (stryCov_9fa48("14766"), {
  crewId: stryMutAct_9fa48("14767") ? z.string().max(1, "Debe seleccionar una cuadrilla") : (stryCov_9fa48("14767"), z.string().min(1, stryMutAct_9fa48("14768") ? "" : (stryCov_9fa48("14768"), "Debe seleccionar una cuadrilla"))),
  vehicleId: z.string().nullable().optional(),
  overrideNote: overrideNoteSchema
}));
export type AssignCrewInput = z.infer<typeof assignCrewInputSchema>;
export const SUSPEND_NOTE_MAX_LENGTH = 500;
const suspendServiceNoteSchema = stryMutAct_9fa48("14770") ? z.string().min(SUSPEND_NOTE_MAX_LENGTH, `La nota de suspensión no puede superar los ${SUSPEND_NOTE_MAX_LENGTH} caracteres.`).trim() : stryMutAct_9fa48("14769") ? z.string().max(SUSPEND_NOTE_MAX_LENGTH, `La nota de suspensión no puede superar los ${SUSPEND_NOTE_MAX_LENGTH} caracteres.`) : (stryCov_9fa48("14769", "14770"), z.string().max(SUSPEND_NOTE_MAX_LENGTH, stryMutAct_9fa48("14771") ? `` : (stryCov_9fa48("14771"), `La nota de suspensión no puede superar los ${SUSPEND_NOTE_MAX_LENGTH} caracteres.`)).trim());

// The Field form keeps the note required; the BFF accepts the backend's optional note contract.
export const suspendServiceInputSchema = z.object(stryMutAct_9fa48("14772") ? {} : (stryCov_9fa48("14772"), {
  reason: notServicedReasonSchema,
  note: stryMutAct_9fa48("14773") ? suspendServiceNoteSchema.max(1, "La nota es obligatoria para suspender el servicio") : (stryCov_9fa48("14773"), suspendServiceNoteSchema.min(1, stryMutAct_9fa48("14774") ? "" : (stryCov_9fa48("14774"), "La nota es obligatoria para suspender el servicio")))
}));
export const suspendServiceRequestSchema = z.object(stryMutAct_9fa48("14775") ? {} : (stryCov_9fa48("14775"), {
  reason: notServicedReasonSchema,
  note: suspendServiceNoteSchema.optional()
}));
export type SuspendServiceInput = z.infer<typeof suspendServiceInputSchema>;
export type SuspendServiceRequest = z.infer<typeof suspendServiceRequestSchema>;
export function toSuspendServiceBackendInput(input: SuspendServiceRequest) {
  if (stryMutAct_9fa48("14776")) {
    {}
  } else {
    stryCov_9fa48("14776");
    const note = stryMutAct_9fa48("14778") ? input.note.trim() : stryMutAct_9fa48("14777") ? input.note : (stryCov_9fa48("14777", "14778"), input.note?.trim());
    return stryMutAct_9fa48("14779") ? {} : (stryCov_9fa48("14779"), {
      reason: NOT_SERVICED_REASON_LABEL[input.reason],
      ...(note ? stryMutAct_9fa48("14780") ? {} : (stryCov_9fa48("14780"), {
        note
      }) : {})
    });
  }
}
export const rescheduleServiceInputSchema = z.object(stryMutAct_9fa48("14781") ? {} : (stryCov_9fa48("14781"), {
  reason: reasonInput(stryMutAct_9fa48("14782") ? "" : (stryCov_9fa48("14782"), "El motivo es obligatorio para reprogramar el servicio"))
}));
export type RescheduleServiceInput = z.infer<typeof rescheduleServiceInputSchema>;
export const cancelServiceInputSchema = z.object(stryMutAct_9fa48("14783") ? {} : (stryCov_9fa48("14783"), {
  reason: reasonInput(stryMutAct_9fa48("14784") ? "" : (stryCov_9fa48("14784"), "El motivo es obligatorio para cancelar el servicio"))
}));
export type CancelServiceInput = z.infer<typeof cancelServiceInputSchema>;
export const confirmRescheduleInputSchema = z.object(stryMutAct_9fa48("14785") ? {} : (stryCov_9fa48("14785"), {
  scheduledDate: z.string().regex(stryMutAct_9fa48("14793") ? /^\d{4}-\d{2}-\D{2}$/ : stryMutAct_9fa48("14792") ? /^\d{4}-\d{2}-\d$/ : stryMutAct_9fa48("14791") ? /^\d{4}-\D{2}-\d{2}$/ : stryMutAct_9fa48("14790") ? /^\d{4}-\d-\d{2}$/ : stryMutAct_9fa48("14789") ? /^\D{4}-\d{2}-\d{2}$/ : stryMutAct_9fa48("14788") ? /^\d-\d{2}-\d{2}$/ : stryMutAct_9fa48("14787") ? /^\d{4}-\d{2}-\d{2}/ : stryMutAct_9fa48("14786") ? /\d{4}-\d{2}-\d{2}$/ : (stryCov_9fa48("14786", "14787", "14788", "14789", "14790", "14791", "14792", "14793"), /^\d{4}-\d{2}-\d{2}$/), stryMutAct_9fa48("14794") ? "" : (stryCov_9fa48("14794"), "La fecha debe tener formato YYYY-MM-DD")).refine(stryMutAct_9fa48("14795") ? () => undefined : (stryCov_9fa48("14795"), value => stryMutAct_9fa48("14798") ? !/^\d{4}-\d{2}-\d{2}$/.test(value) && value >= todayInArgentina() : stryMutAct_9fa48("14797") ? false : stryMutAct_9fa48("14796") ? true : (stryCov_9fa48("14796", "14797", "14798"), (stryMutAct_9fa48("14799") ? /^\d{4}-\d{2}-\d{2}$/.test(value) : (stryCov_9fa48("14799"), !(stryMutAct_9fa48("14807") ? /^\d{4}-\d{2}-\D{2}$/ : stryMutAct_9fa48("14806") ? /^\d{4}-\d{2}-\d$/ : stryMutAct_9fa48("14805") ? /^\d{4}-\D{2}-\d{2}$/ : stryMutAct_9fa48("14804") ? /^\d{4}-\d-\d{2}$/ : stryMutAct_9fa48("14803") ? /^\D{4}-\d{2}-\d{2}$/ : stryMutAct_9fa48("14802") ? /^\d-\d{2}-\d{2}$/ : stryMutAct_9fa48("14801") ? /^\d{4}-\d{2}-\d{2}/ : stryMutAct_9fa48("14800") ? /\d{4}-\d{2}-\d{2}$/ : (stryCov_9fa48("14800", "14801", "14802", "14803", "14804", "14805", "14806", "14807"), /^\d{4}-\d{2}-\d{2}$/)).test(value))) || (stryMutAct_9fa48("14810") ? value < todayInArgentina() : stryMutAct_9fa48("14809") ? value > todayInArgentina() : stryMutAct_9fa48("14808") ? false : (stryCov_9fa48("14808", "14809", "14810"), value >= todayInArgentina())))), stryMutAct_9fa48("14811") ? "" : (stryCov_9fa48("14811"), "La nueva fecha no puede ser anterior a hoy.")),
  timeWindow: z.object(stryMutAct_9fa48("14812") ? {} : (stryCov_9fa48("14812"), {
    start: z.string().regex(stryMutAct_9fa48("14818") ? /^\d{2}:\D{2}$/ : stryMutAct_9fa48("14817") ? /^\d{2}:\d$/ : stryMutAct_9fa48("14816") ? /^\D{2}:\d{2}$/ : stryMutAct_9fa48("14815") ? /^\d:\d{2}$/ : stryMutAct_9fa48("14814") ? /^\d{2}:\d{2}/ : stryMutAct_9fa48("14813") ? /\d{2}:\d{2}$/ : (stryCov_9fa48("14813", "14814", "14815", "14816", "14817", "14818"), /^\d{2}:\d{2}$/), stryMutAct_9fa48("14819") ? "" : (stryCov_9fa48("14819"), "Hora de inicio inválida (HH:MM)")),
    end: z.string().regex(stryMutAct_9fa48("14825") ? /^\d{2}:\D{2}$/ : stryMutAct_9fa48("14824") ? /^\d{2}:\d$/ : stryMutAct_9fa48("14823") ? /^\D{2}:\d{2}$/ : stryMutAct_9fa48("14822") ? /^\d:\d{2}$/ : stryMutAct_9fa48("14821") ? /^\d{2}:\d{2}/ : stryMutAct_9fa48("14820") ? /\d{2}:\d{2}$/ : (stryCov_9fa48("14820", "14821", "14822", "14823", "14824", "14825"), /^\d{2}:\d{2}$/), stryMutAct_9fa48("14826") ? "" : (stryCov_9fa48("14826"), "Hora de fin inválida (HH:MM)"))
  }))
}));
export type ConfirmRescheduleInput = z.infer<typeof confirmRescheduleInputSchema>;
export function toConfirmRescheduleBackendInput(input: ConfirmRescheduleInput) {
  if (stryMutAct_9fa48("14827")) {
    {}
  } else {
    stryCov_9fa48("14827");
    return stryMutAct_9fa48("14828") ? {} : (stryCov_9fa48("14828"), {
      scheduledDate: input.scheduledDate,
      windowFrom: input.timeWindow.start,
      windowTo: input.timeWindow.end
    });
  }
}
export const recordZoneResultInputSchema = z.object(stryMutAct_9fa48("14829") ? {} : (stryCov_9fa48("14829"), {
  zoneId: stryMutAct_9fa48("14830") ? z.string().max(1, "Debe seleccionar una zona") : (stryCov_9fa48("14830"), z.string().min(1, stryMutAct_9fa48("14831") ? "" : (stryCov_9fa48("14831"), "Debe seleccionar una zona"))),
  status: zoneResultStatusSchema,
  reason: notServicedReasonSchema.nullable().optional(),
  notes: z.string().nullable().optional(),
  proposedDate: z.string().nullable().optional()
})).superRefine((data, ctx) => {
  if (stryMutAct_9fa48("14832")) {
    {}
  } else {
    stryCov_9fa48("14832");
    if (stryMutAct_9fa48("14835") ? data.status !== "SERVICED" || !data.reason : stryMutAct_9fa48("14834") ? false : stryMutAct_9fa48("14833") ? true : (stryCov_9fa48("14833", "14834", "14835"), (stryMutAct_9fa48("14837") ? data.status === "SERVICED" : stryMutAct_9fa48("14836") ? true : (stryCov_9fa48("14836", "14837"), data.status !== (stryMutAct_9fa48("14838") ? "" : (stryCov_9fa48("14838"), "SERVICED")))) && (stryMutAct_9fa48("14839") ? data.reason : (stryCov_9fa48("14839"), !data.reason)))) {
      if (stryMutAct_9fa48("14840")) {
        {}
      } else {
        stryCov_9fa48("14840");
        ctx.addIssue(stryMutAct_9fa48("14842") ? {} : (stryCov_9fa48("14842"), {
          code: z.ZodIssueCode.custom,
          path: stryMutAct_9fa48("14843") ? [] : (stryCov_9fa48("14843"), [stryMutAct_9fa48("14844") ? "" : (stryCov_9fa48("14844"), "reason")]),
          message: stryMutAct_9fa48("14845") ? "" : (stryCov_9fa48("14845"), "El motivo es obligatorio para resultados parciales o no atendidos")
        }));
      }
    }
    if (stryMutAct_9fa48("14848") ? data.status === "SERVICED" || data.reason : stryMutAct_9fa48("14847") ? false : stryMutAct_9fa48("14846") ? true : (stryCov_9fa48("14846", "14847", "14848"), (stryMutAct_9fa48("14850") ? data.status !== "SERVICED" : stryMutAct_9fa48("14849") ? true : (stryCov_9fa48("14849", "14850"), data.status === (stryMutAct_9fa48("14851") ? "" : (stryCov_9fa48("14851"), "SERVICED")))) && data.reason)) {
      if (stryMutAct_9fa48("14852")) {
        {}
      } else {
        stryCov_9fa48("14852");
        ctx.addIssue(stryMutAct_9fa48("14854") ? {} : (stryCov_9fa48("14854"), {
          code: z.ZodIssueCode.custom,
          path: stryMutAct_9fa48("14855") ? [] : (stryCov_9fa48("14855"), [stryMutAct_9fa48("14856") ? "" : (stryCov_9fa48("14856"), "reason")]),
          message: stryMutAct_9fa48("14857") ? "" : (stryCov_9fa48("14857"), "No debe especificarse motivo para zonas atendidas")
        }));
      }
    }
  }
});
export type RecordZoneResultInput = z.infer<typeof recordZoneResultInputSchema>;
export const evidenceOwnerTypeSchema = z.enum(stryMutAct_9fa48("14858") ? [] : (stryCov_9fa48("14858"), [stryMutAct_9fa48("14859") ? "" : (stryCov_9fa48("14859"), "ZONE_RESULT"), stryMutAct_9fa48("14860") ? "" : (stryCov_9fa48("14860"), "SERVICE"), stryMutAct_9fa48("14861") ? "" : (stryCov_9fa48("14861"), "INSPECTION"), stryMutAct_9fa48("14862") ? "" : (stryCov_9fa48("14862"), "CONTAINER")]));
export type EvidenceOwnerType = z.infer<typeof evidenceOwnerTypeSchema>;
export const ZONE_RESULT_STATUS_LABEL: Record<ZoneResultStatus, string> = stryMutAct_9fa48("14863") ? {} : (stryCov_9fa48("14863"), {
  SERVICED: stryMutAct_9fa48("14864") ? "" : (stryCov_9fa48("14864"), "Atendida"),
  PARTIAL: stryMutAct_9fa48("14865") ? "" : (stryCov_9fa48("14865"), "Parcial"),
  NOT_SERVICED: stryMutAct_9fa48("14866") ? "" : (stryCov_9fa48("14866"), "No atendida")
});
export const NOT_SERVICED_REASON_LABEL: Record<NotServicedReason, string> = stryMutAct_9fa48("14867") ? {} : (stryCov_9fa48("14867"), {
  VEHICLE_BREAKDOWN: stryMutAct_9fa48("14868") ? "" : (stryCov_9fa48("14868"), "Desperfecto vehicular"),
  CREW_UNAVAILABLE: stryMutAct_9fa48("14869") ? "" : (stryCov_9fa48("14869"), "Cuadrilla no disponible"),
  BLOCKED_ACCESS: stryMutAct_9fa48("14870") ? "" : (stryCov_9fa48("14870"), "Acceso bloqueado"),
  STREET_CLOSURE: stryMutAct_9fa48("14871") ? "" : (stryCov_9fa48("14871"), "Corte de calle / Obra"),
  WEATHER: stryMutAct_9fa48("14872") ? "" : (stryCov_9fa48("14872"), "Condición meteorológica"),
  EXCESS_VOLUME: stryMutAct_9fa48("14873") ? "" : (stryCov_9fa48("14873"), "Exceso de volumen"),
  SECURITY_INCIDENT: stryMutAct_9fa48("14874") ? "" : (stryCov_9fa48("14874"), "Incidente de seguridad"),
  OTHER: stryMutAct_9fa48("14875") ? "" : (stryCov_9fa48("14875"), "Otro motivo")
});
export const serviceQuerySchema = z.object(stryMutAct_9fa48("14876") ? {} : (stryCov_9fa48("14876"), {
  status: z.union(stryMutAct_9fa48("14877") ? [] : (stryCov_9fa48("14877"), [serviceStatusSchema, z.array(serviceStatusSchema)])).optional(),
  mode: serviceModeSchema.optional(),
  origin: serviceOriginSchema.optional(),
  serviceTypeId: stryMutAct_9fa48("14878") ? z.string().max(1).optional() : (stryCov_9fa48("14878"), z.string().min(1).optional()),
  vehicleId: stryMutAct_9fa48("14879") ? z.string().max(1).optional() : (stryCov_9fa48("14879"), z.string().min(1).optional()),
  ticketId: stryMutAct_9fa48("14880") ? z.string().max(1).optional() : (stryCov_9fa48("14880"), z.string().min(1).optional()),
  zoneId: stryMutAct_9fa48("14881") ? z.string().max(1).optional() : (stryCov_9fa48("14881"), z.string().min(1).optional()),
  crewId: stryMutAct_9fa48("14882") ? z.string().max(1).optional() : (stryCov_9fa48("14882"), z.string().min(1).optional()),
  scheduledFrom: z.union(stryMutAct_9fa48("14883") ? [] : (stryCov_9fa48("14883"), [z.iso.date(), z.iso.datetime(stryMutAct_9fa48("14884") ? {} : (stryCov_9fa48("14884"), {
    offset: stryMutAct_9fa48("14885") ? false : (stryCov_9fa48("14885"), true)
  }))])).optional(),
  scheduledTo: z.union(stryMutAct_9fa48("14886") ? [] : (stryCov_9fa48("14886"), [z.iso.date(), z.iso.datetime(stryMutAct_9fa48("14887") ? {} : (stryCov_9fa48("14887"), {
    offset: stryMutAct_9fa48("14888") ? false : (stryCov_9fa48("14888"), true)
  }))])).optional(),
  search: z.string().optional(),
  timeFrom: z.string().optional(),
  timeTo: z.string().optional(),
  page: z.number().int().optional(),
  pageSize: z.number().int().optional()
}));
export type ServiceQuery = {
  status?: ServiceStatus | ServiceStatus[];
  mode?: ServiceMode;
  origin?: ServiceOrigin;
  zoneId?: string;
  crewId?: string;
  serviceTypeId?: string;
  vehicleId?: string;
  ticketId?: string;
  search?: string;
  timeFrom?: string;
  timeTo?: string;
  scheduledFrom?: string;
  scheduledTo?: string;
  page?: number;
  pageSize?: number;
};
export type ServicesPage = {
  services: Service[];
  /** Records of this page dropped for an unknown enum value (not the same as `total` exceeding the rows shown). */
  dropped?: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export class ServiceContractError extends Error {
  constructor(message: string, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("14889")) {
      {}
    } else {
      stryCov_9fa48("14889");
      super(message, options);
      this.name = stryMutAct_9fa48("14890") ? "" : (stryCov_9fa48("14890"), "ServiceContractError");
    }
  }
}
export class ServiceRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("14891")) {
      {}
    } else {
      stryCov_9fa48("14891");
      super(message, options);
      this.name = stryMutAct_9fa48("14892") ? "" : (stryCov_9fa48("14892"), "ServiceRequestError");
      this.status = status;
    }
  }
}
export class ServiceStartBlockedError extends ServiceRequestError {
  readonly streetClosureRequest: StreetClosureRequest;
  constructor(message: string, streetClosureRequest: StreetClosureRequest) {
    if (stryMutAct_9fa48("14893")) {
      {}
    } else {
      stryCov_9fa48("14893");
      super(message, 409);
      this.name = stryMutAct_9fa48("14894") ? "" : (stryCov_9fa48("14894"), "ServiceStartBlockedError");
      this.streetClosureRequest = streetClosureRequest;
    }
  }
}
export const STATUS_LABEL: Record<ServiceStatus, string> = stryMutAct_9fa48("14895") ? {} : (stryCov_9fa48("14895"), {
  SCHEDULED: stryMutAct_9fa48("14896") ? "" : (stryCov_9fa48("14896"), "Programado"),
  RESCHEDULED: stryMutAct_9fa48("14897") ? "" : (stryCov_9fa48("14897"), "A reprogramar"),
  IN_PROGRESS: stryMutAct_9fa48("14898") ? "" : (stryCov_9fa48("14898"), "En curso"),
  SUSPENDED: stryMutAct_9fa48("14899") ? "" : (stryCov_9fa48("14899"), "Suspendido"),
  COMPLETED: stryMutAct_9fa48("14900") ? "" : (stryCov_9fa48("14900"), "Completado"),
  PARTIALLY_COMPLETED: stryMutAct_9fa48("14901") ? "" : (stryCov_9fa48("14901"), "Parcial"),
  CANCELLED: stryMutAct_9fa48("14902") ? "" : (stryCov_9fa48("14902"), "Cancelado")
});

// Lifecycle-aware order for sorting: early -> active -> suspended -> completed -> cancelled
export const STATUS_ORDER: Record<ServiceStatus, number> = stryMutAct_9fa48("14903") ? {} : (stryCov_9fa48("14903"), {
  SCHEDULED: 0,
  RESCHEDULED: 1,
  IN_PROGRESS: 2,
  SUSPENDED: 3,
  COMPLETED: 4,
  PARTIALLY_COMPLETED: 5,
  CANCELLED: 6
});
export const servicesEnvelopeSchema = z.object(stryMutAct_9fa48("14904") ? {} : (stryCov_9fa48("14904"), {
  data: tolerantRecords(serviceWireSchema, stryMutAct_9fa48("14905") ? "" : (stryCov_9fa48("14905"), "services")),
  meta: z.object(stryMutAct_9fa48("14906") ? {} : (stryCov_9fa48("14906"), {
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
    // Set by the BFF, which parses (and so drops) before re-serializing.
    dropped: z.number().int().nonnegative().optional()
  }))
}));
const errorResponseSchema = z.object(stryMutAct_9fa48("14907") ? {} : (stryCov_9fa48("14907"), {
  statusCode: z.number(),
  message: z.union(stryMutAct_9fa48("14908") ? [] : (stryCov_9fa48("14908"), [z.string(), z.array(z.string())])),
  error: z.string(),
  timestamp: z.string(),
  path: z.string()
}));
function buildServicesQueryString(query: ServiceQuery): string {
  if (stryMutAct_9fa48("14909")) {
    {}
  } else {
    stryCov_9fa48("14909");
    const params = new URLSearchParams();
    if (stryMutAct_9fa48("14911") ? false : stryMutAct_9fa48("14910") ? true : (stryCov_9fa48("14910", "14911"), query.status)) {
      if (stryMutAct_9fa48("14912")) {
        {}
      } else {
        stryCov_9fa48("14912");
        if (stryMutAct_9fa48("14914") ? false : stryMutAct_9fa48("14913") ? true : (stryCov_9fa48("14913", "14914"), Array.isArray(query.status))) {
          if (stryMutAct_9fa48("14915")) {
            {}
          } else {
            stryCov_9fa48("14915");
            query.status.forEach(stryMutAct_9fa48("14917") ? () => undefined : (stryCov_9fa48("14917"), st => params.append(stryMutAct_9fa48("14918") ? "" : (stryCov_9fa48("14918"), "status"), st)));
          }
        } else {
          if (stryMutAct_9fa48("14919")) {
            {}
          } else {
            stryCov_9fa48("14919");
            params.set(stryMutAct_9fa48("14921") ? "" : (stryCov_9fa48("14921"), "status"), query.status);
          }
        }
      }
    }
    if (stryMutAct_9fa48("14923") ? false : stryMutAct_9fa48("14922") ? true : (stryCov_9fa48("14922", "14923"), query.mode)) params.set(stryMutAct_9fa48("14925") ? "" : (stryCov_9fa48("14925"), "mode"), query.mode);
    if (stryMutAct_9fa48("14927") ? false : stryMutAct_9fa48("14926") ? true : (stryCov_9fa48("14926", "14927"), query.origin)) params.set(stryMutAct_9fa48("14929") ? "" : (stryCov_9fa48("14929"), "origin"), query.origin);
    if (stryMutAct_9fa48("14931") ? false : stryMutAct_9fa48("14930") ? true : (stryCov_9fa48("14930", "14931"), query.zoneId)) params.set(stryMutAct_9fa48("14933") ? "" : (stryCov_9fa48("14933"), "zoneId"), query.zoneId);
    if (stryMutAct_9fa48("14935") ? false : stryMutAct_9fa48("14934") ? true : (stryCov_9fa48("14934", "14935"), query.crewId)) params.set(stryMutAct_9fa48("14937") ? "" : (stryCov_9fa48("14937"), "crewId"), query.crewId);
    if (stryMutAct_9fa48("14939") ? false : stryMutAct_9fa48("14938") ? true : (stryCov_9fa48("14938", "14939"), query.serviceTypeId)) params.set(stryMutAct_9fa48("14941") ? "" : (stryCov_9fa48("14941"), "serviceTypeId"), query.serviceTypeId);
    if (stryMutAct_9fa48("14943") ? false : stryMutAct_9fa48("14942") ? true : (stryCov_9fa48("14942", "14943"), query.vehicleId)) params.set(stryMutAct_9fa48("14945") ? "" : (stryCov_9fa48("14945"), "vehicleId"), query.vehicleId);
    if (stryMutAct_9fa48("14947") ? false : stryMutAct_9fa48("14946") ? true : (stryCov_9fa48("14946", "14947"), query.ticketId)) params.set(stryMutAct_9fa48("14949") ? "" : (stryCov_9fa48("14949"), "ticketId"), query.ticketId);
    if (stryMutAct_9fa48("14951") ? false : stryMutAct_9fa48("14950") ? true : (stryCov_9fa48("14950", "14951"), query.search)) params.set(stryMutAct_9fa48("14953") ? "" : (stryCov_9fa48("14953"), "search"), query.search);
    if (stryMutAct_9fa48("14955") ? false : stryMutAct_9fa48("14954") ? true : (stryCov_9fa48("14954", "14955"), query.timeFrom)) params.set(stryMutAct_9fa48("14957") ? "" : (stryCov_9fa48("14957"), "timeFrom"), query.timeFrom);
    if (stryMutAct_9fa48("14959") ? false : stryMutAct_9fa48("14958") ? true : (stryCov_9fa48("14958", "14959"), query.timeTo)) params.set(stryMutAct_9fa48("14961") ? "" : (stryCov_9fa48("14961"), "timeTo"), query.timeTo);
    if (stryMutAct_9fa48("14963") ? false : stryMutAct_9fa48("14962") ? true : (stryCov_9fa48("14962", "14963"), query.scheduledFrom)) params.set(stryMutAct_9fa48("14965") ? "" : (stryCov_9fa48("14965"), "scheduledFrom"), query.scheduledFrom);
    if (stryMutAct_9fa48("14967") ? false : stryMutAct_9fa48("14966") ? true : (stryCov_9fa48("14966", "14967"), query.scheduledTo)) params.set(stryMutAct_9fa48("14969") ? "" : (stryCov_9fa48("14969"), "scheduledTo"), query.scheduledTo);
    if (stryMutAct_9fa48("14972") ? query.page === undefined : stryMutAct_9fa48("14971") ? false : stryMutAct_9fa48("14970") ? true : (stryCov_9fa48("14970", "14971", "14972"), query.page !== undefined)) params.set(stryMutAct_9fa48("14974") ? "" : (stryCov_9fa48("14974"), "page"), String(query.page));
    if (stryMutAct_9fa48("14977") ? query.pageSize === undefined : stryMutAct_9fa48("14976") ? false : stryMutAct_9fa48("14975") ? true : (stryCov_9fa48("14975", "14976", "14977"), query.pageSize !== undefined)) params.set(stryMutAct_9fa48("14979") ? "" : (stryCov_9fa48("14979"), "pageSize"), String(query.pageSize));
    const queryString = params.toString();
    return queryString ? stryMutAct_9fa48("14980") ? `` : (stryCov_9fa48("14980"), `?${queryString}`) : stryMutAct_9fa48("14981") ? "Stryker was here!" : (stryCov_9fa48("14981"), "");
  }
}
async function readJsonBody(response: Response): Promise<unknown> {
  if (stryMutAct_9fa48("14982")) {
    {}
  } else {
    stryCov_9fa48("14982");
    try {
      if (stryMutAct_9fa48("14983")) {
        {}
      } else {
        stryCov_9fa48("14983");
        return await response.json();
      }
    } catch (cause) {
      if (stryMutAct_9fa48("14984")) {
        {}
      } else {
        stryCov_9fa48("14984");
        recordTelemetryEvent(stryMutAct_9fa48("14986") ? {} : (stryCov_9fa48("14986"), {
          name: stryMutAct_9fa48("14987") ? "" : (stryCov_9fa48("14987"), "request_malformed_response"),
          resource: stryMutAct_9fa48("14988") ? "" : (stryCov_9fa48("14988"), "services")
        }));
        throw new ServiceContractError(stryMutAct_9fa48("14990") ? "" : (stryCov_9fa48("14990"), "No se pudo obtener información válida de servicios. Reintente en unos segundos."), stryMutAct_9fa48("14991") ? {} : (stryCov_9fa48("14991"), {
          cause
        }));
      }
    }
  }
}

/**
 * Completa lo que el backend no manda: el título del servicio y los nombres de sus
 * zonas y de su cuadrilla, resueltos contra los catálogos. Es el único lugar donde se parsea una
 * respuesta de servicio, así que el listado, el detalle y cada transición devuelven
 * el mismo título y no se degrada después de una acción.
 */
async function completarEtiquetas(wire: z.infer<typeof serviceWireSchema>): Promise<Service> {
  if (stryMutAct_9fa48("14992")) {
    {}
  } else {
    stryCov_9fa48("14992");
    const {
      serviceTypes,
      zones,
      crews,
      vehicles
    } = await catalogoDeEtiquetas();
    const nombresDeZona = stryMutAct_9fa48("14993") ? wire.zoneIds.map(zoneId => zones.get(zoneId)) : (stryCov_9fa48("14993"), wire.zoneIds.map(stryMutAct_9fa48("14994") ? () => undefined : (stryCov_9fa48("14994"), zoneId => zones.get(zoneId))).filter(stryMutAct_9fa48("14995") ? () => undefined : (stryCov_9fa48("14995"), (nombre): nombre is string => Boolean(nombre))));
    const tipo = serviceTypes.get(wire.serviceTypeId);
    const nombreDeTipo = stryMutAct_9fa48("14996") ? tipo.name : (stryCov_9fa48("14996"), tipo?.name);
    return stryMutAct_9fa48("14997") ? {} : (stryCov_9fa48("14997"), {
      ...wire,
      serviceTypeName: stryMutAct_9fa48("14998") ? nombreDeTipo && wire.serviceTypeName : (stryCov_9fa48("14998"), nombreDeTipo ?? wire.serviceTypeName),
      serviceTypeCategory: stryMutAct_9fa48("14999") ? tipo?.category && wire.serviceTypeCategory : (stryCov_9fa48("14999"), (stryMutAct_9fa48("15000") ? tipo.category : (stryCov_9fa48("15000"), tipo?.category)) ?? wire.serviceTypeCategory),
      zoneNames: (stryMutAct_9fa48("15004") ? wire.zoneNames.length <= 0 : stryMutAct_9fa48("15003") ? wire.zoneNames.length >= 0 : stryMutAct_9fa48("15002") ? false : stryMutAct_9fa48("15001") ? true : (stryCov_9fa48("15001", "15002", "15003", "15004"), wire.zoneNames.length > 0)) ? wire.zoneNames : nombresDeZona,
      crewName: stryMutAct_9fa48("15005") ? wire.crewName && (wire.crewId ? crews.get(wire.crewId) ?? null : null) : (stryCov_9fa48("15005"), wire.crewName ?? (wire.crewId ? stryMutAct_9fa48("15006") ? crews.get(wire.crewId) && null : (stryCov_9fa48("15006"), crews.get(wire.crewId) ?? null) : null)),
      vehiclePlate: stryMutAct_9fa48("15007") ? wire.vehiclePlate && (wire.vehicleId ? vehicles.get(wire.vehicleId) ?? null : null) : (stryCov_9fa48("15007"), wire.vehiclePlate ?? (wire.vehicleId ? stryMutAct_9fa48("15008") ? vehicles.get(wire.vehicleId) && null : (stryCov_9fa48("15008"), vehicles.get(wire.vehicleId) ?? null) : null)),
      title: stryMutAct_9fa48("15009") ? wire.title && componerTituloDeServicio(wire, {
        serviceType: nombreDeTipo,
        zones: nombresDeZona
      }) : (stryCov_9fa48("15009"), wire.title ?? componerTituloDeServicio(wire, stryMutAct_9fa48("15010") ? {} : (stryCov_9fa48("15010"), {
        serviceType: nombreDeTipo,
        zones: nombresDeZona
      })))
    });
  }
}
async function parseServicio(raw: unknown, message: string): Promise<Service> {
  if (stryMutAct_9fa48("15011")) {
    {}
  } else {
    stryCov_9fa48("15011");
    const parsed = serviceWireSchema.safeParse(raw);
    if (stryMutAct_9fa48("15014") ? false : stryMutAct_9fa48("15013") ? true : stryMutAct_9fa48("15012") ? parsed.success : (stryCov_9fa48("15012", "15013", "15014"), !parsed.success)) {
      if (stryMutAct_9fa48("15015")) {
        {}
      } else {
        stryCov_9fa48("15015");
        recordTelemetryEvent(stryMutAct_9fa48("15017") ? {} : (stryCov_9fa48("15017"), {
          name: stryMutAct_9fa48("15018") ? "" : (stryCov_9fa48("15018"), "request_malformed_response"),
          resource: stryMutAct_9fa48("15019") ? "" : (stryCov_9fa48("15019"), "services")
        }));
        throw new ServiceContractError(message, stryMutAct_9fa48("15021") ? {} : (stryCov_9fa48("15021"), {
          cause: parsed.error
        }));
      }
    }
    return completarEtiquetas(parsed.data);
  }
}

/** `fetch` autenticado de `/api/services*`: registra la telemetría de fallo de red y relanza. */
async function fetchServicesApi(...args: Parameters<typeof authenticatedFetch>): Promise<Response> {
  if (stryMutAct_9fa48("15022")) {
    {}
  } else {
    stryCov_9fa48("15022");
    try {
      if (stryMutAct_9fa48("15023")) {
        {}
      } else {
        stryCov_9fa48("15023");
        return await authenticatedFetch(...args);
      }
    } catch (cause) {
      if (stryMutAct_9fa48("15024")) {
        {}
      } else {
        stryCov_9fa48("15024");
        if (stryMutAct_9fa48("15026") ? false : stryMutAct_9fa48("15025") ? true : (stryCov_9fa48("15025", "15026"), cause instanceof NetworkFailureError)) {
          if (stryMutAct_9fa48("15027")) {
            {}
          } else {
            stryCov_9fa48("15027");
            recordTelemetryEvent(stryMutAct_9fa48("15029") ? {} : (stryCov_9fa48("15029"), {
              name: stryMutAct_9fa48("15030") ? "" : (stryCov_9fa48("15030"), "request_network_failure"),
              resource: stryMutAct_9fa48("15031") ? "" : (stryCov_9fa48("15031"), "services")
            }));
          }
        }
        throw cause;
      }
    }
  }
}

/** Traduce el cuerpo de una respuesta no exitosa en `ServiceRequestError` o, si no es válido, `ServiceContractError`. */
function throwServiceResponseError(payload: unknown, malformedMessage: string): never {
  if (stryMutAct_9fa48("15032")) {
    {}
  } else {
    stryCov_9fa48("15032");
    const parsedError = errorResponseSchema.safeParse(payload);
    if (stryMutAct_9fa48("15035") ? false : stryMutAct_9fa48("15034") ? true : stryMutAct_9fa48("15033") ? parsedError.success : (stryCov_9fa48("15033", "15034", "15035"), !parsedError.success)) {
      if (stryMutAct_9fa48("15036")) {
        {}
      } else {
        stryCov_9fa48("15036");
        recordTelemetryEvent(stryMutAct_9fa48("15038") ? {} : (stryCov_9fa48("15038"), {
          name: stryMutAct_9fa48("15039") ? "" : (stryCov_9fa48("15039"), "request_malformed_response"),
          resource: stryMutAct_9fa48("15040") ? "" : (stryCov_9fa48("15040"), "services")
        }));
        throw new ServiceContractError(malformedMessage, stryMutAct_9fa48("15042") ? {} : (stryCov_9fa48("15042"), {
          cause: parsedError.error
        }));
      }
    }
    const message = Array.isArray(parsedError.data.message) ? parsedError.data.message.join(stryMutAct_9fa48("15043") ? "" : (stryCov_9fa48("15043"), " ")) : parsedError.data.message;
    if (stryMutAct_9fa48("15044")) {
      ;
    } else {
      stryCov_9fa48("15044");
      throw new ServiceRequestError(message, parsedError.data.statusCode);
    }
  }
}

/** Pide un Servicio a `/api/services*`: respuesta de error traducida, sobre `{ data }` abierto y esquema validado. */
async function requestServicio(path: string, init: RequestInit | undefined, malformedMessage: string): Promise<Service> {
  if (stryMutAct_9fa48("15045")) {
    {}
  } else {
    stryCov_9fa48("15045");
    const response = await fetchServicesApi(path, init);
    const payload = await readJsonBody(response);
    if (stryMutAct_9fa48("15048") ? false : stryMutAct_9fa48("15047") ? true : stryMutAct_9fa48("15046") ? response.ok : (stryCov_9fa48("15046", "15047", "15048"), !response.ok)) if (stryMutAct_9fa48("15049")) {
      ;
    } else {
      stryCov_9fa48("15049");
      throwServiceResponseError(payload, malformedMessage);
    }
    return parseServicio(unwrapData(payload), malformedMessage);
  }
}

/** Abre el sobre `{ data }` de una respuesta; si el cuerpo ya es el recurso (tiene `id`), lo devuelve tal cual. */
function unwrapData(payload: unknown): unknown {
  if (stryMutAct_9fa48("15050")) {
    {}
  } else {
    stryCov_9fa48("15050");
    return (stryMutAct_9fa48("15053") ? payload && typeof payload === "object" && "data" in payload || !("id" in payload) : stryMutAct_9fa48("15052") ? false : stryMutAct_9fa48("15051") ? true : (stryCov_9fa48("15051", "15052", "15053"), (stryMutAct_9fa48("15055") ? payload && typeof payload === "object" || "data" in payload : stryMutAct_9fa48("15054") ? true : (stryCov_9fa48("15054", "15055"), (stryMutAct_9fa48("15057") ? payload || typeof payload === "object" : stryMutAct_9fa48("15056") ? true : (stryCov_9fa48("15056", "15057"), payload && (stryMutAct_9fa48("15059") ? typeof payload !== "object" : stryMutAct_9fa48("15058") ? true : (stryCov_9fa48("15058", "15059"), typeof payload === (stryMutAct_9fa48("15060") ? "" : (stryCov_9fa48("15060"), "object")))))) && (stryMutAct_9fa48("15061") ? "" : (stryCov_9fa48("15061"), "data")) in payload)) && (stryMutAct_9fa48("15062") ? "id" in payload : (stryCov_9fa48("15062"), !((stryMutAct_9fa48("15063") ? "" : (stryCov_9fa48("15063"), "id")) in payload))))) ? (payload as {
      data: unknown;
    }).data : payload;
  }
}
export const servicesAdapter = stryMutAct_9fa48("15064") ? {} : (stryCov_9fa48("15064"), {
  async list(query: ServiceQuery = {}): Promise<ServicesPage> {
    if (stryMutAct_9fa48("15065")) {
      {}
    } else {
      stryCov_9fa48("15065");
      // Se arranca el catalogo junto con el listado y no despues: encadenarlos dejaba
      // la pantalla en el esqueleto de carga durante dos viajes de ida y vuelta.
      void catalogoDeEtiquetas();
      const response = await fetchServicesApi(stryMutAct_9fa48("15066") ? `` : (stryCov_9fa48("15066"), `/api/services${buildServicesQueryString(query)}`));
      const payload = await readJsonBody(response);
      if (stryMutAct_9fa48("15069") ? false : stryMutAct_9fa48("15068") ? true : stryMutAct_9fa48("15067") ? response.ok : (stryCov_9fa48("15067", "15068", "15069"), !response.ok)) throwServiceResponseError(payload, stryMutAct_9fa48("15071") ? "" : (stryCov_9fa48("15071"), "No se pudo obtener información válida de servicios. Reintente en unos segundos."));
      const parsed = servicesEnvelopeSchema.safeParse(payload);
      if (stryMutAct_9fa48("15074") ? false : stryMutAct_9fa48("15073") ? true : stryMutAct_9fa48("15072") ? parsed.success : (stryCov_9fa48("15072", "15073", "15074"), !parsed.success)) {
        if (stryMutAct_9fa48("15075")) {
          {}
        } else {
          stryCov_9fa48("15075");
          recordTelemetryEvent(stryMutAct_9fa48("15077") ? {} : (stryCov_9fa48("15077"), {
            name: stryMutAct_9fa48("15078") ? "" : (stryCov_9fa48("15078"), "request_malformed_response"),
            resource: stryMutAct_9fa48("15079") ? "" : (stryCov_9fa48("15079"), "services")
          }));
          throw new ServiceContractError(stryMutAct_9fa48("15081") ? "" : (stryCov_9fa48("15081"), "No se pudo obtener información válida de servicios. Reintente en unos segundos."), stryMutAct_9fa48("15082") ? {} : (stryCov_9fa48("15082"), {
            cause: parsed.error
          }));
        }
      }
      return stryMutAct_9fa48("15083") ? {} : (stryCov_9fa48("15083"), {
        services: await Promise.all(parsed.data.data.map(completarEtiquetas)),
        dropped: stryMutAct_9fa48("15084") ? droppedRecords(parsed.data.data) - (parsed.data.meta.dropped ?? 0) : (stryCov_9fa48("15084"), droppedRecords(parsed.data.data) + (stryMutAct_9fa48("15085") ? parsed.data.meta.dropped && 0 : (stryCov_9fa48("15085"), parsed.data.meta.dropped ?? 0))),
        page: parsed.data.meta.page,
        pageSize: parsed.data.meta.pageSize,
        total: parsed.data.meta.total,
        totalPages: parsed.data.meta.totalPages
      });
    }
  },
  async get(id: string): Promise<Service> {
    if (stryMutAct_9fa48("15086")) {
      {}
    } else {
      stryCov_9fa48("15086");
      void catalogoDeEtiquetas();
      const response = await fetchServicesApi(stryMutAct_9fa48("15087") ? `` : (stryCov_9fa48("15087"), `/api/services/${id}`));
      const payload = await readJsonBody(response);
      if (stryMutAct_9fa48("15090") ? false : stryMutAct_9fa48("15089") ? true : stryMutAct_9fa48("15088") ? response.ok : (stryCov_9fa48("15088", "15089", "15090"), !response.ok)) throwServiceResponseError(payload, stryMutAct_9fa48("15092") ? "" : (stryCov_9fa48("15092"), "No se pudo obtener información válida de servicio. Reintente en unos segundos."));
      return parseServicio(payload, stryMutAct_9fa48("15093") ? "" : (stryCov_9fa48("15093"), "No se pudo obtener información válida del detalle de servicio. Reintente en unos segundos."));
    }
  },
  async create(input: CreateServiceInput): Promise<Service> {
    if (stryMutAct_9fa48("15094")) {
      {}
    } else {
      stryCov_9fa48("15094");
      const parsedInput = createServiceInputSchema.safeParse(input);
      if (stryMutAct_9fa48("15097") ? false : stryMutAct_9fa48("15096") ? true : stryMutAct_9fa48("15095") ? parsedInput.success : (stryCov_9fa48("15095", "15096", "15097"), !parsedInput.success)) {
        if (stryMutAct_9fa48("15098")) {
          {}
        } else {
          stryCov_9fa48("15098");
          throw new ServiceContractError(stryMutAct_9fa48("15100") ? "" : (stryCov_9fa48("15100"), "Los datos para programar el servicio son inválidos."), stryMutAct_9fa48("15101") ? {} : (stryCov_9fa48("15101"), {
            cause: parsedInput.error
          }));
        }
      }
      const response = await fetchServicesApi(stryMutAct_9fa48("15102") ? "" : (stryCov_9fa48("15102"), "/api/services"), stryMutAct_9fa48("15103") ? {} : (stryCov_9fa48("15103"), {
        method: stryMutAct_9fa48("15104") ? "" : (stryCov_9fa48("15104"), "POST"),
        headers: stryMutAct_9fa48("15105") ? {} : (stryCov_9fa48("15105"), {
          "content-type": stryMutAct_9fa48("15106") ? "" : (stryCov_9fa48("15106"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      }));
      const payload = await readJsonBody(response);
      if (stryMutAct_9fa48("15109") ? false : stryMutAct_9fa48("15108") ? true : stryMutAct_9fa48("15107") ? response.ok : (stryCov_9fa48("15107", "15108", "15109"), !response.ok)) throwServiceResponseError(payload, stryMutAct_9fa48("15111") ? "" : (stryCov_9fa48("15111"), "No se pudo obtener información válida de servicios. Reintente en unos segundos."));
      const raw = unwrapData(payload);
      return parseServicio(raw, stryMutAct_9fa48("15112") ? "" : (stryCov_9fa48("15112"), "No se pudo obtener información válida de la creación de servicio. Reintente en unos segundos."));
    }
  },
  async assignCrew(serviceId: string, input: AssignCrewInput): Promise<Service> {
    if (stryMutAct_9fa48("15113")) {
      {}
    } else {
      stryCov_9fa48("15113");
      const parsedInput = assignCrewInputSchema.safeParse(input);
      if (stryMutAct_9fa48("15116") ? false : stryMutAct_9fa48("15115") ? true : stryMutAct_9fa48("15114") ? parsedInput.success : (stryCov_9fa48("15114", "15115", "15116"), !parsedInput.success)) {
        if (stryMutAct_9fa48("15117")) {
          {}
        } else {
          stryCov_9fa48("15117");
          throw new ServiceContractError(stryMutAct_9fa48("15119") ? "" : (stryCov_9fa48("15119"), "Los datos para la asignación de recursos son inválidos."), stryMutAct_9fa48("15120") ? {} : (stryCov_9fa48("15120"), {
            cause: parsedInput.error
          }));
        }
      }
      return requestServicio(stryMutAct_9fa48("15121") ? `` : (stryCov_9fa48("15121"), `/api/services/${serviceId}/assign-crew`), stryMutAct_9fa48("15122") ? {} : (stryCov_9fa48("15122"), {
        method: stryMutAct_9fa48("15123") ? "" : (stryCov_9fa48("15123"), "POST"),
        headers: stryMutAct_9fa48("15124") ? {} : (stryCov_9fa48("15124"), {
          "content-type": stryMutAct_9fa48("15125") ? "" : (stryCov_9fa48("15125"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      }), stryMutAct_9fa48("15126") ? "" : (stryCov_9fa48("15126"), "No se pudo obtener información válida de la asignación de servicio. Reintente en unos segundos."));
    }
  },
  async start(serviceId: string): Promise<Service> {
    if (stryMutAct_9fa48("15127")) {
      {}
    } else {
      stryCov_9fa48("15127");
      const dependency = await streetClosureRequestsAdapter.getForService(serviceId);
      if (stryMutAct_9fa48("15130") ? dependency.outcome !== "blocked" : stryMutAct_9fa48("15129") ? false : stryMutAct_9fa48("15128") ? true : (stryCov_9fa48("15128", "15129", "15130"), dependency.outcome === (stryMutAct_9fa48("15131") ? "" : (stryCov_9fa48("15131"), "blocked")))) {
        if (stryMutAct_9fa48("15132")) {
          {}
        } else {
          stryCov_9fa48("15132");
          throw new ServiceStartBlockedError(stryMutAct_9fa48("15134") ? "" : (stryCov_9fa48("15134"), "No se puede iniciar el Servicio: la solicitud de corte de calle sigue pendiente de respuesta de Tránsito."), dependency.request!);
        }
      }
      if (stryMutAct_9fa48("15137") ? dependency.outcome !== "rejected" : stryMutAct_9fa48("15136") ? false : stryMutAct_9fa48("15135") ? true : (stryCov_9fa48("15135", "15136", "15137"), dependency.outcome === (stryMutAct_9fa48("15138") ? "" : (stryCov_9fa48("15138"), "rejected")))) {
        if (stryMutAct_9fa48("15139")) {
          {}
        } else {
          stryCov_9fa48("15139");
          throw new ServiceStartBlockedError(stryMutAct_9fa48("15141") ? "" : (stryCov_9fa48("15141"), "Tránsito rechazó el corte de calle. Oficina debe elegir explícitamente entre reprogramar o cancelar el Servicio."), dependency.request!);
        }
      }
      return requestServicio(stryMutAct_9fa48("15142") ? `` : (stryCov_9fa48("15142"), `/api/services/${serviceId}/start`), stryMutAct_9fa48("15143") ? {} : (stryCov_9fa48("15143"), {
        method: stryMutAct_9fa48("15144") ? "" : (stryCov_9fa48("15144"), "POST")
      }), stryMutAct_9fa48("15145") ? "" : (stryCov_9fa48("15145"), "No se pudo obtener información válida del inicio de servicio. Reintente en unos segundos."));
    }
  },
  async suspend(serviceId: string, input: SuspendServiceInput): Promise<Service> {
    if (stryMutAct_9fa48("15146")) {
      {}
    } else {
      stryCov_9fa48("15146");
      const parsedInput = suspendServiceInputSchema.safeParse(input);
      if (stryMutAct_9fa48("15149") ? false : stryMutAct_9fa48("15148") ? true : stryMutAct_9fa48("15147") ? parsedInput.success : (stryCov_9fa48("15147", "15148", "15149"), !parsedInput.success)) {
        if (stryMutAct_9fa48("15150")) {
          {}
        } else {
          stryCov_9fa48("15150");
          throw new ServiceContractError(stryMutAct_9fa48("15152") ? "" : (stryCov_9fa48("15152"), "Los datos para suspender el servicio son inválidos."), stryMutAct_9fa48("15153") ? {} : (stryCov_9fa48("15153"), {
            cause: parsedInput.error
          }));
        }
      }
      return requestServicio(stryMutAct_9fa48("15154") ? `` : (stryCov_9fa48("15154"), `/api/services/${serviceId}/suspend`), stryMutAct_9fa48("15155") ? {} : (stryCov_9fa48("15155"), {
        method: stryMutAct_9fa48("15156") ? "" : (stryCov_9fa48("15156"), "POST"),
        headers: stryMutAct_9fa48("15157") ? {} : (stryCov_9fa48("15157"), {
          "content-type": stryMutAct_9fa48("15158") ? "" : (stryCov_9fa48("15158"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      }), stryMutAct_9fa48("15159") ? "" : (stryCov_9fa48("15159"), "No se pudo obtener información válida de la suspensión de servicio. Reintente en unos segundos."));
    }
  },
  async resume(serviceId: string): Promise<Service> {
    if (stryMutAct_9fa48("15160")) {
      {}
    } else {
      stryCov_9fa48("15160");
      return requestServicio(stryMutAct_9fa48("15161") ? `` : (stryCov_9fa48("15161"), `/api/services/${serviceId}/resume`), stryMutAct_9fa48("15162") ? {} : (stryCov_9fa48("15162"), {
        method: stryMutAct_9fa48("15163") ? "" : (stryCov_9fa48("15163"), "POST")
      }), stryMutAct_9fa48("15164") ? "" : (stryCov_9fa48("15164"), "No se pudo obtener información válida de la reanudación de servicio. Reintente en unos segundos."));
    }
  },
  async reschedule(serviceId: string, input: RescheduleServiceInput): Promise<Service> {
    if (stryMutAct_9fa48("15165")) {
      {}
    } else {
      stryCov_9fa48("15165");
      const parsedInput = rescheduleServiceInputSchema.safeParse(input);
      if (stryMutAct_9fa48("15168") ? false : stryMutAct_9fa48("15167") ? true : stryMutAct_9fa48("15166") ? parsedInput.success : (stryCov_9fa48("15166", "15167", "15168"), !parsedInput.success)) {
        if (stryMutAct_9fa48("15169")) {
          {}
        } else {
          stryCov_9fa48("15169");
          throw new ServiceContractError(stryMutAct_9fa48("15171") ? "" : (stryCov_9fa48("15171"), "Los datos para reprogramar el servicio son inválidos."), stryMutAct_9fa48("15172") ? {} : (stryCov_9fa48("15172"), {
            cause: parsedInput.error
          }));
        }
      }
      return requestServicio(stryMutAct_9fa48("15173") ? `` : (stryCov_9fa48("15173"), `/api/services/${serviceId}/reschedule`), stryMutAct_9fa48("15174") ? {} : (stryCov_9fa48("15174"), {
        method: stryMutAct_9fa48("15175") ? "" : (stryCov_9fa48("15175"), "POST"),
        headers: stryMutAct_9fa48("15176") ? {} : (stryCov_9fa48("15176"), {
          "content-type": stryMutAct_9fa48("15177") ? "" : (stryCov_9fa48("15177"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      }), stryMutAct_9fa48("15178") ? "" : (stryCov_9fa48("15178"), "No se pudo obtener información válida de la reprogramación de servicio. Reintente en unos segundos."));
    }
  },
  async cancel(serviceId: string, input: CancelServiceInput): Promise<Service> {
    if (stryMutAct_9fa48("15179")) {
      {}
    } else {
      stryCov_9fa48("15179");
      const parsedInput = cancelServiceInputSchema.safeParse(input);
      if (stryMutAct_9fa48("15182") ? false : stryMutAct_9fa48("15181") ? true : stryMutAct_9fa48("15180") ? parsedInput.success : (stryCov_9fa48("15180", "15181", "15182"), !parsedInput.success)) {
        if (stryMutAct_9fa48("15183")) {
          {}
        } else {
          stryCov_9fa48("15183");
          throw new ServiceContractError(stryMutAct_9fa48("15185") ? "" : (stryCov_9fa48("15185"), "Los datos para cancelar el servicio son inválidos."), stryMutAct_9fa48("15186") ? {} : (stryCov_9fa48("15186"), {
            cause: parsedInput.error
          }));
        }
      }
      return requestServicio(stryMutAct_9fa48("15187") ? `` : (stryCov_9fa48("15187"), `/api/services/${serviceId}/cancel`), stryMutAct_9fa48("15188") ? {} : (stryCov_9fa48("15188"), {
        method: stryMutAct_9fa48("15189") ? "" : (stryCov_9fa48("15189"), "POST"),
        headers: stryMutAct_9fa48("15190") ? {} : (stryCov_9fa48("15190"), {
          "content-type": stryMutAct_9fa48("15191") ? "" : (stryCov_9fa48("15191"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      }), stryMutAct_9fa48("15192") ? "" : (stryCov_9fa48("15192"), "No se pudo obtener información válida de la cancelación de servicio. Reintente en unos segundos."));
    }
  },
  async confirmReschedule(serviceId: string, input: ConfirmRescheduleInput): Promise<Service> {
    if (stryMutAct_9fa48("15193")) {
      {}
    } else {
      stryCov_9fa48("15193");
      const parsedInput = confirmRescheduleInputSchema.safeParse(input);
      if (stryMutAct_9fa48("15196") ? false : stryMutAct_9fa48("15195") ? true : stryMutAct_9fa48("15194") ? parsedInput.success : (stryCov_9fa48("15194", "15195", "15196"), !parsedInput.success)) {
        if (stryMutAct_9fa48("15197")) {
          {}
        } else {
          stryCov_9fa48("15197");
          throw new ServiceContractError(stryMutAct_9fa48("15199") ? "" : (stryCov_9fa48("15199"), "Los datos para confirmar la nueva fecha del servicio son inválidos."), stryMutAct_9fa48("15200") ? {} : (stryCov_9fa48("15200"), {
            cause: parsedInput.error
          }));
        }
      }
      return requestServicio(stryMutAct_9fa48("15201") ? `` : (stryCov_9fa48("15201"), `/api/services/${serviceId}/confirm-reschedule`), stryMutAct_9fa48("15202") ? {} : (stryCov_9fa48("15202"), {
        method: stryMutAct_9fa48("15203") ? "" : (stryCov_9fa48("15203"), "POST"),
        headers: stryMutAct_9fa48("15204") ? {} : (stryCov_9fa48("15204"), {
          "content-type": stryMutAct_9fa48("15205") ? "" : (stryCov_9fa48("15205"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      }), stryMutAct_9fa48("15206") ? "" : (stryCov_9fa48("15206"), "No se pudo obtener información válida de la confirmación de reprogramación. Reintente en unos segundos."));
    }
  },
  async getZoneResults(serviceId: string): Promise<ZoneResult[]> {
    if (stryMutAct_9fa48("15207")) {
      {}
    } else {
      stryCov_9fa48("15207");
      const response = await fetchServicesApi(stryMutAct_9fa48("15208") ? `` : (stryCov_9fa48("15208"), `/api/services/${serviceId}/zone-results`));
      const payload = await readJsonBody(response);
      if (stryMutAct_9fa48("15211") ? false : stryMutAct_9fa48("15210") ? true : stryMutAct_9fa48("15209") ? response.ok : (stryCov_9fa48("15209", "15210", "15211"), !response.ok)) throwServiceResponseError(payload, stryMutAct_9fa48("15213") ? "" : (stryCov_9fa48("15213"), "No se pudo obtener información válida de resultados de zona. Reintente en unos segundos."));
      const parsed = z.array(zoneResultSchema).safeParse(payload);
      if (stryMutAct_9fa48("15216") ? false : stryMutAct_9fa48("15215") ? true : stryMutAct_9fa48("15214") ? parsed.success : (stryCov_9fa48("15214", "15215", "15216"), !parsed.success)) {
        if (stryMutAct_9fa48("15217")) {
          {}
        } else {
          stryCov_9fa48("15217");
          recordTelemetryEvent(stryMutAct_9fa48("15219") ? {} : (stryCov_9fa48("15219"), {
            name: stryMutAct_9fa48("15220") ? "" : (stryCov_9fa48("15220"), "request_malformed_response"),
            resource: stryMutAct_9fa48("15221") ? "" : (stryCov_9fa48("15221"), "services")
          }));
          throw new ServiceContractError(stryMutAct_9fa48("15223") ? "" : (stryCov_9fa48("15223"), "No se pudo obtener información válida de resultados de zona. Reintente en unos segundos."), stryMutAct_9fa48("15224") ? {} : (stryCov_9fa48("15224"), {
            cause: parsed.error
          }));
        }
      }
      return parsed.data;
    }
  },
  async recordZoneResult(serviceId: string, input: RecordZoneResultInput): Promise<ZoneResult> {
    if (stryMutAct_9fa48("15225")) {
      {}
    } else {
      stryCov_9fa48("15225");
      const parsedInput = recordZoneResultInputSchema.safeParse(input);
      if (stryMutAct_9fa48("15228") ? false : stryMutAct_9fa48("15227") ? true : stryMutAct_9fa48("15226") ? parsedInput.success : (stryCov_9fa48("15226", "15227", "15228"), !parsedInput.success)) {
        if (stryMutAct_9fa48("15229")) {
          {}
        } else {
          stryCov_9fa48("15229");
          throw new ServiceContractError(stryMutAct_9fa48("15231") ? "" : (stryCov_9fa48("15231"), "Los datos para registrar el resultado de zona son inválidos."), stryMutAct_9fa48("15232") ? {} : (stryCov_9fa48("15232"), {
            cause: parsedInput.error
          }));
        }
      }
      const response = await fetchServicesApi(stryMutAct_9fa48("15233") ? `` : (stryCov_9fa48("15233"), `/api/services/${serviceId}/zone-results`), stryMutAct_9fa48("15234") ? {} : (stryCov_9fa48("15234"), {
        method: stryMutAct_9fa48("15235") ? "" : (stryCov_9fa48("15235"), "POST"),
        headers: stryMutAct_9fa48("15236") ? {} : (stryCov_9fa48("15236"), {
          "content-type": stryMutAct_9fa48("15237") ? "" : (stryCov_9fa48("15237"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      }));
      const payload = await readJsonBody(response);
      if (stryMutAct_9fa48("15240") ? false : stryMutAct_9fa48("15239") ? true : stryMutAct_9fa48("15238") ? response.ok : (stryCov_9fa48("15238", "15239", "15240"), !response.ok)) throwServiceResponseError(payload, stryMutAct_9fa48("15242") ? "" : (stryCov_9fa48("15242"), "No se pudo obtener información válida del registro de zona. Reintente en unos segundos."));
      const raw = unwrapData(payload);
      const parsed = zoneResultSchema.safeParse(raw);
      if (stryMutAct_9fa48("15245") ? false : stryMutAct_9fa48("15244") ? true : stryMutAct_9fa48("15243") ? parsed.success : (stryCov_9fa48("15243", "15244", "15245"), !parsed.success)) {
        if (stryMutAct_9fa48("15246")) {
          {}
        } else {
          stryCov_9fa48("15246");
          recordTelemetryEvent(stryMutAct_9fa48("15248") ? {} : (stryCov_9fa48("15248"), {
            name: stryMutAct_9fa48("15249") ? "" : (stryCov_9fa48("15249"), "request_malformed_response"),
            resource: stryMutAct_9fa48("15250") ? "" : (stryCov_9fa48("15250"), "services")
          }));
          throw new ServiceContractError(stryMutAct_9fa48("15252") ? "" : (stryCov_9fa48("15252"), "No se pudo obtener información válida del registro de zona. Reintente en unos segundos."), stryMutAct_9fa48("15253") ? {} : (stryCov_9fa48("15253"), {
            cause: parsed.error
          }));
        }
      }
      return parsed.data;
    }
  },
  // Zone-result attachments are listed separately from GET /services/:id/zone-results.
  async getZoneResultEvidence(zoneResultId: string): Promise<Attachment[]> {
    if (stryMutAct_9fa48("15254")) {
      {}
    } else {
      stryCov_9fa48("15254");
      const response = await authenticatedFetch(stryMutAct_9fa48("15255") ? `` : (stryCov_9fa48("15255"), `/api/evidence?ownerType=ZONE_RESULT&ownerId=${encodeURIComponent(zoneResultId)}`));
      const payload = await readJsonBody(response);
      if (stryMutAct_9fa48("15258") ? false : stryMutAct_9fa48("15257") ? true : stryMutAct_9fa48("15256") ? response.ok : (stryCov_9fa48("15256", "15257", "15258"), !response.ok)) {
        if (stryMutAct_9fa48("15259")) {
          {}
        } else {
          stryCov_9fa48("15259");
          const parsedError = errorResponseSchema.safeParse(payload);
          if (stryMutAct_9fa48("15262") ? false : stryMutAct_9fa48("15261") ? true : stryMutAct_9fa48("15260") ? parsedError.success : (stryCov_9fa48("15260", "15261", "15262"), !parsedError.success)) {
            if (stryMutAct_9fa48("15263")) {
              {}
            } else {
              stryCov_9fa48("15263");
              recordTelemetryEvent(stryMutAct_9fa48("15265") ? {} : (stryCov_9fa48("15265"), {
                name: stryMutAct_9fa48("15266") ? "" : (stryCov_9fa48("15266"), "request_malformed_response"),
                resource: stryMutAct_9fa48("15267") ? "" : (stryCov_9fa48("15267"), "services")
              }));
              throw new ServiceContractError(stryMutAct_9fa48("15269") ? "" : (stryCov_9fa48("15269"), "La respuesta de error de evidencia no respeta el contrato."), stryMutAct_9fa48("15270") ? {} : (stryCov_9fa48("15270"), {
                cause: parsedError.error
              }));
            }
          }
          const message = Array.isArray(parsedError.data.message) ? parsedError.data.message.join(stryMutAct_9fa48("15271") ? "" : (stryCov_9fa48("15271"), " ")) : parsedError.data.message;
          if (stryMutAct_9fa48("15272")) {
            ;
          } else {
            stryCov_9fa48("15272");
            throw new ServiceRequestError(message, parsedError.data.statusCode);
          }
        }
      }
      const parsed = z.array(attachmentSchema).safeParse(payload);
      if (stryMutAct_9fa48("15275") ? false : stryMutAct_9fa48("15274") ? true : stryMutAct_9fa48("15273") ? parsed.success : (stryCov_9fa48("15273", "15274", "15275"), !parsed.success)) {
        if (stryMutAct_9fa48("15276")) {
          {}
        } else {
          stryCov_9fa48("15276");
          recordTelemetryEvent(stryMutAct_9fa48("15278") ? {} : (stryCov_9fa48("15278"), {
            name: stryMutAct_9fa48("15279") ? "" : (stryCov_9fa48("15279"), "request_malformed_response"),
            resource: stryMutAct_9fa48("15280") ? "" : (stryCov_9fa48("15280"), "services")
          }));
          throw new ServiceContractError(stryMutAct_9fa48("15282") ? "" : (stryCov_9fa48("15282"), "La lista de evidencia de zona no respeta el contrato."), stryMutAct_9fa48("15283") ? {} : (stryCov_9fa48("15283"), {
            cause: parsed.error
          }));
        }
      }
      return parsed.data;
    }
  },
  async uploadEvidence(params: {
    file: File;
    ownerType: EvidenceOwnerType;
    ownerId: string;
    serviceId?: string;
    idempotencyKey?: string;
  }): Promise<Attachment> {
    if (stryMutAct_9fa48("15284")) {
      {}
    } else {
      stryCov_9fa48("15284");
      const key = stryMutAct_9fa48("15287") ? params.idempotencyKey && (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `idemp-${Date.now()}`) : stryMutAct_9fa48("15286") ? false : stryMutAct_9fa48("15285") ? true : (stryCov_9fa48("15285", "15286", "15287"), params.idempotencyKey || ((stryMutAct_9fa48("15290") ? typeof crypto !== "undefined" || crypto.randomUUID : stryMutAct_9fa48("15289") ? false : stryMutAct_9fa48("15288") ? true : (stryCov_9fa48("15288", "15289", "15290"), (stryMutAct_9fa48("15292") ? typeof crypto === "undefined" : stryMutAct_9fa48("15291") ? true : (stryCov_9fa48("15291", "15292"), typeof crypto !== (stryMutAct_9fa48("15293") ? "" : (stryCov_9fa48("15293"), "undefined")))) && crypto.randomUUID)) ? crypto.randomUUID() : stryMutAct_9fa48("15294") ? `` : (stryCov_9fa48("15294"), `idemp-${Date.now()}`)));
      const formData = new FormData();
      formData.append(stryMutAct_9fa48("15296") ? "" : (stryCov_9fa48("15296"), "file"), params.file);
      formData.append(stryMutAct_9fa48("15298") ? "" : (stryCov_9fa48("15298"), "fileName"), params.file.name);
      formData.append(stryMutAct_9fa48("15300") ? "" : (stryCov_9fa48("15300"), "ownerType"), params.ownerType);
      formData.append(stryMutAct_9fa48("15302") ? "" : (stryCov_9fa48("15302"), "ownerId"), params.ownerId);
      if (stryMutAct_9fa48("15305") ? params.ownerType === "ZONE_RESULT" || params.serviceId : stryMutAct_9fa48("15304") ? false : stryMutAct_9fa48("15303") ? true : (stryCov_9fa48("15303", "15304", "15305"), (stryMutAct_9fa48("15307") ? params.ownerType !== "ZONE_RESULT" : stryMutAct_9fa48("15306") ? true : (stryCov_9fa48("15306", "15307"), params.ownerType === (stryMutAct_9fa48("15308") ? "" : (stryCov_9fa48("15308"), "ZONE_RESULT")))) && params.serviceId)) {
        if (stryMutAct_9fa48("15309")) {
          {}
        } else {
          stryCov_9fa48("15309");
          formData.append(stryMutAct_9fa48("15311") ? "" : (stryCov_9fa48("15311"), "serviceId"), params.serviceId);
        }
      }
      const response = await fetchServicesApi(stryMutAct_9fa48("15312") ? "" : (stryCov_9fa48("15312"), "/api/evidence"), stryMutAct_9fa48("15313") ? {} : (stryCov_9fa48("15313"), {
        method: stryMutAct_9fa48("15314") ? "" : (stryCov_9fa48("15314"), "POST"),
        headers: stryMutAct_9fa48("15315") ? {} : (stryCov_9fa48("15315"), {
          "Idempotency-Key": key
        }),
        body: formData
      }));
      const payload = await readJsonBody(response);
      if (stryMutAct_9fa48("15318") ? false : stryMutAct_9fa48("15317") ? true : stryMutAct_9fa48("15316") ? response.ok : (stryCov_9fa48("15316", "15317", "15318"), !response.ok)) throwServiceResponseError(payload, stryMutAct_9fa48("15320") ? "" : (stryCov_9fa48("15320"), "No se pudo obtener información válida de la carga de evidencia. Reintente en unos segundos."));
      const parsed = attachmentSchema.safeParse(payload);
      if (stryMutAct_9fa48("15323") ? false : stryMutAct_9fa48("15322") ? true : stryMutAct_9fa48("15321") ? parsed.success : (stryCov_9fa48("15321", "15322", "15323"), !parsed.success)) {
        if (stryMutAct_9fa48("15324")) {
          {}
        } else {
          stryCov_9fa48("15324");
          recordTelemetryEvent(stryMutAct_9fa48("15326") ? {} : (stryCov_9fa48("15326"), {
            name: stryMutAct_9fa48("15327") ? "" : (stryCov_9fa48("15327"), "request_malformed_response"),
            resource: stryMutAct_9fa48("15328") ? "" : (stryCov_9fa48("15328"), "services")
          }));
          throw new ServiceContractError(stryMutAct_9fa48("15330") ? "" : (stryCov_9fa48("15330"), "No se pudo obtener información válida de la carga de evidencia. Reintente en unos segundos."), stryMutAct_9fa48("15331") ? {} : (stryCov_9fa48("15331"), {
            cause: parsed.error
          }));
        }
      }
      return parsed.data;
    }
  },
  async complete(serviceId: string, input?: CompleteServiceInput): Promise<Service> {
    if (stryMutAct_9fa48("15332")) {
      {}
    } else {
      stryCov_9fa48("15332");
      const parsedInput = completeServiceInputSchema.safeParse(stryMutAct_9fa48("15333") ? input && {} : (stryCov_9fa48("15333"), input ?? {}));
      if (stryMutAct_9fa48("15336") ? false : stryMutAct_9fa48("15335") ? true : stryMutAct_9fa48("15334") ? parsedInput.success : (stryCov_9fa48("15334", "15335", "15336"), !parsedInput.success)) {
        if (stryMutAct_9fa48("15337")) {
          {}
        } else {
          stryCov_9fa48("15337");
          throw new ServiceContractError(stryMutAct_9fa48("15339") ? "" : (stryCov_9fa48("15339"), "Los datos para completar el servicio son inválidos."), stryMutAct_9fa48("15340") ? {} : (stryCov_9fa48("15340"), {
            cause: parsedInput.error
          }));
        }
      }
      const requestInit: RequestInit = stryMutAct_9fa48("15341") ? {} : (stryCov_9fa48("15341"), {
        method: stryMutAct_9fa48("15342") ? "" : (stryCov_9fa48("15342"), "POST")
      });
      if (stryMutAct_9fa48("15344") ? false : stryMutAct_9fa48("15343") ? true : (stryCov_9fa48("15343", "15344"), parsedInput.data.containerLocation)) {
        if (stryMutAct_9fa48("15345")) {
          {}
        } else {
          stryCov_9fa48("15345");
          requestInit.headers = stryMutAct_9fa48("15346") ? {} : (stryCov_9fa48("15346"), {
            "content-type": stryMutAct_9fa48("15347") ? "" : (stryCov_9fa48("15347"), "application/json")
          });
          requestInit.body = JSON.stringify(parsedInput.data);
        }
      }
      return requestServicio(stryMutAct_9fa48("15348") ? `` : (stryCov_9fa48("15348"), `/api/services/${serviceId}/complete`), requestInit, stryMutAct_9fa48("15349") ? "" : (stryCov_9fa48("15349"), "No se pudo obtener información válida de la finalización de servicio. Reintente en unos segundos."));
    }
  }
});
function timeWindowsOverlap(w1Start?: string | null, w1End?: string | null, w2Start?: string | null, w2End?: string | null): boolean {
  if (stryMutAct_9fa48("15350")) {
    {}
  } else {
    stryCov_9fa48("15350");
    if (stryMutAct_9fa48("15353") ? (!w1Start || !w1End || !w2Start) && !w2End : stryMutAct_9fa48("15352") ? false : stryMutAct_9fa48("15351") ? true : (stryCov_9fa48("15351", "15352", "15353"), (stryMutAct_9fa48("15355") ? (!w1Start || !w1End) && !w2Start : stryMutAct_9fa48("15354") ? false : (stryCov_9fa48("15354", "15355"), (stryMutAct_9fa48("15357") ? !w1Start && !w1End : stryMutAct_9fa48("15356") ? false : (stryCov_9fa48("15356", "15357"), (stryMutAct_9fa48("15358") ? w1Start : (stryCov_9fa48("15358"), !w1Start)) || (stryMutAct_9fa48("15359") ? w1End : (stryCov_9fa48("15359"), !w1End)))) || (stryMutAct_9fa48("15360") ? w2Start : (stryCov_9fa48("15360"), !w2Start)))) || (stryMutAct_9fa48("15361") ? w2End : (stryCov_9fa48("15361"), !w2End)))) {
      if (stryMutAct_9fa48("15362")) {
        {}
      } else {
        stryCov_9fa48("15362");
        return stryMutAct_9fa48("15363") ? false : (stryCov_9fa48("15363"), true);
      }
    }
    return stryMutAct_9fa48("15366") ? w1Start < w2End || w2Start < w1End : stryMutAct_9fa48("15365") ? false : stryMutAct_9fa48("15364") ? true : (stryCov_9fa48("15364", "15365", "15366"), (stryMutAct_9fa48("15369") ? w1Start >= w2End : stryMutAct_9fa48("15368") ? w1Start <= w2End : stryMutAct_9fa48("15367") ? true : (stryCov_9fa48("15367", "15368", "15369"), w1Start < w2End)) && (stryMutAct_9fa48("15372") ? w2Start >= w1End : stryMutAct_9fa48("15371") ? w2Start <= w1End : stryMutAct_9fa48("15370") ? true : (stryCov_9fa48("15370", "15371", "15372"), w2Start < w1End)));
  }
}
const RESOURCE_HOLDING_STATUSES: ServiceStatus[] = stryMutAct_9fa48("15373") ? [] : (stryCov_9fa48("15373"), [stryMutAct_9fa48("15374") ? "" : (stryCov_9fa48("15374"), "SCHEDULED"), stryMutAct_9fa48("15375") ? "" : (stryCov_9fa48("15375"), "RESCHEDULED"), stryMutAct_9fa48("15376") ? "" : (stryCov_9fa48("15376"), "IN_PROGRESS"), stryMutAct_9fa48("15377") ? "" : (stryCov_9fa48("15377"), "SUSPENDED")]);
export function checkAssignmentConflicts({
  service,
  crewId,
  vehicleId,
  allServices
}: {
  service: Service;
  crewId?: string | null;
  vehicleId?: string | null;
  allServices: Service[];
}): {
  crewConflict: Service | null;
  vehicleConflict: Service | null;
} {
  if (stryMutAct_9fa48("15378")) {
    {}
  } else {
    stryCov_9fa48("15378");
    let crewConflict: Service | null = null;
    let vehicleConflict: Service | null = null;
    for (const other of allServices) {
      if (stryMutAct_9fa48("15379")) {
        {}
      } else {
        stryCov_9fa48("15379");
        if (stryMutAct_9fa48("15382") ? other.id !== service.id : stryMutAct_9fa48("15381") ? false : stryMutAct_9fa48("15380") ? true : (stryCov_9fa48("15380", "15381", "15382"), other.id === service.id)) continue;
        // Mismo criterio que el backend: sólo ocupan recurso los servicios abiertos.
        if (stryMutAct_9fa48("15385") ? false : stryMutAct_9fa48("15384") ? true : stryMutAct_9fa48("15383") ? RESOURCE_HOLDING_STATUSES.includes(other.status) : (stryCov_9fa48("15383", "15384", "15385"), !RESOURCE_HOLDING_STATUSES.includes(other.status))) continue;
        if (stryMutAct_9fa48("15388") ? other.scheduledDate === service.scheduledDate : stryMutAct_9fa48("15387") ? false : stryMutAct_9fa48("15386") ? true : (stryCov_9fa48("15386", "15387", "15388"), other.scheduledDate !== service.scheduledDate)) continue;
        const overlaps = timeWindowsOverlap(service.windowFrom, service.windowTo, other.windowFrom, other.windowTo);
        if (stryMutAct_9fa48("15391") ? false : stryMutAct_9fa48("15390") ? true : stryMutAct_9fa48("15389") ? overlaps : (stryCov_9fa48("15389", "15390", "15391"), !overlaps)) continue;
        if (stryMutAct_9fa48("15394") ? !crewConflict && crewId || other.crewId === crewId : stryMutAct_9fa48("15393") ? false : stryMutAct_9fa48("15392") ? true : (stryCov_9fa48("15392", "15393", "15394"), (stryMutAct_9fa48("15396") ? !crewConflict || crewId : stryMutAct_9fa48("15395") ? true : (stryCov_9fa48("15395", "15396"), (stryMutAct_9fa48("15397") ? crewConflict : (stryCov_9fa48("15397"), !crewConflict)) && crewId)) && (stryMutAct_9fa48("15399") ? other.crewId !== crewId : stryMutAct_9fa48("15398") ? true : (stryCov_9fa48("15398", "15399"), other.crewId === crewId)))) {
          if (stryMutAct_9fa48("15400")) {
            {}
          } else {
            stryCov_9fa48("15400");
            crewConflict = other;
          }
        }
        if (stryMutAct_9fa48("15403") ? !vehicleConflict && vehicleId || other.vehicleId === vehicleId : stryMutAct_9fa48("15402") ? false : stryMutAct_9fa48("15401") ? true : (stryCov_9fa48("15401", "15402", "15403"), (stryMutAct_9fa48("15405") ? !vehicleConflict || vehicleId : stryMutAct_9fa48("15404") ? true : (stryCov_9fa48("15404", "15405"), (stryMutAct_9fa48("15406") ? vehicleConflict : (stryCov_9fa48("15406"), !vehicleConflict)) && vehicleId)) && (stryMutAct_9fa48("15408") ? other.vehicleId !== vehicleId : stryMutAct_9fa48("15407") ? true : (stryCov_9fa48("15407", "15408"), other.vehicleId === vehicleId)))) {
          if (stryMutAct_9fa48("15409")) {
            {}
          } else {
            stryCov_9fa48("15409");
            vehicleConflict = other;
          }
        }
        if (stryMutAct_9fa48("15412") ? crewConflict || vehicleConflict || !vehicleId : stryMutAct_9fa48("15411") ? false : stryMutAct_9fa48("15410") ? true : (stryCov_9fa48("15410", "15411", "15412"), crewConflict && (stryMutAct_9fa48("15414") ? vehicleConflict && !vehicleId : stryMutAct_9fa48("15413") ? true : (stryCov_9fa48("15413", "15414"), vehicleConflict || (stryMutAct_9fa48("15415") ? vehicleId : (stryCov_9fa48("15415"), !vehicleId)))))) {
          if (stryMutAct_9fa48("15416")) {
            {}
          } else {
            stryCov_9fa48("15416");
            break;
          }
        }
      }
    }
    return stryMutAct_9fa48("15417") ? {} : (stryCov_9fa48("15417"), {
      crewConflict,
      vehicleConflict
    });
  }
}
export type ServiceWindowTiming = {
  isOutside: boolean;
  timing: "within" | "early" | "late";
  message: string | null;
};
export function checkServiceWindowTiming(service: Service, now: Date = new Date()): ServiceWindowTiming {
  if (stryMutAct_9fa48("15418")) {
    {}
  } else {
    stryCov_9fa48("15418");
    if (stryMutAct_9fa48("15421") ? !service.windowFrom && !service.windowTo : stryMutAct_9fa48("15420") ? false : stryMutAct_9fa48("15419") ? true : (stryCov_9fa48("15419", "15420", "15421"), (stryMutAct_9fa48("15422") ? service.windowFrom : (stryCov_9fa48("15422"), !service.windowFrom)) || (stryMutAct_9fa48("15423") ? service.windowTo : (stryCov_9fa48("15423"), !service.windowTo)))) {
      if (stryMutAct_9fa48("15424")) {
        {}
      } else {
        stryCov_9fa48("15424");
        return stryMutAct_9fa48("15425") ? {} : (stryCov_9fa48("15425"), {
          isOutside: stryMutAct_9fa48("15426") ? true : (stryCov_9fa48("15426"), false),
          timing: stryMutAct_9fa48("15427") ? "" : (stryCov_9fa48("15427"), "within"),
          message: null
        });
      }
    }
    const currentDateStr = todayInArgentina(now);
    const scheduledDateLabel = formatCalendarDay(service.scheduledDate);
    const currentHours = String(now.getHours()).padStart(2, stryMutAct_9fa48("15428") ? "" : (stryCov_9fa48("15428"), "0"));
    const currentMinutes = String(now.getMinutes()).padStart(2, stryMutAct_9fa48("15429") ? "" : (stryCov_9fa48("15429"), "0"));
    const currentTimeStr = stryMutAct_9fa48("15430") ? `` : (stryCov_9fa48("15430"), `${currentHours}:${currentMinutes}`);
    if (stryMutAct_9fa48("15434") ? service.scheduledDate >= currentDateStr : stryMutAct_9fa48("15433") ? service.scheduledDate <= currentDateStr : stryMutAct_9fa48("15432") ? false : stryMutAct_9fa48("15431") ? true : (stryCov_9fa48("15431", "15432", "15433", "15434"), service.scheduledDate < currentDateStr)) {
      if (stryMutAct_9fa48("15435")) {
        {}
      } else {
        stryCov_9fa48("15435");
        return stryMutAct_9fa48("15436") ? {} : (stryCov_9fa48("15436"), {
          isOutside: stryMutAct_9fa48("15437") ? false : (stryCov_9fa48("15437"), true),
          timing: stryMutAct_9fa48("15438") ? "" : (stryCov_9fa48("15438"), "late"),
          message: stryMutAct_9fa48("15439") ? `` : (stryCov_9fa48("15439"), `Inicio fuera de ventana horaria: la fecha programada fue el ${scheduledDateLabel} (${service.windowFrom} – ${service.windowTo}).`)
        });
      }
    }
    if (stryMutAct_9fa48("15443") ? service.scheduledDate <= currentDateStr : stryMutAct_9fa48("15442") ? service.scheduledDate >= currentDateStr : stryMutAct_9fa48("15441") ? false : stryMutAct_9fa48("15440") ? true : (stryCov_9fa48("15440", "15441", "15442", "15443"), service.scheduledDate > currentDateStr)) {
      if (stryMutAct_9fa48("15444")) {
        {}
      } else {
        stryCov_9fa48("15444");
        return stryMutAct_9fa48("15445") ? {} : (stryCov_9fa48("15445"), {
          isOutside: stryMutAct_9fa48("15446") ? false : (stryCov_9fa48("15446"), true),
          timing: stryMutAct_9fa48("15447") ? "" : (stryCov_9fa48("15447"), "early"),
          message: stryMutAct_9fa48("15448") ? `` : (stryCov_9fa48("15448"), `Inicio fuera de ventana horaria: el servicio está programado para el ${scheduledDateLabel} (${service.windowFrom} – ${service.windowTo}).`)
        });
      }
    }
    if (stryMutAct_9fa48("15452") ? currentTimeStr >= service.windowFrom : stryMutAct_9fa48("15451") ? currentTimeStr <= service.windowFrom : stryMutAct_9fa48("15450") ? false : stryMutAct_9fa48("15449") ? true : (stryCov_9fa48("15449", "15450", "15451", "15452"), currentTimeStr < service.windowFrom)) {
      if (stryMutAct_9fa48("15453")) {
        {}
      } else {
        stryCov_9fa48("15453");
        return stryMutAct_9fa48("15454") ? {} : (stryCov_9fa48("15454"), {
          isOutside: stryMutAct_9fa48("15455") ? false : (stryCov_9fa48("15455"), true),
          timing: stryMutAct_9fa48("15456") ? "" : (stryCov_9fa48("15456"), "early"),
          message: stryMutAct_9fa48("15457") ? `` : (stryCov_9fa48("15457"), `Inicio fuera de ventana horaria: la ventana programada inicia a las ${service.windowFrom} (actual: ${currentTimeStr}).`)
        });
      }
    }
    if (stryMutAct_9fa48("15461") ? currentTimeStr <= service.windowTo : stryMutAct_9fa48("15460") ? currentTimeStr >= service.windowTo : stryMutAct_9fa48("15459") ? false : stryMutAct_9fa48("15458") ? true : (stryCov_9fa48("15458", "15459", "15460", "15461"), currentTimeStr > service.windowTo)) {
      if (stryMutAct_9fa48("15462")) {
        {}
      } else {
        stryCov_9fa48("15462");
        return stryMutAct_9fa48("15463") ? {} : (stryCov_9fa48("15463"), {
          isOutside: stryMutAct_9fa48("15464") ? false : (stryCov_9fa48("15464"), true),
          timing: stryMutAct_9fa48("15465") ? "" : (stryCov_9fa48("15465"), "late"),
          message: stryMutAct_9fa48("15466") ? `` : (stryCov_9fa48("15466"), `Inicio fuera de ventana horaria: la ventana programada finalizó a las ${service.windowTo} (actual: ${currentTimeStr}).`)
        });
      }
    }
    return stryMutAct_9fa48("15467") ? {} : (stryCov_9fa48("15467"), {
      isOutside: stryMutAct_9fa48("15468") ? true : (stryCov_9fa48("15468"), false),
      timing: stryMutAct_9fa48("15469") ? "" : (stryCov_9fa48("15469"), "within"),
      message: null
    });
  }
}