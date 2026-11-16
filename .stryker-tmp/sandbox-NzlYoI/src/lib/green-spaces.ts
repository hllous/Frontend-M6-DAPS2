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
import { MAX_DECIMAL_10_2, boundedDecimalInput, latitudeInput, longitudeInput } from "@/lib/input-limits";
import { tolerantRecords } from "./tolerant-records";
export const greenSpaceTypeSchema = z.enum(stryMutAct_9fa48("9440") ? [] : (stryCov_9fa48("9440"), [stryMutAct_9fa48("9441") ? "" : (stryCov_9fa48("9441"), "SQUARE"), stryMutAct_9fa48("9442") ? "" : (stryCov_9fa48("9442"), "PARK"), stryMutAct_9fa48("9443") ? "" : (stryCov_9fa48("9443"), "PLANTER"), stryMutAct_9fa48("9444") ? "" : (stryCov_9fa48("9444"), "MEDIAN"), stryMutAct_9fa48("9445") ? "" : (stryCov_9fa48("9445"), "PROMENADE")]));
export type GreenSpaceType = z.infer<typeof greenSpaceTypeSchema>;
export const greenSpaceSchema = withResponseCoordinates(stryMutAct_9fa48("9446") ? {} : (stryCov_9fa48("9446"), {
  id: z.string(),
  name: z.string(),
  spaceType: greenSpaceTypeSchema,
  areaM2: z.number().nullable(),
  zoneId: z.string(),
  active: z.boolean()
}));
export type GreenSpace = z.infer<typeof greenSpaceSchema>;
export type GreenSpaceQuery = {
  active?: boolean;
  spaceType?: GreenSpaceType;
  zoneId?: string;
  page?: number;
  pageSize?: number;
};
export type GreenSpacesPage = {
  greenSpaces: GreenSpace[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export const createGreenSpaceInputSchema = z.object(stryMutAct_9fa48("9447") ? {} : (stryCov_9fa48("9447"), {
  name: stryMutAct_9fa48("9449") ? z.string().min(1, "El nombre es obligatorio.") : stryMutAct_9fa48("9448") ? z.string().trim().max(1, "El nombre es obligatorio.") : (stryCov_9fa48("9448", "9449"), z.string().trim().min(1, stryMutAct_9fa48("9450") ? "" : (stryCov_9fa48("9450"), "El nombre es obligatorio."))),
  spaceType: greenSpaceTypeSchema,
  areaM2: boundedDecimalInput(stryMutAct_9fa48("9451") ? "" : (stryCov_9fa48("9451"), "La superficie"), MAX_DECIMAL_10_2, stryMutAct_9fa48("9452") ? {} : (stryCov_9fa48("9452"), {
    positive: stryMutAct_9fa48("9453") ? false : (stryCov_9fa48("9453"), true)
  })),
  zoneId: stryMutAct_9fa48("9455") ? z.string().min(1, "La zona es obligatoria.") : stryMutAct_9fa48("9454") ? z.string().trim().max(1, "La zona es obligatoria.") : (stryCov_9fa48("9454", "9455"), z.string().trim().min(1, stryMutAct_9fa48("9456") ? "" : (stryCov_9fa48("9456"), "La zona es obligatoria."))),
  lat: latitudeInput().optional(),
  lng: longitudeInput().optional()
}));
export type CreateGreenSpaceInput = z.infer<typeof createGreenSpaceInputSchema>;

// spaceType is immutable in the backend (UpdateGreenSpaceDto has no such field); zod strips it if a caller sends it.
export const updateGreenSpaceInputSchema = createGreenSpaceInputSchema.omit(stryMutAct_9fa48("9457") ? {} : (stryCov_9fa48("9457"), {
  spaceType: stryMutAct_9fa48("9458") ? false : (stryCov_9fa48("9458"), true)
})).partial().extend(stryMutAct_9fa48("9459") ? {} : (stryCov_9fa48("9459"), {
  active: z.boolean().optional()
}));
export type UpdateGreenSpaceInput = z.infer<typeof updateGreenSpaceInputSchema>;
export class GreenSpaceContractError extends Error {
  constructor(message: string, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("9460")) {
      {}
    } else {
      stryCov_9fa48("9460");
      super(message, options);
      this.name = stryMutAct_9fa48("9461") ? "" : (stryCov_9fa48("9461"), "GreenSpaceContractError");
    }
  }
}
export class GreenSpaceRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("9462")) {
      {}
    } else {
      stryCov_9fa48("9462");
      super(message, options);
      this.name = stryMutAct_9fa48("9463") ? "" : (stryCov_9fa48("9463"), "GreenSpaceRequestError");
      this.status = status;
    }
  }
}
const greenSpacesEnvelopeSchema = z.object(stryMutAct_9fa48("9464") ? {} : (stryCov_9fa48("9464"), {
  data: tolerantRecords(greenSpaceSchema, stryMutAct_9fa48("9465") ? "" : (stryCov_9fa48("9465"), "green-spaces")),
  meta: z.object(stryMutAct_9fa48("9466") ? {} : (stryCov_9fa48("9466"), {
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number()
  }))
}));
const errorResponseSchema = z.object(stryMutAct_9fa48("9467") ? {} : (stryCov_9fa48("9467"), {
  statusCode: z.number(),
  message: z.union(stryMutAct_9fa48("9468") ? [] : (stryCov_9fa48("9468"), [z.string(), z.array(z.string())])),
  error: z.string(),
  timestamp: z.string(),
  path: z.string()
}));
function buildQueryString(query: GreenSpaceQuery): string {
  if (stryMutAct_9fa48("9469")) {
    {}
  } else {
    stryCov_9fa48("9469");
    const params = new URLSearchParams();
    if (stryMutAct_9fa48("9472") ? query.active === undefined : stryMutAct_9fa48("9471") ? false : stryMutAct_9fa48("9470") ? true : (stryCov_9fa48("9470", "9471", "9472"), query.active !== undefined)) params.set(stryMutAct_9fa48("9474") ? "" : (stryCov_9fa48("9474"), "active"), String(query.active));
    if (stryMutAct_9fa48("9476") ? false : stryMutAct_9fa48("9475") ? true : (stryCov_9fa48("9475", "9476"), query.spaceType)) params.set(stryMutAct_9fa48("9478") ? "" : (stryCov_9fa48("9478"), "spaceType"), query.spaceType);
    if (stryMutAct_9fa48("9480") ? false : stryMutAct_9fa48("9479") ? true : (stryCov_9fa48("9479", "9480"), query.zoneId)) params.set(stryMutAct_9fa48("9482") ? "" : (stryCov_9fa48("9482"), "zoneId"), query.zoneId);
    if (stryMutAct_9fa48("9485") ? query.page === undefined : stryMutAct_9fa48("9484") ? false : stryMutAct_9fa48("9483") ? true : (stryCov_9fa48("9483", "9484", "9485"), query.page !== undefined)) params.set(stryMutAct_9fa48("9487") ? "" : (stryCov_9fa48("9487"), "page"), String(query.page));
    if (stryMutAct_9fa48("9490") ? query.pageSize === undefined : stryMutAct_9fa48("9489") ? false : stryMutAct_9fa48("9488") ? true : (stryCov_9fa48("9488", "9489", "9490"), query.pageSize !== undefined)) params.set(stryMutAct_9fa48("9492") ? "" : (stryCov_9fa48("9492"), "pageSize"), String(query.pageSize));
    const queryString = params.toString();
    return queryString ? stryMutAct_9fa48("9493") ? `` : (stryCov_9fa48("9493"), `?${queryString}`) : stryMutAct_9fa48("9494") ? "Stryker was here!" : (stryCov_9fa48("9494"), "");
  }
}
async function readJsonBody(response: Response): Promise<unknown> {
  if (stryMutAct_9fa48("9495")) {
    {}
  } else {
    stryCov_9fa48("9495");
    try {
      if (stryMutAct_9fa48("9496")) {
        {}
      } else {
        stryCov_9fa48("9496");
        return await response.json();
      }
    } catch (cause) {
      if (stryMutAct_9fa48("9497")) {
        {}
      } else {
        stryCov_9fa48("9497");
        recordTelemetryEvent(stryMutAct_9fa48("9499") ? {} : (stryCov_9fa48("9499"), {
          name: stryMutAct_9fa48("9500") ? "" : (stryCov_9fa48("9500"), "request_malformed_response"),
          resource: stryMutAct_9fa48("9501") ? "" : (stryCov_9fa48("9501"), "green-spaces")
        }));
        throw new GreenSpaceContractError(stryMutAct_9fa48("9503") ? "" : (stryCov_9fa48("9503"), "No se pudo obtener información válida de espacios verdes. Reintente en unos segundos."), stryMutAct_9fa48("9504") ? {} : (stryCov_9fa48("9504"), {
          cause
        }));
      }
    }
  }
}
function requestError(payload: unknown): GreenSpaceRequestError | GreenSpaceContractError {
  if (stryMutAct_9fa48("9505")) {
    {}
  } else {
    stryCov_9fa48("9505");
    const parsed = errorResponseSchema.safeParse(payload);
    if (stryMutAct_9fa48("9508") ? false : stryMutAct_9fa48("9507") ? true : stryMutAct_9fa48("9506") ? parsed.success : (stryCov_9fa48("9506", "9507", "9508"), !parsed.success)) {
      if (stryMutAct_9fa48("9509")) {
        {}
      } else {
        stryCov_9fa48("9509");
        recordTelemetryEvent(stryMutAct_9fa48("9511") ? {} : (stryCov_9fa48("9511"), {
          name: stryMutAct_9fa48("9512") ? "" : (stryCov_9fa48("9512"), "request_malformed_response"),
          resource: stryMutAct_9fa48("9513") ? "" : (stryCov_9fa48("9513"), "green-spaces")
        }));
        return new GreenSpaceContractError(stryMutAct_9fa48("9514") ? "" : (stryCov_9fa48("9514"), "No se pudo obtener información válida de espacios verdes. Reintente en unos segundos."), stryMutAct_9fa48("9515") ? {} : (stryCov_9fa48("9515"), {
          cause: parsed.error
        }));
      }
    }
    const message = Array.isArray(parsed.data.message) ? parsed.data.message.join(stryMutAct_9fa48("9516") ? "" : (stryCov_9fa48("9516"), " ")) : parsed.data.message;
    return new GreenSpaceRequestError(message, parsed.data.statusCode);
  }
}
async function send(input: string, init?: RequestInit): Promise<unknown> {
  if (stryMutAct_9fa48("9517")) {
    {}
  } else {
    stryCov_9fa48("9517");
    let response: Response;
    try {
      if (stryMutAct_9fa48("9518")) {
        {}
      } else {
        stryCov_9fa48("9518");
        response = await authenticatedFetch(input, init);
      }
    } catch (cause) {
      if (stryMutAct_9fa48("9519")) {
        {}
      } else {
        stryCov_9fa48("9519");
        if (stryMutAct_9fa48("9521") ? false : stryMutAct_9fa48("9520") ? true : (stryCov_9fa48("9520", "9521"), cause instanceof NetworkFailureError)) {
          if (stryMutAct_9fa48("9522")) {
            {}
          } else {
            stryCov_9fa48("9522");
            recordTelemetryEvent(stryMutAct_9fa48("9524") ? {} : (stryCov_9fa48("9524"), {
              name: stryMutAct_9fa48("9525") ? "" : (stryCov_9fa48("9525"), "request_network_failure"),
              resource: stryMutAct_9fa48("9526") ? "" : (stryCov_9fa48("9526"), "green-spaces")
            }));
          }
        }
        throw cause;
      }
    }
    const payload = await readJsonBody(response);
    if (stryMutAct_9fa48("9529") ? false : stryMutAct_9fa48("9528") ? true : stryMutAct_9fa48("9527") ? response.ok : (stryCov_9fa48("9527", "9528", "9529"), !response.ok)) throw requestError(payload);
    return payload;
  }
}
function parseGreenSpace(payload: unknown, message: string): GreenSpace {
  if (stryMutAct_9fa48("9530")) {
    {}
  } else {
    stryCov_9fa48("9530");
    const parsed = greenSpaceSchema.safeParse(payload);
    if (stryMutAct_9fa48("9533") ? false : stryMutAct_9fa48("9532") ? true : stryMutAct_9fa48("9531") ? parsed.success : (stryCov_9fa48("9531", "9532", "9533"), !parsed.success)) {
      if (stryMutAct_9fa48("9534")) {
        {}
      } else {
        stryCov_9fa48("9534");
        recordTelemetryEvent(stryMutAct_9fa48("9536") ? {} : (stryCov_9fa48("9536"), {
          name: stryMutAct_9fa48("9537") ? "" : (stryCov_9fa48("9537"), "request_malformed_response"),
          resource: stryMutAct_9fa48("9538") ? "" : (stryCov_9fa48("9538"), "green-spaces")
        }));
        throw new GreenSpaceContractError(message, stryMutAct_9fa48("9540") ? {} : (stryCov_9fa48("9540"), {
          cause: parsed.error
        }));
      }
    }
    return parsed.data;
  }
}
export const greenSpacesAdapter = stryMutAct_9fa48("9541") ? {} : (stryCov_9fa48("9541"), {
  async list(query: GreenSpaceQuery = {}): Promise<GreenSpacesPage> {
    if (stryMutAct_9fa48("9542")) {
      {}
    } else {
      stryCov_9fa48("9542");
      const payload = await send(stryMutAct_9fa48("9543") ? `` : (stryCov_9fa48("9543"), `/api/green-spaces${buildQueryString(query)}`));
      const parsed = greenSpacesEnvelopeSchema.safeParse(payload);
      if (stryMutAct_9fa48("9546") ? false : stryMutAct_9fa48("9545") ? true : stryMutAct_9fa48("9544") ? parsed.success : (stryCov_9fa48("9544", "9545", "9546"), !parsed.success)) {
        if (stryMutAct_9fa48("9547")) {
          {}
        } else {
          stryCov_9fa48("9547");
          recordTelemetryEvent(stryMutAct_9fa48("9549") ? {} : (stryCov_9fa48("9549"), {
            name: stryMutAct_9fa48("9550") ? "" : (stryCov_9fa48("9550"), "request_malformed_response"),
            resource: stryMutAct_9fa48("9551") ? "" : (stryCov_9fa48("9551"), "green-spaces")
          }));
          throw new GreenSpaceContractError(stryMutAct_9fa48("9553") ? "" : (stryCov_9fa48("9553"), "No se pudo obtener información válida de espacios verdes. Reintente en unos segundos."), stryMutAct_9fa48("9554") ? {} : (stryCov_9fa48("9554"), {
            cause: parsed.error
          }));
        }
      }
      return stryMutAct_9fa48("9555") ? {} : (stryCov_9fa48("9555"), {
        greenSpaces: parsed.data.data,
        page: parsed.data.meta.page,
        pageSize: parsed.data.meta.pageSize,
        total: parsed.data.meta.total,
        totalPages: parsed.data.meta.totalPages
      });
    }
  },
  async get(id: string): Promise<GreenSpace> {
    if (stryMutAct_9fa48("9556")) {
      {}
    } else {
      stryCov_9fa48("9556");
      return parseGreenSpace(await send(stryMutAct_9fa48("9557") ? `` : (stryCov_9fa48("9557"), `/api/green-spaces/${id}`)), stryMutAct_9fa48("9558") ? "" : (stryCov_9fa48("9558"), "No se pudo obtener información válida del detalle de espacio verde. Reintente en unos segundos."));
    }
  },
  async create(input: CreateGreenSpaceInput): Promise<GreenSpace> {
    if (stryMutAct_9fa48("9559")) {
      {}
    } else {
      stryCov_9fa48("9559");
      const parsedInput = createGreenSpaceInputSchema.safeParse(input);
      if (stryMutAct_9fa48("9562") ? false : stryMutAct_9fa48("9561") ? true : stryMutAct_9fa48("9560") ? parsedInput.success : (stryCov_9fa48("9560", "9561", "9562"), !parsedInput.success)) {
        if (stryMutAct_9fa48("9563")) {
          {}
        } else {
          stryCov_9fa48("9563");
          throw new GreenSpaceContractError(stryMutAct_9fa48("9565") ? "" : (stryCov_9fa48("9565"), "Los datos para registrar el espacio verde son inválidos."), stryMutAct_9fa48("9566") ? {} : (stryCov_9fa48("9566"), {
            cause: parsedInput.error
          }));
        }
      }
      const saved = parseGreenSpace(await send(stryMutAct_9fa48("9567") ? "" : (stryCov_9fa48("9567"), "/api/green-spaces"), stryMutAct_9fa48("9568") ? {} : (stryCov_9fa48("9568"), {
        method: stryMutAct_9fa48("9569") ? "" : (stryCov_9fa48("9569"), "POST"),
        headers: stryMutAct_9fa48("9570") ? {} : (stryCov_9fa48("9570"), {
          "content-type": stryMutAct_9fa48("9571") ? "" : (stryCov_9fa48("9571"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      })), stryMutAct_9fa48("9572") ? "" : (stryCov_9fa48("9572"), "No se pudo obtener información válida de la creación de espacio verde. Reintente en unos segundos."));
      if (stryMutAct_9fa48("9573")) {
        ;
      } else {
        stryCov_9fa48("9573");
        notifyMapInventoryChanged();
      }
      return saved;
    }
  },
  async update(id: string, input: UpdateGreenSpaceInput): Promise<GreenSpace> {
    if (stryMutAct_9fa48("9574")) {
      {}
    } else {
      stryCov_9fa48("9574");
      const parsedInput = updateGreenSpaceInputSchema.safeParse(input);
      if (stryMutAct_9fa48("9577") ? false : stryMutAct_9fa48("9576") ? true : stryMutAct_9fa48("9575") ? parsedInput.success : (stryCov_9fa48("9575", "9576", "9577"), !parsedInput.success)) {
        if (stryMutAct_9fa48("9578")) {
          {}
        } else {
          stryCov_9fa48("9578");
          throw new GreenSpaceContractError(stryMutAct_9fa48("9580") ? "" : (stryCov_9fa48("9580"), "Los datos para actualizar el espacio verde son inválidos."), stryMutAct_9fa48("9581") ? {} : (stryCov_9fa48("9581"), {
            cause: parsedInput.error
          }));
        }
      }
      const saved = parseGreenSpace(await send(stryMutAct_9fa48("9582") ? `` : (stryCov_9fa48("9582"), `/api/green-spaces/${id}`), stryMutAct_9fa48("9583") ? {} : (stryCov_9fa48("9583"), {
        method: stryMutAct_9fa48("9584") ? "" : (stryCov_9fa48("9584"), "PATCH"),
        headers: stryMutAct_9fa48("9585") ? {} : (stryCov_9fa48("9585"), {
          "content-type": stryMutAct_9fa48("9586") ? "" : (stryCov_9fa48("9586"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      })), stryMutAct_9fa48("9587") ? "" : (stryCov_9fa48("9587"), "No se pudo obtener información válida de la actualización de espacio verde. Reintente en unos segundos."));
      if (stryMutAct_9fa48("9588")) {
        ;
      } else {
        stryCov_9fa48("9588");
        notifyMapInventoryChanged();
      }
      return saved;
    }
  },
  async remove(id: string): Promise<GreenSpace> {
    if (stryMutAct_9fa48("9589")) {
      {}
    } else {
      stryCov_9fa48("9589");
      return parseGreenSpace(await send(stryMutAct_9fa48("9590") ? `` : (stryCov_9fa48("9590"), `/api/green-spaces/${id}`), stryMutAct_9fa48("9591") ? {} : (stryCov_9fa48("9591"), {
        method: stryMutAct_9fa48("9592") ? "" : (stryCov_9fa48("9592"), "DELETE")
      })), stryMutAct_9fa48("9593") ? "" : (stryCov_9fa48("9593"), "No se pudo obtener información válida de la baja de espacio verde. Reintente en unos segundos."));
    }
  }
});