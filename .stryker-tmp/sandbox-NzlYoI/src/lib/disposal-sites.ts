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
export const disposalSiteTypeSchema = z.enum(stryMutAct_9fa48("8273") ? [] : (stryCov_9fa48("8273"), [stryMutAct_9fa48("8274") ? "" : (stryCov_9fa48("8274"), "LANDFILL"), stryMutAct_9fa48("8275") ? "" : (stryCov_9fa48("8275"), "TRANSFER_STATION"), stryMutAct_9fa48("8276") ? "" : (stryCov_9fa48("8276"), "RECYCLING_PLANT"), stryMutAct_9fa48("8277") ? "" : (stryCov_9fa48("8277"), "COMPOSTING_PLANT")]));
export type DisposalSiteType = z.infer<typeof disposalSiteTypeSchema>;
export const disposalSiteSchema = z.object(stryMutAct_9fa48("8278") ? {} : (stryCov_9fa48("8278"), {
  id: z.string(),
  code: z.string(),
  siteType: disposalSiteTypeSchema,
  name: z.string(),
  active: z.boolean()
}));
export type DisposalSite = z.infer<typeof disposalSiteSchema>;
export const disposalSiteCreateInputSchema = z.object(stryMutAct_9fa48("8279") ? {} : (stryCov_9fa48("8279"), {
  code: stryMutAct_9fa48("8281") ? z.string().min(1, "El código es obligatorio") : stryMutAct_9fa48("8280") ? z.string().trim().max(1, "El código es obligatorio") : (stryCov_9fa48("8280", "8281"), z.string().trim().min(1, stryMutAct_9fa48("8282") ? "" : (stryCov_9fa48("8282"), "El código es obligatorio"))),
  siteType: disposalSiteTypeSchema,
  name: stryMutAct_9fa48("8284") ? z.string().min(1, "El nombre es obligatorio") : stryMutAct_9fa48("8283") ? z.string().trim().max(1, "El nombre es obligatorio") : (stryCov_9fa48("8283", "8284"), z.string().trim().min(1, stryMutAct_9fa48("8285") ? "" : (stryCov_9fa48("8285"), "El nombre es obligatorio")))
}));
export type DisposalSiteCreateInput = z.infer<typeof disposalSiteCreateInputSchema>;
export const disposalSiteUpdateInputSchema = z.object(stryMutAct_9fa48("8286") ? {} : (stryCov_9fa48("8286"), {
  name: stryMutAct_9fa48("8288") ? z.string().min(1, "El nombre es obligatorio") : stryMutAct_9fa48("8287") ? z.string().trim().max(1, "El nombre es obligatorio") : (stryCov_9fa48("8287", "8288"), z.string().trim().min(1, stryMutAct_9fa48("8289") ? "" : (stryCov_9fa48("8289"), "El nombre es obligatorio"))),
  siteType: disposalSiteTypeSchema,
  active: z.boolean()
})).strict();
export type DisposalSiteUpdateInput = z.infer<typeof disposalSiteUpdateInputSchema>;
export type DisposalSiteQuery = {
  active?: boolean;
  siteType?: DisposalSiteType;
  search?: string;
  page?: number;
  pageSize?: number;
};
export type DisposalSitesPage = {
  disposalSites: DisposalSite[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export class DisposalSiteContractError extends Error {
  constructor(message: string, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("8290")) {
      {}
    } else {
      stryCov_9fa48("8290");
      super(message, options);
      this.name = stryMutAct_9fa48("8291") ? "" : (stryCov_9fa48("8291"), "DisposalSiteContractError");
    }
  }
}
export class DisposalSiteRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("8292")) {
      {}
    } else {
      stryCov_9fa48("8292");
      super(message, options);
      this.name = stryMutAct_9fa48("8293") ? "" : (stryCov_9fa48("8293"), "DisposalSiteRequestError");
      this.status = status;
    }
  }
}
const pageSchema = z.object(stryMutAct_9fa48("8294") ? {} : (stryCov_9fa48("8294"), {
  data: tolerantRecords(disposalSiteSchema, stryMutAct_9fa48("8295") ? "" : (stryCov_9fa48("8295"), "disposal-sites")),
  meta: z.object(stryMutAct_9fa48("8296") ? {} : (stryCov_9fa48("8296"), {
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number()
  }))
}));
const errorResponseSchema = z.object(stryMutAct_9fa48("8297") ? {} : (stryCov_9fa48("8297"), {
  statusCode: z.number(),
  message: z.union(stryMutAct_9fa48("8298") ? [] : (stryCov_9fa48("8298"), [z.string(), z.array(z.string())])),
  error: z.string(),
  timestamp: z.string(),
  path: z.string()
}));
function queryString(query: DisposalSiteQuery) {
  if (stryMutAct_9fa48("8299")) {
    {}
  } else {
    stryCov_9fa48("8299");
    const params = new URLSearchParams();
    if (stryMutAct_9fa48("8302") ? query.active === undefined : stryMutAct_9fa48("8301") ? false : stryMutAct_9fa48("8300") ? true : (stryCov_9fa48("8300", "8301", "8302"), query.active !== undefined)) params.set(stryMutAct_9fa48("8304") ? "" : (stryCov_9fa48("8304"), "active"), String(query.active));
    if (stryMutAct_9fa48("8306") ? false : stryMutAct_9fa48("8305") ? true : (stryCov_9fa48("8305", "8306"), query.siteType)) params.set(stryMutAct_9fa48("8308") ? "" : (stryCov_9fa48("8308"), "siteType"), query.siteType);
    if (stryMutAct_9fa48("8310") ? false : stryMutAct_9fa48("8309") ? true : (stryCov_9fa48("8309", "8310"), query.search)) params.set(stryMutAct_9fa48("8312") ? "" : (stryCov_9fa48("8312"), "search"), query.search);
    if (stryMutAct_9fa48("8315") ? query.page === undefined : stryMutAct_9fa48("8314") ? false : stryMutAct_9fa48("8313") ? true : (stryCov_9fa48("8313", "8314", "8315"), query.page !== undefined)) params.set(stryMutAct_9fa48("8317") ? "" : (stryCov_9fa48("8317"), "page"), String(query.page));
    if (stryMutAct_9fa48("8320") ? query.pageSize === undefined : stryMutAct_9fa48("8319") ? false : stryMutAct_9fa48("8318") ? true : (stryCov_9fa48("8318", "8319", "8320"), query.pageSize !== undefined)) params.set(stryMutAct_9fa48("8322") ? "" : (stryCov_9fa48("8322"), "pageSize"), String(query.pageSize));
    const value = params.toString();
    return value ? stryMutAct_9fa48("8323") ? `` : (stryCov_9fa48("8323"), `?${value}`) : stryMutAct_9fa48("8324") ? "Stryker was here!" : (stryCov_9fa48("8324"), "");
  }
}
async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  if (stryMutAct_9fa48("8325")) {
    {}
  } else {
    stryCov_9fa48("8325");
    let response: Response;
    try {
      if (stryMutAct_9fa48("8326")) {
        {}
      } else {
        stryCov_9fa48("8326");
        response = await authenticatedFetch(path, init);
      }
    } catch (cause) {
      if (stryMutAct_9fa48("8327")) {
        {}
      } else {
        stryCov_9fa48("8327");
        if (stryMutAct_9fa48("8329") ? false : stryMutAct_9fa48("8328") ? true : (stryCov_9fa48("8328", "8329"), cause instanceof NetworkFailureError)) throw cause;
        throw cause;
      }
    }
    let payload: unknown;
    try {
      if (stryMutAct_9fa48("8330")) {
        {}
      } else {
        stryCov_9fa48("8330");
        payload = await response.json();
      }
    } catch (cause) {
      if (stryMutAct_9fa48("8331")) {
        {}
      } else {
        stryCov_9fa48("8331");
        throw new DisposalSiteContractError(stryMutAct_9fa48("8333") ? "" : (stryCov_9fa48("8333"), "No se pudo obtener información válida de sitios de disposición. Reintente en unos segundos."), stryMutAct_9fa48("8334") ? {} : (stryCov_9fa48("8334"), {
          cause
        }));
      }
    }
    if (stryMutAct_9fa48("8337") ? false : stryMutAct_9fa48("8336") ? true : stryMutAct_9fa48("8335") ? response.ok : (stryCov_9fa48("8335", "8336", "8337"), !response.ok)) {
      if (stryMutAct_9fa48("8338")) {
        {}
      } else {
        stryCov_9fa48("8338");
        const parsed = errorResponseSchema.safeParse(payload);
        if (stryMutAct_9fa48("8341") ? false : stryMutAct_9fa48("8340") ? true : stryMutAct_9fa48("8339") ? parsed.success : (stryCov_9fa48("8339", "8340", "8341"), !parsed.success)) throw new DisposalSiteContractError(stryMutAct_9fa48("8343") ? "" : (stryCov_9fa48("8343"), "No se pudo obtener información válida. Reintente en unos segundos."), stryMutAct_9fa48("8344") ? {} : (stryCov_9fa48("8344"), {
          cause: parsed.error
        }));
        const message = Array.isArray(parsed.data.message) ? parsed.data.message.join(stryMutAct_9fa48("8345") ? "" : (stryCov_9fa48("8345"), " ")) : parsed.data.message;
        if (stryMutAct_9fa48("8346")) {
          ;
        } else {
          stryCov_9fa48("8346");
          throw new DisposalSiteRequestError(message, parsed.data.statusCode);
        }
      }
    }
    return payload;
  }
}
function parseResource(payload: unknown): DisposalSite {
  if (stryMutAct_9fa48("8347")) {
    {}
  } else {
    stryCov_9fa48("8347");
    const raw = (stryMutAct_9fa48("8350") ? payload && typeof payload === "object" && "data" in payload || !("id" in payload) : stryMutAct_9fa48("8349") ? false : stryMutAct_9fa48("8348") ? true : (stryCov_9fa48("8348", "8349", "8350"), (stryMutAct_9fa48("8352") ? payload && typeof payload === "object" || "data" in payload : stryMutAct_9fa48("8351") ? true : (stryCov_9fa48("8351", "8352"), (stryMutAct_9fa48("8354") ? payload || typeof payload === "object" : stryMutAct_9fa48("8353") ? true : (stryCov_9fa48("8353", "8354"), payload && (stryMutAct_9fa48("8356") ? typeof payload !== "object" : stryMutAct_9fa48("8355") ? true : (stryCov_9fa48("8355", "8356"), typeof payload === (stryMutAct_9fa48("8357") ? "" : (stryCov_9fa48("8357"), "object")))))) && (stryMutAct_9fa48("8358") ? "" : (stryCov_9fa48("8358"), "data")) in payload)) && (stryMutAct_9fa48("8359") ? "id" in payload : (stryCov_9fa48("8359"), !((stryMutAct_9fa48("8360") ? "" : (stryCov_9fa48("8360"), "id")) in payload))))) ? (payload as {
      data: unknown;
    }).data : payload;
    const parsed = disposalSiteSchema.safeParse(raw);
    if (stryMutAct_9fa48("8363") ? false : stryMutAct_9fa48("8362") ? true : stryMutAct_9fa48("8361") ? parsed.success : (stryCov_9fa48("8361", "8362", "8363"), !parsed.success)) throw new DisposalSiteContractError(stryMutAct_9fa48("8365") ? "" : (stryCov_9fa48("8365"), "No se pudo obtener información válida del sitio de disposición. Reintente en unos segundos."), stryMutAct_9fa48("8366") ? {} : (stryCov_9fa48("8366"), {
      cause: parsed.error
    }));
    return parsed.data;
  }
}
export const disposalSitesAdapter = stryMutAct_9fa48("8367") ? {} : (stryCov_9fa48("8367"), {
  async list(query: DisposalSiteQuery = {}): Promise<DisposalSitesPage> {
    if (stryMutAct_9fa48("8368")) {
      {}
    } else {
      stryCov_9fa48("8368");
      const parsed = pageSchema.safeParse(await requestJson(stryMutAct_9fa48("8369") ? `` : (stryCov_9fa48("8369"), `/api/disposal-sites${queryString(query)}`)));
      if (stryMutAct_9fa48("8372") ? false : stryMutAct_9fa48("8371") ? true : stryMutAct_9fa48("8370") ? parsed.success : (stryCov_9fa48("8370", "8371", "8372"), !parsed.success)) throw new DisposalSiteContractError(stryMutAct_9fa48("8374") ? "" : (stryCov_9fa48("8374"), "No se pudo obtener información válida de la lista de sitios de disposición. Reintente en unos segundos."), stryMutAct_9fa48("8375") ? {} : (stryCov_9fa48("8375"), {
        cause: parsed.error
      }));
      return stryMutAct_9fa48("8376") ? {} : (stryCov_9fa48("8376"), {
        disposalSites: parsed.data.data,
        page: parsed.data.meta.page,
        pageSize: parsed.data.meta.pageSize,
        total: parsed.data.meta.total,
        totalPages: parsed.data.meta.totalPages
      });
    }
  },
  async get(id: string) {
    if (stryMutAct_9fa48("8377")) {
      {}
    } else {
      stryCov_9fa48("8377");
      return parseResource(await requestJson(stryMutAct_9fa48("8378") ? `` : (stryCov_9fa48("8378"), `/api/disposal-sites/${id}`)));
    }
  },
  async create(input: DisposalSiteCreateInput) {
    if (stryMutAct_9fa48("8379")) {
      {}
    } else {
      stryCov_9fa48("8379");
      const parsed = disposalSiteCreateInputSchema.safeParse(input);
      if (stryMutAct_9fa48("8382") ? false : stryMutAct_9fa48("8381") ? true : stryMutAct_9fa48("8380") ? parsed.success : (stryCov_9fa48("8380", "8381", "8382"), !parsed.success)) throw new DisposalSiteContractError(stryMutAct_9fa48("8384") ? "" : (stryCov_9fa48("8384"), "Los datos del sitio de disposición son inválidos."), stryMutAct_9fa48("8385") ? {} : (stryCov_9fa48("8385"), {
        cause: parsed.error
      }));
      return parseResource(await requestJson(stryMutAct_9fa48("8386") ? "" : (stryCov_9fa48("8386"), "/api/disposal-sites"), stryMutAct_9fa48("8387") ? {} : (stryCov_9fa48("8387"), {
        method: stryMutAct_9fa48("8388") ? "" : (stryCov_9fa48("8388"), "POST"),
        headers: stryMutAct_9fa48("8389") ? {} : (stryCov_9fa48("8389"), {
          "content-type": stryMutAct_9fa48("8390") ? "" : (stryCov_9fa48("8390"), "application/json")
        }),
        body: JSON.stringify(parsed.data)
      })));
    }
  },
  async update(id: string, input: DisposalSiteUpdateInput) {
    if (stryMutAct_9fa48("8391")) {
      {}
    } else {
      stryCov_9fa48("8391");
      const parsed = disposalSiteUpdateInputSchema.safeParse(input);
      if (stryMutAct_9fa48("8394") ? false : stryMutAct_9fa48("8393") ? true : stryMutAct_9fa48("8392") ? parsed.success : (stryCov_9fa48("8392", "8393", "8394"), !parsed.success)) throw new DisposalSiteContractError(stryMutAct_9fa48("8396") ? "" : (stryCov_9fa48("8396"), "Los datos editables del sitio de disposición son inválidos."), stryMutAct_9fa48("8397") ? {} : (stryCov_9fa48("8397"), {
        cause: parsed.error
      }));
      return parseResource(await requestJson(stryMutAct_9fa48("8398") ? `` : (stryCov_9fa48("8398"), `/api/disposal-sites/${id}`), stryMutAct_9fa48("8399") ? {} : (stryCov_9fa48("8399"), {
        method: stryMutAct_9fa48("8400") ? "" : (stryCov_9fa48("8400"), "PATCH"),
        headers: stryMutAct_9fa48("8401") ? {} : (stryCov_9fa48("8401"), {
          "content-type": stryMutAct_9fa48("8402") ? "" : (stryCov_9fa48("8402"), "application/json")
        }),
        body: JSON.stringify(parsed.data)
      })));
    }
  },
  async remove(id: string) {
    if (stryMutAct_9fa48("8403")) {
      {}
    } else {
      stryCov_9fa48("8403");
      return parseResource(await requestJson(stryMutAct_9fa48("8404") ? `` : (stryCov_9fa48("8404"), `/api/disposal-sites/${id}`), stryMutAct_9fa48("8405") ? {} : (stryCov_9fa48("8405"), {
        method: stryMutAct_9fa48("8406") ? "" : (stryCov_9fa48("8406"), "DELETE")
      })));
    }
  }
});