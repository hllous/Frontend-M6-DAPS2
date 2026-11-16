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
export const serviceFrequencyShiftSchema = z.enum(stryMutAct_9fa48("13829") ? [] : (stryCov_9fa48("13829"), [stryMutAct_9fa48("13830") ? "" : (stryCov_9fa48("13830"), "MORNING"), stryMutAct_9fa48("13831") ? "" : (stryCov_9fa48("13831"), "AFTERNOON"), stryMutAct_9fa48("13832") ? "" : (stryCov_9fa48("13832"), "NIGHT")]));
export type ServiceFrequencyShift = z.infer<typeof serviceFrequencyShiftSchema>;
const dateSchema = z.string().regex(stryMutAct_9fa48("13840") ? /^\d{4}-\d{2}-\D{2}$/ : stryMutAct_9fa48("13839") ? /^\d{4}-\d{2}-\d$/ : stryMutAct_9fa48("13838") ? /^\d{4}-\D{2}-\d{2}$/ : stryMutAct_9fa48("13837") ? /^\d{4}-\d-\d{2}$/ : stryMutAct_9fa48("13836") ? /^\D{4}-\d{2}-\d{2}$/ : stryMutAct_9fa48("13835") ? /^\d-\d{2}-\d{2}$/ : stryMutAct_9fa48("13834") ? /^\d{4}-\d{2}-\d{2}/ : stryMutAct_9fa48("13833") ? /\d{4}-\d{2}-\d{2}$/ : (stryCov_9fa48("13833", "13834", "13835", "13836", "13837", "13838", "13839", "13840"), /^\d{4}-\d{2}-\d{2}$/), stryMutAct_9fa48("13841") ? "" : (stryCov_9fa48("13841"), "La fecha debe tener el formato AAAA-MM-DD"));
// Las respuestas serializan Date como ISO; la UI trabaja con días calendario.
const responseDateSchema = z.union(stryMutAct_9fa48("13842") ? [] : (stryCov_9fa48("13842"), [dateSchema, z.iso.datetime()])).transform(stryMutAct_9fa48("13843") ? () => undefined : (stryCov_9fa48("13843"), value => stryMutAct_9fa48("13844") ? value : (stryCov_9fa48("13844"), value.slice(0, 10))));
export const serviceFrequencySchema = z.object(stryMutAct_9fa48("13845") ? {} : (stryCov_9fa48("13845"), {
  id: z.string(),
  serviceTypeId: z.string(),
  routeId: z.string(),
  weekdays: stryMutAct_9fa48("13846") ? z.array(z.number().int().min(1).max(7)).max(1) : (stryCov_9fa48("13846"), z.array(stryMutAct_9fa48("13848") ? z.number().int().max(1).max(7) : stryMutAct_9fa48("13847") ? z.number().int().min(1).min(7) : (stryCov_9fa48("13847", "13848"), z.number().int().min(1).max(7))).min(1)),
  shift: serviceFrequencyShiftSchema,
  validFrom: responseDateSchema,
  validTo: responseDateSchema.nullable()
}));
export type ServiceFrequency = z.infer<typeof serviceFrequencySchema>;
export const serviceFrequencyCreateInputSchema = z.object(stryMutAct_9fa48("13849") ? {} : (stryCov_9fa48("13849"), {
  serviceTypeId: stryMutAct_9fa48("13851") ? z.string().min(1, "El tipo de servicio es obligatorio") : stryMutAct_9fa48("13850") ? z.string().trim().max(1, "El tipo de servicio es obligatorio") : (stryCov_9fa48("13850", "13851"), z.string().trim().min(1, stryMutAct_9fa48("13852") ? "" : (stryCov_9fa48("13852"), "El tipo de servicio es obligatorio"))),
  routeId: stryMutAct_9fa48("13854") ? z.string().min(1, "El recorrido es obligatorio") : stryMutAct_9fa48("13853") ? z.string().trim().max(1, "El recorrido es obligatorio") : (stryCov_9fa48("13853", "13854"), z.string().trim().min(1, stryMutAct_9fa48("13855") ? "" : (stryCov_9fa48("13855"), "El recorrido es obligatorio"))),
  weekdays: stryMutAct_9fa48("13857") ? z.array(z.number().int().min(1).max(7)).max(1, "Seleccione al menos un día").max(7).refine(days => new Set(days).size === days.length, "No repita días") : stryMutAct_9fa48("13856") ? z.array(z.number().int().min(1).max(7)).min(1, "Seleccione al menos un día").min(7).refine(days => new Set(days).size === days.length, "No repita días") : (stryCov_9fa48("13856", "13857"), z.array(stryMutAct_9fa48("13859") ? z.number().int().max(1).max(7) : stryMutAct_9fa48("13858") ? z.number().int().min(1).min(7) : (stryCov_9fa48("13858", "13859"), z.number().int().min(1).max(7))).min(1, stryMutAct_9fa48("13860") ? "" : (stryCov_9fa48("13860"), "Seleccione al menos un día")).max(7).refine(stryMutAct_9fa48("13861") ? () => undefined : (stryCov_9fa48("13861"), days => stryMutAct_9fa48("13864") ? new Set(days).size !== days.length : stryMutAct_9fa48("13863") ? false : stryMutAct_9fa48("13862") ? true : (stryCov_9fa48("13862", "13863", "13864"), new Set(days).size === days.length)), stryMutAct_9fa48("13865") ? "" : (stryCov_9fa48("13865"), "No repita días"))),
  shift: serviceFrequencyShiftSchema,
  validFrom: dateSchema,
  validTo: dateSchema.nullable().optional()
})).superRefine((value, ctx) => {
  if (stryMutAct_9fa48("13866")) {
    {}
  } else {
    stryCov_9fa48("13866");
    if (stryMutAct_9fa48("13869") ? value.validTo || value.validTo < value.validFrom : stryMutAct_9fa48("13868") ? false : stryMutAct_9fa48("13867") ? true : (stryCov_9fa48("13867", "13868", "13869"), value.validTo && (stryMutAct_9fa48("13872") ? value.validTo >= value.validFrom : stryMutAct_9fa48("13871") ? value.validTo <= value.validFrom : stryMutAct_9fa48("13870") ? true : (stryCov_9fa48("13870", "13871", "13872"), value.validTo < value.validFrom)))) ctx.addIssue(stryMutAct_9fa48("13874") ? {} : (stryCov_9fa48("13874"), {
      code: stryMutAct_9fa48("13875") ? "" : (stryCov_9fa48("13875"), "custom"),
      path: stryMutAct_9fa48("13876") ? [] : (stryCov_9fa48("13876"), [stryMutAct_9fa48("13877") ? "" : (stryCov_9fa48("13877"), "validTo")]),
      message: stryMutAct_9fa48("13878") ? "" : (stryCov_9fa48("13878"), "La fecha de cierre no puede ser anterior al inicio")
    }));
  }
});
export type ServiceFrequencyCreateInput = z.infer<typeof serviceFrequencyCreateInputSchema>;
export const serviceFrequencyUpdateInputSchema = z.object(stryMutAct_9fa48("13879") ? {} : (stryCov_9fa48("13879"), {
  weekdays: serviceFrequencyCreateInputSchema.shape.weekdays.optional(),
  shift: serviceFrequencyShiftSchema.optional(),
  validFrom: dateSchema.optional(),
  validTo: dateSchema.nullable().optional()
})).strict().superRefine((value, ctx) => {
  if (stryMutAct_9fa48("13880")) {
    {}
  } else {
    stryCov_9fa48("13880");
    if (stryMutAct_9fa48("13883") ? value.validFrom && value.validTo || value.validTo < value.validFrom : stryMutAct_9fa48("13882") ? false : stryMutAct_9fa48("13881") ? true : (stryCov_9fa48("13881", "13882", "13883"), (stryMutAct_9fa48("13885") ? value.validFrom || value.validTo : stryMutAct_9fa48("13884") ? true : (stryCov_9fa48("13884", "13885"), value.validFrom && value.validTo)) && (stryMutAct_9fa48("13888") ? value.validTo >= value.validFrom : stryMutAct_9fa48("13887") ? value.validTo <= value.validFrom : stryMutAct_9fa48("13886") ? true : (stryCov_9fa48("13886", "13887", "13888"), value.validTo < value.validFrom)))) ctx.addIssue(stryMutAct_9fa48("13890") ? {} : (stryCov_9fa48("13890"), {
      code: stryMutAct_9fa48("13891") ? "" : (stryCov_9fa48("13891"), "custom"),
      path: stryMutAct_9fa48("13892") ? [] : (stryCov_9fa48("13892"), [stryMutAct_9fa48("13893") ? "" : (stryCov_9fa48("13893"), "validTo")]),
      message: stryMutAct_9fa48("13894") ? "" : (stryCov_9fa48("13894"), "La fecha de cierre no puede ser anterior al inicio")
    }));
  }
});
export type ServiceFrequencyUpdateInput = z.infer<typeof serviceFrequencyUpdateInputSchema>;
export type ServiceFrequencyQuery = {
  serviceTypeId?: string;
  routeId?: string;
  shift?: ServiceFrequencyShift;
  weekday?: number;
  validOn?: string;
  page?: number;
  pageSize?: number;
};
export type ServiceFrequenciesPage = {
  serviceFrequencies: ServiceFrequency[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export class ServiceFrequencyContractError extends Error {
  constructor(message: string, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("13895")) {
      {}
    } else {
      stryCov_9fa48("13895");
      super(message, options);
      this.name = stryMutAct_9fa48("13896") ? "" : (stryCov_9fa48("13896"), "ServiceFrequencyContractError");
    }
  }
}
export class ServiceFrequencyRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("13897")) {
      {}
    } else {
      stryCov_9fa48("13897");
      super(message, options);
      this.name = stryMutAct_9fa48("13898") ? "" : (stryCov_9fa48("13898"), "ServiceFrequencyRequestError");
      this.status = status;
    }
  }
}
const pageSchema = z.object(stryMutAct_9fa48("13899") ? {} : (stryCov_9fa48("13899"), {
  data: tolerantRecords(serviceFrequencySchema, stryMutAct_9fa48("13900") ? "" : (stryCov_9fa48("13900"), "service-frequencies")),
  meta: z.object(stryMutAct_9fa48("13901") ? {} : (stryCov_9fa48("13901"), {
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number()
  }))
}));
const errorResponseSchema = z.object(stryMutAct_9fa48("13902") ? {} : (stryCov_9fa48("13902"), {
  statusCode: z.number(),
  message: z.union(stryMutAct_9fa48("13903") ? [] : (stryCov_9fa48("13903"), [z.string(), z.array(z.string())])),
  error: z.string(),
  timestamp: z.string(),
  path: z.string()
}));
function queryString(query: ServiceFrequencyQuery): string {
  if (stryMutAct_9fa48("13904")) {
    {}
  } else {
    stryCov_9fa48("13904");
    const params = new URLSearchParams();
    if (stryMutAct_9fa48("13906") ? false : stryMutAct_9fa48("13905") ? true : (stryCov_9fa48("13905", "13906"), query.serviceTypeId)) params.set(stryMutAct_9fa48("13908") ? "" : (stryCov_9fa48("13908"), "serviceTypeId"), query.serviceTypeId);
    if (stryMutAct_9fa48("13910") ? false : stryMutAct_9fa48("13909") ? true : (stryCov_9fa48("13909", "13910"), query.routeId)) params.set(stryMutAct_9fa48("13912") ? "" : (stryCov_9fa48("13912"), "routeId"), query.routeId);
    if (stryMutAct_9fa48("13914") ? false : stryMutAct_9fa48("13913") ? true : (stryCov_9fa48("13913", "13914"), query.shift)) params.set(stryMutAct_9fa48("13916") ? "" : (stryCov_9fa48("13916"), "shift"), query.shift);
    if (stryMutAct_9fa48("13919") ? query.weekday === undefined : stryMutAct_9fa48("13918") ? false : stryMutAct_9fa48("13917") ? true : (stryCov_9fa48("13917", "13918", "13919"), query.weekday !== undefined)) params.set(stryMutAct_9fa48("13921") ? "" : (stryCov_9fa48("13921"), "weekday"), String(query.weekday));
    if (stryMutAct_9fa48("13923") ? false : stryMutAct_9fa48("13922") ? true : (stryCov_9fa48("13922", "13923"), query.validOn)) params.set(stryMutAct_9fa48("13925") ? "" : (stryCov_9fa48("13925"), "validOn"), query.validOn);
    if (stryMutAct_9fa48("13928") ? query.page === undefined : stryMutAct_9fa48("13927") ? false : stryMutAct_9fa48("13926") ? true : (stryCov_9fa48("13926", "13927", "13928"), query.page !== undefined)) params.set(stryMutAct_9fa48("13930") ? "" : (stryCov_9fa48("13930"), "page"), String(query.page));
    if (stryMutAct_9fa48("13933") ? query.pageSize === undefined : stryMutAct_9fa48("13932") ? false : stryMutAct_9fa48("13931") ? true : (stryCov_9fa48("13931", "13932", "13933"), query.pageSize !== undefined)) params.set(stryMutAct_9fa48("13935") ? "" : (stryCov_9fa48("13935"), "pageSize"), String(query.pageSize));
    const value = params.toString();
    return value ? stryMutAct_9fa48("13936") ? `` : (stryCov_9fa48("13936"), `?${value}`) : stryMutAct_9fa48("13937") ? "Stryker was here!" : (stryCov_9fa48("13937"), "");
  }
}
async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  if (stryMutAct_9fa48("13938")) {
    {}
  } else {
    stryCov_9fa48("13938");
    let response: Response;
    try {
      if (stryMutAct_9fa48("13939")) {
        {}
      } else {
        stryCov_9fa48("13939");
        response = await authenticatedFetch(path, init);
      }
    } catch (cause) {
      if (stryMutAct_9fa48("13940")) {
        {}
      } else {
        stryCov_9fa48("13940");
        if (stryMutAct_9fa48("13942") ? false : stryMutAct_9fa48("13941") ? true : (stryCov_9fa48("13941", "13942"), cause instanceof NetworkFailureError)) recordTelemetryEvent(stryMutAct_9fa48("13944") ? {} : (stryCov_9fa48("13944"), {
          name: stryMutAct_9fa48("13945") ? "" : (stryCov_9fa48("13945"), "request_network_failure"),
          resource: stryMutAct_9fa48("13946") ? "" : (stryCov_9fa48("13946"), "service-frequencies")
        }));
        throw cause;
      }
    }
    let payload: unknown;
    try {
      if (stryMutAct_9fa48("13947")) {
        {}
      } else {
        stryCov_9fa48("13947");
        payload = await response.json();
      }
    } catch (cause) {
      if (stryMutAct_9fa48("13948")) {
        {}
      } else {
        stryCov_9fa48("13948");
        recordTelemetryEvent(stryMutAct_9fa48("13950") ? {} : (stryCov_9fa48("13950"), {
          name: stryMutAct_9fa48("13951") ? "" : (stryCov_9fa48("13951"), "request_malformed_response"),
          resource: stryMutAct_9fa48("13952") ? "" : (stryCov_9fa48("13952"), "service-frequencies")
        }));
        throw new ServiceFrequencyContractError(stryMutAct_9fa48("13954") ? "" : (stryCov_9fa48("13954"), "No se pudo obtener información válida de frecuencias. Reintente en unos segundos."), stryMutAct_9fa48("13955") ? {} : (stryCov_9fa48("13955"), {
          cause
        }));
      }
    }
    if (stryMutAct_9fa48("13958") ? false : stryMutAct_9fa48("13957") ? true : stryMutAct_9fa48("13956") ? response.ok : (stryCov_9fa48("13956", "13957", "13958"), !response.ok)) {
      if (stryMutAct_9fa48("13959")) {
        {}
      } else {
        stryCov_9fa48("13959");
        const parsed = errorResponseSchema.safeParse(payload);
        if (stryMutAct_9fa48("13962") ? false : stryMutAct_9fa48("13961") ? true : stryMutAct_9fa48("13960") ? parsed.success : (stryCov_9fa48("13960", "13961", "13962"), !parsed.success)) throw new ServiceFrequencyContractError(stryMutAct_9fa48("13964") ? "" : (stryCov_9fa48("13964"), "No se pudo obtener información válida de frecuencias. Reintente en unos segundos."), stryMutAct_9fa48("13965") ? {} : (stryCov_9fa48("13965"), {
          cause: parsed.error
        }));
        const message = Array.isArray(parsed.data.message) ? parsed.data.message.join(stryMutAct_9fa48("13966") ? "" : (stryCov_9fa48("13966"), " ")) : parsed.data.message;
        if (stryMutAct_9fa48("13967")) {
          ;
        } else {
          stryCov_9fa48("13967");
          throw new ServiceFrequencyRequestError(message, parsed.data.statusCode);
        }
      }
    }
    return payload;
  }
}
function parseResource(payload: unknown): ServiceFrequency {
  if (stryMutAct_9fa48("13968")) {
    {}
  } else {
    stryCov_9fa48("13968");
    const raw = (stryMutAct_9fa48("13971") ? payload && typeof payload === "object" && "data" in payload || !("id" in payload) : stryMutAct_9fa48("13970") ? false : stryMutAct_9fa48("13969") ? true : (stryCov_9fa48("13969", "13970", "13971"), (stryMutAct_9fa48("13973") ? payload && typeof payload === "object" || "data" in payload : stryMutAct_9fa48("13972") ? true : (stryCov_9fa48("13972", "13973"), (stryMutAct_9fa48("13975") ? payload || typeof payload === "object" : stryMutAct_9fa48("13974") ? true : (stryCov_9fa48("13974", "13975"), payload && (stryMutAct_9fa48("13977") ? typeof payload !== "object" : stryMutAct_9fa48("13976") ? true : (stryCov_9fa48("13976", "13977"), typeof payload === (stryMutAct_9fa48("13978") ? "" : (stryCov_9fa48("13978"), "object")))))) && (stryMutAct_9fa48("13979") ? "" : (stryCov_9fa48("13979"), "data")) in payload)) && (stryMutAct_9fa48("13980") ? "id" in payload : (stryCov_9fa48("13980"), !((stryMutAct_9fa48("13981") ? "" : (stryCov_9fa48("13981"), "id")) in payload))))) ? (payload as {
      data: unknown;
    }).data : payload;
    const parsed = serviceFrequencySchema.safeParse(raw);
    if (stryMutAct_9fa48("13984") ? false : stryMutAct_9fa48("13983") ? true : stryMutAct_9fa48("13982") ? parsed.success : (stryCov_9fa48("13982", "13983", "13984"), !parsed.success)) throw new ServiceFrequencyContractError(stryMutAct_9fa48("13986") ? "" : (stryCov_9fa48("13986"), "No se pudo obtener información válida de la frecuencia. Reintente en unos segundos."), stryMutAct_9fa48("13987") ? {} : (stryCov_9fa48("13987"), {
      cause: parsed.error
    }));
    return parsed.data;
  }
}
export const serviceFrequenciesAdapter = stryMutAct_9fa48("13988") ? {} : (stryCov_9fa48("13988"), {
  async list(query: ServiceFrequencyQuery = {}): Promise<ServiceFrequenciesPage> {
    if (stryMutAct_9fa48("13989")) {
      {}
    } else {
      stryCov_9fa48("13989");
      const parsed = pageSchema.safeParse(await requestJson(stryMutAct_9fa48("13990") ? `` : (stryCov_9fa48("13990"), `/api/service-frequencies${queryString(query)}`)));
      if (stryMutAct_9fa48("13993") ? false : stryMutAct_9fa48("13992") ? true : stryMutAct_9fa48("13991") ? parsed.success : (stryCov_9fa48("13991", "13992", "13993"), !parsed.success)) throw new ServiceFrequencyContractError(stryMutAct_9fa48("13995") ? "" : (stryCov_9fa48("13995"), "No se pudo obtener información válida de la lista de frecuencias. Reintente en unos segundos."), stryMutAct_9fa48("13996") ? {} : (stryCov_9fa48("13996"), {
        cause: parsed.error
      }));
      return stryMutAct_9fa48("13997") ? {} : (stryCov_9fa48("13997"), {
        serviceFrequencies: parsed.data.data,
        ...parsed.data.meta
      });
    }
  },
  async get(id: string): Promise<ServiceFrequency> {
    if (stryMutAct_9fa48("13998")) {
      {}
    } else {
      stryCov_9fa48("13998");
      return parseResource(await requestJson(stryMutAct_9fa48("13999") ? `` : (stryCov_9fa48("13999"), `/api/service-frequencies/${id}`)));
    }
  },
  async create(input: ServiceFrequencyCreateInput): Promise<ServiceFrequency> {
    if (stryMutAct_9fa48("14000")) {
      {}
    } else {
      stryCov_9fa48("14000");
      const parsed = serviceFrequencyCreateInputSchema.safeParse(input);
      if (stryMutAct_9fa48("14003") ? false : stryMutAct_9fa48("14002") ? true : stryMutAct_9fa48("14001") ? parsed.success : (stryCov_9fa48("14001", "14002", "14003"), !parsed.success)) throw new ServiceFrequencyContractError(stryMutAct_9fa48("14005") ? "" : (stryCov_9fa48("14005"), "Los datos de la frecuencia son inválidos."), stryMutAct_9fa48("14006") ? {} : (stryCov_9fa48("14006"), {
        cause: parsed.error
      }));
      return parseResource(await requestJson(stryMutAct_9fa48("14007") ? "" : (stryCov_9fa48("14007"), "/api/service-frequencies"), stryMutAct_9fa48("14008") ? {} : (stryCov_9fa48("14008"), {
        method: stryMutAct_9fa48("14009") ? "" : (stryCov_9fa48("14009"), "POST"),
        headers: stryMutAct_9fa48("14010") ? {} : (stryCov_9fa48("14010"), {
          "content-type": stryMutAct_9fa48("14011") ? "" : (stryCov_9fa48("14011"), "application/json")
        }),
        body: JSON.stringify(parsed.data)
      })));
    }
  },
  async update(id: string, input: ServiceFrequencyUpdateInput): Promise<ServiceFrequency> {
    if (stryMutAct_9fa48("14012")) {
      {}
    } else {
      stryCov_9fa48("14012");
      const parsed = serviceFrequencyUpdateInputSchema.safeParse(input);
      if (stryMutAct_9fa48("14015") ? false : stryMutAct_9fa48("14014") ? true : stryMutAct_9fa48("14013") ? parsed.success : (stryCov_9fa48("14013", "14014", "14015"), !parsed.success)) throw new ServiceFrequencyContractError(stryMutAct_9fa48("14017") ? "" : (stryCov_9fa48("14017"), "Los datos editables de la frecuencia son inválidos."), stryMutAct_9fa48("14018") ? {} : (stryCov_9fa48("14018"), {
        cause: parsed.error
      }));
      return parseResource(await requestJson(stryMutAct_9fa48("14019") ? `` : (stryCov_9fa48("14019"), `/api/service-frequencies/${id}`), stryMutAct_9fa48("14020") ? {} : (stryCov_9fa48("14020"), {
        method: stryMutAct_9fa48("14021") ? "" : (stryCov_9fa48("14021"), "PATCH"),
        headers: stryMutAct_9fa48("14022") ? {} : (stryCov_9fa48("14022"), {
          "content-type": stryMutAct_9fa48("14023") ? "" : (stryCov_9fa48("14023"), "application/json")
        }),
        body: JSON.stringify(parsed.data)
      })));
    }
  },
  async close(id: string): Promise<ServiceFrequency> {
    if (stryMutAct_9fa48("14024")) {
      {}
    } else {
      stryCov_9fa48("14024");
      return parseResource(await requestJson(stryMutAct_9fa48("14025") ? `` : (stryCov_9fa48("14025"), `/api/service-frequencies/${id}`), stryMutAct_9fa48("14026") ? {} : (stryCov_9fa48("14026"), {
        method: stryMutAct_9fa48("14027") ? "" : (stryCov_9fa48("14027"), "DELETE")
      })));
    }
  }
});