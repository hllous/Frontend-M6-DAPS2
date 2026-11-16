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
import { latitudeInput, longitudeInput } from "@/lib/input-limits";
import { tolerantRecords } from "./tolerant-records";
export const wasteTypeSchema = z.enum(stryMutAct_9fa48("9249") ? [] : (stryCov_9fa48("9249"), [stryMutAct_9fa48("9250") ? "" : (stryCov_9fa48("9250"), "HOUSEHOLD"), stryMutAct_9fa48("9251") ? "" : (stryCov_9fa48("9251"), "RECYCLABLE"), stryMutAct_9fa48("9252") ? "" : (stryCov_9fa48("9252"), "BULKY"), stryMutAct_9fa48("9253") ? "" : (stryCov_9fa48("9253"), "GREEN"), stryMutAct_9fa48("9254") ? "" : (stryCov_9fa48("9254"), "MIXED")]));
export type WasteType = z.infer<typeof wasteTypeSchema>;
export const WASTE_TYPE_LABELS: Record<WasteType, string> = stryMutAct_9fa48("9255") ? {} : (stryCov_9fa48("9255"), {
  HOUSEHOLD: stryMutAct_9fa48("9256") ? "" : (stryCov_9fa48("9256"), "Domiciliarios"),
  RECYCLABLE: stryMutAct_9fa48("9257") ? "" : (stryCov_9fa48("9257"), "Reciclables"),
  BULKY: stryMutAct_9fa48("9258") ? "" : (stryCov_9fa48("9258"), "Voluminosos"),
  GREEN: stryMutAct_9fa48("9259") ? "" : (stryCov_9fa48("9259"), "Verdes"),
  MIXED: stryMutAct_9fa48("9260") ? "" : (stryCov_9fa48("9260"), "Mixtos")
});
export const greenPointSchema = withResponseCoordinates(stryMutAct_9fa48("9261") ? {} : (stryCov_9fa48("9261"), {
  id: z.string(),
  code: z.string(),
  name: z.string(),
  zoneId: z.string(),
  wasteTypes: z.array(wasteTypeSchema),
  address: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional()
}));
export type GreenPoint = z.infer<typeof greenPointSchema>;
export const greenPointCreateInputSchema = z.object(stryMutAct_9fa48("9262") ? {} : (stryCov_9fa48("9262"), {
  code: stryMutAct_9fa48("9265") ? z.string().min(1, "El código es obligatorio.").max(20, "El código no puede superar los 20 caracteres.") : stryMutAct_9fa48("9264") ? z.string().trim().max(1, "El código es obligatorio.").max(20, "El código no puede superar los 20 caracteres.") : stryMutAct_9fa48("9263") ? z.string().trim().min(1, "El código es obligatorio.").min(20, "El código no puede superar los 20 caracteres.") : (stryCov_9fa48("9263", "9264", "9265"), z.string().trim().min(1, stryMutAct_9fa48("9266") ? "" : (stryCov_9fa48("9266"), "El código es obligatorio.")).max(20, stryMutAct_9fa48("9267") ? "" : (stryCov_9fa48("9267"), "El código no puede superar los 20 caracteres."))),
  name: stryMutAct_9fa48("9270") ? z.string().min(1, "El nombre es obligatorio.").max(100, "El nombre no puede superar los 100 caracteres.") : stryMutAct_9fa48("9269") ? z.string().trim().max(1, "El nombre es obligatorio.").max(100, "El nombre no puede superar los 100 caracteres.") : stryMutAct_9fa48("9268") ? z.string().trim().min(1, "El nombre es obligatorio.").min(100, "El nombre no puede superar los 100 caracteres.") : (stryCov_9fa48("9268", "9269", "9270"), z.string().trim().min(1, stryMutAct_9fa48("9271") ? "" : (stryCov_9fa48("9271"), "El nombre es obligatorio.")).max(100, stryMutAct_9fa48("9272") ? "" : (stryCov_9fa48("9272"), "El nombre no puede superar los 100 caracteres."))),
  zoneId: stryMutAct_9fa48("9274") ? z.string().min(1, "La zona operativa es obligatoria.") : stryMutAct_9fa48("9273") ? z.string().trim().max(1, "La zona operativa es obligatoria.") : (stryCov_9fa48("9273", "9274"), z.string().trim().min(1, stryMutAct_9fa48("9275") ? "" : (stryCov_9fa48("9275"), "La zona operativa es obligatoria."))),
  wasteTypes: stryMutAct_9fa48("9277") ? z.array(wasteTypeSchema).max(1, "Seleccione al menos un tipo de residuo.").max(5).refine(items => new Set(items).size === items.length, "No repita tipos de residuo.") : stryMutAct_9fa48("9276") ? z.array(wasteTypeSchema).min(1, "Seleccione al menos un tipo de residuo.").min(5).refine(items => new Set(items).size === items.length, "No repita tipos de residuo.") : (stryCov_9fa48("9276", "9277"), z.array(wasteTypeSchema).min(1, stryMutAct_9fa48("9278") ? "" : (stryCov_9fa48("9278"), "Seleccione al menos un tipo de residuo.")).max(5).refine(stryMutAct_9fa48("9279") ? () => undefined : (stryCov_9fa48("9279"), items => stryMutAct_9fa48("9282") ? new Set(items).size !== items.length : stryMutAct_9fa48("9281") ? false : stryMutAct_9fa48("9280") ? true : (stryCov_9fa48("9280", "9281", "9282"), new Set(items).size === items.length)), stryMutAct_9fa48("9283") ? "" : (stryCov_9fa48("9283"), "No repita tipos de residuo."))),
  address: stryMutAct_9fa48("9285") ? z.string().max(200, "La dirección no puede superar los 200 caracteres.").optional() : stryMutAct_9fa48("9284") ? z.string().trim().min(200, "La dirección no puede superar los 200 caracteres.").optional() : (stryCov_9fa48("9284", "9285"), z.string().trim().max(200, stryMutAct_9fa48("9286") ? "" : (stryCov_9fa48("9286"), "La dirección no puede superar los 200 caracteres.")).optional()),
  lat: latitudeInput().optional(),
  lng: longitudeInput().optional(),
  active: z.boolean().optional()
}));
export type GreenPointCreateInput = z.infer<typeof greenPointCreateInputSchema>;
export const greenPointUpdateInputSchema = z.object(stryMutAct_9fa48("9287") ? {} : (stryCov_9fa48("9287"), {
  name: stryMutAct_9fa48("9290") ? z.string().min(1, "El nombre es obligatorio.").max(100, "El nombre no puede superar los 100 caracteres.").optional() : stryMutAct_9fa48("9289") ? z.string().trim().max(1, "El nombre es obligatorio.").max(100, "El nombre no puede superar los 100 caracteres.").optional() : stryMutAct_9fa48("9288") ? z.string().trim().min(1, "El nombre es obligatorio.").min(100, "El nombre no puede superar los 100 caracteres.").optional() : (stryCov_9fa48("9288", "9289", "9290"), z.string().trim().min(1, stryMutAct_9fa48("9291") ? "" : (stryCov_9fa48("9291"), "El nombre es obligatorio.")).max(100, stryMutAct_9fa48("9292") ? "" : (stryCov_9fa48("9292"), "El nombre no puede superar los 100 caracteres.")).optional()),
  zoneId: stryMutAct_9fa48("9294") ? z.string().min(1, "La zona operativa es obligatoria.").optional() : stryMutAct_9fa48("9293") ? z.string().trim().max(1, "La zona operativa es obligatoria.").optional() : (stryCov_9fa48("9293", "9294"), z.string().trim().min(1, stryMutAct_9fa48("9295") ? "" : (stryCov_9fa48("9295"), "La zona operativa es obligatoria.")).optional()),
  wasteTypes: stryMutAct_9fa48("9297") ? z.array(wasteTypeSchema).max(1, "Seleccione al menos un tipo de residuo.").max(5).refine(items => new Set(items).size === items.length, "No repita tipos de residuo.").optional() : stryMutAct_9fa48("9296") ? z.array(wasteTypeSchema).min(1, "Seleccione al menos un tipo de residuo.").min(5).refine(items => new Set(items).size === items.length, "No repita tipos de residuo.").optional() : (stryCov_9fa48("9296", "9297"), z.array(wasteTypeSchema).min(1, stryMutAct_9fa48("9298") ? "" : (stryCov_9fa48("9298"), "Seleccione al menos un tipo de residuo.")).max(5).refine(stryMutAct_9fa48("9299") ? () => undefined : (stryCov_9fa48("9299"), items => stryMutAct_9fa48("9302") ? new Set(items).size !== items.length : stryMutAct_9fa48("9301") ? false : stryMutAct_9fa48("9300") ? true : (stryCov_9fa48("9300", "9301", "9302"), new Set(items).size === items.length)), stryMutAct_9fa48("9303") ? "" : (stryCov_9fa48("9303"), "No repita tipos de residuo.")).optional()),
  address: stryMutAct_9fa48("9305") ? z.string().max(200, "La dirección no puede superar los 200 caracteres.").optional() : stryMutAct_9fa48("9304") ? z.string().trim().min(200, "La dirección no puede superar los 200 caracteres.").optional() : (stryCov_9fa48("9304", "9305"), z.string().trim().max(200, stryMutAct_9fa48("9306") ? "" : (stryCov_9fa48("9306"), "La dirección no puede superar los 200 caracteres.")).optional()),
  lat: latitudeInput().optional(),
  lng: longitudeInput().optional(),
  active: z.boolean().optional()
})).strict();
export type GreenPointUpdateInput = z.infer<typeof greenPointUpdateInputSchema>;
export type GreenPointQuery = {
  active?: boolean;
  zoneId?: string;
  wasteType?: WasteType;
  search?: string;
  page?: number;
  pageSize?: number;
};
export type GreenPointsPage = {
  greenPoints: GreenPoint[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export class GreenPointContractError extends Error {
  constructor(message: string, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("9307")) {
      {}
    } else {
      stryCov_9fa48("9307");
      super(message, options);
      this.name = stryMutAct_9fa48("9308") ? "" : (stryCov_9fa48("9308"), "GreenPointContractError");
    }
  }
}
export class GreenPointRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("9309")) {
      {}
    } else {
      stryCov_9fa48("9309");
      super(message, options);
      this.name = stryMutAct_9fa48("9310") ? "" : (stryCov_9fa48("9310"), "GreenPointRequestError");
      this.status = status;
    }
  }
}
const pageSchema = z.object(stryMutAct_9fa48("9311") ? {} : (stryCov_9fa48("9311"), {
  data: tolerantRecords(greenPointSchema, stryMutAct_9fa48("9312") ? "" : (stryCov_9fa48("9312"), "green-points")),
  meta: z.object(stryMutAct_9fa48("9313") ? {} : (stryCov_9fa48("9313"), {
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number()
  }))
}));
const errorResponseSchema = z.object(stryMutAct_9fa48("9314") ? {} : (stryCov_9fa48("9314"), {
  statusCode: z.number(),
  message: z.union(stryMutAct_9fa48("9315") ? [] : (stryCov_9fa48("9315"), [z.string(), z.array(z.string())])),
  error: z.string(),
  timestamp: z.string(),
  path: z.string()
}));
function queryString(query: GreenPointQuery): string {
  if (stryMutAct_9fa48("9316")) {
    {}
  } else {
    stryCov_9fa48("9316");
    const params = new URLSearchParams();
    if (stryMutAct_9fa48("9319") ? query.active === undefined : stryMutAct_9fa48("9318") ? false : stryMutAct_9fa48("9317") ? true : (stryCov_9fa48("9317", "9318", "9319"), query.active !== undefined)) params.set(stryMutAct_9fa48("9321") ? "" : (stryCov_9fa48("9321"), "active"), String(query.active));
    if (stryMutAct_9fa48("9323") ? false : stryMutAct_9fa48("9322") ? true : (stryCov_9fa48("9322", "9323"), query.zoneId)) params.set(stryMutAct_9fa48("9325") ? "" : (stryCov_9fa48("9325"), "zoneId"), query.zoneId);
    if (stryMutAct_9fa48("9327") ? false : stryMutAct_9fa48("9326") ? true : (stryCov_9fa48("9326", "9327"), query.wasteType)) params.set(stryMutAct_9fa48("9329") ? "" : (stryCov_9fa48("9329"), "wasteType"), query.wasteType);
    if (stryMutAct_9fa48("9331") ? false : stryMutAct_9fa48("9330") ? true : (stryCov_9fa48("9330", "9331"), query.search)) params.set(stryMutAct_9fa48("9333") ? "" : (stryCov_9fa48("9333"), "search"), query.search);
    if (stryMutAct_9fa48("9336") ? query.page === undefined : stryMutAct_9fa48("9335") ? false : stryMutAct_9fa48("9334") ? true : (stryCov_9fa48("9334", "9335", "9336"), query.page !== undefined)) params.set(stryMutAct_9fa48("9338") ? "" : (stryCov_9fa48("9338"), "page"), String(query.page));
    if (stryMutAct_9fa48("9341") ? query.pageSize === undefined : stryMutAct_9fa48("9340") ? false : stryMutAct_9fa48("9339") ? true : (stryCov_9fa48("9339", "9340", "9341"), query.pageSize !== undefined)) params.set(stryMutAct_9fa48("9343") ? "" : (stryCov_9fa48("9343"), "pageSize"), String(query.pageSize));
    const value = params.toString();
    return value ? stryMutAct_9fa48("9344") ? `` : (stryCov_9fa48("9344"), `?${value}`) : stryMutAct_9fa48("9345") ? "Stryker was here!" : (stryCov_9fa48("9345"), "");
  }
}
async function readJson(response: Response): Promise<unknown> {
  if (stryMutAct_9fa48("9346")) {
    {}
  } else {
    stryCov_9fa48("9346");
    try {
      if (stryMutAct_9fa48("9347")) {
        {}
      } else {
        stryCov_9fa48("9347");
        return await response.json();
      }
    } catch (cause) {
      if (stryMutAct_9fa48("9348")) {
        {}
      } else {
        stryCov_9fa48("9348");
        recordTelemetryEvent(stryMutAct_9fa48("9350") ? {} : (stryCov_9fa48("9350"), {
          name: stryMutAct_9fa48("9351") ? "" : (stryCov_9fa48("9351"), "request_malformed_response"),
          resource: stryMutAct_9fa48("9352") ? "" : (stryCov_9fa48("9352"), "green-points")
        }));
        throw new GreenPointContractError(stryMutAct_9fa48("9354") ? "" : (stryCov_9fa48("9354"), "No se pudo obtener información válida de puntos verdes. Reintente en unos segundos."), stryMutAct_9fa48("9355") ? {} : (stryCov_9fa48("9355"), {
          cause
        }));
      }
    }
  }
}
async function request(path: string, init?: RequestInit): Promise<{
  response: Response;
  payload: unknown;
}> {
  if (stryMutAct_9fa48("9356")) {
    {}
  } else {
    stryCov_9fa48("9356");
    let response: Response;
    try {
      if (stryMutAct_9fa48("9357")) {
        {}
      } else {
        stryCov_9fa48("9357");
        response = await authenticatedFetch(path, init);
      }
    } catch (cause) {
      if (stryMutAct_9fa48("9358")) {
        {}
      } else {
        stryCov_9fa48("9358");
        if (stryMutAct_9fa48("9360") ? false : stryMutAct_9fa48("9359") ? true : (stryCov_9fa48("9359", "9360"), cause instanceof NetworkFailureError)) {
          if (stryMutAct_9fa48("9361")) {
            {}
          } else {
            stryCov_9fa48("9361");
            recordTelemetryEvent(stryMutAct_9fa48("9363") ? {} : (stryCov_9fa48("9363"), {
              name: stryMutAct_9fa48("9364") ? "" : (stryCov_9fa48("9364"), "request_network_failure"),
              resource: stryMutAct_9fa48("9365") ? "" : (stryCov_9fa48("9365"), "green-points")
            }));
          }
        }
        throw cause;
      }
    }
    if (stryMutAct_9fa48("9368") ? response.status !== 204 : stryMutAct_9fa48("9367") ? false : stryMutAct_9fa48("9366") ? true : (stryCov_9fa48("9366", "9367", "9368"), response.status === 204)) return stryMutAct_9fa48("9369") ? {} : (stryCov_9fa48("9369"), {
      response,
      payload: undefined
    });
    const payload = await readJson(response);
    if (stryMutAct_9fa48("9372") ? false : stryMutAct_9fa48("9371") ? true : stryMutAct_9fa48("9370") ? response.ok : (stryCov_9fa48("9370", "9371", "9372"), !response.ok)) {
      if (stryMutAct_9fa48("9373")) {
        {}
      } else {
        stryCov_9fa48("9373");
        const parsed = errorResponseSchema.safeParse(payload);
        if (stryMutAct_9fa48("9376") ? false : stryMutAct_9fa48("9375") ? true : stryMutAct_9fa48("9374") ? parsed.success : (stryCov_9fa48("9374", "9375", "9376"), !parsed.success)) {
          if (stryMutAct_9fa48("9377")) {
            {}
          } else {
            stryCov_9fa48("9377");
            throw new GreenPointContractError(stryMutAct_9fa48("9379") ? "" : (stryCov_9fa48("9379"), "No se pudo obtener información válida de puntos verdes. Reintente en unos segundos."), stryMutAct_9fa48("9380") ? {} : (stryCov_9fa48("9380"), {
              cause: parsed.error
            }));
          }
        }
        const message = Array.isArray(parsed.data.message) ? parsed.data.message.join(stryMutAct_9fa48("9381") ? "" : (stryCov_9fa48("9381"), " ")) : parsed.data.message;
        if (stryMutAct_9fa48("9382")) {
          ;
        } else {
          stryCov_9fa48("9382");
          throw new GreenPointRequestError(message, parsed.data.statusCode);
        }
      }
    }
    return stryMutAct_9fa48("9383") ? {} : (stryCov_9fa48("9383"), {
      response,
      payload
    });
  }
}
function parseResource(payload: unknown, message: string): GreenPoint {
  if (stryMutAct_9fa48("9384")) {
    {}
  } else {
    stryCov_9fa48("9384");
    const parsed = greenPointSchema.safeParse(payload);
    if (stryMutAct_9fa48("9387") ? false : stryMutAct_9fa48("9386") ? true : stryMutAct_9fa48("9385") ? parsed.success : (stryCov_9fa48("9385", "9386", "9387"), !parsed.success)) {
      if (stryMutAct_9fa48("9388")) {
        {}
      } else {
        stryCov_9fa48("9388");
        recordTelemetryEvent(stryMutAct_9fa48("9390") ? {} : (stryCov_9fa48("9390"), {
          name: stryMutAct_9fa48("9391") ? "" : (stryCov_9fa48("9391"), "request_malformed_response"),
          resource: stryMutAct_9fa48("9392") ? "" : (stryCov_9fa48("9392"), "green-points")
        }));
        throw new GreenPointContractError(message, stryMutAct_9fa48("9394") ? {} : (stryCov_9fa48("9394"), {
          cause: parsed.error
        }));
      }
    }
    return parsed.data;
  }
}
export const greenPointsAdapter = stryMutAct_9fa48("9395") ? {} : (stryCov_9fa48("9395"), {
  async list(query: GreenPointQuery = {}): Promise<GreenPointsPage> {
    if (stryMutAct_9fa48("9396")) {
      {}
    } else {
      stryCov_9fa48("9396");
      const {
        payload
      } = await request(stryMutAct_9fa48("9397") ? `` : (stryCov_9fa48("9397"), `/api/green-points${queryString(query)}`));
      const parsed = pageSchema.safeParse(payload);
      if (stryMutAct_9fa48("9400") ? false : stryMutAct_9fa48("9399") ? true : stryMutAct_9fa48("9398") ? parsed.success : (stryCov_9fa48("9398", "9399", "9400"), !parsed.success)) throw new GreenPointContractError(stryMutAct_9fa48("9402") ? "" : (stryCov_9fa48("9402"), "No se pudo obtener información válida de la lista de puntos verdes. Reintente en unos segundos."), stryMutAct_9fa48("9403") ? {} : (stryCov_9fa48("9403"), {
        cause: parsed.error
      }));
      return stryMutAct_9fa48("9404") ? {} : (stryCov_9fa48("9404"), {
        greenPoints: parsed.data.data,
        page: parsed.data.meta.page,
        pageSize: parsed.data.meta.pageSize,
        total: parsed.data.meta.total,
        totalPages: parsed.data.meta.totalPages
      });
    }
  },
  async get(id: string): Promise<GreenPoint> {
    if (stryMutAct_9fa48("9405")) {
      {}
    } else {
      stryCov_9fa48("9405");
      const {
        payload
      } = await request(stryMutAct_9fa48("9406") ? `` : (stryCov_9fa48("9406"), `/api/green-points/${id}`));
      return parseResource(payload, stryMutAct_9fa48("9407") ? "" : (stryCov_9fa48("9407"), "No se pudo obtener información válida del detalle del punto verde. Reintente en unos segundos."));
    }
  },
  async create(input: GreenPointCreateInput): Promise<GreenPoint> {
    if (stryMutAct_9fa48("9408")) {
      {}
    } else {
      stryCov_9fa48("9408");
      const parsedInput = greenPointCreateInputSchema.safeParse(input);
      if (stryMutAct_9fa48("9411") ? false : stryMutAct_9fa48("9410") ? true : stryMutAct_9fa48("9409") ? parsedInput.success : (stryCov_9fa48("9409", "9410", "9411"), !parsedInput.success)) throw new GreenPointContractError(stryMutAct_9fa48("9413") ? "" : (stryCov_9fa48("9413"), "Los datos para registrar el punto verde son inválidos."), stryMutAct_9fa48("9414") ? {} : (stryCov_9fa48("9414"), {
        cause: parsedInput.error
      }));
      const {
        payload
      } = await request(stryMutAct_9fa48("9415") ? "" : (stryCov_9fa48("9415"), "/api/green-points"), stryMutAct_9fa48("9416") ? {} : (stryCov_9fa48("9416"), {
        method: stryMutAct_9fa48("9417") ? "" : (stryCov_9fa48("9417"), "POST"),
        headers: stryMutAct_9fa48("9418") ? {} : (stryCov_9fa48("9418"), {
          "content-type": stryMutAct_9fa48("9419") ? "" : (stryCov_9fa48("9419"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      }));
      const saved = parseResource(payload, stryMutAct_9fa48("9420") ? "" : (stryCov_9fa48("9420"), "No se pudo obtener información válida de la creación del punto verde. Reintente en unos segundos."));
      if (stryMutAct_9fa48("9421")) {
        ;
      } else {
        stryCov_9fa48("9421");
        notifyMapInventoryChanged();
      }
      return saved;
    }
  },
  async update(id: string, input: GreenPointUpdateInput): Promise<GreenPoint> {
    if (stryMutAct_9fa48("9422")) {
      {}
    } else {
      stryCov_9fa48("9422");
      const parsedInput = greenPointUpdateInputSchema.safeParse(input);
      if (stryMutAct_9fa48("9425") ? false : stryMutAct_9fa48("9424") ? true : stryMutAct_9fa48("9423") ? parsedInput.success : (stryCov_9fa48("9423", "9424", "9425"), !parsedInput.success)) throw new GreenPointContractError(stryMutAct_9fa48("9427") ? "" : (stryCov_9fa48("9427"), "Los datos editables del punto verde son inválidos."), stryMutAct_9fa48("9428") ? {} : (stryCov_9fa48("9428"), {
        cause: parsedInput.error
      }));
      const {
        payload
      } = await request(stryMutAct_9fa48("9429") ? `` : (stryCov_9fa48("9429"), `/api/green-points/${id}`), stryMutAct_9fa48("9430") ? {} : (stryCov_9fa48("9430"), {
        method: stryMutAct_9fa48("9431") ? "" : (stryCov_9fa48("9431"), "PATCH"),
        headers: stryMutAct_9fa48("9432") ? {} : (stryCov_9fa48("9432"), {
          "content-type": stryMutAct_9fa48("9433") ? "" : (stryCov_9fa48("9433"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      }));
      const saved = parseResource(payload, stryMutAct_9fa48("9434") ? "" : (stryCov_9fa48("9434"), "No se pudo obtener información válida de la actualización del punto verde. Reintente en unos segundos."));
      if (stryMutAct_9fa48("9435")) {
        ;
      } else {
        stryCov_9fa48("9435");
        notifyMapInventoryChanged();
      }
      return saved;
    }
  },
  async remove(id: string): Promise<void> {
    if (stryMutAct_9fa48("9436")) {
      {}
    } else {
      stryCov_9fa48("9436");
      await request(stryMutAct_9fa48("9437") ? `` : (stryCov_9fa48("9437"), `/api/green-points/${id}`), stryMutAct_9fa48("9438") ? {} : (stryCov_9fa48("9438"), {
        method: stryMutAct_9fa48("9439") ? "" : (stryCov_9fa48("9439"), "DELETE")
      }));
    }
  }
});