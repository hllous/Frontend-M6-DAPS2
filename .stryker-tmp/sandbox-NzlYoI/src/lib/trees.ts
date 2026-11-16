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
import { notifyMapInventoryChanged } from "./map-inventory-events";
import { z } from "zod";
import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";
import { withResponseCoordinates } from "./response-coordinates";
import { riskLevelSchema, riskTypeSchema, treeHealthStatusSchema, treeInterventionTypeSchema } from "./tree-surveys";
import { MAX_TREE_DIAMETER_CM, MAX_TREE_HEIGHT_M, boundedDecimalInput, latitudeInput, longitudeInput } from "@/lib/input-limits";
import { tolerantRecords } from "./tolerant-records";
export const treeLastSurveySchema = z.object(stryMutAct_9fa48("16756") ? {} : (stryCov_9fa48("16756"), {
  surveyedAt: z.string(),
  healthStatus: treeHealthStatusSchema,
  riskLevel: riskLevelSchema,
  riskType: riskTypeSchema.nullable(),
  suggestedIntervention: treeInterventionTypeSchema.nullable()
}));
export const treeSchema = withResponseCoordinates(stryMutAct_9fa48("16757") ? {} : (stryCov_9fa48("16757"), {
  id: z.string(),
  surveyCode: z.string(),
  zoneId: z.string(),
  species: z.string().nullable(),
  address: z.string().nullable(),
  heightM: z.number().nullable(),
  diameterCm: z.number().nullable(),
  active: z.boolean(),
  lastSurvey: treeLastSurveySchema.nullable().default(null),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
}));
export type Tree = z.infer<typeof treeSchema>;

// El árbol seleccionado viaja en `tree` entre el catálogo y el mapa; `detail` abre la ficha.
export function treeCatalogHref(treeId: string): string {
  if (stryMutAct_9fa48("16758")) {
    {}
  } else {
    stryCov_9fa48("16758");
    const id = encodeURIComponent(treeId);
    return stryMutAct_9fa48("16759") ? `` : (stryCov_9fa48("16759"), `/app/catalog/trees?tree=${id}&detail=${id}`);
  }
}
export function treeMapHref(treeId: string): string {
  if (stryMutAct_9fa48("16760")) {
    {}
  } else {
    stryCov_9fa48("16760");
    return stryMutAct_9fa48("16761") ? `` : (stryCov_9fa48("16761"), `/app?destination=map&tree=${encodeURIComponent(treeId)}`);
  }
}
const heightInput = boundedDecimalInput(stryMutAct_9fa48("16762") ? "" : (stryCov_9fa48("16762"), "La altura"), MAX_TREE_HEIGHT_M, stryMutAct_9fa48("16763") ? {} : (stryCov_9fa48("16763"), {
  positive: stryMutAct_9fa48("16764") ? false : (stryCov_9fa48("16764"), true)
}));
const diameterInput = boundedDecimalInput(stryMutAct_9fa48("16765") ? "" : (stryCov_9fa48("16765"), "El diámetro"), MAX_TREE_DIAMETER_CM, stryMutAct_9fa48("16766") ? {} : (stryCov_9fa48("16766"), {
  positive: stryMutAct_9fa48("16767") ? false : (stryCov_9fa48("16767"), true)
}));
export const treeCreateInputSchema = z.object(stryMutAct_9fa48("16768") ? {} : (stryCov_9fa48("16768"), {
  surveyCode: stryMutAct_9fa48("16771") ? z.string().min(1, "El código de relevamiento es obligatorio.").max(30, "El código de relevamiento no puede superar los 30 caracteres.") : stryMutAct_9fa48("16770") ? z.string().trim().max(1, "El código de relevamiento es obligatorio.").max(30, "El código de relevamiento no puede superar los 30 caracteres.") : stryMutAct_9fa48("16769") ? z.string().trim().min(1, "El código de relevamiento es obligatorio.").min(30, "El código de relevamiento no puede superar los 30 caracteres.") : (stryCov_9fa48("16769", "16770", "16771"), z.string().trim().min(1, stryMutAct_9fa48("16772") ? "" : (stryCov_9fa48("16772"), "El código de relevamiento es obligatorio.")).max(30, stryMutAct_9fa48("16773") ? "" : (stryCov_9fa48("16773"), "El código de relevamiento no puede superar los 30 caracteres."))),
  zoneId: stryMutAct_9fa48("16775") ? z.string().min(1, "La zona operativa es obligatoria.") : stryMutAct_9fa48("16774") ? z.string().trim().max(1, "La zona operativa es obligatoria.") : (stryCov_9fa48("16774", "16775"), z.string().trim().min(1, stryMutAct_9fa48("16776") ? "" : (stryCov_9fa48("16776"), "La zona operativa es obligatoria."))),
  species: stryMutAct_9fa48("16779") ? z.string().min(1, "La especie es obligatoria.").max(120, "La especie no puede superar los 120 caracteres.") : stryMutAct_9fa48("16778") ? z.string().trim().max(1, "La especie es obligatoria.").max(120, "La especie no puede superar los 120 caracteres.") : stryMutAct_9fa48("16777") ? z.string().trim().min(1, "La especie es obligatoria.").min(120, "La especie no puede superar los 120 caracteres.") : (stryCov_9fa48("16777", "16778", "16779"), z.string().trim().min(1, stryMutAct_9fa48("16780") ? "" : (stryCov_9fa48("16780"), "La especie es obligatoria.")).max(120, stryMutAct_9fa48("16781") ? "" : (stryCov_9fa48("16781"), "La especie no puede superar los 120 caracteres."))),
  address: stryMutAct_9fa48("16783") ? z.string().max(200, "La dirección no puede superar los 200 caracteres.").optional() : stryMutAct_9fa48("16782") ? z.string().trim().min(200, "La dirección no puede superar los 200 caracteres.").optional() : (stryCov_9fa48("16782", "16783"), z.string().trim().max(200, stryMutAct_9fa48("16784") ? "" : (stryCov_9fa48("16784"), "La dirección no puede superar los 200 caracteres.")).optional()),
  lat: latitudeInput().optional(),
  lng: longitudeInput().optional(),
  heightM: heightInput,
  diameterCm: diameterInput,
  active: z.boolean().optional()
}));
export type TreeCreateInput = z.infer<typeof treeCreateInputSchema>;
export const treeUpdateInputSchema = z.object(stryMutAct_9fa48("16785") ? {} : (stryCov_9fa48("16785"), {
  zoneId: stryMutAct_9fa48("16787") ? z.string().min(1, "La zona operativa es obligatoria.").optional() : stryMutAct_9fa48("16786") ? z.string().trim().max(1, "La zona operativa es obligatoria.").optional() : (stryCov_9fa48("16786", "16787"), z.string().trim().min(1, stryMutAct_9fa48("16788") ? "" : (stryCov_9fa48("16788"), "La zona operativa es obligatoria.")).optional()),
  species: stryMutAct_9fa48("16791") ? z.string().min(1, "La especie es obligatoria.").max(120, "La especie no puede superar los 120 caracteres.").optional() : stryMutAct_9fa48("16790") ? z.string().trim().max(1, "La especie es obligatoria.").max(120, "La especie no puede superar los 120 caracteres.").optional() : stryMutAct_9fa48("16789") ? z.string().trim().min(1, "La especie es obligatoria.").min(120, "La especie no puede superar los 120 caracteres.").optional() : (stryCov_9fa48("16789", "16790", "16791"), z.string().trim().min(1, stryMutAct_9fa48("16792") ? "" : (stryCov_9fa48("16792"), "La especie es obligatoria.")).max(120, stryMutAct_9fa48("16793") ? "" : (stryCov_9fa48("16793"), "La especie no puede superar los 120 caracteres.")).optional()),
  address: stryMutAct_9fa48("16795") ? z.string().max(200, "La dirección no puede superar los 200 caracteres.").optional() : stryMutAct_9fa48("16794") ? z.string().trim().min(200, "La dirección no puede superar los 200 caracteres.").optional() : (stryCov_9fa48("16794", "16795"), z.string().trim().max(200, stryMutAct_9fa48("16796") ? "" : (stryCov_9fa48("16796"), "La dirección no puede superar los 200 caracteres.")).optional()),
  lat: latitudeInput().optional(),
  lng: longitudeInput().optional(),
  heightM: heightInput.optional(),
  diameterCm: diameterInput.optional(),
  active: z.boolean().optional()
})).strict();
export type TreeUpdateInput = z.infer<typeof treeUpdateInputSchema>;
export type TreeQuery = {
  active?: boolean;
  zoneId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};
export type TreesPage = {
  trees: Tree[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export class TreeContractError extends Error {
  constructor(message: string, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("16797")) {
      {}
    } else {
      stryCov_9fa48("16797");
      super(message, options);
      this.name = stryMutAct_9fa48("16798") ? "" : (stryCov_9fa48("16798"), "TreeContractError");
    }
  }
}
export class TreeRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("16799")) {
      {}
    } else {
      stryCov_9fa48("16799");
      super(message, options);
      this.name = stryMutAct_9fa48("16800") ? "" : (stryCov_9fa48("16800"), "TreeRequestError");
      this.status = status;
    }
  }
}
const pageSchema = z.object(stryMutAct_9fa48("16801") ? {} : (stryCov_9fa48("16801"), {
  data: tolerantRecords(treeSchema, stryMutAct_9fa48("16802") ? "" : (stryCov_9fa48("16802"), "trees")),
  meta: z.object(stryMutAct_9fa48("16803") ? {} : (stryCov_9fa48("16803"), {
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number()
  }))
}));
const errorResponseSchema = z.object(stryMutAct_9fa48("16804") ? {} : (stryCov_9fa48("16804"), {
  statusCode: z.number(),
  message: z.union(stryMutAct_9fa48("16805") ? [] : (stryCov_9fa48("16805"), [z.string(), z.array(z.string())])),
  error: z.string(),
  timestamp: z.string(),
  path: z.string()
}));
function queryString(query: TreeQuery): string {
  if (stryMutAct_9fa48("16806")) {
    {}
  } else {
    stryCov_9fa48("16806");
    const params = new URLSearchParams();
    if (stryMutAct_9fa48("16809") ? query.active === undefined : stryMutAct_9fa48("16808") ? false : stryMutAct_9fa48("16807") ? true : (stryCov_9fa48("16807", "16808", "16809"), query.active !== undefined)) params.set(stryMutAct_9fa48("16811") ? "" : (stryCov_9fa48("16811"), "active"), String(query.active));
    if (stryMutAct_9fa48("16813") ? false : stryMutAct_9fa48("16812") ? true : (stryCov_9fa48("16812", "16813"), query.zoneId)) params.set(stryMutAct_9fa48("16815") ? "" : (stryCov_9fa48("16815"), "zoneId"), query.zoneId);
    if (stryMutAct_9fa48("16817") ? false : stryMutAct_9fa48("16816") ? true : (stryCov_9fa48("16816", "16817"), query.search)) params.set(stryMutAct_9fa48("16819") ? "" : (stryCov_9fa48("16819"), "search"), query.search);
    if (stryMutAct_9fa48("16822") ? query.page === undefined : stryMutAct_9fa48("16821") ? false : stryMutAct_9fa48("16820") ? true : (stryCov_9fa48("16820", "16821", "16822"), query.page !== undefined)) params.set(stryMutAct_9fa48("16824") ? "" : (stryCov_9fa48("16824"), "page"), String(query.page));
    if (stryMutAct_9fa48("16827") ? query.pageSize === undefined : stryMutAct_9fa48("16826") ? false : stryMutAct_9fa48("16825") ? true : (stryCov_9fa48("16825", "16826", "16827"), query.pageSize !== undefined)) params.set(stryMutAct_9fa48("16829") ? "" : (stryCov_9fa48("16829"), "pageSize"), String(query.pageSize));
    const value = params.toString();
    return value ? stryMutAct_9fa48("16830") ? `` : (stryCov_9fa48("16830"), `?${value}`) : stryMutAct_9fa48("16831") ? "Stryker was here!" : (stryCov_9fa48("16831"), "");
  }
}
async function readJson(response: Response): Promise<unknown> {
  if (stryMutAct_9fa48("16832")) {
    {}
  } else {
    stryCov_9fa48("16832");
    try {
      if (stryMutAct_9fa48("16833")) {
        {}
      } else {
        stryCov_9fa48("16833");
        return await response.json();
      }
    } catch (cause) {
      if (stryMutAct_9fa48("16834")) {
        {}
      } else {
        stryCov_9fa48("16834");
        recordTelemetryEvent(stryMutAct_9fa48("16836") ? {} : (stryCov_9fa48("16836"), {
          name: stryMutAct_9fa48("16837") ? "" : (stryCov_9fa48("16837"), "request_malformed_response"),
          resource: stryMutAct_9fa48("16838") ? "" : (stryCov_9fa48("16838"), "trees")
        }));
        throw new TreeContractError(stryMutAct_9fa48("16840") ? "" : (stryCov_9fa48("16840"), "No se pudo obtener información válida de árboles. Reintente en unos segundos."), stryMutAct_9fa48("16841") ? {} : (stryCov_9fa48("16841"), {
          cause
        }));
      }
    }
  }
}
async function request(path: string, init?: RequestInit): Promise<{
  payload: unknown;
}> {
  if (stryMutAct_9fa48("16842")) {
    {}
  } else {
    stryCov_9fa48("16842");
    let response: Response;
    try {
      if (stryMutAct_9fa48("16843")) {
        {}
      } else {
        stryCov_9fa48("16843");
        response = await authenticatedFetch(path, init);
      }
    } catch (cause) {
      if (stryMutAct_9fa48("16844")) {
        {}
      } else {
        stryCov_9fa48("16844");
        if (stryMutAct_9fa48("16846") ? false : stryMutAct_9fa48("16845") ? true : (stryCov_9fa48("16845", "16846"), cause instanceof NetworkFailureError)) {
          if (stryMutAct_9fa48("16847")) {
            {}
          } else {
            stryCov_9fa48("16847");
            recordTelemetryEvent(stryMutAct_9fa48("16849") ? {} : (stryCov_9fa48("16849"), {
              name: stryMutAct_9fa48("16850") ? "" : (stryCov_9fa48("16850"), "request_network_failure"),
              resource: stryMutAct_9fa48("16851") ? "" : (stryCov_9fa48("16851"), "trees")
            }));
          }
        }
        throw cause;
      }
    }
    if (stryMutAct_9fa48("16854") ? response.status !== 204 : stryMutAct_9fa48("16853") ? false : stryMutAct_9fa48("16852") ? true : (stryCov_9fa48("16852", "16853", "16854"), response.status === 204)) return stryMutAct_9fa48("16855") ? {} : (stryCov_9fa48("16855"), {
      payload: undefined
    });
    const payload = await readJson(response);
    if (stryMutAct_9fa48("16858") ? false : stryMutAct_9fa48("16857") ? true : stryMutAct_9fa48("16856") ? response.ok : (stryCov_9fa48("16856", "16857", "16858"), !response.ok)) {
      if (stryMutAct_9fa48("16859")) {
        {}
      } else {
        stryCov_9fa48("16859");
        const parsed = errorResponseSchema.safeParse(payload);
        if (stryMutAct_9fa48("16862") ? false : stryMutAct_9fa48("16861") ? true : stryMutAct_9fa48("16860") ? parsed.success : (stryCov_9fa48("16860", "16861", "16862"), !parsed.success)) {
          if (stryMutAct_9fa48("16863")) {
            {}
          } else {
            stryCov_9fa48("16863");
            throw new TreeContractError(stryMutAct_9fa48("16865") ? "" : (stryCov_9fa48("16865"), "No se pudo obtener información válida de árboles. Reintente en unos segundos."), stryMutAct_9fa48("16866") ? {} : (stryCov_9fa48("16866"), {
              cause: parsed.error
            }));
          }
        }
        const message = Array.isArray(parsed.data.message) ? parsed.data.message.join(stryMutAct_9fa48("16867") ? "" : (stryCov_9fa48("16867"), " ")) : parsed.data.message;
        if (stryMutAct_9fa48("16868")) {
          ;
        } else {
          stryCov_9fa48("16868");
          throw new TreeRequestError(message, parsed.data.statusCode);
        }
      }
    }
    return stryMutAct_9fa48("16869") ? {} : (stryCov_9fa48("16869"), {
      payload
    });
  }
}
function parseResource(payload: unknown, message: string): Tree {
  if (stryMutAct_9fa48("16870")) {
    {}
  } else {
    stryCov_9fa48("16870");
    const parsed = treeSchema.safeParse(payload);
    if (stryMutAct_9fa48("16873") ? false : stryMutAct_9fa48("16872") ? true : stryMutAct_9fa48("16871") ? parsed.success : (stryCov_9fa48("16871", "16872", "16873"), !parsed.success)) {
      if (stryMutAct_9fa48("16874")) {
        {}
      } else {
        stryCov_9fa48("16874");
        recordTelemetryEvent(stryMutAct_9fa48("16876") ? {} : (stryCov_9fa48("16876"), {
          name: stryMutAct_9fa48("16877") ? "" : (stryCov_9fa48("16877"), "request_malformed_response"),
          resource: stryMutAct_9fa48("16878") ? "" : (stryCov_9fa48("16878"), "trees")
        }));
        throw new TreeContractError(message, stryMutAct_9fa48("16880") ? {} : (stryCov_9fa48("16880"), {
          cause: parsed.error
        }));
      }
    }
    return parsed.data;
  }
}
export const treesAdapter = stryMutAct_9fa48("16881") ? {} : (stryCov_9fa48("16881"), {
  async list(query: TreeQuery = {}): Promise<TreesPage> {
    if (stryMutAct_9fa48("16882")) {
      {}
    } else {
      stryCov_9fa48("16882");
      const {
        payload
      } = await request(stryMutAct_9fa48("16883") ? `` : (stryCov_9fa48("16883"), `/api/trees${queryString(query)}`));
      const parsed = pageSchema.safeParse(payload);
      if (stryMutAct_9fa48("16886") ? false : stryMutAct_9fa48("16885") ? true : stryMutAct_9fa48("16884") ? parsed.success : (stryCov_9fa48("16884", "16885", "16886"), !parsed.success)) throw new TreeContractError(stryMutAct_9fa48("16888") ? "" : (stryCov_9fa48("16888"), "No se pudo obtener información válida de la lista de árboles. Reintente en unos segundos."), stryMutAct_9fa48("16889") ? {} : (stryCov_9fa48("16889"), {
        cause: parsed.error
      }));
      return stryMutAct_9fa48("16890") ? {} : (stryCov_9fa48("16890"), {
        trees: parsed.data.data,
        page: parsed.data.meta.page,
        pageSize: parsed.data.meta.pageSize,
        total: parsed.data.meta.total,
        totalPages: parsed.data.meta.totalPages
      });
    }
  },
  async get(id: string): Promise<Tree> {
    if (stryMutAct_9fa48("16891")) {
      {}
    } else {
      stryCov_9fa48("16891");
      const {
        payload
      } = await request(stryMutAct_9fa48("16892") ? `` : (stryCov_9fa48("16892"), `/api/trees/${id}`));
      return parseResource(payload, stryMutAct_9fa48("16893") ? "" : (stryCov_9fa48("16893"), "No se pudo obtener información válida del detalle del árbol. Reintente en unos segundos."));
    }
  },
  async create(input: TreeCreateInput): Promise<Tree> {
    if (stryMutAct_9fa48("16894")) {
      {}
    } else {
      stryCov_9fa48("16894");
      const parsedInput = treeCreateInputSchema.safeParse(input);
      if (stryMutAct_9fa48("16897") ? false : stryMutAct_9fa48("16896") ? true : stryMutAct_9fa48("16895") ? parsedInput.success : (stryCov_9fa48("16895", "16896", "16897"), !parsedInput.success)) throw new TreeContractError(stryMutAct_9fa48("16899") ? "" : (stryCov_9fa48("16899"), "Los datos para registrar el árbol son inválidos."), stryMutAct_9fa48("16900") ? {} : (stryCov_9fa48("16900"), {
        cause: parsedInput.error
      }));
      const {
        payload
      } = await request(stryMutAct_9fa48("16901") ? "" : (stryCov_9fa48("16901"), "/api/trees"), stryMutAct_9fa48("16902") ? {} : (stryCov_9fa48("16902"), {
        method: stryMutAct_9fa48("16903") ? "" : (stryCov_9fa48("16903"), "POST"),
        headers: stryMutAct_9fa48("16904") ? {} : (stryCov_9fa48("16904"), {
          "content-type": stryMutAct_9fa48("16905") ? "" : (stryCov_9fa48("16905"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      }));
      const saved = parseResource(payload, stryMutAct_9fa48("16906") ? "" : (stryCov_9fa48("16906"), "No se pudo obtener información válida de la creación del árbol. Reintente en unos segundos."));
      if (stryMutAct_9fa48("16907")) {
        ;
      } else {
        stryCov_9fa48("16907");
        notifyMapInventoryChanged();
      }
      return saved;
    }
  },
  async update(id: string, input: TreeUpdateInput): Promise<Tree> {
    if (stryMutAct_9fa48("16908")) {
      {}
    } else {
      stryCov_9fa48("16908");
      const parsedInput = treeUpdateInputSchema.safeParse(input);
      if (stryMutAct_9fa48("16911") ? false : stryMutAct_9fa48("16910") ? true : stryMutAct_9fa48("16909") ? parsedInput.success : (stryCov_9fa48("16909", "16910", "16911"), !parsedInput.success)) throw new TreeContractError(stryMutAct_9fa48("16913") ? "" : (stryCov_9fa48("16913"), "Los datos editables del árbol son inválidos."), stryMutAct_9fa48("16914") ? {} : (stryCov_9fa48("16914"), {
        cause: parsedInput.error
      }));
      const {
        payload
      } = await request(stryMutAct_9fa48("16915") ? `` : (stryCov_9fa48("16915"), `/api/trees/${id}`), stryMutAct_9fa48("16916") ? {} : (stryCov_9fa48("16916"), {
        method: stryMutAct_9fa48("16917") ? "" : (stryCov_9fa48("16917"), "PATCH"),
        headers: stryMutAct_9fa48("16918") ? {} : (stryCov_9fa48("16918"), {
          "content-type": stryMutAct_9fa48("16919") ? "" : (stryCov_9fa48("16919"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      }));
      const saved = parseResource(payload, stryMutAct_9fa48("16920") ? "" : (stryCov_9fa48("16920"), "No se pudo obtener información válida de la actualización del árbol. Reintente en unos segundos."));
      if (stryMutAct_9fa48("16921")) {
        ;
      } else {
        stryCov_9fa48("16921");
        notifyMapInventoryChanged();
      }
      return saved;
    }
  },
  async remove(id: string): Promise<void> {
    if (stryMutAct_9fa48("16922")) {
      {}
    } else {
      stryCov_9fa48("16922");
      await request(stryMutAct_9fa48("16923") ? `` : (stryCov_9fa48("16923"), `/api/trees/${id}`), stryMutAct_9fa48("16924") ? {} : (stryCov_9fa48("16924"), {
        method: stryMutAct_9fa48("16925") ? "" : (stryCov_9fa48("16925"), "DELETE")
      }));
    }
  }
});