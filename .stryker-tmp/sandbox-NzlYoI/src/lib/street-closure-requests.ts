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
import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";
import { treeInterventionTypeSchema } from "./tree-interventions";
export const streetClosureTypeSchema = z.enum(stryMutAct_9fa48("16015") ? [] : (stryCov_9fa48("16015"), [stryMutAct_9fa48("16016") ? "" : (stryCov_9fa48("16016"), "TOTAL"), stryMutAct_9fa48("16017") ? "" : (stryCov_9fa48("16017"), "PARTIAL")]));
export type StreetClosureType = z.infer<typeof streetClosureTypeSchema>;
export const streetClosureDirectionSchema = z.enum(stryMutAct_9fa48("16018") ? [] : (stryCov_9fa48("16018"), [stryMutAct_9fa48("16019") ? "" : (stryCov_9fa48("16019"), "FORWARD"), stryMutAct_9fa48("16020") ? "" : (stryCov_9fa48("16020"), "REVERSE"), stryMutAct_9fa48("16021") ? "" : (stryCov_9fa48("16021"), "BOTH")]), stryMutAct_9fa48("16022") ? {} : (stryCov_9fa48("16022"), {
  error: stryMutAct_9fa48("16023") ? "" : (stryCov_9fa48("16023"), "Indique el sentido del tramo")
}));
export type StreetClosureDirection = z.infer<typeof streetClosureDirectionSchema>;
export const streetClosureRequestStatusSchema = z.enum(stryMutAct_9fa48("16024") ? [] : (stryCov_9fa48("16024"), [stryMutAct_9fa48("16025") ? "" : (stryCov_9fa48("16025"), "REQUESTED"), stryMutAct_9fa48("16026") ? "" : (stryCov_9fa48("16026"), "APPROVED"), stryMutAct_9fa48("16027") ? "" : (stryCov_9fa48("16027"), "REJECTED"), stryMutAct_9fa48("16028") ? "" : (stryCov_9fa48("16028"), "ENDED"), stryMutAct_9fa48("16029") ? "" : (stryCov_9fa48("16029"), "EXPIRED")]));
export type StreetClosureRequestStatus = z.infer<typeof streetClosureRequestStatusSchema>;
export const streetClosureRequestSourceTypeSchema = z.enum(stryMutAct_9fa48("16030") ? [] : (stryCov_9fa48("16030"), [stryMutAct_9fa48("16031") ? "" : (stryCov_9fa48("16031"), "SERVICE"), stryMutAct_9fa48("16032") ? "" : (stryCov_9fa48("16032"), "TREE_INTERVENTION")]));
export type StreetClosureRequestSourceType = z.infer<typeof streetClosureRequestSourceTypeSchema>;
const affectedSectionFields = stryMutAct_9fa48("16033") ? {} : (stryCov_9fa48("16033"), {
  streetName: stryMutAct_9fa48("16035") ? z.string().min(1, "Indique el nombre de la calle") : stryMutAct_9fa48("16034") ? z.string().trim().max(1, "Indique el nombre de la calle") : (stryCov_9fa48("16034", "16035"), z.string().trim().min(1, stryMutAct_9fa48("16036") ? "" : (stryCov_9fa48("16036"), "Indique el nombre de la calle"))),
  fromCross: stryMutAct_9fa48("16038") ? z.string().min(1, "Indique la calle transversal de inicio") : stryMutAct_9fa48("16037") ? z.string().trim().max(1, "Indique la calle transversal de inicio") : (stryCov_9fa48("16037", "16038"), z.string().trim().min(1, stryMutAct_9fa48("16039") ? "" : (stryCov_9fa48("16039"), "Indique la calle transversal de inicio"))),
  toCross: stryMutAct_9fa48("16041") ? z.string().min(1, "Indique la calle transversal de fin") : stryMutAct_9fa48("16040") ? z.string().trim().max(1, "Indique la calle transversal de fin") : (stryCov_9fa48("16040", "16041"), z.string().trim().min(1, stryMutAct_9fa48("16042") ? "" : (stryCov_9fa48("16042"), "Indique la calle transversal de fin")))
});

/** Direction can be absent on older requests returned by the backend. */
export const affectedSectionSchema = z.object(stryMutAct_9fa48("16043") ? {} : (stryCov_9fa48("16043"), {
  ...affectedSectionFields,
  direction: streetClosureDirectionSchema.nullish()
}));
export type AffectedSection = z.infer<typeof affectedSectionSchema>;
export const createAffectedSectionSchema = z.object(stryMutAct_9fa48("16044") ? {} : (stryCov_9fa48("16044"), {
  ...affectedSectionFields,
  direction: streetClosureDirectionSchema
}));
export type CreateAffectedSection = z.infer<typeof createAffectedSectionSchema>;
export function streetClosureDirectionLabel(direction: StreetClosureDirection | null | undefined): string {
  if (stryMutAct_9fa48("16045")) {
    {}
  } else {
    stryCov_9fa48("16045");
    if (stryMutAct_9fa48("16048") ? direction !== "FORWARD" : stryMutAct_9fa48("16047") ? false : stryMutAct_9fa48("16046") ? true : (stryCov_9fa48("16046", "16047", "16048"), direction === (stryMutAct_9fa48("16049") ? "" : (stryCov_9fa48("16049"), "FORWARD")))) return stryMutAct_9fa48("16050") ? "" : (stryCov_9fa48("16050"), "Ascendente");
    if (stryMutAct_9fa48("16053") ? direction !== "REVERSE" : stryMutAct_9fa48("16052") ? false : stryMutAct_9fa48("16051") ? true : (stryCov_9fa48("16051", "16052", "16053"), direction === (stryMutAct_9fa48("16054") ? "" : (stryCov_9fa48("16054"), "REVERSE")))) return stryMutAct_9fa48("16055") ? "" : (stryCov_9fa48("16055"), "Descendente");
    if (stryMutAct_9fa48("16058") ? direction !== "BOTH" : stryMutAct_9fa48("16057") ? false : stryMutAct_9fa48("16056") ? true : (stryCov_9fa48("16056", "16057", "16058"), direction === (stryMutAct_9fa48("16059") ? "" : (stryCov_9fa48("16059"), "BOTH")))) return stryMutAct_9fa48("16060") ? "" : (stryCov_9fa48("16060"), "Ambos sentidos");
    return stryMutAct_9fa48("16061") ? "" : (stryCov_9fa48("16061"), "Sentido no informado");
  }
}
const serviceStreetClosureSourceContextSchema = z.object(stryMutAct_9fa48("16062") ? {} : (stryCov_9fa48("16062"), {
  sourceType: z.literal(stryMutAct_9fa48("16063") ? "" : (stryCov_9fa48("16063"), "SERVICE")),
  sourceId: stryMutAct_9fa48("16064") ? z.string().max(1) : (stryCov_9fa48("16064"), z.string().min(1)),
  title: stryMutAct_9fa48("16065") ? z.string().max(1) : (stryCov_9fa48("16065"), z.string().min(1)),
  mode: z.enum(stryMutAct_9fa48("16066") ? [] : (stryCov_9fa48("16066"), [stryMutAct_9fa48("16067") ? "" : (stryCov_9fa48("16067"), "ROUTE"), stryMutAct_9fa48("16068") ? "" : (stryCov_9fa48("16068"), "POINT")])),
  serviceTypeName: stryMutAct_9fa48("16069") ? z.string().max(1) : (stryCov_9fa48("16069"), z.string().min(1)),
  scheduledDate: stryMutAct_9fa48("16070") ? z.string().max(1) : (stryCov_9fa48("16070"), z.string().min(1)),
  windowFrom: z.string().nullable(),
  windowTo: z.string().nullable()
}));
const treeInterventionStreetClosureSourceContextSchema = z.object(stryMutAct_9fa48("16071") ? {} : (stryCov_9fa48("16071"), {
  sourceType: z.literal(stryMutAct_9fa48("16072") ? "" : (stryCov_9fa48("16072"), "TREE_INTERVENTION")),
  sourceId: stryMutAct_9fa48("16073") ? z.string().max(1) : (stryCov_9fa48("16073"), z.string().min(1)),
  title: stryMutAct_9fa48("16074") ? z.string().max(1) : (stryCov_9fa48("16074"), z.string().min(1)),
  interventionType: treeInterventionTypeSchema,
  address: stryMutAct_9fa48("16075") ? z.string().max(1) : (stryCov_9fa48("16075"), z.string().min(1))
}));
export const streetClosureSourceContextSchema = z.discriminatedUnion(stryMutAct_9fa48("16076") ? "" : (stryCov_9fa48("16076"), "sourceType"), stryMutAct_9fa48("16077") ? [] : (stryCov_9fa48("16077"), [serviceStreetClosureSourceContextSchema, treeInterventionStreetClosureSourceContextSchema]));
export type StreetClosureSourceContext = z.infer<typeof streetClosureSourceContextSchema>;
export const createStreetClosureRequestInputSchema = z.object(stryMutAct_9fa48("16078") ? {} : (stryCov_9fa48("16078"), {
  reason: stryMutAct_9fa48("16080") ? z.string().min(1, "El motivo es obligatorio") : stryMutAct_9fa48("16079") ? z.string().trim().max(1, "El motivo es obligatorio") : (stryCov_9fa48("16079", "16080"), z.string().trim().min(1, stryMutAct_9fa48("16081") ? "" : (stryCov_9fa48("16081"), "El motivo es obligatorio"))),
  sourceType: streetClosureRequestSourceTypeSchema,
  sourceId: stryMutAct_9fa48("16083") ? z.string().min(1, "Debe indicar la fuente de origen") : stryMutAct_9fa48("16082") ? z.string().trim().max(1, "Debe indicar la fuente de origen") : (stryCov_9fa48("16082", "16083"), z.string().trim().min(1, stryMutAct_9fa48("16084") ? "" : (stryCov_9fa48("16084"), "Debe indicar la fuente de origen"))),
  sourceModule: z.literal(stryMutAct_9fa48("16085") ? "" : (stryCov_9fa48("16085"), "M6")),
  closureType: streetClosureTypeSchema,
  requestedFrom: stryMutAct_9fa48("16087") ? z.string().min(1, "Indique el inicio de la ventana solicitada") : stryMutAct_9fa48("16086") ? z.string().trim().max(1, "Indique el inicio de la ventana solicitada") : (stryCov_9fa48("16086", "16087"), z.string().trim().min(1, stryMutAct_9fa48("16088") ? "" : (stryCov_9fa48("16088"), "Indique el inicio de la ventana solicitada"))),
  requestedTo: stryMutAct_9fa48("16090") ? z.string().min(1, "Indique el fin de la ventana solicitada") : stryMutAct_9fa48("16089") ? z.string().trim().max(1, "Indique el fin de la ventana solicitada") : (stryCov_9fa48("16089", "16090"), z.string().trim().min(1, stryMutAct_9fa48("16091") ? "" : (stryCov_9fa48("16091"), "Indique el fin de la ventana solicitada"))),
  // Backend confirms REST `sections` and required `closureType`; its M7 event uses structured
  // `affectedSections` entries with `direction` (Backend docs/bloqueantes at 448a538, 31/10; #447).
  // The adapter owns the translation so the UI does not depend on the REST wire name.
  affectedSections: stryMutAct_9fa48("16092") ? z.array(createAffectedSectionSchema).max(1, "Agregue al menos un tramo afectado") : (stryCov_9fa48("16092"), z.array(createAffectedSectionSchema).min(1, stryMutAct_9fa48("16093") ? "" : (stryCov_9fa48("16093"), "Agregue al menos un tramo afectado")))
})).superRefine((data, ctx) => {
  if (stryMutAct_9fa48("16094")) {
    {}
  } else {
    stryCov_9fa48("16094");
    const from = Date.parse(data.requestedFrom);
    const to = Date.parse(data.requestedTo);
    if (stryMutAct_9fa48("16097") ? !Number.isNaN(from) && !Number.isNaN(to) || from >= to : stryMutAct_9fa48("16096") ? false : stryMutAct_9fa48("16095") ? true : (stryCov_9fa48("16095", "16096", "16097"), (stryMutAct_9fa48("16099") ? !Number.isNaN(from) || !Number.isNaN(to) : stryMutAct_9fa48("16098") ? true : (stryCov_9fa48("16098", "16099"), (stryMutAct_9fa48("16100") ? Number.isNaN(from) : (stryCov_9fa48("16100"), !Number.isNaN(from))) && (stryMutAct_9fa48("16101") ? Number.isNaN(to) : (stryCov_9fa48("16101"), !Number.isNaN(to))))) && (stryMutAct_9fa48("16104") ? from < to : stryMutAct_9fa48("16103") ? from > to : stryMutAct_9fa48("16102") ? true : (stryCov_9fa48("16102", "16103", "16104"), from >= to)))) {
      if (stryMutAct_9fa48("16105")) {
        {}
      } else {
        stryCov_9fa48("16105");
        ctx.addIssue(stryMutAct_9fa48("16107") ? {} : (stryCov_9fa48("16107"), {
          code: z.ZodIssueCode.custom,
          path: stryMutAct_9fa48("16108") ? [] : (stryCov_9fa48("16108"), [stryMutAct_9fa48("16109") ? "" : (stryCov_9fa48("16109"), "requestedTo")]),
          message: stryMutAct_9fa48("16110") ? "" : (stryCov_9fa48("16110"), "La ventana final debe ser posterior a la inicial")
        }));
      }
    }
  }
});
export type CreateStreetClosureRequestInput = z.infer<typeof createStreetClosureRequestInputSchema>;
const streetClosureRequestShape = z.object(stryMutAct_9fa48("16111") ? {} : (stryCov_9fa48("16111"), {
  id: stryMutAct_9fa48("16112") ? z.string().max(1) : (stryCov_9fa48("16112"), z.string().min(1)),
  reason: z.string(),
  sourceType: streetClosureRequestSourceTypeSchema,
  sourceId: stryMutAct_9fa48("16113") ? z.string().max(1) : (stryCov_9fa48("16113"), z.string().min(1)),
  sourceModule: z.literal(stryMutAct_9fa48("16114") ? "" : (stryCov_9fa48("16114"), "M6")),
  // Legacy records may omit optional M7 response fields or send null; normalize both to null.
  closureType: streetClosureTypeSchema.nullish().transform(stryMutAct_9fa48("16115") ? () => undefined : (stryCov_9fa48("16115"), value => stryMutAct_9fa48("16116") ? value && null : (stryCov_9fa48("16116"), value ?? null))),
  requestedFrom: z.string().nullish().transform(stryMutAct_9fa48("16117") ? () => undefined : (stryCov_9fa48("16117"), value => stryMutAct_9fa48("16118") ? value && null : (stryCov_9fa48("16118"), value ?? null))),
  requestedTo: z.string().nullish().transform(stryMutAct_9fa48("16119") ? () => undefined : (stryCov_9fa48("16119"), value => stryMutAct_9fa48("16120") ? value && null : (stryCov_9fa48("16120"), value ?? null))),
  approvedFrom: z.string().datetime(stryMutAct_9fa48("16121") ? {} : (stryCov_9fa48("16121"), {
    offset: stryMutAct_9fa48("16122") ? false : (stryCov_9fa48("16122"), true)
  })).nullish().transform(stryMutAct_9fa48("16123") ? () => undefined : (stryCov_9fa48("16123"), value => stryMutAct_9fa48("16124") ? value && null : (stryCov_9fa48("16124"), value ?? null))),
  approvedTo: z.string().datetime(stryMutAct_9fa48("16125") ? {} : (stryCov_9fa48("16125"), {
    offset: stryMutAct_9fa48("16126") ? false : (stryCov_9fa48("16126"), true)
  })).nullish().transform(stryMutAct_9fa48("16127") ? () => undefined : (stryCov_9fa48("16127"), value => stryMutAct_9fa48("16128") ? value && null : (stryCov_9fa48("16128"), value ?? null))),
  rejectionReason: z.string().nullish().transform(stryMutAct_9fa48("16129") ? () => undefined : (stryCov_9fa48("16129"), value => stryMutAct_9fa48("16130") ? value && null : (stryCov_9fa48("16130"), value ?? null))),
  affectedSections: stryMutAct_9fa48("16131") ? z.array(affectedSectionSchema).max(1) : (stryCov_9fa48("16131"), z.array(affectedSectionSchema).min(1)),
  status: streetClosureRequestStatusSchema,
  closureId: z.string().nullish().transform(stryMutAct_9fa48("16132") ? () => undefined : (stryCov_9fa48("16132"), value => stryMutAct_9fa48("16133") ? value && null : (stryCov_9fa48("16133"), value ?? null))),
  // Not part of the backend DTO: only present in fixtures. Consumers fall back to `reason`.
  sourceContext: streetClosureSourceContextSchema.optional(),
  createdAt: z.string(),
  updatedAt: z.string()
}));

/**
 * Backend's StreetClosureRequestResponseDto names these fields `sections`, `closureFrom` and
 * `closureTo` and has no `sourceModule` (#735). Its approved window is `approvedFrom`/`approvedTo`.
 * Map the wire shape onto the internal one; anything already in the internal shape passes through.
 */
function fromWireShape(record: unknown): unknown {
  if (stryMutAct_9fa48("16134")) {
    {}
  } else {
    stryCov_9fa48("16134");
    if (stryMutAct_9fa48("16137") ? (!record || typeof record !== "object") && !("sections" in record) : stryMutAct_9fa48("16136") ? false : stryMutAct_9fa48("16135") ? true : (stryCov_9fa48("16135", "16136", "16137"), (stryMutAct_9fa48("16139") ? !record && typeof record !== "object" : stryMutAct_9fa48("16138") ? false : (stryCov_9fa48("16138", "16139"), (stryMutAct_9fa48("16140") ? record : (stryCov_9fa48("16140"), !record)) || (stryMutAct_9fa48("16142") ? typeof record === "object" : stryMutAct_9fa48("16141") ? false : (stryCov_9fa48("16141", "16142"), typeof record !== (stryMutAct_9fa48("16143") ? "" : (stryCov_9fa48("16143"), "object")))))) || (stryMutAct_9fa48("16144") ? "sections" in record : (stryCov_9fa48("16144"), !((stryMutAct_9fa48("16145") ? "" : (stryCov_9fa48("16145"), "sections")) in record))))) return record;
    const {
      sections,
      closureFrom,
      closureTo,
      ...rest
    } = record as Record<string, unknown>;
    // Only fill what is absent: a field already in the internal shape wins over its wire alias.
    return stryMutAct_9fa48("16146") ? {} : (stryCov_9fa48("16146"), {
      ...rest,
      sourceModule: stryMutAct_9fa48("16147") ? rest.sourceModule && "M6" : (stryCov_9fa48("16147"), rest.sourceModule ?? (stryMutAct_9fa48("16148") ? "" : (stryCov_9fa48("16148"), "M6"))),
      affectedSections: stryMutAct_9fa48("16149") ? rest.affectedSections && sections : (stryCov_9fa48("16149"), rest.affectedSections ?? sections),
      requestedFrom: stryMutAct_9fa48("16150") ? rest.requestedFrom && closureFrom : (stryCov_9fa48("16150"), rest.requestedFrom ?? closureFrom),
      requestedTo: stryMutAct_9fa48("16151") ? rest.requestedTo && closureTo : (stryCov_9fa48("16151"), rest.requestedTo ?? closureTo)
    });
  }
}
export const streetClosureRequestSchema = z.preprocess(fromWireShape, streetClosureRequestShape);
export type StreetClosureRequest = z.infer<typeof streetClosureRequestSchema>;
export const approveStreetClosureRequestInputSchema = z.object(stryMutAct_9fa48("16152") ? {} : (stryCov_9fa48("16152"), {
  closureId: stryMutAct_9fa48("16154") ? z.string().min(1, "El número de corte de Tránsito es obligatorio") : stryMutAct_9fa48("16153") ? z.string().trim().max(1, "El número de corte de Tránsito es obligatorio") : (stryCov_9fa48("16153", "16154"), z.string().trim().min(1, stryMutAct_9fa48("16155") ? "" : (stryCov_9fa48("16155"), "El número de corte de Tránsito es obligatorio")))
}));
export type ApproveStreetClosureRequestInput = z.infer<typeof approveStreetClosureRequestInputSchema>;
export const streetClosureRequestQuerySchema = z.object(stryMutAct_9fa48("16156") ? {} : (stryCov_9fa48("16156"), {
  status: streetClosureRequestStatusSchema.optional(),
  sourceId: z.string().optional(),
  page: z.number().int().positive().optional(),
  pageSize: stryMutAct_9fa48("16157") ? z.number().int().positive().min(100).optional() : (stryCov_9fa48("16157"), z.number().int().positive().max(100).optional())
}));
export type StreetClosureRequestQuery = z.infer<typeof streetClosureRequestQuerySchema>;
export type StreetClosureRequestPage = {
  requests: StreetClosureRequest[];
  /** Records the backend sent that do not match the contract (e.g. an unknown status); never shown as valid. */
  invalid: number;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export type StreetClosureDependencyOutcome = "none" | "blocked" | "allowed" | "rejected" | "released"
// Backend swept an APPROVED closure M7 let lapse; the unstarted Service is already RESCHEDULED.
| "expired";
export type StreetClosureDependency = {
  request: StreetClosureRequest | null;
  outcome: StreetClosureDependencyOutcome;
};
export function resolveStreetClosureDependency(requests: StreetClosureRequest[]): StreetClosureDependency {
  if (stryMutAct_9fa48("16158")) {
    {}
  } else {
    stryCov_9fa48("16158");
    const request = stryMutAct_9fa48("16159") ? [...requests].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0] && null : (stryCov_9fa48("16159"), (stryMutAct_9fa48("16160") ? [...requests][0] : (stryCov_9fa48("16160"), (stryMutAct_9fa48("16161") ? [] : (stryCov_9fa48("16161"), [...requests])).sort(stryMutAct_9fa48("16162") ? () => undefined : (stryCov_9fa48("16162"), (left, right) => stryMutAct_9fa48("16163") ? Date.parse(right.updatedAt) + Date.parse(left.updatedAt) : (stryCov_9fa48("16163"), Date.parse(right.updatedAt) - Date.parse(left.updatedAt))))[0])) ?? null);
    if (stryMutAct_9fa48("16166") ? false : stryMutAct_9fa48("16165") ? true : stryMutAct_9fa48("16164") ? request : (stryCov_9fa48("16164", "16165", "16166"), !request)) return stryMutAct_9fa48("16167") ? {} : (stryCov_9fa48("16167"), {
      request: null,
      outcome: stryMutAct_9fa48("16168") ? "" : (stryCov_9fa48("16168"), "none")
    });
    if (stryMutAct_9fa48("16171") ? request.status !== "REQUESTED" : stryMutAct_9fa48("16170") ? false : stryMutAct_9fa48("16169") ? true : (stryCov_9fa48("16169", "16170", "16171"), request.status === (stryMutAct_9fa48("16172") ? "" : (stryCov_9fa48("16172"), "REQUESTED")))) return stryMutAct_9fa48("16173") ? {} : (stryCov_9fa48("16173"), {
      request,
      outcome: stryMutAct_9fa48("16174") ? "" : (stryCov_9fa48("16174"), "blocked")
    });
    if (stryMutAct_9fa48("16177") ? request.status !== "REJECTED" : stryMutAct_9fa48("16176") ? false : stryMutAct_9fa48("16175") ? true : (stryCov_9fa48("16175", "16176", "16177"), request.status === (stryMutAct_9fa48("16178") ? "" : (stryCov_9fa48("16178"), "REJECTED")))) return stryMutAct_9fa48("16179") ? {} : (stryCov_9fa48("16179"), {
      request,
      outcome: stryMutAct_9fa48("16180") ? "" : (stryCov_9fa48("16180"), "rejected")
    });
    if (stryMutAct_9fa48("16183") ? request.status !== "ENDED" : stryMutAct_9fa48("16182") ? false : stryMutAct_9fa48("16181") ? true : (stryCov_9fa48("16181", "16182", "16183"), request.status === (stryMutAct_9fa48("16184") ? "" : (stryCov_9fa48("16184"), "ENDED")))) return stryMutAct_9fa48("16185") ? {} : (stryCov_9fa48("16185"), {
      request,
      outcome: stryMutAct_9fa48("16186") ? "" : (stryCov_9fa48("16186"), "released")
    });
    if (stryMutAct_9fa48("16189") ? request.status !== "EXPIRED" : stryMutAct_9fa48("16188") ? false : stryMutAct_9fa48("16187") ? true : (stryCov_9fa48("16187", "16188", "16189"), request.status === (stryMutAct_9fa48("16190") ? "" : (stryCov_9fa48("16190"), "EXPIRED")))) return stryMutAct_9fa48("16191") ? {} : (stryCov_9fa48("16191"), {
      request,
      outcome: stryMutAct_9fa48("16192") ? "" : (stryCov_9fa48("16192"), "expired")
    });
    return stryMutAct_9fa48("16193") ? {} : (stryCov_9fa48("16193"), {
      request,
      outcome: stryMutAct_9fa48("16194") ? "" : (stryCov_9fa48("16194"), "allowed")
    });
  }
}
export class StreetClosureRequestContractError extends Error {
  constructor(message: string, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("16195")) {
      {}
    } else {
      stryCov_9fa48("16195");
      super(message, options);
      this.name = stryMutAct_9fa48("16196") ? "" : (stryCov_9fa48("16196"), "StreetClosureRequestContractError");
    }
  }
}
export class StreetClosureRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("16197")) {
      {}
    } else {
      stryCov_9fa48("16197");
      super(message, options);
      this.name = stryMutAct_9fa48("16198") ? "" : (stryCov_9fa48("16198"), "StreetClosureRequestError");
      this.status = status;
    }
  }
}
const errorResponseSchema = z.object(stryMutAct_9fa48("16199") ? {} : (stryCov_9fa48("16199"), {
  statusCode: z.number(),
  message: z.union(stryMutAct_9fa48("16200") ? [] : (stryCov_9fa48("16200"), [z.string(), z.array(z.string())])),
  error: z.string(),
  timestamp: z.string(),
  path: z.string()
}));
const requestPageSchema = z.object(stryMutAct_9fa48("16201") ? {} : (stryCov_9fa48("16201"), {
  data: z.array(z.unknown()),
  meta: z.object(stryMutAct_9fa48("16202") ? {} : (stryCov_9fa48("16202"), {
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number()
  }))
}));
function buildQueryString(query: StreetClosureRequestQuery): string {
  if (stryMutAct_9fa48("16203")) {
    {}
  } else {
    stryCov_9fa48("16203");
    const params = new URLSearchParams();
    if (stryMutAct_9fa48("16205") ? false : stryMutAct_9fa48("16204") ? true : (stryCov_9fa48("16204", "16205"), query.status)) params.set(stryMutAct_9fa48("16207") ? "" : (stryCov_9fa48("16207"), "status"), query.status);
    if (stryMutAct_9fa48("16209") ? false : stryMutAct_9fa48("16208") ? true : (stryCov_9fa48("16208", "16209"), query.sourceId)) params.set(stryMutAct_9fa48("16211") ? "" : (stryCov_9fa48("16211"), "sourceId"), query.sourceId);
    if (stryMutAct_9fa48("16214") ? query.page === undefined : stryMutAct_9fa48("16213") ? false : stryMutAct_9fa48("16212") ? true : (stryCov_9fa48("16212", "16213", "16214"), query.page !== undefined)) params.set(stryMutAct_9fa48("16216") ? "" : (stryCov_9fa48("16216"), "page"), String(query.page));
    if (stryMutAct_9fa48("16219") ? query.pageSize === undefined : stryMutAct_9fa48("16218") ? false : stryMutAct_9fa48("16217") ? true : (stryCov_9fa48("16217", "16218", "16219"), query.pageSize !== undefined)) params.set(stryMutAct_9fa48("16221") ? "" : (stryCov_9fa48("16221"), "pageSize"), String(query.pageSize));
    const queryString = params.toString();
    return queryString ? stryMutAct_9fa48("16222") ? `` : (stryCov_9fa48("16222"), `?${queryString}`) : stryMutAct_9fa48("16223") ? "Stryker was here!" : (stryCov_9fa48("16223"), "");
  }
}
async function readJsonBody(response: Response): Promise<unknown> {
  if (stryMutAct_9fa48("16224")) {
    {}
  } else {
    stryCov_9fa48("16224");
    try {
      if (stryMutAct_9fa48("16225")) {
        {}
      } else {
        stryCov_9fa48("16225");
        return await response.json();
      }
    } catch (cause) {
      if (stryMutAct_9fa48("16226")) {
        {}
      } else {
        stryCov_9fa48("16226");
        recordTelemetryEvent(stryMutAct_9fa48("16228") ? {} : (stryCov_9fa48("16228"), {
          name: stryMutAct_9fa48("16229") ? "" : (stryCov_9fa48("16229"), "request_malformed_response"),
          resource: stryMutAct_9fa48("16230") ? "" : (stryCov_9fa48("16230"), "street-closure-requests")
        }));
        throw new StreetClosureRequestContractError(stryMutAct_9fa48("16232") ? "" : (stryCov_9fa48("16232"), "No se pudo obtener información válida de cortes de calle. Reintente en unos segundos."), stryMutAct_9fa48("16233") ? {} : (stryCov_9fa48("16233"), {
          cause
        }));
      }
    }
  }
}
async function requestError(payload: unknown, response: Response): Promise<never> {
  if (stryMutAct_9fa48("16234")) {
    {}
  } else {
    stryCov_9fa48("16234");
    const parsedError = errorResponseSchema.safeParse(payload);
    if (stryMutAct_9fa48("16237") ? false : stryMutAct_9fa48("16236") ? true : stryMutAct_9fa48("16235") ? parsedError.success : (stryCov_9fa48("16235", "16236", "16237"), !parsedError.success)) {
      if (stryMutAct_9fa48("16238")) {
        {}
      } else {
        stryCov_9fa48("16238");
        recordTelemetryEvent(stryMutAct_9fa48("16240") ? {} : (stryCov_9fa48("16240"), {
          name: stryMutAct_9fa48("16241") ? "" : (stryCov_9fa48("16241"), "request_malformed_response"),
          resource: stryMutAct_9fa48("16242") ? "" : (stryCov_9fa48("16242"), "street-closure-requests")
        }));
        throw new StreetClosureRequestContractError(stryMutAct_9fa48("16244") ? "" : (stryCov_9fa48("16244"), "No se pudo obtener información válida de cortes de calle. Reintente en unos segundos."), stryMutAct_9fa48("16245") ? {} : (stryCov_9fa48("16245"), {
          cause: parsedError.error
        }));
      }
    }
    const message = Array.isArray(parsedError.data.message) ? parsedError.data.message.join(stryMutAct_9fa48("16246") ? "" : (stryCov_9fa48("16246"), " ")) : parsedError.data.message;
    if (stryMutAct_9fa48("16247")) {
      ;
    } else {
      stryCov_9fa48("16247");
      throw new StreetClosureRequestError(message, response.status);
    }
  }
}
async function sendRequest(path: string, init?: RequestInit): Promise<unknown> {
  if (stryMutAct_9fa48("16248")) {
    {}
  } else {
    stryCov_9fa48("16248");
    let response: Response;
    try {
      if (stryMutAct_9fa48("16249")) {
        {}
      } else {
        stryCov_9fa48("16249");
        response = await authenticatedFetch(path, init);
      }
    } catch (cause) {
      if (stryMutAct_9fa48("16250")) {
        {}
      } else {
        stryCov_9fa48("16250");
        if (stryMutAct_9fa48("16252") ? false : stryMutAct_9fa48("16251") ? true : (stryCov_9fa48("16251", "16252"), cause instanceof NetworkFailureError)) {
          if (stryMutAct_9fa48("16253")) {
            {}
          } else {
            stryCov_9fa48("16253");
            recordTelemetryEvent(stryMutAct_9fa48("16255") ? {} : (stryCov_9fa48("16255"), {
              name: stryMutAct_9fa48("16256") ? "" : (stryCov_9fa48("16256"), "request_network_failure"),
              resource: stryMutAct_9fa48("16257") ? "" : (stryCov_9fa48("16257"), "street-closure-requests")
            }));
          }
        }
        throw cause;
      }
    }
    const payload = await readJsonBody(response);
    if (stryMutAct_9fa48("16260") ? false : stryMutAct_9fa48("16259") ? true : stryMutAct_9fa48("16258") ? response.ok : (stryCov_9fa48("16258", "16259", "16260"), !response.ok)) return requestError(payload, response);
    return payload;
  }
}
function parseRequest(payload: unknown, message: string): StreetClosureRequest {
  if (stryMutAct_9fa48("16261")) {
    {}
  } else {
    stryCov_9fa48("16261");
    const parsed = streetClosureRequestSchema.safeParse(payload);
    if (stryMutAct_9fa48("16264") ? false : stryMutAct_9fa48("16263") ? true : stryMutAct_9fa48("16262") ? parsed.success : (stryCov_9fa48("16262", "16263", "16264"), !parsed.success)) {
      if (stryMutAct_9fa48("16265")) {
        {}
      } else {
        stryCov_9fa48("16265");
        recordTelemetryEvent(stryMutAct_9fa48("16267") ? {} : (stryCov_9fa48("16267"), {
          name: stryMutAct_9fa48("16268") ? "" : (stryCov_9fa48("16268"), "request_malformed_response"),
          resource: stryMutAct_9fa48("16269") ? "" : (stryCov_9fa48("16269"), "street-closure-requests")
        }));
        throw new StreetClosureRequestContractError(message, stryMutAct_9fa48("16271") ? {} : (stryCov_9fa48("16271"), {
          cause: parsed.error
        }));
      }
    }
    return parsed.data;
  }
}
export const streetClosureRequestsAdapter = stryMutAct_9fa48("16272") ? {} : (stryCov_9fa48("16272"), {
  async list(query: StreetClosureRequestQuery = {}): Promise<StreetClosureRequestPage> {
    if (stryMutAct_9fa48("16273")) {
      {}
    } else {
      stryCov_9fa48("16273");
      const payload = await sendRequest(stryMutAct_9fa48("16274") ? `` : (stryCov_9fa48("16274"), `/api/street-closure-requests${buildQueryString(query)}`));
      const parsed = requestPageSchema.safeParse(payload);
      if (stryMutAct_9fa48("16277") ? false : stryMutAct_9fa48("16276") ? true : stryMutAct_9fa48("16275") ? parsed.success : (stryCov_9fa48("16275", "16276", "16277"), !parsed.success)) {
        if (stryMutAct_9fa48("16278")) {
          {}
        } else {
          stryCov_9fa48("16278");
          recordTelemetryEvent(stryMutAct_9fa48("16280") ? {} : (stryCov_9fa48("16280"), {
            name: stryMutAct_9fa48("16281") ? "" : (stryCov_9fa48("16281"), "request_malformed_response"),
            resource: stryMutAct_9fa48("16282") ? "" : (stryCov_9fa48("16282"), "street-closure-requests")
          }));
          throw new StreetClosureRequestContractError(stryMutAct_9fa48("16284") ? "" : (stryCov_9fa48("16284"), "No se pudo obtener información válida de la lista de cortes de calle. Reintente en unos segundos."), stryMutAct_9fa48("16285") ? {} : (stryCov_9fa48("16285"), {
            cause: parsed.error
          }));
        }
      }
      const requests: StreetClosureRequest[] = stryMutAct_9fa48("16286") ? ["Stryker was here"] : (stryCov_9fa48("16286"), []);
      let invalid = 0;
      for (const record of parsed.data.data) {
        if (stryMutAct_9fa48("16287")) {
          {}
        } else {
          stryCov_9fa48("16287");
          const item = streetClosureRequestSchema.safeParse(record);
          if (stryMutAct_9fa48("16289") ? false : stryMutAct_9fa48("16288") ? true : (stryCov_9fa48("16288", "16289"), item.success)) {
            if (stryMutAct_9fa48("16290")) {
              {}
            } else {
              stryCov_9fa48("16290");
              if (stryMutAct_9fa48("16291")) {
                ;
              } else {
                stryCov_9fa48("16291");
                requests.push(item.data);
              }
              continue;
            }
          }
          stryMutAct_9fa48("16292") ? invalid -= 1 : (stryCov_9fa48("16292"), invalid += 1);
          recordTelemetryEvent(stryMutAct_9fa48("16294") ? {} : (stryCov_9fa48("16294"), {
            name: stryMutAct_9fa48("16295") ? "" : (stryCov_9fa48("16295"), "request_malformed_response"),
            resource: stryMutAct_9fa48("16296") ? "" : (stryCov_9fa48("16296"), "street-closure-requests")
          }));
          const id = (stryMutAct_9fa48("16299") ? typeof record === "object" && record || "id" in record : stryMutAct_9fa48("16298") ? false : stryMutAct_9fa48("16297") ? true : (stryCov_9fa48("16297", "16298", "16299"), (stryMutAct_9fa48("16301") ? typeof record === "object" || record : stryMutAct_9fa48("16300") ? true : (stryCov_9fa48("16300", "16301"), (stryMutAct_9fa48("16303") ? typeof record !== "object" : stryMutAct_9fa48("16302") ? true : (stryCov_9fa48("16302", "16303"), typeof record === (stryMutAct_9fa48("16304") ? "" : (stryCov_9fa48("16304"), "object")))) && record)) && (stryMutAct_9fa48("16305") ? "" : (stryCov_9fa48("16305"), "id")) in record)) ? String(record.id) : stryMutAct_9fa48("16306") ? "" : (stryCov_9fa48("16306"), "?");
          const status = (stryMutAct_9fa48("16309") ? typeof record === "object" && record || "status" in record : stryMutAct_9fa48("16308") ? false : stryMutAct_9fa48("16307") ? true : (stryCov_9fa48("16307", "16308", "16309"), (stryMutAct_9fa48("16311") ? typeof record === "object" || record : stryMutAct_9fa48("16310") ? true : (stryCov_9fa48("16310", "16311"), (stryMutAct_9fa48("16313") ? typeof record !== "object" : stryMutAct_9fa48("16312") ? true : (stryCov_9fa48("16312", "16313"), typeof record === (stryMutAct_9fa48("16314") ? "" : (stryCov_9fa48("16314"), "object")))) && record)) && (stryMutAct_9fa48("16315") ? "" : (stryCov_9fa48("16315"), "status")) in record)) ? String(record.status) : stryMutAct_9fa48("16316") ? "" : (stryCov_9fa48("16316"), "?");
          console.warn(stryMutAct_9fa48("16318") ? `` : (stryCov_9fa48("16318"), `Corte de calle ${id} descartado: no respeta el contrato (status: ${status}).`));
        }
      }
      return stryMutAct_9fa48("16319") ? {} : (stryCov_9fa48("16319"), {
        requests,
        invalid,
        ...parsed.data.meta
      });
    }
  },
  async getForService(serviceId: string): Promise<StreetClosureDependency> {
    if (stryMutAct_9fa48("16320")) {
      {}
    } else {
      stryCov_9fa48("16320");
      const page = await this.list(stryMutAct_9fa48("16321") ? {} : (stryCov_9fa48("16321"), {
        sourceId: serviceId,
        pageSize: 100
      }));
      // An unreadable record could be the one that decides the dependency: do not guess.
      if (stryMutAct_9fa48("16325") ? page.invalid <= 0 : stryMutAct_9fa48("16324") ? page.invalid >= 0 : stryMutAct_9fa48("16323") ? false : stryMutAct_9fa48("16322") ? true : (stryCov_9fa48("16322", "16323", "16324", "16325"), page.invalid > 0)) {
        if (stryMutAct_9fa48("16326")) {
          {}
        } else {
          stryCov_9fa48("16326");
          throw new StreetClosureRequestContractError(stryMutAct_9fa48("16328") ? "" : (stryCov_9fa48("16328"), "No se pudo obtener información válida del corte de calle. No se puede resolver la dependencia."));
        }
      }
      return resolveStreetClosureDependency(page.requests);
    }
  },
  async get(id: string): Promise<StreetClosureRequest> {
    if (stryMutAct_9fa48("16329")) {
      {}
    } else {
      stryCov_9fa48("16329");
      return parseRequest(await sendRequest(stryMutAct_9fa48("16330") ? `` : (stryCov_9fa48("16330"), `/api/street-closure-requests/${id}`)), stryMutAct_9fa48("16331") ? "" : (stryCov_9fa48("16331"), "No se pudo obtener información válida del detalle de corte de calle. Reintente en unos segundos."));
    }
  },
  async create(input: CreateStreetClosureRequestInput): Promise<StreetClosureRequest> {
    if (stryMutAct_9fa48("16332")) {
      {}
    } else {
      stryCov_9fa48("16332");
      const parsedInput = createStreetClosureRequestInputSchema.safeParse(input);
      if (stryMutAct_9fa48("16335") ? false : stryMutAct_9fa48("16334") ? true : stryMutAct_9fa48("16333") ? parsedInput.success : (stryCov_9fa48("16333", "16334", "16335"), !parsedInput.success)) {
        if (stryMutAct_9fa48("16336")) {
          {}
        } else {
          stryCov_9fa48("16336");
          throw new StreetClosureRequestContractError(stryMutAct_9fa48("16338") ? "" : (stryCov_9fa48("16338"), "Los datos del corte de calle son inválidos."), stryMutAct_9fa48("16339") ? {} : (stryCov_9fa48("16339"), {
            cause: parsedInput.error
          }));
        }
      }
      return parseRequest(await sendRequest(stryMutAct_9fa48("16340") ? "" : (stryCov_9fa48("16340"), "/api/street-closure-requests"), stryMutAct_9fa48("16341") ? {} : (stryCov_9fa48("16341"), {
        method: stryMutAct_9fa48("16342") ? "" : (stryCov_9fa48("16342"), "POST"),
        headers: stryMutAct_9fa48("16343") ? {} : (stryCov_9fa48("16343"), {
          "content-type": stryMutAct_9fa48("16344") ? "" : (stryCov_9fa48("16344"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      })), stryMutAct_9fa48("16345") ? "" : (stryCov_9fa48("16345"), "No se pudo obtener información válida de la creación del corte de calle. Reintente en unos segundos."));
    }
  },
  async approve(id: string, input: ApproveStreetClosureRequestInput): Promise<StreetClosureRequest> {
    if (stryMutAct_9fa48("16346")) {
      {}
    } else {
      stryCov_9fa48("16346");
      const parsedInput = approveStreetClosureRequestInputSchema.safeParse(input);
      if (stryMutAct_9fa48("16349") ? false : stryMutAct_9fa48("16348") ? true : stryMutAct_9fa48("16347") ? parsedInput.success : (stryCov_9fa48("16347", "16348", "16349"), !parsedInput.success)) {
        if (stryMutAct_9fa48("16350")) {
          {}
        } else {
          stryCov_9fa48("16350");
          throw new StreetClosureRequestContractError(stryMutAct_9fa48("16352") ? "" : (stryCov_9fa48("16352"), "El número de corte de Tránsito es inválido."), stryMutAct_9fa48("16353") ? {} : (stryCov_9fa48("16353"), {
            cause: parsedInput.error
          }));
        }
      }
      return parseRequest(await sendRequest(stryMutAct_9fa48("16354") ? `` : (stryCov_9fa48("16354"), `/api/street-closure-requests/${id}/approve`), stryMutAct_9fa48("16355") ? {} : (stryCov_9fa48("16355"), {
        method: stryMutAct_9fa48("16356") ? "" : (stryCov_9fa48("16356"), "POST"),
        headers: stryMutAct_9fa48("16357") ? {} : (stryCov_9fa48("16357"), {
          "content-type": stryMutAct_9fa48("16358") ? "" : (stryCov_9fa48("16358"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      })), stryMutAct_9fa48("16359") ? "" : (stryCov_9fa48("16359"), "No se pudo obtener información válida de la aprobación del corte de calle. Reintente en unos segundos."));
    }
  },
  async reject(id: string): Promise<StreetClosureRequest> {
    if (stryMutAct_9fa48("16360")) {
      {}
    } else {
      stryCov_9fa48("16360");
      return parseRequest(await sendRequest(stryMutAct_9fa48("16361") ? `` : (stryCov_9fa48("16361"), `/api/street-closure-requests/${id}/reject`), stryMutAct_9fa48("16362") ? {} : (stryCov_9fa48("16362"), {
        method: stryMutAct_9fa48("16363") ? "" : (stryCov_9fa48("16363"), "POST")
      })), stryMutAct_9fa48("16364") ? "" : (stryCov_9fa48("16364"), "No se pudo obtener información válida del rechazo del corte de calle. Reintente en unos segundos."));
    }
  },
  async end(id: string): Promise<StreetClosureRequest> {
    if (stryMutAct_9fa48("16365")) {
      {}
    } else {
      stryCov_9fa48("16365");
      return parseRequest(await sendRequest(stryMutAct_9fa48("16366") ? `` : (stryCov_9fa48("16366"), `/api/street-closure-requests/${id}/end`), stryMutAct_9fa48("16367") ? {} : (stryCov_9fa48("16367"), {
        method: stryMutAct_9fa48("16368") ? "" : (stryCov_9fa48("16368"), "POST")
      })), stryMutAct_9fa48("16369") ? "" : (stryCov_9fa48("16369"), "No se pudo obtener información válida de la finalización del corte de calle. Reintente en unos segundos."));
    }
  }
});