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
import { tolerantRecords } from "./tolerant-records";
export const repairDamageTypeSchema = z.enum(stryMutAct_9fa48("13037") ? [] : (stryCov_9fa48("13037"), [stryMutAct_9fa48("13038") ? "" : (stryCov_9fa48("13038"), "BROKEN_PAVEMENT"), stryMutAct_9fa48("13039") ? "" : (stryCov_9fa48("13039"), "BROKEN_SIDEWALK"), stryMutAct_9fa48("13040") ? "" : (stryCov_9fa48("13040"), "BROKEN_STREETLIGHT"), stryMutAct_9fa48("13041") ? "" : (stryCov_9fa48("13041"), "BLOCKED_DRAIN"), stryMutAct_9fa48("13042") ? "" : (stryCov_9fa48("13042"), "DAMAGED_STRUCTURE")]));
export type RepairDamageType = z.infer<typeof repairDamageTypeSchema>;
export const repairSeveritySchema = z.enum(stryMutAct_9fa48("13043") ? [] : (stryCov_9fa48("13043"), [stryMutAct_9fa48("13044") ? "" : (stryCov_9fa48("13044"), "LOW"), stryMutAct_9fa48("13045") ? "" : (stryCov_9fa48("13045"), "MEDIUM"), stryMutAct_9fa48("13046") ? "" : (stryCov_9fa48("13046"), "HIGH"), stryMutAct_9fa48("13047") ? "" : (stryCov_9fa48("13047"), "CRITICAL")]));
export type RepairSeverity = z.infer<typeof repairSeveritySchema>;
export const repairRequestStatusSchema = z.enum(stryMutAct_9fa48("13048") ? [] : (stryCov_9fa48("13048"), [stryMutAct_9fa48("13049") ? "" : (stryCov_9fa48("13049"), "REQUESTED"), stryMutAct_9fa48("13050") ? "" : (stryCov_9fa48("13050"), "IN_PROGRESS"), stryMutAct_9fa48("13051") ? "" : (stryCov_9fa48("13051"), "CLOSED")]));
export type RepairRequestStatus = z.infer<typeof repairRequestStatusSchema>;
export const detectedInTypeSchema = z.enum(stryMutAct_9fa48("13052") ? [] : (stryCov_9fa48("13052"), [stryMutAct_9fa48("13053") ? "" : (stryCov_9fa48("13053"), "SERVICE"), stryMutAct_9fa48("13054") ? "" : (stryCov_9fa48("13054"), "INSPECTION")]));
export type DetectedInType = z.infer<typeof detectedInTypeSchema>;
export const referralContextSchema = z.object(stryMutAct_9fa48("13055") ? {} : (stryCov_9fa48("13055"), {
  type: detectedInTypeSchema,
  id: stryMutAct_9fa48("13056") ? z.string().max(1) : (stryCov_9fa48("13056"), z.string().min(1)),
  label: stryMutAct_9fa48("13057") ? z.string().max(1) : (stryCov_9fa48("13057"), z.string().min(1)),
  href: stryMutAct_9fa48("13058") ? z.string().max(1) : (stryCov_9fa48("13058"), z.string().min(1))
}));
export type ReferralContext = z.infer<typeof referralContextSchema>;
export const createRepairRequestInputSchema = z.object(stryMutAct_9fa48("13059") ? {} : (stryCov_9fa48("13059"), {
  damageType: repairDamageTypeSchema,
  // Backend's CreateRepairRequestDto accepts optional `address` (outbound-requests/dto/dtos.ts at 448a538);
  // M6 requires it for a usable location.
  address: stryMutAct_9fa48("13061") ? z.string().min(1, "Debe indicar la ubicación del daño.") : stryMutAct_9fa48("13060") ? z.string().trim().max(1, "Debe indicar la ubicación del daño.") : (stryCov_9fa48("13060", "13061"), z.string().trim().min(1, stryMutAct_9fa48("13062") ? "" : (stryCov_9fa48("13062"), "Debe indicar la ubicación del daño."))),
  severity: repairSeveritySchema,
  publicSafetyRisk: z.boolean(),
  detectedInType: detectedInTypeSchema,
  detectedInId: stryMutAct_9fa48("13064") ? z.string().min(1, "Debe indicar el origen de la derivación.") : stryMutAct_9fa48("13063") ? z.string().trim().max(1, "Debe indicar el origen de la derivación.") : (stryCov_9fa48("13063", "13064"), z.string().trim().min(1, stryMutAct_9fa48("13065") ? "" : (stryCov_9fa48("13065"), "Debe indicar el origen de la derivación.")))
}));
export type CreateRepairRequestInput = z.infer<typeof createRepairRequestInputSchema>;
export const repairRequestRecoveryInputSchema = z.object(stryMutAct_9fa48("13066") ? {} : (stryCov_9fa48("13066"), {
  workOrderId: stryMutAct_9fa48("13068") ? z.string().min(1, "Debe indicar el identificador de la orden de trabajo.").optional() : stryMutAct_9fa48("13067") ? z.string().trim().max(1, "Debe indicar el identificador de la orden de trabajo.").optional() : (stryCov_9fa48("13067", "13068"), z.string().trim().min(1, stryMutAct_9fa48("13069") ? "" : (stryCov_9fa48("13069"), "Debe indicar el identificador de la orden de trabajo.")).optional())
}));
export type RepairRequestRecoveryInput = z.infer<typeof repairRequestRecoveryInputSchema>;
export const repairRequestSchema = z.object(stryMutAct_9fa48("13070") ? {} : (stryCov_9fa48("13070"), {
  id: z.string(),
  damageType: repairDamageTypeSchema,
  // Backend: nullable (`RepairRequestResponseDto.address`); inspection-derived requests may have none (#735).
  address: z.string().nullish().transform(stryMutAct_9fa48("13071") ? () => undefined : (stryCov_9fa48("13071"), value => stryMutAct_9fa48("13072") ? value && null : (stryCov_9fa48("13072"), value ?? null))),
  severity: repairSeveritySchema,
  publicSafetyRisk: z.boolean(),
  detectedInType: detectedInTypeSchema,
  detectedInId: z.string(),
  sourceContext: referralContextSchema.optional(),
  status: repairRequestStatusSchema,
  workOrderId: z.string().nullable().optional(),
  requestedAt: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
}));
export type RepairRequest = z.infer<typeof repairRequestSchema>;
export type RepairRequestQuery = {
  status?: RepairRequestStatus;
  damageType?: RepairDamageType;
  severity?: RepairSeverity;
  detectedInId?: string;
  page?: number;
  pageSize?: number;
};
export type RepairRequestsPage = {
  repairRequests: RepairRequest[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export class RepairRequestContractError extends Error {
  constructor(message: string, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("13073")) {
      {}
    } else {
      stryCov_9fa48("13073");
      super(message, options);
      this.name = stryMutAct_9fa48("13074") ? "" : (stryCov_9fa48("13074"), "RepairRequestContractError");
    }
  }
}
export class RepairRequestRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("13075")) {
      {}
    } else {
      stryCov_9fa48("13075");
      super(message, options);
      this.name = stryMutAct_9fa48("13076") ? "" : (stryCov_9fa48("13076"), "RepairRequestRequestError");
      this.status = status;
    }
  }
}
export const REPAIR_DAMAGE_TYPE_LABEL: Record<RepairDamageType, string> = stryMutAct_9fa48("13077") ? {} : (stryCov_9fa48("13077"), {
  BROKEN_PAVEMENT: stryMutAct_9fa48("13078") ? "" : (stryCov_9fa48("13078"), "Pavimento roto"),
  BROKEN_SIDEWALK: stryMutAct_9fa48("13079") ? "" : (stryCov_9fa48("13079"), "Vereda hundida o rota"),
  BROKEN_STREETLIGHT: stryMutAct_9fa48("13080") ? "" : (stryCov_9fa48("13080"), "Luminaria caída o dañada"),
  BLOCKED_DRAIN: stryMutAct_9fa48("13081") ? "" : (stryCov_9fa48("13081"), "Sumidero obstruido"),
  DAMAGED_STRUCTURE: stryMutAct_9fa48("13082") ? "" : (stryCov_9fa48("13082"), "Estructura dañada")
});
export const REPAIR_SEVERITY_LABEL: Record<RepairSeverity, string> = stryMutAct_9fa48("13083") ? {} : (stryCov_9fa48("13083"), {
  LOW: stryMutAct_9fa48("13084") ? "" : (stryCov_9fa48("13084"), "Baja"),
  MEDIUM: stryMutAct_9fa48("13085") ? "" : (stryCov_9fa48("13085"), "Media"),
  HIGH: stryMutAct_9fa48("13086") ? "" : (stryCov_9fa48("13086"), "Alta"),
  CRITICAL: stryMutAct_9fa48("13087") ? "" : (stryCov_9fa48("13087"), "Crítica")
});
export const REPAIR_REQUEST_STATUS_LABEL: Record<RepairRequestStatus, string> = stryMutAct_9fa48("13088") ? {} : (stryCov_9fa48("13088"), {
  REQUESTED: stryMutAct_9fa48("13089") ? "" : (stryCov_9fa48("13089"), "Pendiente"),
  IN_PROGRESS: stryMutAct_9fa48("13090") ? "" : (stryCov_9fa48("13090"), "En curso"),
  CLOSED: stryMutAct_9fa48("13091") ? "" : (stryCov_9fa48("13091"), "Cerrada")
});
const errorResponseSchema = z.object(stryMutAct_9fa48("13092") ? {} : (stryCov_9fa48("13092"), {
  statusCode: z.number(),
  message: z.union(stryMutAct_9fa48("13093") ? [] : (stryCov_9fa48("13093"), [z.string(), z.array(z.string())])),
  error: z.string(),
  timestamp: z.string(),
  path: z.string()
}));
function queryString(query: RepairRequestQuery): string {
  if (stryMutAct_9fa48("13094")) {
    {}
  } else {
    stryCov_9fa48("13094");
    const params = new URLSearchParams();
    if (stryMutAct_9fa48("13096") ? false : stryMutAct_9fa48("13095") ? true : (stryCov_9fa48("13095", "13096"), query.status)) params.set(stryMutAct_9fa48("13098") ? "" : (stryCov_9fa48("13098"), "status"), query.status);
    if (stryMutAct_9fa48("13100") ? false : stryMutAct_9fa48("13099") ? true : (stryCov_9fa48("13099", "13100"), query.damageType)) params.set(stryMutAct_9fa48("13102") ? "" : (stryCov_9fa48("13102"), "damageType"), query.damageType);
    if (stryMutAct_9fa48("13104") ? false : stryMutAct_9fa48("13103") ? true : (stryCov_9fa48("13103", "13104"), query.severity)) params.set(stryMutAct_9fa48("13106") ? "" : (stryCov_9fa48("13106"), "severity"), query.severity);
    if (stryMutAct_9fa48("13108") ? false : stryMutAct_9fa48("13107") ? true : (stryCov_9fa48("13107", "13108"), query.detectedInId)) params.set(stryMutAct_9fa48("13110") ? "" : (stryCov_9fa48("13110"), "detectedInId"), query.detectedInId);
    if (stryMutAct_9fa48("13113") ? query.page === undefined : stryMutAct_9fa48("13112") ? false : stryMutAct_9fa48("13111") ? true : (stryCov_9fa48("13111", "13112", "13113"), query.page !== undefined)) params.set(stryMutAct_9fa48("13115") ? "" : (stryCov_9fa48("13115"), "page"), String(query.page));
    if (stryMutAct_9fa48("13118") ? query.pageSize === undefined : stryMutAct_9fa48("13117") ? false : stryMutAct_9fa48("13116") ? true : (stryCov_9fa48("13116", "13117", "13118"), query.pageSize !== undefined)) params.set(stryMutAct_9fa48("13120") ? "" : (stryCov_9fa48("13120"), "pageSize"), String(query.pageSize));
    const value = params.toString();
    return value ? stryMutAct_9fa48("13121") ? `` : (stryCov_9fa48("13121"), `?${value}`) : stryMutAct_9fa48("13122") ? "Stryker was here!" : (stryCov_9fa48("13122"), "");
  }
}
async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  if (stryMutAct_9fa48("13123")) {
    {}
  } else {
    stryCov_9fa48("13123");
    let response: Response;
    try {
      if (stryMutAct_9fa48("13124")) {
        {}
      } else {
        stryCov_9fa48("13124");
        response = await authenticatedFetch(path, init);
      }
    } catch (cause) {
      if (stryMutAct_9fa48("13125")) {
        {}
      } else {
        stryCov_9fa48("13125");
        if (stryMutAct_9fa48("13127") ? false : stryMutAct_9fa48("13126") ? true : (stryCov_9fa48("13126", "13127"), cause instanceof NetworkFailureError)) {
          if (stryMutAct_9fa48("13128")) {
            {}
          } else {
            stryCov_9fa48("13128");
            recordTelemetryEvent(stryMutAct_9fa48("13130") ? {} : (stryCov_9fa48("13130"), {
              name: stryMutAct_9fa48("13131") ? "" : (stryCov_9fa48("13131"), "request_network_failure"),
              resource: stryMutAct_9fa48("13132") ? "" : (stryCov_9fa48("13132"), "repair-requests")
            }));
          }
        }
        throw cause;
      }
    }
    let payload: unknown;
    try {
      if (stryMutAct_9fa48("13133")) {
        {}
      } else {
        stryCov_9fa48("13133");
        payload = await response.json();
      }
    } catch (cause) {
      if (stryMutAct_9fa48("13134")) {
        {}
      } else {
        stryCov_9fa48("13134");
        recordTelemetryEvent(stryMutAct_9fa48("13136") ? {} : (stryCov_9fa48("13136"), {
          name: stryMutAct_9fa48("13137") ? "" : (stryCov_9fa48("13137"), "request_malformed_response"),
          resource: stryMutAct_9fa48("13138") ? "" : (stryCov_9fa48("13138"), "repair-requests")
        }));
        throw new RepairRequestContractError(stryMutAct_9fa48("13140") ? "" : (stryCov_9fa48("13140"), "No se pudo obtener información válida de derivaciones. Reintente en unos segundos."), stryMutAct_9fa48("13141") ? {} : (stryCov_9fa48("13141"), {
          cause
        }));
      }
    }
    if (stryMutAct_9fa48("13144") ? false : stryMutAct_9fa48("13143") ? true : stryMutAct_9fa48("13142") ? response.ok : (stryCov_9fa48("13142", "13143", "13144"), !response.ok)) {
      if (stryMutAct_9fa48("13145")) {
        {}
      } else {
        stryCov_9fa48("13145");
        const parsedError = errorResponseSchema.safeParse(payload);
        if (stryMutAct_9fa48("13148") ? false : stryMutAct_9fa48("13147") ? true : stryMutAct_9fa48("13146") ? parsedError.success : (stryCov_9fa48("13146", "13147", "13148"), !parsedError.success)) {
          if (stryMutAct_9fa48("13149")) {
            {}
          } else {
            stryCov_9fa48("13149");
            recordTelemetryEvent(stryMutAct_9fa48("13151") ? {} : (stryCov_9fa48("13151"), {
              name: stryMutAct_9fa48("13152") ? "" : (stryCov_9fa48("13152"), "request_malformed_response"),
              resource: stryMutAct_9fa48("13153") ? "" : (stryCov_9fa48("13153"), "repair-requests")
            }));
            throw new RepairRequestContractError(stryMutAct_9fa48("13155") ? "" : (stryCov_9fa48("13155"), "No se pudo obtener información válida de derivaciones. Reintente en unos segundos."), stryMutAct_9fa48("13156") ? {} : (stryCov_9fa48("13156"), {
              cause: parsedError.error
            }));
          }
        }
        const message = Array.isArray(parsedError.data.message) ? parsedError.data.message.join(stryMutAct_9fa48("13157") ? "" : (stryCov_9fa48("13157"), " ")) : parsedError.data.message;
        if (stryMutAct_9fa48("13158")) {
          ;
        } else {
          stryCov_9fa48("13158");
          throw new RepairRequestRequestError(message, parsedError.data.statusCode);
        }
      }
    }
    return payload;
  }
}
function resourcePayload(payload: unknown): unknown {
  if (stryMutAct_9fa48("13159")) {
    {}
  } else {
    stryCov_9fa48("13159");
    return (stryMutAct_9fa48("13162") ? payload && typeof payload === "object" && "data" in payload || !("id" in payload) : stryMutAct_9fa48("13161") ? false : stryMutAct_9fa48("13160") ? true : (stryCov_9fa48("13160", "13161", "13162"), (stryMutAct_9fa48("13164") ? payload && typeof payload === "object" || "data" in payload : stryMutAct_9fa48("13163") ? true : (stryCov_9fa48("13163", "13164"), (stryMutAct_9fa48("13166") ? payload || typeof payload === "object" : stryMutAct_9fa48("13165") ? true : (stryCov_9fa48("13165", "13166"), payload && (stryMutAct_9fa48("13168") ? typeof payload !== "object" : stryMutAct_9fa48("13167") ? true : (stryCov_9fa48("13167", "13168"), typeof payload === (stryMutAct_9fa48("13169") ? "" : (stryCov_9fa48("13169"), "object")))))) && (stryMutAct_9fa48("13170") ? "" : (stryCov_9fa48("13170"), "data")) in payload)) && (stryMutAct_9fa48("13171") ? "id" in payload : (stryCov_9fa48("13171"), !((stryMutAct_9fa48("13172") ? "" : (stryCov_9fa48("13172"), "id")) in payload))))) ? (payload as {
      data: unknown;
    }).data : payload;
  }
}
function parseResource(payload: unknown, message: string): RepairRequest {
  if (stryMutAct_9fa48("13173")) {
    {}
  } else {
    stryCov_9fa48("13173");
    const parsed = repairRequestSchema.safeParse(resourcePayload(payload));
    if (stryMutAct_9fa48("13176") ? false : stryMutAct_9fa48("13175") ? true : stryMutAct_9fa48("13174") ? parsed.success : (stryCov_9fa48("13174", "13175", "13176"), !parsed.success)) {
      if (stryMutAct_9fa48("13177")) {
        {}
      } else {
        stryCov_9fa48("13177");
        recordTelemetryEvent(stryMutAct_9fa48("13179") ? {} : (stryCov_9fa48("13179"), {
          name: stryMutAct_9fa48("13180") ? "" : (stryCov_9fa48("13180"), "request_malformed_response"),
          resource: stryMutAct_9fa48("13181") ? "" : (stryCov_9fa48("13181"), "repair-requests")
        }));
        throw new RepairRequestContractError(message, stryMutAct_9fa48("13183") ? {} : (stryCov_9fa48("13183"), {
          cause: parsed.error
        }));
      }
    }
    return parsed.data;
  }
}
export const repairRequestsAdapter = stryMutAct_9fa48("13184") ? {} : (stryCov_9fa48("13184"), {
  async list(query: RepairRequestQuery = {}): Promise<RepairRequestsPage> {
    if (stryMutAct_9fa48("13185")) {
      {}
    } else {
      stryCov_9fa48("13185");
      const payload = await requestJson(stryMutAct_9fa48("13186") ? `` : (stryCov_9fa48("13186"), `/api/repair-requests${queryString(query)}`));
      const parsed = z.object(stryMutAct_9fa48("13187") ? {} : (stryCov_9fa48("13187"), {
        data: tolerantRecords(repairRequestSchema, stryMutAct_9fa48("13188") ? "" : (stryCov_9fa48("13188"), "repair-requests")),
        meta: z.object(stryMutAct_9fa48("13189") ? {} : (stryCov_9fa48("13189"), {
          total: z.number(),
          page: z.number(),
          pageSize: z.number(),
          totalPages: z.number()
        }))
      })).safeParse(payload);
      if (stryMutAct_9fa48("13192") ? false : stryMutAct_9fa48("13191") ? true : stryMutAct_9fa48("13190") ? parsed.success : (stryCov_9fa48("13190", "13191", "13192"), !parsed.success)) {
        if (stryMutAct_9fa48("13193")) {
          {}
        } else {
          stryCov_9fa48("13193");
          recordTelemetryEvent(stryMutAct_9fa48("13195") ? {} : (stryCov_9fa48("13195"), {
            name: stryMutAct_9fa48("13196") ? "" : (stryCov_9fa48("13196"), "request_malformed_response"),
            resource: stryMutAct_9fa48("13197") ? "" : (stryCov_9fa48("13197"), "repair-requests")
          }));
          throw new RepairRequestContractError(stryMutAct_9fa48("13199") ? "" : (stryCov_9fa48("13199"), "No se pudo obtener información válida de la lista de derivaciones. Reintente en unos segundos."), stryMutAct_9fa48("13200") ? {} : (stryCov_9fa48("13200"), {
            cause: parsed.error
          }));
        }
      }
      return stryMutAct_9fa48("13201") ? {} : (stryCov_9fa48("13201"), {
        repairRequests: parsed.data.data,
        page: parsed.data.meta.page,
        pageSize: parsed.data.meta.pageSize,
        total: parsed.data.meta.total,
        totalPages: parsed.data.meta.totalPages
      });
    }
  },
  async get(id: string): Promise<RepairRequest> {
    if (stryMutAct_9fa48("13202")) {
      {}
    } else {
      stryCov_9fa48("13202");
      return parseResource(await requestJson(stryMutAct_9fa48("13203") ? `` : (stryCov_9fa48("13203"), `/api/repair-requests/${id}`)), stryMutAct_9fa48("13204") ? "" : (stryCov_9fa48("13204"), "No se pudo obtener información válida del detalle de la derivación. Reintente en unos segundos."));
    }
  },
  async create(input: CreateRepairRequestInput): Promise<RepairRequest> {
    if (stryMutAct_9fa48("13205")) {
      {}
    } else {
      stryCov_9fa48("13205");
      const parsedInput = createRepairRequestInputSchema.safeParse(input);
      if (stryMutAct_9fa48("13208") ? false : stryMutAct_9fa48("13207") ? true : stryMutAct_9fa48("13206") ? parsedInput.success : (stryCov_9fa48("13206", "13207", "13208"), !parsedInput.success)) {
        if (stryMutAct_9fa48("13209")) {
          {}
        } else {
          stryCov_9fa48("13209");
          throw new RepairRequestContractError(stryMutAct_9fa48("13211") ? "" : (stryCov_9fa48("13211"), "Los datos de la derivación son inválidos."), stryMutAct_9fa48("13212") ? {} : (stryCov_9fa48("13212"), {
            cause: parsedInput.error
          }));
        }
      }
      return parseResource(await requestJson(stryMutAct_9fa48("13213") ? "" : (stryCov_9fa48("13213"), "/api/repair-requests"), stryMutAct_9fa48("13214") ? {} : (stryCov_9fa48("13214"), {
        method: stryMutAct_9fa48("13215") ? "" : (stryCov_9fa48("13215"), "POST"),
        headers: stryMutAct_9fa48("13216") ? {} : (stryCov_9fa48("13216"), {
          "content-type": stryMutAct_9fa48("13217") ? "" : (stryCov_9fa48("13217"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      })), stryMutAct_9fa48("13218") ? "" : (stryCov_9fa48("13218"), "No se pudo obtener información válida de la creación de la derivación. Reintente en unos segundos."));
    }
  },
  async start(id: string, input: RepairRequestRecoveryInput = {}): Promise<RepairRequest> {
    if (stryMutAct_9fa48("13219")) {
      {}
    } else {
      stryCov_9fa48("13219");
      const parsedInput = repairRequestRecoveryInputSchema.safeParse(input);
      if (stryMutAct_9fa48("13222") ? false : stryMutAct_9fa48("13221") ? true : stryMutAct_9fa48("13220") ? parsedInput.success : (stryCov_9fa48("13220", "13221", "13222"), !parsedInput.success)) throw new RepairRequestContractError(stryMutAct_9fa48("13224") ? "" : (stryCov_9fa48("13224"), "Los datos de recuperación son inválidos."), stryMutAct_9fa48("13225") ? {} : (stryCov_9fa48("13225"), {
        cause: parsedInput.error
      }));
      return parseResource(await requestJson(stryMutAct_9fa48("13226") ? `` : (stryCov_9fa48("13226"), `/api/repair-requests/${id}/start`), stryMutAct_9fa48("13227") ? {} : (stryCov_9fa48("13227"), {
        method: stryMutAct_9fa48("13228") ? "" : (stryCov_9fa48("13228"), "POST"),
        headers: stryMutAct_9fa48("13229") ? {} : (stryCov_9fa48("13229"), {
          "content-type": stryMutAct_9fa48("13230") ? "" : (stryCov_9fa48("13230"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      })), stryMutAct_9fa48("13231") ? "" : (stryCov_9fa48("13231"), "No se pudo obtener información válida del inicio de la derivación. Reintente en unos segundos."));
    }
  },
  async close(id: string, input: RepairRequestRecoveryInput = {}): Promise<RepairRequest> {
    if (stryMutAct_9fa48("13232")) {
      {}
    } else {
      stryCov_9fa48("13232");
      const parsedInput = repairRequestRecoveryInputSchema.safeParse(input);
      if (stryMutAct_9fa48("13235") ? false : stryMutAct_9fa48("13234") ? true : stryMutAct_9fa48("13233") ? parsedInput.success : (stryCov_9fa48("13233", "13234", "13235"), !parsedInput.success)) throw new RepairRequestContractError(stryMutAct_9fa48("13237") ? "" : (stryCov_9fa48("13237"), "Los datos de recuperación son inválidos."), stryMutAct_9fa48("13238") ? {} : (stryCov_9fa48("13238"), {
        cause: parsedInput.error
      }));
      return parseResource(await requestJson(stryMutAct_9fa48("13239") ? `` : (stryCov_9fa48("13239"), `/api/repair-requests/${id}/close`), stryMutAct_9fa48("13240") ? {} : (stryCov_9fa48("13240"), {
        method: stryMutAct_9fa48("13241") ? "" : (stryCov_9fa48("13241"), "POST"),
        headers: stryMutAct_9fa48("13242") ? {} : (stryCov_9fa48("13242"), {
          "content-type": stryMutAct_9fa48("13243") ? "" : (stryCov_9fa48("13243"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      })), stryMutAct_9fa48("13244") ? "" : (stryCov_9fa48("13244"), "No se pudo obtener información válida del cierre de la derivación. Reintente en unos segundos."));
    }
  }
});