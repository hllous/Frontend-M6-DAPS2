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
import { withFlatIds } from "./backend-shape";
import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";
import { treeSchema, type Tree } from "./trees";
import { externalIdInput, externalIdListInput } from "@/lib/input-limits";
import { tolerantRecords } from "./tolerant-records";
export const treeInterventionTypeSchema = z.enum(stryMutAct_9fa48("16413") ? [] : (stryCov_9fa48("16413"), [stryMutAct_9fa48("16414") ? "" : (stryCov_9fa48("16414"), "FORMATION_PRUNING"), stryMutAct_9fa48("16415") ? "" : (stryCov_9fa48("16415"), "SAFETY_PRUNING"), stryMutAct_9fa48("16416") ? "" : (stryCov_9fa48("16416"), "REMOVAL"), stryMutAct_9fa48("16417") ? "" : (stryCov_9fa48("16417"), "PLANTING"), stryMutAct_9fa48("16418") ? "" : (stryCov_9fa48("16418"), "TREATMENT")]));
export type TreeInterventionType = z.infer<typeof treeInterventionTypeSchema>;
export const treeInterventionStatusSchema = z.enum(stryMutAct_9fa48("16419") ? [] : (stryCov_9fa48("16419"), [stryMutAct_9fa48("16420") ? "" : (stryCov_9fa48("16420"), "REQUESTED"), stryMutAct_9fa48("16421") ? "" : (stryCov_9fa48("16421"), "PENDING_AUTHORIZATION"), stryMutAct_9fa48("16422") ? "" : (stryCov_9fa48("16422"), "AUTHORIZED"), stryMutAct_9fa48("16423") ? "" : (stryCov_9fa48("16423"), "REJECTED")]));
export type TreeInterventionStatus = z.infer<typeof treeInterventionStatusSchema>;
export const treeInterventionPrioritySchema = z.enum(stryMutAct_9fa48("16424") ? [] : (stryCov_9fa48("16424"), [stryMutAct_9fa48("16425") ? "" : (stryCov_9fa48("16425"), "LOW"), stryMutAct_9fa48("16426") ? "" : (stryCov_9fa48("16426"), "MEDIUM"), stryMutAct_9fa48("16427") ? "" : (stryCov_9fa48("16427"), "HIGH"), stryMutAct_9fa48("16428") ? "" : (stryCov_9fa48("16428"), "CRITICAL")]));
export type TreeInterventionPriority = z.infer<typeof treeInterventionPrioritySchema>;

// El backend devuelve trees: [{ treeId }] y address puede venir en null.
export const treeInterventionSchema = z.object(stryMutAct_9fa48("16429") ? {} : (stryCov_9fa48("16429"), {
  id: z.string(),
  interventionType: treeInterventionTypeSchema,
  treeIds: stryMutAct_9fa48("16430") ? z.array(z.string()).max(1) : (stryCov_9fa48("16430"), z.array(z.string()).min(1)),
  address: z.string().nullable().default(null),
  requiresStreetClosure: z.boolean(),
  priority: treeInterventionPrioritySchema.nullable(),
  status: treeInterventionStatusSchema,
  serviceId: z.string().nullable(),
  justification: z.string().nullable(),
  authorizedByUserId: z.string().nullable().optional(),
  authorizedAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
}));
export type TreeIntervention = z.infer<typeof treeInterventionSchema> & {
  trees?: Tree[];
};
const treeInterventionResponseSchema = z.preprocess(withFlatIds(stryMutAct_9fa48("16431") ? "" : (stryCov_9fa48("16431"), "trees"), stryMutAct_9fa48("16432") ? "" : (stryCov_9fa48("16432"), "treeId"), stryMutAct_9fa48("16433") ? "" : (stryCov_9fa48("16433"), "treeIds")), treeInterventionSchema.extend(stryMutAct_9fa48("16434") ? {} : (stryCov_9fa48("16434"), {
  trees: z.array(treeSchema).optional()
})));
export type TreeInterventionDetail = z.infer<typeof treeInterventionResponseSchema>;
export const treeInterventionCreateInputSchema = z.object(stryMutAct_9fa48("16435") ? {} : (stryCov_9fa48("16435"), {
  interventionType: treeInterventionTypeSchema,
  treeIds: externalIdListInput(stryMutAct_9fa48("16436") ? {} : (stryCov_9fa48("16436"), {
    emptyMessage: stryMutAct_9fa48("16437") ? "" : (stryCov_9fa48("16437"), "Seleccione al menos un árbol.")
  })),
  address: stryMutAct_9fa48("16440") ? z.string().min(1, "La dirección es obligatoria.").max(200, "La dirección no puede superar los 200 caracteres.") : stryMutAct_9fa48("16439") ? z.string().trim().max(1, "La dirección es obligatoria.").max(200, "La dirección no puede superar los 200 caracteres.") : stryMutAct_9fa48("16438") ? z.string().trim().min(1, "La dirección es obligatoria.").min(200, "La dirección no puede superar los 200 caracteres.") : (stryCov_9fa48("16438", "16439", "16440"), z.string().trim().min(1, stryMutAct_9fa48("16441") ? "" : (stryCov_9fa48("16441"), "La dirección es obligatoria.")).max(200, stryMutAct_9fa48("16442") ? "" : (stryCov_9fa48("16442"), "La dirección no puede superar los 200 caracteres."))),
  requiresStreetClosure: z.boolean(),
  priority: treeInterventionPrioritySchema,
  justification: stryMutAct_9fa48("16444") ? z.string().max(2000, "La justificación no puede superar los 2000 caracteres.").optional() : stryMutAct_9fa48("16443") ? z.string().trim().min(2000, "La justificación no puede superar los 2000 caracteres.").optional() : (stryCov_9fa48("16443", "16444"), z.string().trim().max(2000, stryMutAct_9fa48("16445") ? "" : (stryCov_9fa48("16445"), "La justificación no puede superar los 2000 caracteres.")).optional())
})).refine(stryMutAct_9fa48("16446") ? () => undefined : (stryCov_9fa48("16446"), input => stryMutAct_9fa48("16449") ? input.interventionType !== "REMOVAL" && Boolean(input.justification) : stryMutAct_9fa48("16448") ? false : stryMutAct_9fa48("16447") ? true : (stryCov_9fa48("16447", "16448", "16449"), (stryMutAct_9fa48("16451") ? input.interventionType === "REMOVAL" : stryMutAct_9fa48("16450") ? false : (stryCov_9fa48("16450", "16451"), input.interventionType !== (stryMutAct_9fa48("16452") ? "" : (stryCov_9fa48("16452"), "REMOVAL")))) || Boolean(input.justification))), stryMutAct_9fa48("16453") ? {} : (stryCov_9fa48("16453"), {
  path: stryMutAct_9fa48("16454") ? [] : (stryCov_9fa48("16454"), [stryMutAct_9fa48("16455") ? "" : (stryCov_9fa48("16455"), "justification")]),
  message: stryMutAct_9fa48("16456") ? "" : (stryCov_9fa48("16456"), "La justificación es obligatoria para solicitar una extracción.")
}));
export type TreeInterventionCreateInput = z.infer<typeof treeInterventionCreateInputSchema>;
export const treeInterventionAssignServiceInputSchema = z.object(stryMutAct_9fa48("16457") ? {} : (stryCov_9fa48("16457"), {
  serviceId: stryMutAct_9fa48("16459") ? z.string().min(1, "Debe indicar el servicio que ejecutará la intervención.") : stryMutAct_9fa48("16458") ? z.string().trim().max(1, "Debe indicar el servicio que ejecutará la intervención.") : (stryCov_9fa48("16458", "16459"), z.string().trim().min(1, stryMutAct_9fa48("16460") ? "" : (stryCov_9fa48("16460"), "Debe indicar el servicio que ejecutará la intervención.")))
}));
export type TreeInterventionAssignServiceInput = z.infer<typeof treeInterventionAssignServiceInputSchema>;
export type TreeInterventionQuery = {
  interventionType?: TreeInterventionType;
  status?: TreeInterventionStatus;
  priority?: TreeInterventionPriority;
  page?: number;
  pageSize?: number;
};
export type TreeInterventionsPage = {
  interventions: TreeIntervention[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export class TreeInterventionContractError extends Error {
  constructor(message: string, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("16461")) {
      {}
    } else {
      stryCov_9fa48("16461");
      super(message, options);
      this.name = stryMutAct_9fa48("16462") ? "" : (stryCov_9fa48("16462"), "TreeInterventionContractError");
    }
  }
}
export class TreeInterventionRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("16463")) {
      {}
    } else {
      stryCov_9fa48("16463");
      super(message, options);
      this.name = stryMutAct_9fa48("16464") ? "" : (stryCov_9fa48("16464"), "TreeInterventionRequestError");
      this.status = status;
    }
  }
}
const pageSchema = z.object(stryMutAct_9fa48("16465") ? {} : (stryCov_9fa48("16465"), {
  data: tolerantRecords(treeInterventionResponseSchema, stryMutAct_9fa48("16466") ? "" : (stryCov_9fa48("16466"), "tree-interventions")),
  meta: z.object(stryMutAct_9fa48("16467") ? {} : (stryCov_9fa48("16467"), {
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number()
  }))
}));
const errorResponseSchema = z.object(stryMutAct_9fa48("16468") ? {} : (stryCov_9fa48("16468"), {
  statusCode: z.number(),
  message: z.union(stryMutAct_9fa48("16469") ? [] : (stryCov_9fa48("16469"), [z.string(), z.array(z.string())])),
  error: z.string(),
  timestamp: z.string(),
  path: z.string()
}));
function queryString(query: TreeInterventionQuery) {
  if (stryMutAct_9fa48("16470")) {
    {}
  } else {
    stryCov_9fa48("16470");
    const params = new URLSearchParams();
    if (stryMutAct_9fa48("16472") ? false : stryMutAct_9fa48("16471") ? true : (stryCov_9fa48("16471", "16472"), query.interventionType)) params.set(stryMutAct_9fa48("16474") ? "" : (stryCov_9fa48("16474"), "interventionType"), query.interventionType);
    if (stryMutAct_9fa48("16476") ? false : stryMutAct_9fa48("16475") ? true : (stryCov_9fa48("16475", "16476"), query.status)) params.set(stryMutAct_9fa48("16478") ? "" : (stryCov_9fa48("16478"), "status"), query.status);
    if (stryMutAct_9fa48("16480") ? false : stryMutAct_9fa48("16479") ? true : (stryCov_9fa48("16479", "16480"), query.priority)) params.set(stryMutAct_9fa48("16482") ? "" : (stryCov_9fa48("16482"), "priority"), query.priority);
    if (stryMutAct_9fa48("16485") ? query.page === undefined : stryMutAct_9fa48("16484") ? false : stryMutAct_9fa48("16483") ? true : (stryCov_9fa48("16483", "16484", "16485"), query.page !== undefined)) params.set(stryMutAct_9fa48("16487") ? "" : (stryCov_9fa48("16487"), "page"), String(query.page));
    if (stryMutAct_9fa48("16490") ? query.pageSize === undefined : stryMutAct_9fa48("16489") ? false : stryMutAct_9fa48("16488") ? true : (stryCov_9fa48("16488", "16489", "16490"), query.pageSize !== undefined)) params.set(stryMutAct_9fa48("16492") ? "" : (stryCov_9fa48("16492"), "pageSize"), String(query.pageSize));
    const value = params.toString();
    return value ? stryMutAct_9fa48("16493") ? `` : (stryCov_9fa48("16493"), `?${value}`) : stryMutAct_9fa48("16494") ? "Stryker was here!" : (stryCov_9fa48("16494"), "");
  }
}
async function request(path: string, init?: RequestInit): Promise<unknown> {
  if (stryMutAct_9fa48("16495")) {
    {}
  } else {
    stryCov_9fa48("16495");
    let response: Response;
    try {
      if (stryMutAct_9fa48("16496")) {
        {}
      } else {
        stryCov_9fa48("16496");
        response = await authenticatedFetch(path, init);
      }
    } catch (cause) {
      if (stryMutAct_9fa48("16497")) {
        {}
      } else {
        stryCov_9fa48("16497");
        if (stryMutAct_9fa48("16499") ? false : stryMutAct_9fa48("16498") ? true : (stryCov_9fa48("16498", "16499"), cause instanceof NetworkFailureError)) recordTelemetryEvent(stryMutAct_9fa48("16501") ? {} : (stryCov_9fa48("16501"), {
          name: stryMutAct_9fa48("16502") ? "" : (stryCov_9fa48("16502"), "request_network_failure"),
          resource: stryMutAct_9fa48("16503") ? "" : (stryCov_9fa48("16503"), "tree-interventions")
        }));
        throw cause;
      }
    }
    let payload: unknown;
    try {
      if (stryMutAct_9fa48("16504")) {
        {}
      } else {
        stryCov_9fa48("16504");
        payload = (stryMutAct_9fa48("16507") ? response.status !== 204 : stryMutAct_9fa48("16506") ? false : stryMutAct_9fa48("16505") ? true : (stryCov_9fa48("16505", "16506", "16507"), response.status === 204)) ? undefined : await response.json();
      }
    } catch (cause) {
      if (stryMutAct_9fa48("16508")) {
        {}
      } else {
        stryCov_9fa48("16508");
        recordTelemetryEvent(stryMutAct_9fa48("16510") ? {} : (stryCov_9fa48("16510"), {
          name: stryMutAct_9fa48("16511") ? "" : (stryCov_9fa48("16511"), "request_malformed_response"),
          resource: stryMutAct_9fa48("16512") ? "" : (stryCov_9fa48("16512"), "tree-interventions")
        }));
        throw new TreeInterventionContractError(stryMutAct_9fa48("16514") ? "" : (stryCov_9fa48("16514"), "No se pudo obtener información válida de intervenciones de arbolado. Reintente en unos segundos."), stryMutAct_9fa48("16515") ? {} : (stryCov_9fa48("16515"), {
          cause
        }));
      }
    }
    if (stryMutAct_9fa48("16518") ? false : stryMutAct_9fa48("16517") ? true : stryMutAct_9fa48("16516") ? response.ok : (stryCov_9fa48("16516", "16517", "16518"), !response.ok)) {
      if (stryMutAct_9fa48("16519")) {
        {}
      } else {
        stryCov_9fa48("16519");
        const parsedError = errorResponseSchema.safeParse(payload);
        if (stryMutAct_9fa48("16522") ? false : stryMutAct_9fa48("16521") ? true : stryMutAct_9fa48("16520") ? parsedError.success : (stryCov_9fa48("16520", "16521", "16522"), !parsedError.success)) throw new TreeInterventionContractError(stryMutAct_9fa48("16524") ? "" : (stryCov_9fa48("16524"), "No se pudo obtener información válida de intervenciones. Reintente en unos segundos."), stryMutAct_9fa48("16525") ? {} : (stryCov_9fa48("16525"), {
          cause: parsedError.error
        }));
        const message = Array.isArray(parsedError.data.message) ? parsedError.data.message.join(stryMutAct_9fa48("16526") ? "" : (stryCov_9fa48("16526"), " ")) : parsedError.data.message;
        if (stryMutAct_9fa48("16527")) {
          ;
        } else {
          stryCov_9fa48("16527");
          throw new TreeInterventionRequestError(message, parsedError.data.statusCode);
        }
      }
    }
    return payload;
  }
}
function parseIntervention(payload: unknown, message: string): TreeInterventionDetail {
  if (stryMutAct_9fa48("16528")) {
    {}
  } else {
    stryCov_9fa48("16528");
    const parsed = treeInterventionResponseSchema.safeParse(payload);
    if (stryMutAct_9fa48("16531") ? false : stryMutAct_9fa48("16530") ? true : stryMutAct_9fa48("16529") ? parsed.success : (stryCov_9fa48("16529", "16530", "16531"), !parsed.success)) {
      if (stryMutAct_9fa48("16532")) {
        {}
      } else {
        stryCov_9fa48("16532");
        recordTelemetryEvent(stryMutAct_9fa48("16534") ? {} : (stryCov_9fa48("16534"), {
          name: stryMutAct_9fa48("16535") ? "" : (stryCov_9fa48("16535"), "request_malformed_response"),
          resource: stryMutAct_9fa48("16536") ? "" : (stryCov_9fa48("16536"), "tree-interventions")
        }));
        throw new TreeInterventionContractError(message, stryMutAct_9fa48("16538") ? {} : (stryCov_9fa48("16538"), {
          cause: parsed.error
        }));
      }
    }
    return parsed.data;
  }
}
export const treeInterventionsAdapter = stryMutAct_9fa48("16539") ? {} : (stryCov_9fa48("16539"), {
  async list(query: TreeInterventionQuery = {}): Promise<TreeInterventionsPage> {
    if (stryMutAct_9fa48("16540")) {
      {}
    } else {
      stryCov_9fa48("16540");
      const parsed = pageSchema.safeParse(await request(stryMutAct_9fa48("16541") ? `` : (stryCov_9fa48("16541"), `/api/tree-interventions${queryString(query)}`)));
      if (stryMutAct_9fa48("16544") ? false : stryMutAct_9fa48("16543") ? true : stryMutAct_9fa48("16542") ? parsed.success : (stryCov_9fa48("16542", "16543", "16544"), !parsed.success)) throw new TreeInterventionContractError(stryMutAct_9fa48("16546") ? "" : (stryCov_9fa48("16546"), "No se pudo obtener información válida de la lista de intervenciones. Reintente en unos segundos."), stryMutAct_9fa48("16547") ? {} : (stryCov_9fa48("16547"), {
        cause: parsed.error
      }));
      return stryMutAct_9fa48("16548") ? {} : (stryCov_9fa48("16548"), {
        interventions: parsed.data.data,
        page: parsed.data.meta.page,
        pageSize: parsed.data.meta.pageSize,
        total: parsed.data.meta.total,
        totalPages: parsed.data.meta.totalPages
      });
    }
  },
  async get(id: string): Promise<TreeInterventionDetail> {
    if (stryMutAct_9fa48("16549")) {
      {}
    } else {
      stryCov_9fa48("16549");
      return parseIntervention(await request(stryMutAct_9fa48("16550") ? `` : (stryCov_9fa48("16550"), `/api/tree-interventions/${encodeURIComponent(id)}`)), stryMutAct_9fa48("16551") ? "" : (stryCov_9fa48("16551"), "No se pudo obtener información válida del detalle de la intervención. Reintente en unos segundos."));
    }
  },
  async create(input: TreeInterventionCreateInput): Promise<TreeInterventionDetail> {
    if (stryMutAct_9fa48("16552")) {
      {}
    } else {
      stryCov_9fa48("16552");
      const parsedInput = treeInterventionCreateInputSchema.safeParse(input);
      if (stryMutAct_9fa48("16555") ? false : stryMutAct_9fa48("16554") ? true : stryMutAct_9fa48("16553") ? parsedInput.success : (stryCov_9fa48("16553", "16554", "16555"), !parsedInput.success)) throw new TreeInterventionContractError(stryMutAct_9fa48("16557") ? "" : (stryCov_9fa48("16557"), "Los datos de la intervención son inválidos."), stryMutAct_9fa48("16558") ? {} : (stryCov_9fa48("16558"), {
        cause: parsedInput.error
      }));
      return parseIntervention(await request(stryMutAct_9fa48("16559") ? "" : (stryCov_9fa48("16559"), "/api/tree-interventions"), stryMutAct_9fa48("16560") ? {} : (stryCov_9fa48("16560"), {
        method: stryMutAct_9fa48("16561") ? "" : (stryCov_9fa48("16561"), "POST"),
        headers: stryMutAct_9fa48("16562") ? {} : (stryCov_9fa48("16562"), {
          "content-type": stryMutAct_9fa48("16563") ? "" : (stryCov_9fa48("16563"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      })), stryMutAct_9fa48("16564") ? "" : (stryCov_9fa48("16564"), "No se pudo obtener información válida de la creación de la intervención. Reintente en unos segundos."));
    }
  },
  async submitForAuthorization(id: string): Promise<TreeInterventionDetail> {
    if (stryMutAct_9fa48("16565")) {
      {}
    } else {
      stryCov_9fa48("16565");
      return parseIntervention(await request(stryMutAct_9fa48("16566") ? `` : (stryCov_9fa48("16566"), `/api/tree-interventions/${encodeURIComponent(id)}/submit-for-authorization`), stryMutAct_9fa48("16567") ? {} : (stryCov_9fa48("16567"), {
        method: stryMutAct_9fa48("16568") ? "" : (stryCov_9fa48("16568"), "POST")
      })), stryMutAct_9fa48("16569") ? "" : (stryCov_9fa48("16569"), "No se pudo obtener información válida del envío a autorización. Reintente en unos segundos."));
    }
  },
  /** Quién autoriza lo toma el backend del token; el cliente ya no manda `authorizedByUserId` (deprecado, se ignora). */
  async authorize(id: string): Promise<TreeInterventionDetail> {
    if (stryMutAct_9fa48("16570")) {
      {}
    } else {
      stryCov_9fa48("16570");
      return parseIntervention(await request(stryMutAct_9fa48("16571") ? `` : (stryCov_9fa48("16571"), `/api/tree-interventions/${encodeURIComponent(id)}/authorize`), stryMutAct_9fa48("16572") ? {} : (stryCov_9fa48("16572"), {
        method: stryMutAct_9fa48("16573") ? "" : (stryCov_9fa48("16573"), "POST")
      })), stryMutAct_9fa48("16574") ? "" : (stryCov_9fa48("16574"), "No se pudo obtener información válida de autorización. Reintente en unos segundos."));
    }
  },
  async reject(id: string): Promise<TreeInterventionDetail> {
    if (stryMutAct_9fa48("16575")) {
      {}
    } else {
      stryCov_9fa48("16575");
      return parseIntervention(await request(stryMutAct_9fa48("16576") ? `` : (stryCov_9fa48("16576"), `/api/tree-interventions/${encodeURIComponent(id)}/reject`), stryMutAct_9fa48("16577") ? {} : (stryCov_9fa48("16577"), {
        method: stryMutAct_9fa48("16578") ? "" : (stryCov_9fa48("16578"), "POST")
      })), stryMutAct_9fa48("16579") ? "" : (stryCov_9fa48("16579"), "No se pudo obtener información válida de rechazo. Reintente en unos segundos."));
    }
  },
  async assignService(id: string, input: TreeInterventionAssignServiceInput): Promise<TreeInterventionDetail> {
    if (stryMutAct_9fa48("16580")) {
      {}
    } else {
      stryCov_9fa48("16580");
      const parsedInput = treeInterventionAssignServiceInputSchema.safeParse(input);
      if (stryMutAct_9fa48("16583") ? false : stryMutAct_9fa48("16582") ? true : stryMutAct_9fa48("16581") ? parsedInput.success : (stryCov_9fa48("16581", "16582", "16583"), !parsedInput.success)) throw new TreeInterventionContractError(stryMutAct_9fa48("16585") ? "" : (stryCov_9fa48("16585"), "El servicio para la intervención es inválido."), stryMutAct_9fa48("16586") ? {} : (stryCov_9fa48("16586"), {
        cause: parsedInput.error
      }));
      return parseIntervention(await request(stryMutAct_9fa48("16587") ? `` : (stryCov_9fa48("16587"), `/api/tree-interventions/${encodeURIComponent(id)}/assign-service`), stryMutAct_9fa48("16588") ? {} : (stryCov_9fa48("16588"), {
        method: stryMutAct_9fa48("16589") ? "" : (stryCov_9fa48("16589"), "POST"),
        headers: stryMutAct_9fa48("16590") ? {} : (stryCov_9fa48("16590"), {
          "content-type": stryMutAct_9fa48("16591") ? "" : (stryCov_9fa48("16591"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      })), stryMutAct_9fa48("16592") ? "" : (stryCov_9fa48("16592"), "No se pudo obtener información válida de la asociación del servicio. Reintente en unos segundos."));
    }
  }
});