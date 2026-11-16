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
import { BackendContractError, parseBackendError, readJsonBody as readBackendJsonBody } from "./backend-client";
import { recordTelemetryEvent } from "./telemetry";
import { MAX_DECIMAL_10_2, boundedDecimalInput } from "@/lib/input-limits";
import { tolerantRecords } from "./tolerant-records";
export const vehicleTypeSchema = z.enum(stryMutAct_9fa48("17021") ? [] : (stryCov_9fa48("17021"), [stryMutAct_9fa48("17022") ? "" : (stryCov_9fa48("17022"), "COMPACTOR_TRUCK"), stryMutAct_9fa48("17023") ? "" : (stryCov_9fa48("17023"), "DUMP_TRUCK"), stryMutAct_9fa48("17024") ? "" : (stryCov_9fa48("17024"), "SWEEPER"), stryMutAct_9fa48("17025") ? "" : (stryCov_9fa48("17025"), "WATER_TANKER"), stryMutAct_9fa48("17026") ? "" : (stryCov_9fa48("17026"), "CRANE_TRUCK"), stryMutAct_9fa48("17027") ? "" : (stryCov_9fa48("17027"), "VAN")]));
export type VehicleType = z.infer<typeof vehicleTypeSchema>;
const vehicleSchema = z.object(stryMutAct_9fa48("17028") ? {} : (stryCov_9fa48("17028"), {
  id: z.string(),
  plate: z.string(),
  vehicleType: vehicleTypeSchema,
  capacity: z.number().nullable(),
  active: z.boolean()
}));
export type Vehicle = z.infer<typeof vehicleSchema>;
export type VehicleQuery = {
  active?: boolean;
  vehicleType?: VehicleType;
  page?: number;
  pageSize?: number;
};
export type VehiclesPage = {
  vehicles: Vehicle[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export const createVehicleInputSchema = z.object(stryMutAct_9fa48("17029") ? {} : (stryCov_9fa48("17029"), {
  plate: stryMutAct_9fa48("17031") ? z.string().min(1, "La patente es obligatoria.") : stryMutAct_9fa48("17030") ? z.string().trim().max(1, "La patente es obligatoria.") : (stryCov_9fa48("17030", "17031"), z.string().trim().min(1, stryMutAct_9fa48("17032") ? "" : (stryCov_9fa48("17032"), "La patente es obligatoria."))),
  vehicleType: vehicleTypeSchema,
  capacity: boundedDecimalInput(stryMutAct_9fa48("17033") ? "" : (stryCov_9fa48("17033"), "La capacidad"), MAX_DECIMAL_10_2, stryMutAct_9fa48("17034") ? {} : (stryCov_9fa48("17034"), {
    positive: stryMutAct_9fa48("17035") ? false : (stryCov_9fa48("17035"), true)
  }))
}));
export type CreateVehicleInput = z.infer<typeof createVehicleInputSchema>;
export const updateVehicleInputSchema = createVehicleInputSchema.partial().extend(stryMutAct_9fa48("17036") ? {} : (stryCov_9fa48("17036"), {
  active: z.boolean().optional()
}));
export type UpdateVehicleInput = z.infer<typeof updateVehicleInputSchema>;
export class VehicleContractError extends Error {
  constructor(message: string, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("17037")) {
      {}
    } else {
      stryCov_9fa48("17037");
      super(message, options);
      this.name = stryMutAct_9fa48("17038") ? "" : (stryCov_9fa48("17038"), "VehicleContractError");
    }
  }
}
export class VehicleRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("17039")) {
      {}
    } else {
      stryCov_9fa48("17039");
      super(message, options);
      this.name = stryMutAct_9fa48("17040") ? "" : (stryCov_9fa48("17040"), "VehicleRequestError");
      this.status = status;
    }
  }
}
const vehiclesEnvelopeSchema = z.object(stryMutAct_9fa48("17041") ? {} : (stryCov_9fa48("17041"), {
  data: tolerantRecords(vehicleSchema, stryMutAct_9fa48("17042") ? "" : (stryCov_9fa48("17042"), "vehicles")),
  meta: z.object(stryMutAct_9fa48("17043") ? {} : (stryCov_9fa48("17043"), {
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number()
  }))
}));
function buildVehiclesQueryString(query: VehicleQuery): string {
  if (stryMutAct_9fa48("17044")) {
    {}
  } else {
    stryCov_9fa48("17044");
    const params = new URLSearchParams();
    if (stryMutAct_9fa48("17047") ? query.active === undefined : stryMutAct_9fa48("17046") ? false : stryMutAct_9fa48("17045") ? true : (stryCov_9fa48("17045", "17046", "17047"), query.active !== undefined)) params.set(stryMutAct_9fa48("17049") ? "" : (stryCov_9fa48("17049"), "active"), String(query.active));
    if (stryMutAct_9fa48("17051") ? false : stryMutAct_9fa48("17050") ? true : (stryCov_9fa48("17050", "17051"), query.vehicleType)) params.set(stryMutAct_9fa48("17053") ? "" : (stryCov_9fa48("17053"), "vehicleType"), query.vehicleType);
    if (stryMutAct_9fa48("17056") ? query.page === undefined : stryMutAct_9fa48("17055") ? false : stryMutAct_9fa48("17054") ? true : (stryCov_9fa48("17054", "17055", "17056"), query.page !== undefined)) params.set(stryMutAct_9fa48("17058") ? "" : (stryCov_9fa48("17058"), "page"), String(query.page));
    if (stryMutAct_9fa48("17061") ? query.pageSize === undefined : stryMutAct_9fa48("17060") ? false : stryMutAct_9fa48("17059") ? true : (stryCov_9fa48("17059", "17060", "17061"), query.pageSize !== undefined)) params.set(stryMutAct_9fa48("17063") ? "" : (stryCov_9fa48("17063"), "pageSize"), String(query.pageSize));
    const queryString = params.toString();
    return queryString ? stryMutAct_9fa48("17064") ? `` : (stryCov_9fa48("17064"), `?${queryString}`) : stryMutAct_9fa48("17065") ? "Stryker was here!" : (stryCov_9fa48("17065"), "");
  }
}
async function readJsonBody(response: Response): Promise<unknown> {
  if (stryMutAct_9fa48("17066")) {
    {}
  } else {
    stryCov_9fa48("17066");
    try {
      if (stryMutAct_9fa48("17067")) {
        {}
      } else {
        stryCov_9fa48("17067");
        return await readBackendJsonBody(response, stryMutAct_9fa48("17068") ? "" : (stryCov_9fa48("17068"), "vehículos"));
      }
    } catch (error) {
      if (stryMutAct_9fa48("17069")) {
        {}
      } else {
        stryCov_9fa48("17069");
        if (stryMutAct_9fa48("17072") ? false : stryMutAct_9fa48("17071") ? true : stryMutAct_9fa48("17070") ? error instanceof BackendContractError : (stryCov_9fa48("17070", "17071", "17072"), !(error instanceof BackendContractError))) throw error;
        recordTelemetryEvent(stryMutAct_9fa48("17074") ? {} : (stryCov_9fa48("17074"), {
          name: stryMutAct_9fa48("17075") ? "" : (stryCov_9fa48("17075"), "request_malformed_response"),
          resource: stryMutAct_9fa48("17076") ? "" : (stryCov_9fa48("17076"), "vehicles")
        }));
        throw new VehicleContractError(error.message, stryMutAct_9fa48("17078") ? {} : (stryCov_9fa48("17078"), {
          cause: error.cause
        }));
      }
    }
  }
}
function requestError(payload: unknown, resource = stryMutAct_9fa48("17079") ? "" : (stryCov_9fa48("17079"), "vehículos")): VehicleRequestError | VehicleContractError {
  if (stryMutAct_9fa48("17080")) {
    {}
  } else {
    stryCov_9fa48("17080");
    const error = parseBackendError(payload, resource);
    if (stryMutAct_9fa48("17082") ? false : stryMutAct_9fa48("17081") ? true : (stryCov_9fa48("17081", "17082"), error instanceof BackendContractError)) {
      if (stryMutAct_9fa48("17083")) {
        {}
      } else {
        stryCov_9fa48("17083");
        recordTelemetryEvent(stryMutAct_9fa48("17085") ? {} : (stryCov_9fa48("17085"), {
          name: stryMutAct_9fa48("17086") ? "" : (stryCov_9fa48("17086"), "request_malformed_response"),
          resource: stryMutAct_9fa48("17087") ? "" : (stryCov_9fa48("17087"), "vehicles")
        }));
        return new VehicleContractError(error.message, stryMutAct_9fa48("17088") ? {} : (stryCov_9fa48("17088"), {
          cause: error.cause
        }));
      }
    }
    return new VehicleRequestError(error.message, error.status);
  }
}
async function send(input: string, init?: RequestInit): Promise<unknown> {
  if (stryMutAct_9fa48("17089")) {
    {}
  } else {
    stryCov_9fa48("17089");
    let response: Response;
    try {
      if (stryMutAct_9fa48("17090")) {
        {}
      } else {
        stryCov_9fa48("17090");
        response = await authenticatedFetch(input, init);
      }
    } catch (cause) {
      if (stryMutAct_9fa48("17091")) {
        {}
      } else {
        stryCov_9fa48("17091");
        if (stryMutAct_9fa48("17093") ? false : stryMutAct_9fa48("17092") ? true : (stryCov_9fa48("17092", "17093"), cause instanceof NetworkFailureError)) {
          if (stryMutAct_9fa48("17094")) {
            {}
          } else {
            stryCov_9fa48("17094");
            recordTelemetryEvent(stryMutAct_9fa48("17096") ? {} : (stryCov_9fa48("17096"), {
              name: stryMutAct_9fa48("17097") ? "" : (stryCov_9fa48("17097"), "request_network_failure"),
              resource: stryMutAct_9fa48("17098") ? "" : (stryCov_9fa48("17098"), "vehicles")
            }));
          }
        }
        throw cause;
      }
    }
    const payload = await readJsonBody(response);
    if (stryMutAct_9fa48("17101") ? false : stryMutAct_9fa48("17100") ? true : stryMutAct_9fa48("17099") ? response.ok : (stryCov_9fa48("17099", "17100", "17101"), !response.ok)) throw requestError(payload);
    return payload;
  }
}
function parseVehicle(payload: unknown, message: string): Vehicle {
  if (stryMutAct_9fa48("17102")) {
    {}
  } else {
    stryCov_9fa48("17102");
    const parsed = vehicleSchema.safeParse(payload);
    if (stryMutAct_9fa48("17105") ? false : stryMutAct_9fa48("17104") ? true : stryMutAct_9fa48("17103") ? parsed.success : (stryCov_9fa48("17103", "17104", "17105"), !parsed.success)) {
      if (stryMutAct_9fa48("17106")) {
        {}
      } else {
        stryCov_9fa48("17106");
        recordTelemetryEvent(stryMutAct_9fa48("17108") ? {} : (stryCov_9fa48("17108"), {
          name: stryMutAct_9fa48("17109") ? "" : (stryCov_9fa48("17109"), "request_malformed_response"),
          resource: stryMutAct_9fa48("17110") ? "" : (stryCov_9fa48("17110"), "vehicles")
        }));
        throw new VehicleContractError(message, stryMutAct_9fa48("17112") ? {} : (stryCov_9fa48("17112"), {
          cause: parsed.error
        }));
      }
    }
    return parsed.data;
  }
}
export const vehiclesAdapter = stryMutAct_9fa48("17113") ? {} : (stryCov_9fa48("17113"), {
  async list(query: VehicleQuery = {}): Promise<VehiclesPage> {
    if (stryMutAct_9fa48("17114")) {
      {}
    } else {
      stryCov_9fa48("17114");
      const payload = await send(stryMutAct_9fa48("17115") ? `` : (stryCov_9fa48("17115"), `/api/vehicles${buildVehiclesQueryString(query)}`));
      const parsed = vehiclesEnvelopeSchema.safeParse(payload);
      if (stryMutAct_9fa48("17118") ? false : stryMutAct_9fa48("17117") ? true : stryMutAct_9fa48("17116") ? parsed.success : (stryCov_9fa48("17116", "17117", "17118"), !parsed.success)) {
        if (stryMutAct_9fa48("17119")) {
          {}
        } else {
          stryCov_9fa48("17119");
          recordTelemetryEvent(stryMutAct_9fa48("17121") ? {} : (stryCov_9fa48("17121"), {
            name: stryMutAct_9fa48("17122") ? "" : (stryCov_9fa48("17122"), "request_malformed_response"),
            resource: stryMutAct_9fa48("17123") ? "" : (stryCov_9fa48("17123"), "vehicles")
          }));
          throw new VehicleContractError(stryMutAct_9fa48("17125") ? "" : (stryCov_9fa48("17125"), "No se pudo obtener información válida de vehículos. Reintente en unos segundos."), stryMutAct_9fa48("17126") ? {} : (stryCov_9fa48("17126"), {
            cause: parsed.error
          }));
        }
      }
      return stryMutAct_9fa48("17127") ? {} : (stryCov_9fa48("17127"), {
        vehicles: parsed.data.data,
        page: parsed.data.meta.page,
        pageSize: parsed.data.meta.pageSize,
        total: parsed.data.meta.total,
        totalPages: parsed.data.meta.totalPages
      });
    }
  },
  async get(id: string): Promise<Vehicle> {
    if (stryMutAct_9fa48("17128")) {
      {}
    } else {
      stryCov_9fa48("17128");
      return parseVehicle(await send(stryMutAct_9fa48("17129") ? `` : (stryCov_9fa48("17129"), `/api/vehicles/${id}`)), stryMutAct_9fa48("17130") ? "" : (stryCov_9fa48("17130"), "No se pudo obtener información válida del detalle de vehículo. Reintente en unos segundos."));
    }
  },
  async create(input: CreateVehicleInput): Promise<Vehicle> {
    if (stryMutAct_9fa48("17131")) {
      {}
    } else {
      stryCov_9fa48("17131");
      const parsedInput = createVehicleInputSchema.safeParse(input);
      if (stryMutAct_9fa48("17134") ? false : stryMutAct_9fa48("17133") ? true : stryMutAct_9fa48("17132") ? parsedInput.success : (stryCov_9fa48("17132", "17133", "17134"), !parsedInput.success)) {
        if (stryMutAct_9fa48("17135")) {
          {}
        } else {
          stryCov_9fa48("17135");
          throw new VehicleContractError(stryMutAct_9fa48("17137") ? "" : (stryCov_9fa48("17137"), "Los datos para registrar el vehículo son inválidos."), stryMutAct_9fa48("17138") ? {} : (stryCov_9fa48("17138"), {
            cause: parsedInput.error
          }));
        }
      }
      return parseVehicle(await send(stryMutAct_9fa48("17139") ? "" : (stryCov_9fa48("17139"), "/api/vehicles"), stryMutAct_9fa48("17140") ? {} : (stryCov_9fa48("17140"), {
        method: stryMutAct_9fa48("17141") ? "" : (stryCov_9fa48("17141"), "POST"),
        headers: stryMutAct_9fa48("17142") ? {} : (stryCov_9fa48("17142"), {
          "content-type": stryMutAct_9fa48("17143") ? "" : (stryCov_9fa48("17143"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      })), stryMutAct_9fa48("17144") ? "" : (stryCov_9fa48("17144"), "No se pudo obtener información válida de la creación de vehículo. Reintente en unos segundos."));
    }
  },
  async update(id: string, input: UpdateVehicleInput): Promise<Vehicle> {
    if (stryMutAct_9fa48("17145")) {
      {}
    } else {
      stryCov_9fa48("17145");
      const parsedInput = updateVehicleInputSchema.safeParse(input);
      if (stryMutAct_9fa48("17148") ? false : stryMutAct_9fa48("17147") ? true : stryMutAct_9fa48("17146") ? parsedInput.success : (stryCov_9fa48("17146", "17147", "17148"), !parsedInput.success)) {
        if (stryMutAct_9fa48("17149")) {
          {}
        } else {
          stryCov_9fa48("17149");
          throw new VehicleContractError(stryMutAct_9fa48("17151") ? "" : (stryCov_9fa48("17151"), "Los datos para actualizar el vehículo son inválidos."), stryMutAct_9fa48("17152") ? {} : (stryCov_9fa48("17152"), {
            cause: parsedInput.error
          }));
        }
      }
      return parseVehicle(await send(stryMutAct_9fa48("17153") ? `` : (stryCov_9fa48("17153"), `/api/vehicles/${id}`), stryMutAct_9fa48("17154") ? {} : (stryCov_9fa48("17154"), {
        method: stryMutAct_9fa48("17155") ? "" : (stryCov_9fa48("17155"), "PATCH"),
        headers: stryMutAct_9fa48("17156") ? {} : (stryCov_9fa48("17156"), {
          "content-type": stryMutAct_9fa48("17157") ? "" : (stryCov_9fa48("17157"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      })), stryMutAct_9fa48("17158") ? "" : (stryCov_9fa48("17158"), "No se pudo obtener información válida de la actualización de vehículo. Reintente en unos segundos."));
    }
  },
  async remove(id: string): Promise<Vehicle> {
    if (stryMutAct_9fa48("17159")) {
      {}
    } else {
      stryCov_9fa48("17159");
      return parseVehicle(await send(stryMutAct_9fa48("17160") ? `` : (stryCov_9fa48("17160"), `/api/vehicles/${id}`), stryMutAct_9fa48("17161") ? {} : (stryCov_9fa48("17161"), {
        method: stryMutAct_9fa48("17162") ? "" : (stryCov_9fa48("17162"), "DELETE")
      })), stryMutAct_9fa48("17163") ? "" : (stryCov_9fa48("17163"), "No se pudo obtener información válida de la baja de vehículo. Reintente en unos segundos."));
    }
  }
});