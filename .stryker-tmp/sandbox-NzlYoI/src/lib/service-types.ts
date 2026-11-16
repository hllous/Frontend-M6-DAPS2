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
import { tolerantRecords } from "./tolerant-records";
export const serviceTypeCategorySchema = z.enum(stryMutAct_9fa48("14074") ? [] : (stryCov_9fa48("14074"), [stryMutAct_9fa48("14075") ? "" : (stryCov_9fa48("14075"), "WASTE_COLLECTION"), stryMutAct_9fa48("14076") ? "" : (stryCov_9fa48("14076"), "STREET_CLEANING"), stryMutAct_9fa48("14077") ? "" : (stryCov_9fa48("14077"), "CONTAINERS"), stryMutAct_9fa48("14078") ? "" : (stryCov_9fa48("14078"), "TREES"), stryMutAct_9fa48("14079") ? "" : (stryCov_9fa48("14079"), "GREEN_SPACES"), stryMutAct_9fa48("14080") ? "" : (stryCov_9fa48("14080"), "ENVIRONMENTAL_CONTROL")]));
export type ServiceTypeCategory = z.infer<typeof serviceTypeCategorySchema>;
export const serviceTypeModeSchema = z.enum(stryMutAct_9fa48("14081") ? [] : (stryCov_9fa48("14081"), [stryMutAct_9fa48("14082") ? "" : (stryCov_9fa48("14082"), "ROUTE"), stryMutAct_9fa48("14083") ? "" : (stryCov_9fa48("14083"), "POINT")]));
export type ServiceTypeMode = z.infer<typeof serviceTypeModeSchema>;
export const serviceTypeSchema = z.object(stryMutAct_9fa48("14084") ? {} : (stryCov_9fa48("14084"), {
  id: z.string(),
  code: z.string(),
  name: z.string(),
  category: serviceTypeCategorySchema,
  mode: serviceTypeModeSchema,
  requiresVehicle: z.boolean(),
  active: z.boolean()
}));
export type ServiceType = z.infer<typeof serviceTypeSchema>;
export const serviceTypeCreateInputSchema = z.object(stryMutAct_9fa48("14085") ? {} : (stryCov_9fa48("14085"), {
  code: stryMutAct_9fa48("14087") ? z.string().min(1, "El código es obligatorio") : stryMutAct_9fa48("14086") ? z.string().trim().max(1, "El código es obligatorio") : (stryCov_9fa48("14086", "14087"), z.string().trim().min(1, stryMutAct_9fa48("14088") ? "" : (stryCov_9fa48("14088"), "El código es obligatorio"))),
  name: stryMutAct_9fa48("14090") ? z.string().min(1, "El nombre es obligatorio") : stryMutAct_9fa48("14089") ? z.string().trim().max(1, "El nombre es obligatorio") : (stryCov_9fa48("14089", "14090"), z.string().trim().min(1, stryMutAct_9fa48("14091") ? "" : (stryCov_9fa48("14091"), "El nombre es obligatorio"))),
  category: serviceTypeCategorySchema,
  mode: serviceTypeModeSchema,
  requiresVehicle: z.boolean()
}));
export type ServiceTypeCreateInput = z.infer<typeof serviceTypeCreateInputSchema>;
export const serviceTypeUpdateInputSchema = z.object(stryMutAct_9fa48("14092") ? {} : (stryCov_9fa48("14092"), {
  name: stryMutAct_9fa48("14094") ? z.string().min(1, "El nombre es obligatorio") : stryMutAct_9fa48("14093") ? z.string().trim().max(1, "El nombre es obligatorio") : (stryCov_9fa48("14093", "14094"), z.string().trim().min(1, stryMutAct_9fa48("14095") ? "" : (stryCov_9fa48("14095"), "El nombre es obligatorio"))),
  requiresVehicle: z.boolean(),
  active: z.boolean()
})).strict();
export type ServiceTypeUpdateInput = z.infer<typeof serviceTypeUpdateInputSchema>;
export type ServiceTypeQuery = {
  active?: boolean;
  category?: ServiceTypeCategory;
  mode?: ServiceTypeMode;
  search?: string;
  page?: number;
  pageSize?: number;
};
export type ServiceTypesPage = {
  serviceTypes: ServiceType[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export class ServiceTypeContractError extends Error {
  constructor(message: string, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("14096")) {
      {}
    } else {
      stryCov_9fa48("14096");
      super(message, options);
      this.name = stryMutAct_9fa48("14097") ? "" : (stryCov_9fa48("14097"), "ServiceTypeContractError");
    }
  }
}
export class ServiceTypeRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("14098")) {
      {}
    } else {
      stryCov_9fa48("14098");
      super(message, options);
      this.name = stryMutAct_9fa48("14099") ? "" : (stryCov_9fa48("14099"), "ServiceTypeRequestError");
      this.status = status;
    }
  }
}
const pageSchema = z.object(stryMutAct_9fa48("14100") ? {} : (stryCov_9fa48("14100"), {
  data: tolerantRecords(serviceTypeSchema, stryMutAct_9fa48("14101") ? "" : (stryCov_9fa48("14101"), "service-types")),
  meta: z.object(stryMutAct_9fa48("14102") ? {} : (stryCov_9fa48("14102"), {
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number()
  }))
}));
const errorResponseSchema = z.object(stryMutAct_9fa48("14103") ? {} : (stryCov_9fa48("14103"), {
  statusCode: z.number(),
  message: z.union(stryMutAct_9fa48("14104") ? [] : (stryCov_9fa48("14104"), [z.string(), z.array(z.string())])),
  error: z.string(),
  timestamp: z.string(),
  path: z.string()
}));
export class ServiceTypeNotFoundError extends Error {
  constructor(message: string) {
    if (stryMutAct_9fa48("14105")) {
      {}
    } else {
      stryCov_9fa48("14105");
      super(message);
      this.name = stryMutAct_9fa48("14106") ? "" : (stryCov_9fa48("14106"), "ServiceTypeNotFoundError");
    }
  }
}
export type ServiceTypeMatchRule = {
  category: ServiceTypeCategory;
  mode: ServiceTypeMode;
  /** Código habitual del tipo; desempata cuando hay más de un tipo activo en la categoría. */
  preferredCode?: string;
  /** Nombre del tipo para el mensaje de error ("poda de arbolado"). */
  label: string;
};

/**
 * Los ids de los tipos de servicio son UUID del backend y no se pueden fijar en el código:
 * se resuelve el tipo contra `GET /service-types` por categoría, modo y estado activo.
 * Si no hay ninguno, falla con un mensaje en español en vez de inventar un id.
 */
export async function resolveServiceType(rule: ServiceTypeMatchRule): Promise<ServiceType> {
  if (stryMutAct_9fa48("14107")) {
    {}
  } else {
    stryCov_9fa48("14107");
    const {
      serviceTypes
    } = await serviceTypesAdapter.list(stryMutAct_9fa48("14108") ? {} : (stryCov_9fa48("14108"), {
      active: stryMutAct_9fa48("14109") ? false : (stryCov_9fa48("14109"), true),
      category: rule.category,
      mode: rule.mode,
      pageSize: 100
    }));
    const candidates = stryMutAct_9fa48("14110") ? serviceTypes : (stryCov_9fa48("14110"), serviceTypes.filter(stryMutAct_9fa48("14111") ? () => undefined : (stryCov_9fa48("14111"), item => stryMutAct_9fa48("14114") ? item.active && item.category === rule.category || item.mode === rule.mode : stryMutAct_9fa48("14113") ? false : stryMutAct_9fa48("14112") ? true : (stryCov_9fa48("14112", "14113", "14114"), (stryMutAct_9fa48("14116") ? item.active || item.category === rule.category : stryMutAct_9fa48("14115") ? true : (stryCov_9fa48("14115", "14116"), item.active && (stryMutAct_9fa48("14118") ? item.category !== rule.category : stryMutAct_9fa48("14117") ? true : (stryCov_9fa48("14117", "14118"), item.category === rule.category)))) && (stryMutAct_9fa48("14120") ? item.mode !== rule.mode : stryMutAct_9fa48("14119") ? true : (stryCov_9fa48("14119", "14120"), item.mode === rule.mode))))));
    const match = stryMutAct_9fa48("14121") ? candidates.find(item => item.code === rule.preferredCode) && candidates[0] : (stryCov_9fa48("14121"), candidates.find(stryMutAct_9fa48("14122") ? () => undefined : (stryCov_9fa48("14122"), item => stryMutAct_9fa48("14125") ? item.code !== rule.preferredCode : stryMutAct_9fa48("14124") ? false : stryMutAct_9fa48("14123") ? true : (stryCov_9fa48("14123", "14124", "14125"), item.code === rule.preferredCode))) ?? candidates[0]);
    if (stryMutAct_9fa48("14128") ? false : stryMutAct_9fa48("14127") ? true : stryMutAct_9fa48("14126") ? match : (stryCov_9fa48("14126", "14127", "14128"), !match)) {
      if (stryMutAct_9fa48("14129")) {
        {}
      } else {
        stryCov_9fa48("14129");
        throw new ServiceTypeNotFoundError(stryMutAct_9fa48("14131") ? `` : (stryCov_9fa48("14131"), `No hay un tipo de servicio activo de ${rule.label} en la configuración. Cree o active uno en Catálogo > Tipos de servicio antes de continuar.`));
      }
    }
    return match;
  }
}
export const TREE_PRUNING_SERVICE_TYPE_RULE: ServiceTypeMatchRule = stryMutAct_9fa48("14132") ? {} : (stryCov_9fa48("14132"), {
  category: stryMutAct_9fa48("14133") ? "" : (stryCov_9fa48("14133"), "TREES"),
  mode: stryMutAct_9fa48("14134") ? "" : (stryCov_9fa48("14134"), "POINT"),
  preferredCode: stryMutAct_9fa48("14135") ? "" : (stryCov_9fa48("14135"), "ARB-POD"),
  label: stryMutAct_9fa48("14136") ? "" : (stryCov_9fa48("14136"), "poda de arbolado")
});
export const ENVIRONMENTAL_INSPECTION_SERVICE_TYPE_RULE: ServiceTypeMatchRule = stryMutAct_9fa48("14137") ? {} : (stryCov_9fa48("14137"), {
  category: stryMutAct_9fa48("14138") ? "" : (stryCov_9fa48("14138"), "ENVIRONMENTAL_CONTROL"),
  mode: stryMutAct_9fa48("14139") ? "" : (stryCov_9fa48("14139"), "POINT"),
  preferredCode: stryMutAct_9fa48("14140") ? "" : (stryCov_9fa48("14140"), "AMB-INSP"),
  label: stryMutAct_9fa48("14141") ? "" : (stryCov_9fa48("14141"), "inspección ambiental")
});
function queryString(query: ServiceTypeQuery): string {
  if (stryMutAct_9fa48("14142")) {
    {}
  } else {
    stryCov_9fa48("14142");
    const params = new URLSearchParams();
    if (stryMutAct_9fa48("14145") ? query.active === undefined : stryMutAct_9fa48("14144") ? false : stryMutAct_9fa48("14143") ? true : (stryCov_9fa48("14143", "14144", "14145"), query.active !== undefined)) params.set(stryMutAct_9fa48("14147") ? "" : (stryCov_9fa48("14147"), "active"), String(query.active));
    if (stryMutAct_9fa48("14149") ? false : stryMutAct_9fa48("14148") ? true : (stryCov_9fa48("14148", "14149"), query.category)) params.set(stryMutAct_9fa48("14151") ? "" : (stryCov_9fa48("14151"), "category"), query.category);
    if (stryMutAct_9fa48("14153") ? false : stryMutAct_9fa48("14152") ? true : (stryCov_9fa48("14152", "14153"), query.mode)) params.set(stryMutAct_9fa48("14155") ? "" : (stryCov_9fa48("14155"), "mode"), query.mode);
    if (stryMutAct_9fa48("14157") ? false : stryMutAct_9fa48("14156") ? true : (stryCov_9fa48("14156", "14157"), query.search)) params.set(stryMutAct_9fa48("14159") ? "" : (stryCov_9fa48("14159"), "search"), query.search);
    if (stryMutAct_9fa48("14162") ? query.page === undefined : stryMutAct_9fa48("14161") ? false : stryMutAct_9fa48("14160") ? true : (stryCov_9fa48("14160", "14161", "14162"), query.page !== undefined)) params.set(stryMutAct_9fa48("14164") ? "" : (stryCov_9fa48("14164"), "page"), String(query.page));
    if (stryMutAct_9fa48("14167") ? query.pageSize === undefined : stryMutAct_9fa48("14166") ? false : stryMutAct_9fa48("14165") ? true : (stryCov_9fa48("14165", "14166", "14167"), query.pageSize !== undefined)) params.set(stryMutAct_9fa48("14169") ? "" : (stryCov_9fa48("14169"), "pageSize"), String(query.pageSize));
    const value = params.toString();
    return value ? stryMutAct_9fa48("14170") ? `` : (stryCov_9fa48("14170"), `?${value}`) : stryMutAct_9fa48("14171") ? "Stryker was here!" : (stryCov_9fa48("14171"), "");
  }
}
async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  if (stryMutAct_9fa48("14172")) {
    {}
  } else {
    stryCov_9fa48("14172");
    let response: Response;
    try {
      if (stryMutAct_9fa48("14173")) {
        {}
      } else {
        stryCov_9fa48("14173");
        response = await authenticatedFetch(path, init);
      }
    } catch (cause) {
      if (stryMutAct_9fa48("14174")) {
        {}
      } else {
        stryCov_9fa48("14174");
        if (stryMutAct_9fa48("14176") ? false : stryMutAct_9fa48("14175") ? true : (stryCov_9fa48("14175", "14176"), cause instanceof NetworkFailureError)) throw cause;
        throw cause;
      }
    }
    let payload: unknown;
    try {
      if (stryMutAct_9fa48("14177")) {
        {}
      } else {
        stryCov_9fa48("14177");
        payload = await response.json();
      }
    } catch (cause) {
      if (stryMutAct_9fa48("14178")) {
        {}
      } else {
        stryCov_9fa48("14178");
        throw new ServiceTypeContractError(stryMutAct_9fa48("14180") ? "" : (stryCov_9fa48("14180"), "No se pudo obtener información válida de tipos de servicio. Reintente en unos segundos."), stryMutAct_9fa48("14181") ? {} : (stryCov_9fa48("14181"), {
          cause
        }));
      }
    }
    if (stryMutAct_9fa48("14184") ? false : stryMutAct_9fa48("14183") ? true : stryMutAct_9fa48("14182") ? response.ok : (stryCov_9fa48("14182", "14183", "14184"), !response.ok)) {
      if (stryMutAct_9fa48("14185")) {
        {}
      } else {
        stryCov_9fa48("14185");
        const parsedError = errorResponseSchema.safeParse(payload);
        if (stryMutAct_9fa48("14188") ? false : stryMutAct_9fa48("14187") ? true : stryMutAct_9fa48("14186") ? parsedError.success : (stryCov_9fa48("14186", "14187", "14188"), !parsedError.success)) throw new ServiceTypeContractError(stryMutAct_9fa48("14190") ? "" : (stryCov_9fa48("14190"), "No se pudo obtener información válida. Reintente en unos segundos."), stryMutAct_9fa48("14191") ? {} : (stryCov_9fa48("14191"), {
          cause: parsedError.error
        }));
        const message = Array.isArray(parsedError.data.message) ? parsedError.data.message.join(stryMutAct_9fa48("14192") ? "" : (stryCov_9fa48("14192"), " ")) : parsedError.data.message;
        if (stryMutAct_9fa48("14193")) {
          ;
        } else {
          stryCov_9fa48("14193");
          throw new ServiceTypeRequestError(message, parsedError.data.statusCode);
        }
      }
    }
    return payload;
  }
}
function parseResource(payload: unknown): ServiceType {
  if (stryMutAct_9fa48("14194")) {
    {}
  } else {
    stryCov_9fa48("14194");
    const raw = (stryMutAct_9fa48("14197") ? payload && typeof payload === "object" && "data" in payload || !("id" in payload) : stryMutAct_9fa48("14196") ? false : stryMutAct_9fa48("14195") ? true : (stryCov_9fa48("14195", "14196", "14197"), (stryMutAct_9fa48("14199") ? payload && typeof payload === "object" || "data" in payload : stryMutAct_9fa48("14198") ? true : (stryCov_9fa48("14198", "14199"), (stryMutAct_9fa48("14201") ? payload || typeof payload === "object" : stryMutAct_9fa48("14200") ? true : (stryCov_9fa48("14200", "14201"), payload && (stryMutAct_9fa48("14203") ? typeof payload !== "object" : stryMutAct_9fa48("14202") ? true : (stryCov_9fa48("14202", "14203"), typeof payload === (stryMutAct_9fa48("14204") ? "" : (stryCov_9fa48("14204"), "object")))))) && (stryMutAct_9fa48("14205") ? "" : (stryCov_9fa48("14205"), "data")) in payload)) && (stryMutAct_9fa48("14206") ? "id" in payload : (stryCov_9fa48("14206"), !((stryMutAct_9fa48("14207") ? "" : (stryCov_9fa48("14207"), "id")) in payload))))) ? (payload as {
      data: unknown;
    }).data : payload;
    const parsed = serviceTypeSchema.safeParse(raw);
    if (stryMutAct_9fa48("14210") ? false : stryMutAct_9fa48("14209") ? true : stryMutAct_9fa48("14208") ? parsed.success : (stryCov_9fa48("14208", "14209", "14210"), !parsed.success)) throw new ServiceTypeContractError(stryMutAct_9fa48("14212") ? "" : (stryCov_9fa48("14212"), "No se pudo obtener información válida del tipo de servicio. Reintente en unos segundos."), stryMutAct_9fa48("14213") ? {} : (stryCov_9fa48("14213"), {
      cause: parsed.error
    }));
    return parsed.data;
  }
}
export const serviceTypesAdapter = stryMutAct_9fa48("14214") ? {} : (stryCov_9fa48("14214"), {
  async list(query: ServiceTypeQuery = {}): Promise<ServiceTypesPage> {
    if (stryMutAct_9fa48("14215")) {
      {}
    } else {
      stryCov_9fa48("14215");
      const payload = await requestJson(stryMutAct_9fa48("14216") ? `` : (stryCov_9fa48("14216"), `/api/service-types${queryString(query)}`));
      const parsed = pageSchema.safeParse(payload);
      if (stryMutAct_9fa48("14219") ? false : stryMutAct_9fa48("14218") ? true : stryMutAct_9fa48("14217") ? parsed.success : (stryCov_9fa48("14217", "14218", "14219"), !parsed.success)) throw new ServiceTypeContractError(stryMutAct_9fa48("14221") ? "" : (stryCov_9fa48("14221"), "No se pudo obtener información válida de la lista de tipos de servicio. Reintente en unos segundos."), stryMutAct_9fa48("14222") ? {} : (stryCov_9fa48("14222"), {
        cause: parsed.error
      }));
      return stryMutAct_9fa48("14223") ? {} : (stryCov_9fa48("14223"), {
        serviceTypes: parsed.data.data,
        page: parsed.data.meta.page,
        pageSize: parsed.data.meta.pageSize,
        total: parsed.data.meta.total,
        totalPages: parsed.data.meta.totalPages
      });
    }
  },
  async get(id: string): Promise<ServiceType> {
    if (stryMutAct_9fa48("14224")) {
      {}
    } else {
      stryCov_9fa48("14224");
      return parseResource(await requestJson(stryMutAct_9fa48("14225") ? `` : (stryCov_9fa48("14225"), `/api/service-types/${id}`)));
    }
  },
  async create(input: ServiceTypeCreateInput): Promise<ServiceType> {
    if (stryMutAct_9fa48("14226")) {
      {}
    } else {
      stryCov_9fa48("14226");
      const parsedInput = serviceTypeCreateInputSchema.safeParse(input);
      if (stryMutAct_9fa48("14229") ? false : stryMutAct_9fa48("14228") ? true : stryMutAct_9fa48("14227") ? parsedInput.success : (stryCov_9fa48("14227", "14228", "14229"), !parsedInput.success)) throw new ServiceTypeContractError(stryMutAct_9fa48("14231") ? "" : (stryCov_9fa48("14231"), "Los datos del tipo de servicio son inválidos."), stryMutAct_9fa48("14232") ? {} : (stryCov_9fa48("14232"), {
        cause: parsedInput.error
      }));
      return parseResource(await requestJson(stryMutAct_9fa48("14233") ? "" : (stryCov_9fa48("14233"), "/api/service-types"), stryMutAct_9fa48("14234") ? {} : (stryCov_9fa48("14234"), {
        method: stryMutAct_9fa48("14235") ? "" : (stryCov_9fa48("14235"), "POST"),
        headers: stryMutAct_9fa48("14236") ? {} : (stryCov_9fa48("14236"), {
          "content-type": stryMutAct_9fa48("14237") ? "" : (stryCov_9fa48("14237"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      })));
    }
  },
  async update(id: string, input: ServiceTypeUpdateInput): Promise<ServiceType> {
    if (stryMutAct_9fa48("14238")) {
      {}
    } else {
      stryCov_9fa48("14238");
      const parsedInput = serviceTypeUpdateInputSchema.safeParse(input);
      if (stryMutAct_9fa48("14241") ? false : stryMutAct_9fa48("14240") ? true : stryMutAct_9fa48("14239") ? parsedInput.success : (stryCov_9fa48("14239", "14240", "14241"), !parsedInput.success)) throw new ServiceTypeContractError(stryMutAct_9fa48("14243") ? "" : (stryCov_9fa48("14243"), "Los datos editables del tipo de servicio son inválidos."), stryMutAct_9fa48("14244") ? {} : (stryCov_9fa48("14244"), {
        cause: parsedInput.error
      }));
      return parseResource(await requestJson(stryMutAct_9fa48("14245") ? `` : (stryCov_9fa48("14245"), `/api/service-types/${id}`), stryMutAct_9fa48("14246") ? {} : (stryCov_9fa48("14246"), {
        method: stryMutAct_9fa48("14247") ? "" : (stryCov_9fa48("14247"), "PATCH"),
        headers: stryMutAct_9fa48("14248") ? {} : (stryCov_9fa48("14248"), {
          "content-type": stryMutAct_9fa48("14249") ? "" : (stryCov_9fa48("14249"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      })));
    }
  },
  async remove(id: string): Promise<ServiceType> {
    if (stryMutAct_9fa48("14250")) {
      {}
    } else {
      stryCov_9fa48("14250");
      return parseResource(await requestJson(stryMutAct_9fa48("14251") ? `` : (stryCov_9fa48("14251"), `/api/service-types/${id}`), stryMutAct_9fa48("14252") ? {} : (stryCov_9fa48("14252"), {
        method: stryMutAct_9fa48("14253") ? "" : (stryCov_9fa48("14253"), "DELETE")
      })));
    }
  }
});