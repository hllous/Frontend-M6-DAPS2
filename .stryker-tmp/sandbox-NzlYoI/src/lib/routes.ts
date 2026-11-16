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
import { externalIdInput } from "@/lib/input-limits";
import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";
import { tolerantRecords } from "./tolerant-records";
export type RouteQuery = {
  active?: boolean;
  zoneId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};
export class RouteContractError extends Error {
  constructor(message: string, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("13295")) {
      {}
    } else {
      stryCov_9fa48("13295");
      super(message, options);
      this.name = stryMutAct_9fa48("13296") ? "" : (stryCov_9fa48("13296"), "RouteContractError");
    }
  }
}
export class RouteRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("13297")) {
      {}
    } else {
      stryCov_9fa48("13297");
      super(message, options);
      this.name = stryMutAct_9fa48("13298") ? "" : (stryCov_9fa48("13298"), "RouteRequestError");
      this.status = status;
    }
  }
}
export const routeStopSchema = z.object(stryMutAct_9fa48("13299") ? {} : (stryCov_9fa48("13299"), {
  id: z.string(),
  sequence: z.number().int().nonnegative(),
  zoneId: z.string(),
  zoneCode: z.string(),
  zoneName: z.string(),
  estimatedDurationMin: z.number().nonnegative()
}));
export type RouteStop = z.infer<typeof routeStopSchema>;
export const routeSchema = z.object(stryMutAct_9fa48("13300") ? {} : (stryCov_9fa48("13300"), {
  id: z.string(),
  code: z.string(),
  name: z.string(),
  active: z.boolean(),
  stops: z.array(routeStopSchema).default(stryMutAct_9fa48("13301") ? ["Stryker was here"] : (stryCov_9fa48("13301"), [])),
  updatedAt: z.string().optional()
}));
export type Route = z.infer<typeof routeSchema>;
export type RoutesPage = {
  routes: Route[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export const createRouteInputSchema = z.object(stryMutAct_9fa48("13302") ? {} : (stryCov_9fa48("13302"), {
  code: stryMutAct_9fa48("13304") ? z.string().min(1, "El código es obligatorio") : stryMutAct_9fa48("13303") ? z.string().trim().max(1, "El código es obligatorio") : (stryCov_9fa48("13303", "13304"), z.string().trim().min(1, stryMutAct_9fa48("13305") ? "" : (stryCov_9fa48("13305"), "El código es obligatorio"))),
  name: stryMutAct_9fa48("13307") ? z.string().min(1, "El nombre es obligatorio") : stryMutAct_9fa48("13306") ? z.string().trim().max(1, "El nombre es obligatorio") : (stryCov_9fa48("13306", "13307"), z.string().trim().min(1, stryMutAct_9fa48("13308") ? "" : (stryCov_9fa48("13308"), "El nombre es obligatorio")))
}));
export type CreateRouteInput = z.infer<typeof createRouteInputSchema>;
export const updateRouteInputSchema = z.object(stryMutAct_9fa48("13309") ? {} : (stryCov_9fa48("13309"), {
  name: stryMutAct_9fa48("13311") ? z.string().min(1, "El nombre es obligatorio").optional() : stryMutAct_9fa48("13310") ? z.string().trim().max(1, "El nombre es obligatorio").optional() : (stryCov_9fa48("13310", "13311"), z.string().trim().min(1, stryMutAct_9fa48("13312") ? "" : (stryCov_9fa48("13312"), "El nombre es obligatorio")).optional()),
  active: z.boolean().optional()
}));
export type UpdateRouteInput = z.infer<typeof updateRouteInputSchema>;
export const routeStopInputSchema = z.object(stryMutAct_9fa48("13313") ? {} : (stryCov_9fa48("13313"), {
  zoneId: externalIdInput(stryMutAct_9fa48("13314") ? "" : (stryCov_9fa48("13314"), "El ID de la zona es obligatorio")),
  estimatedDurationMin: stryMutAct_9fa48("13316") ? z.number({
    message: "La duración estimada debe ser un número"
  }).int("La duración estimada debe ser un número entero").max(1, "La duración mínima es de 1 minuto").max(1440, "La duración máxima es de 1440 minutos") : stryMutAct_9fa48("13315") ? z.number({
    message: "La duración estimada debe ser un número"
  }).int("La duración estimada debe ser un número entero").min(1, "La duración mínima es de 1 minuto").min(1440, "La duración máxima es de 1440 minutos") : (stryCov_9fa48("13315", "13316"), z.number(stryMutAct_9fa48("13317") ? {} : (stryCov_9fa48("13317"), {
    message: stryMutAct_9fa48("13318") ? "" : (stryCov_9fa48("13318"), "La duración estimada debe ser un número")
  })).int(stryMutAct_9fa48("13319") ? "" : (stryCov_9fa48("13319"), "La duración estimada debe ser un número entero")).min(1, stryMutAct_9fa48("13320") ? "" : (stryCov_9fa48("13320"), "La duración mínima es de 1 minuto")).max(1440, stryMutAct_9fa48("13321") ? "" : (stryCov_9fa48("13321"), "La duración máxima es de 1440 minutos")))
}));
export type RouteStopInput = z.infer<typeof routeStopInputSchema>;
export const setRouteStopsInputSchema = z.object(stryMutAct_9fa48("13322") ? {} : (stryCov_9fa48("13322"), {
  stops: stryMutAct_9fa48("13323") ? z.array(routeStopInputSchema).min(100, "Un recorrido no puede tener más de 100 paradas") : (stryCov_9fa48("13323"), z.array(routeStopInputSchema).max(100, stryMutAct_9fa48("13324") ? "" : (stryCov_9fa48("13324"), "Un recorrido no puede tener más de 100 paradas")))
})).superRefine((data, ctx) => {
  if (stryMutAct_9fa48("13325")) {
    {}
  } else {
    stryCov_9fa48("13325");
    const zoneIds = data.stops.map(stryMutAct_9fa48("13326") ? () => undefined : (stryCov_9fa48("13326"), s => s.zoneId));
    const duplicates = stryMutAct_9fa48("13327") ? zoneIds : (stryCov_9fa48("13327"), zoneIds.filter(stryMutAct_9fa48("13328") ? () => undefined : (stryCov_9fa48("13328"), (z, i) => stryMutAct_9fa48("13331") ? zoneIds.indexOf(z) === i : stryMutAct_9fa48("13330") ? false : stryMutAct_9fa48("13329") ? true : (stryCov_9fa48("13329", "13330", "13331"), zoneIds.indexOf(z) !== i))));
    if (stryMutAct_9fa48("13335") ? duplicates.length <= 0 : stryMutAct_9fa48("13334") ? duplicates.length >= 0 : stryMutAct_9fa48("13333") ? false : stryMutAct_9fa48("13332") ? true : (stryCov_9fa48("13332", "13333", "13334", "13335"), duplicates.length > 0)) {
      if (stryMutAct_9fa48("13336")) {
        {}
      } else {
        stryCov_9fa48("13336");
        ctx.addIssue(stryMutAct_9fa48("13338") ? {} : (stryCov_9fa48("13338"), {
          code: z.ZodIssueCode.custom,
          message: stryMutAct_9fa48("13339") ? `` : (stryCov_9fa48("13339"), `Una zona no puede repetirse en el mismo recorrido: ${(stryMutAct_9fa48("13340") ? [] : (stryCov_9fa48("13340"), [...new Set(duplicates)])).join(stryMutAct_9fa48("13341") ? "" : (stryCov_9fa48("13341"), ", "))}`),
          path: stryMutAct_9fa48("13342") ? [] : (stryCov_9fa48("13342"), [stryMutAct_9fa48("13343") ? "" : (stryCov_9fa48("13343"), "stops")])
        }));
      }
    }
  }
});
export type SetRouteStopsInput = z.infer<typeof setRouteStopsInputSchema>;
export const routeReferenceReportSchema = z.object(stryMutAct_9fa48("13344") ? {} : (stryCov_9fa48("13344"), {
  routeId: z.string(),
  activeServiceFrequencies: z.array(z.object(stryMutAct_9fa48("13345") ? {} : (stryCov_9fa48("13345"), {
    id: z.string(),
    serviceTypeName: z.string(),
    shift: z.string(),
    weekdays: z.array(z.string())
  }))),
  totalReferences: z.number()
}));
export type RouteReferenceReport = z.infer<typeof routeReferenceReportSchema>;
const routesEnvelopeSchema = z.object(stryMutAct_9fa48("13346") ? {} : (stryCov_9fa48("13346"), {
  data: tolerantRecords(routeSchema, stryMutAct_9fa48("13347") ? "" : (stryCov_9fa48("13347"), "routes")),
  meta: z.object(stryMutAct_9fa48("13348") ? {} : (stryCov_9fa48("13348"), {
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number()
  }))
}));
const errorResponseSchema = z.object(stryMutAct_9fa48("13349") ? {} : (stryCov_9fa48("13349"), {
  statusCode: z.number(),
  message: z.union(stryMutAct_9fa48("13350") ? [] : (stryCov_9fa48("13350"), [z.string(), z.array(z.string())])),
  error: z.string(),
  timestamp: z.string(),
  path: z.string()
}));
function buildRoutesQueryString(query: RouteQuery): string {
  if (stryMutAct_9fa48("13351")) {
    {}
  } else {
    stryCov_9fa48("13351");
    const params = new URLSearchParams();
    if (stryMutAct_9fa48("13354") ? query.active === undefined : stryMutAct_9fa48("13353") ? false : stryMutAct_9fa48("13352") ? true : (stryCov_9fa48("13352", "13353", "13354"), query.active !== undefined)) params.set(stryMutAct_9fa48("13356") ? "" : (stryCov_9fa48("13356"), "active"), String(query.active));
    if (stryMutAct_9fa48("13358") ? false : stryMutAct_9fa48("13357") ? true : (stryCov_9fa48("13357", "13358"), query.zoneId)) params.set(stryMutAct_9fa48("13360") ? "" : (stryCov_9fa48("13360"), "zoneId"), query.zoneId);
    if (stryMutAct_9fa48("13362") ? false : stryMutAct_9fa48("13361") ? true : (stryCov_9fa48("13361", "13362"), query.search)) params.set(stryMutAct_9fa48("13364") ? "" : (stryCov_9fa48("13364"), "search"), query.search);
    if (stryMutAct_9fa48("13367") ? query.page === undefined : stryMutAct_9fa48("13366") ? false : stryMutAct_9fa48("13365") ? true : (stryCov_9fa48("13365", "13366", "13367"), query.page !== undefined)) params.set(stryMutAct_9fa48("13369") ? "" : (stryCov_9fa48("13369"), "page"), String(query.page));
    if (stryMutAct_9fa48("13372") ? query.pageSize === undefined : stryMutAct_9fa48("13371") ? false : stryMutAct_9fa48("13370") ? true : (stryCov_9fa48("13370", "13371", "13372"), query.pageSize !== undefined)) params.set(stryMutAct_9fa48("13374") ? "" : (stryCov_9fa48("13374"), "pageSize"), String(query.pageSize));
    const queryString = params.toString();
    return queryString ? stryMutAct_9fa48("13375") ? `` : (stryCov_9fa48("13375"), `?${queryString}`) : stryMutAct_9fa48("13376") ? "Stryker was here!" : (stryCov_9fa48("13376"), "");
  }
}
async function readJsonBody(response: Response, resource: "routes" = stryMutAct_9fa48("13377") ? "" : (stryCov_9fa48("13377"), "routes")): Promise<unknown> {
  if (stryMutAct_9fa48("13378")) {
    {}
  } else {
    stryCov_9fa48("13378");
    try {
      if (stryMutAct_9fa48("13379")) {
        {}
      } else {
        stryCov_9fa48("13379");
        return await response.json();
      }
    } catch (cause) {
      if (stryMutAct_9fa48("13380")) {
        {}
      } else {
        stryCov_9fa48("13380");
        recordTelemetryEvent(stryMutAct_9fa48("13382") ? {} : (stryCov_9fa48("13382"), {
          name: stryMutAct_9fa48("13383") ? "" : (stryCov_9fa48("13383"), "request_malformed_response"),
          resource
        }));
        throw new RouteContractError(stryMutAct_9fa48("13385") ? "" : (stryCov_9fa48("13385"), "No se pudo obtener información válida de recorridos. Reintente en unos segundos."), stryMutAct_9fa48("13386") ? {} : (stryCov_9fa48("13386"), {
          cause
        }));
      }
    }
  }
}
function handleErrorPayload(payload: unknown, resource: "routes" = stryMutAct_9fa48("13387") ? "" : (stryCov_9fa48("13387"), "routes")): never {
  if (stryMutAct_9fa48("13388")) {
    {}
  } else {
    stryCov_9fa48("13388");
    const parsedError = errorResponseSchema.safeParse(payload);
    if (stryMutAct_9fa48("13391") ? false : stryMutAct_9fa48("13390") ? true : stryMutAct_9fa48("13389") ? parsedError.success : (stryCov_9fa48("13389", "13390", "13391"), !parsedError.success)) {
      if (stryMutAct_9fa48("13392")) {
        {}
      } else {
        stryCov_9fa48("13392");
        recordTelemetryEvent(stryMutAct_9fa48("13394") ? {} : (stryCov_9fa48("13394"), {
          name: stryMutAct_9fa48("13395") ? "" : (stryCov_9fa48("13395"), "request_malformed_response"),
          resource
        }));
        throw new RouteContractError(stryMutAct_9fa48("13397") ? "" : (stryCov_9fa48("13397"), "No se pudo obtener información válida de recorridos. Reintente en unos segundos."), stryMutAct_9fa48("13398") ? {} : (stryCov_9fa48("13398"), {
          cause: parsedError.error
        }));
      }
    }
    const message = Array.isArray(parsedError.data.message) ? parsedError.data.message.join(stryMutAct_9fa48("13399") ? "" : (stryCov_9fa48("13399"), " ")) : parsedError.data.message;
    if (stryMutAct_9fa48("13400")) {
      ;
    } else {
      stryCov_9fa48("13400");
      throw new RouteRequestError(message, parsedError.data.statusCode);
    }
  }
}
async function handleSingleRouteResponse(response: Response, resource: "routes" = stryMutAct_9fa48("13401") ? "" : (stryCov_9fa48("13401"), "routes")): Promise<Route> {
  if (stryMutAct_9fa48("13402")) {
    {}
  } else {
    stryCov_9fa48("13402");
    const payload = await readJsonBody(response, resource);
    if (stryMutAct_9fa48("13405") ? false : stryMutAct_9fa48("13404") ? true : stryMutAct_9fa48("13403") ? response.ok : (stryCov_9fa48("13403", "13404", "13405"), !response.ok)) {
      if (stryMutAct_9fa48("13406")) {
        {}
      } else {
        stryCov_9fa48("13406");
        if (stryMutAct_9fa48("13407")) {
          ;
        } else {
          stryCov_9fa48("13407");
          handleErrorPayload(payload, resource);
        }
      }
    }
    const parsed = routeSchema.safeParse(payload);
    if (stryMutAct_9fa48("13410") ? false : stryMutAct_9fa48("13409") ? true : stryMutAct_9fa48("13408") ? parsed.success : (stryCov_9fa48("13408", "13409", "13410"), !parsed.success)) {
      if (stryMutAct_9fa48("13411")) {
        {}
      } else {
        stryCov_9fa48("13411");
        recordTelemetryEvent(stryMutAct_9fa48("13413") ? {} : (stryCov_9fa48("13413"), {
          name: stryMutAct_9fa48("13414") ? "" : (stryCov_9fa48("13414"), "request_malformed_response"),
          resource
        }));
        throw new RouteContractError(stryMutAct_9fa48("13416") ? "" : (stryCov_9fa48("13416"), "No se pudo obtener información válida de recorrido. Reintente en unos segundos."), stryMutAct_9fa48("13417") ? {} : (stryCov_9fa48("13417"), {
          cause: parsed.error
        }));
      }
    }
    return parsed.data;
  }
}
export const routesAdapter = stryMutAct_9fa48("13418") ? {} : (stryCov_9fa48("13418"), {
  async list(query: RouteQuery = {}): Promise<RoutesPage> {
    if (stryMutAct_9fa48("13419")) {
      {}
    } else {
      stryCov_9fa48("13419");
      let response: Response;
      try {
        if (stryMutAct_9fa48("13420")) {
          {}
        } else {
          stryCov_9fa48("13420");
          response = await authenticatedFetch(stryMutAct_9fa48("13421") ? `` : (stryCov_9fa48("13421"), `/api/routes${buildRoutesQueryString(query)}`));
        }
      } catch (cause) {
        if (stryMutAct_9fa48("13422")) {
          {}
        } else {
          stryCov_9fa48("13422");
          if (stryMutAct_9fa48("13424") ? false : stryMutAct_9fa48("13423") ? true : (stryCov_9fa48("13423", "13424"), cause instanceof NetworkFailureError)) {
            if (stryMutAct_9fa48("13425")) {
              {}
            } else {
              stryCov_9fa48("13425");
              recordTelemetryEvent(stryMutAct_9fa48("13427") ? {} : (stryCov_9fa48("13427"), {
                name: stryMutAct_9fa48("13428") ? "" : (stryCov_9fa48("13428"), "request_network_failure"),
                resource: stryMutAct_9fa48("13429") ? "" : (stryCov_9fa48("13429"), "routes")
              }));
            }
          }
          throw cause;
        }
      }
      const payload = await readJsonBody(response);
      if (stryMutAct_9fa48("13432") ? false : stryMutAct_9fa48("13431") ? true : stryMutAct_9fa48("13430") ? response.ok : (stryCov_9fa48("13430", "13431", "13432"), !response.ok)) {
        if (stryMutAct_9fa48("13433")) {
          {}
        } else {
          stryCov_9fa48("13433");
          if (stryMutAct_9fa48("13434")) {
            ;
          } else {
            stryCov_9fa48("13434");
            handleErrorPayload(payload);
          }
        }
      }
      const parsed = routesEnvelopeSchema.safeParse(payload);
      if (stryMutAct_9fa48("13437") ? false : stryMutAct_9fa48("13436") ? true : stryMutAct_9fa48("13435") ? parsed.success : (stryCov_9fa48("13435", "13436", "13437"), !parsed.success)) {
        if (stryMutAct_9fa48("13438")) {
          {}
        } else {
          stryCov_9fa48("13438");
          recordTelemetryEvent(stryMutAct_9fa48("13440") ? {} : (stryCov_9fa48("13440"), {
            name: stryMutAct_9fa48("13441") ? "" : (stryCov_9fa48("13441"), "request_malformed_response"),
            resource: stryMutAct_9fa48("13442") ? "" : (stryCov_9fa48("13442"), "routes")
          }));
          throw new RouteContractError(stryMutAct_9fa48("13444") ? "" : (stryCov_9fa48("13444"), "No se pudo obtener información válida de recorridos. Reintente en unos segundos."), stryMutAct_9fa48("13445") ? {} : (stryCov_9fa48("13445"), {
            cause: parsed.error
          }));
        }
      }
      return stryMutAct_9fa48("13446") ? {} : (stryCov_9fa48("13446"), {
        routes: parsed.data.data,
        page: parsed.data.meta.page,
        pageSize: parsed.data.meta.pageSize,
        total: parsed.data.meta.total,
        totalPages: parsed.data.meta.totalPages
      });
    }
  },
  async get(id: string): Promise<Route> {
    if (stryMutAct_9fa48("13447")) {
      {}
    } else {
      stryCov_9fa48("13447");
      let response: Response;
      try {
        if (stryMutAct_9fa48("13448")) {
          {}
        } else {
          stryCov_9fa48("13448");
          response = await authenticatedFetch(stryMutAct_9fa48("13449") ? `` : (stryCov_9fa48("13449"), `/api/routes/${id}`));
        }
      } catch (cause) {
        if (stryMutAct_9fa48("13450")) {
          {}
        } else {
          stryCov_9fa48("13450");
          if (stryMutAct_9fa48("13452") ? false : stryMutAct_9fa48("13451") ? true : (stryCov_9fa48("13451", "13452"), cause instanceof NetworkFailureError)) {
            if (stryMutAct_9fa48("13453")) {
              {}
            } else {
              stryCov_9fa48("13453");
              recordTelemetryEvent(stryMutAct_9fa48("13455") ? {} : (stryCov_9fa48("13455"), {
                name: stryMutAct_9fa48("13456") ? "" : (stryCov_9fa48("13456"), "request_network_failure"),
                resource: stryMutAct_9fa48("13457") ? "" : (stryCov_9fa48("13457"), "routes")
              }));
            }
          }
          throw cause;
        }
      }
      return handleSingleRouteResponse(response);
    }
  },
  async create(input: CreateRouteInput): Promise<Route> {
    if (stryMutAct_9fa48("13458")) {
      {}
    } else {
      stryCov_9fa48("13458");
      const validated = createRouteInputSchema.parse(input);
      let response: Response;
      try {
        if (stryMutAct_9fa48("13459")) {
          {}
        } else {
          stryCov_9fa48("13459");
          response = await authenticatedFetch(stryMutAct_9fa48("13460") ? "" : (stryCov_9fa48("13460"), "/api/routes"), stryMutAct_9fa48("13461") ? {} : (stryCov_9fa48("13461"), {
            method: stryMutAct_9fa48("13462") ? "" : (stryCov_9fa48("13462"), "POST"),
            headers: stryMutAct_9fa48("13463") ? {} : (stryCov_9fa48("13463"), {
              "content-type": stryMutAct_9fa48("13464") ? "" : (stryCov_9fa48("13464"), "application/json")
            }),
            body: JSON.stringify(validated)
          }));
        }
      } catch (cause) {
        if (stryMutAct_9fa48("13465")) {
          {}
        } else {
          stryCov_9fa48("13465");
          if (stryMutAct_9fa48("13467") ? false : stryMutAct_9fa48("13466") ? true : (stryCov_9fa48("13466", "13467"), cause instanceof NetworkFailureError)) {
            if (stryMutAct_9fa48("13468")) {
              {}
            } else {
              stryCov_9fa48("13468");
              recordTelemetryEvent(stryMutAct_9fa48("13470") ? {} : (stryCov_9fa48("13470"), {
                name: stryMutAct_9fa48("13471") ? "" : (stryCov_9fa48("13471"), "request_network_failure"),
                resource: stryMutAct_9fa48("13472") ? "" : (stryCov_9fa48("13472"), "routes")
              }));
            }
          }
          throw cause;
        }
      }
      return handleSingleRouteResponse(response);
    }
  },
  async update(id: string, input: UpdateRouteInput): Promise<Route> {
    if (stryMutAct_9fa48("13473")) {
      {}
    } else {
      stryCov_9fa48("13473");
      const validated = updateRouteInputSchema.parse(input);
      let response: Response;
      try {
        if (stryMutAct_9fa48("13474")) {
          {}
        } else {
          stryCov_9fa48("13474");
          response = await authenticatedFetch(stryMutAct_9fa48("13475") ? `` : (stryCov_9fa48("13475"), `/api/routes/${id}`), stryMutAct_9fa48("13476") ? {} : (stryCov_9fa48("13476"), {
            method: stryMutAct_9fa48("13477") ? "" : (stryCov_9fa48("13477"), "PATCH"),
            headers: stryMutAct_9fa48("13478") ? {} : (stryCov_9fa48("13478"), {
              "content-type": stryMutAct_9fa48("13479") ? "" : (stryCov_9fa48("13479"), "application/json")
            }),
            body: JSON.stringify(validated)
          }));
        }
      } catch (cause) {
        if (stryMutAct_9fa48("13480")) {
          {}
        } else {
          stryCov_9fa48("13480");
          if (stryMutAct_9fa48("13482") ? false : stryMutAct_9fa48("13481") ? true : (stryCov_9fa48("13481", "13482"), cause instanceof NetworkFailureError)) {
            if (stryMutAct_9fa48("13483")) {
              {}
            } else {
              stryCov_9fa48("13483");
              recordTelemetryEvent(stryMutAct_9fa48("13485") ? {} : (stryCov_9fa48("13485"), {
                name: stryMutAct_9fa48("13486") ? "" : (stryCov_9fa48("13486"), "request_network_failure"),
                resource: stryMutAct_9fa48("13487") ? "" : (stryCov_9fa48("13487"), "routes")
              }));
            }
          }
          throw cause;
        }
      }
      return handleSingleRouteResponse(response);
    }
  },
  async delete(id: string): Promise<Route> {
    if (stryMutAct_9fa48("13488")) {
      {}
    } else {
      stryCov_9fa48("13488");
      let response: Response;
      try {
        if (stryMutAct_9fa48("13489")) {
          {}
        } else {
          stryCov_9fa48("13489");
          response = await authenticatedFetch(stryMutAct_9fa48("13490") ? `` : (stryCov_9fa48("13490"), `/api/routes/${id}`), stryMutAct_9fa48("13491") ? {} : (stryCov_9fa48("13491"), {
            method: stryMutAct_9fa48("13492") ? "" : (stryCov_9fa48("13492"), "DELETE")
          }));
        }
      } catch (cause) {
        if (stryMutAct_9fa48("13493")) {
          {}
        } else {
          stryCov_9fa48("13493");
          if (stryMutAct_9fa48("13495") ? false : stryMutAct_9fa48("13494") ? true : (stryCov_9fa48("13494", "13495"), cause instanceof NetworkFailureError)) {
            if (stryMutAct_9fa48("13496")) {
              {}
            } else {
              stryCov_9fa48("13496");
              recordTelemetryEvent(stryMutAct_9fa48("13498") ? {} : (stryCov_9fa48("13498"), {
                name: stryMutAct_9fa48("13499") ? "" : (stryCov_9fa48("13499"), "request_network_failure"),
                resource: stryMutAct_9fa48("13500") ? "" : (stryCov_9fa48("13500"), "routes")
              }));
            }
          }
          throw cause;
        }
      }
      return handleSingleRouteResponse(response);
    }
  },
  async checkReferences(id: string): Promise<RouteReferenceReport> {
    if (stryMutAct_9fa48("13501")) {
      {}
    } else {
      stryCov_9fa48("13501");
      let response: Response;
      try {
        if (stryMutAct_9fa48("13502")) {
          {}
        } else {
          stryCov_9fa48("13502");
          response = await authenticatedFetch(stryMutAct_9fa48("13503") ? `` : (stryCov_9fa48("13503"), `/api/routes/${id}/references`));
        }
      } catch (cause) {
        if (stryMutAct_9fa48("13504")) {
          {}
        } else {
          stryCov_9fa48("13504");
          if (stryMutAct_9fa48("13506") ? false : stryMutAct_9fa48("13505") ? true : (stryCov_9fa48("13505", "13506"), cause instanceof NetworkFailureError)) {
            if (stryMutAct_9fa48("13507")) {
              {}
            } else {
              stryCov_9fa48("13507");
              recordTelemetryEvent(stryMutAct_9fa48("13509") ? {} : (stryCov_9fa48("13509"), {
                name: stryMutAct_9fa48("13510") ? "" : (stryCov_9fa48("13510"), "request_network_failure"),
                resource: stryMutAct_9fa48("13511") ? "" : (stryCov_9fa48("13511"), "routes")
              }));
            }
          }
          throw cause;
        }
      }
      const payload = await readJsonBody(response);
      if (stryMutAct_9fa48("13514") ? false : stryMutAct_9fa48("13513") ? true : stryMutAct_9fa48("13512") ? response.ok : (stryCov_9fa48("13512", "13513", "13514"), !response.ok)) {
        if (stryMutAct_9fa48("13515")) {
          {}
        } else {
          stryCov_9fa48("13515");
          if (stryMutAct_9fa48("13516")) {
            ;
          } else {
            stryCov_9fa48("13516");
            handleErrorPayload(payload);
          }
        }
      }
      const parsed = routeReferenceReportSchema.safeParse(payload);
      if (stryMutAct_9fa48("13519") ? false : stryMutAct_9fa48("13518") ? true : stryMutAct_9fa48("13517") ? parsed.success : (stryCov_9fa48("13517", "13518", "13519"), !parsed.success)) {
        if (stryMutAct_9fa48("13520")) {
          {}
        } else {
          stryCov_9fa48("13520");
          recordTelemetryEvent(stryMutAct_9fa48("13522") ? {} : (stryCov_9fa48("13522"), {
            name: stryMutAct_9fa48("13523") ? "" : (stryCov_9fa48("13523"), "request_malformed_response"),
            resource: stryMutAct_9fa48("13524") ? "" : (stryCov_9fa48("13524"), "routes")
          }));
          throw new RouteContractError(stryMutAct_9fa48("13526") ? "" : (stryCov_9fa48("13526"), "No se pudo obtener información válida de referencias de recorrido. Reintente en unos segundos."), stryMutAct_9fa48("13527") ? {} : (stryCov_9fa48("13527"), {
            cause: parsed.error
          }));
        }
      }
      return parsed.data;
    }
  },
  async setStops(id: string, input: SetRouteStopsInput): Promise<Route> {
    if (stryMutAct_9fa48("13528")) {
      {}
    } else {
      stryCov_9fa48("13528");
      const validated = setRouteStopsInputSchema.parse(input);
      let response: Response;
      try {
        if (stryMutAct_9fa48("13529")) {
          {}
        } else {
          stryCov_9fa48("13529");
          response = await authenticatedFetch(stryMutAct_9fa48("13530") ? `` : (stryCov_9fa48("13530"), `/api/routes/${id}/stops`), stryMutAct_9fa48("13531") ? {} : (stryCov_9fa48("13531"), {
            method: stryMutAct_9fa48("13532") ? "" : (stryCov_9fa48("13532"), "PUT"),
            headers: stryMutAct_9fa48("13533") ? {} : (stryCov_9fa48("13533"), {
              "content-type": stryMutAct_9fa48("13534") ? "" : (stryCov_9fa48("13534"), "application/json")
            }),
            body: JSON.stringify(validated)
          }));
        }
      } catch (cause) {
        if (stryMutAct_9fa48("13535")) {
          {}
        } else {
          stryCov_9fa48("13535");
          if (stryMutAct_9fa48("13537") ? false : stryMutAct_9fa48("13536") ? true : (stryCov_9fa48("13536", "13537"), cause instanceof NetworkFailureError)) {
            if (stryMutAct_9fa48("13538")) {
              {}
            } else {
              stryCov_9fa48("13538");
              recordTelemetryEvent(stryMutAct_9fa48("13540") ? {} : (stryCov_9fa48("13540"), {
                name: stryMutAct_9fa48("13541") ? "" : (stryCov_9fa48("13541"), "request_network_failure"),
                resource: stryMutAct_9fa48("13542") ? "" : (stryCov_9fa48("13542"), "routes")
              }));
            }
          }
          throw cause;
        }
      }
      return handleSingleRouteResponse(response);
    }
  }
});