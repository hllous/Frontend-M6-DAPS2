import { z } from "zod";

import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";

export const vehicleTypeSchema = z.enum([
  "COMPACTOR_TRUCK",
  "DUMP_TRUCK",
  "SWEEPER",
  "WATER_TANKER",
  "CRANE_TRUCK",
  "VAN",
]);
export type VehicleType = z.infer<typeof vehicleTypeSchema>;

const vehicleSchema = z.object({
  id: z.string(),
  plate: z.string(),
  vehicleType: vehicleTypeSchema,
  capacity: z.number(),
  active: z.boolean(),
});
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

export const createVehicleInputSchema = z.object({
  plate: z.string().trim().min(1, "La patente es obligatoria."),
  vehicleType: vehicleTypeSchema,
  capacity: z.number().positive("La capacidad debe ser mayor que cero."),
});
export type CreateVehicleInput = z.infer<typeof createVehicleInputSchema>;

export const updateVehicleInputSchema = createVehicleInputSchema.partial().extend({
  active: z.boolean().optional(),
});
export type UpdateVehicleInput = z.infer<typeof updateVehicleInputSchema>;

export class VehicleContractError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "VehicleContractError";
  }
}

export class VehicleRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "VehicleRequestError";
    this.status = status;
  }
}

const vehiclesEnvelopeSchema = z.object({
  data: z.array(vehicleSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number(),
  }),
});

const errorResponseSchema = z.object({
  statusCode: z.number(),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string(),
  timestamp: z.string(),
  path: z.string(),
});

function buildVehiclesQueryString(query: VehicleQuery): string {
  const params = new URLSearchParams();
  if (query.active !== undefined) params.set("active", String(query.active));
  if (query.vehicleType) params.set("vehicleType", query.vehicleType);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "vehicles" });
    throw new VehicleContractError("La respuesta de vehículos no es JSON válido.", { cause });
  }
}

function requestError(payload: unknown, resource = "vehículos"): VehicleRequestError | VehicleContractError {
  const parsed = errorResponseSchema.safeParse(payload);
  if (!parsed.success) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "vehicles" });
    return new VehicleContractError(`La respuesta de error de ${resource} no respeta el contrato documentado.`, {
      cause: parsed.error,
    });
  }
  const message = Array.isArray(parsed.data.message) ? parsed.data.message.join(" ") : parsed.data.message;
  return new VehicleRequestError(message, parsed.data.statusCode);
}

async function send(
  input: string,
  init?: RequestInit,
): Promise<unknown> {
  let response: Response;
  try {
    response = await authenticatedFetch(input, init);
  } catch (cause) {
    if (cause instanceof NetworkFailureError) {
      recordTelemetryEvent({ name: "request_network_failure", resource: "vehicles" });
    }
    throw cause;
  }
  const payload = await readJsonBody(response);
  if (!response.ok) throw requestError(payload);
  return payload;
}

function parseVehicle(payload: unknown, message: string): Vehicle {
  const parsed = vehicleSchema.safeParse(payload);
  if (!parsed.success) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "vehicles" });
    throw new VehicleContractError(message, { cause: parsed.error });
  }
  return parsed.data;
}

export const vehiclesAdapter = {
  async list(query: VehicleQuery = {}): Promise<VehiclesPage> {
    const payload = await send(`/api/vehicles${buildVehiclesQueryString(query)}`);
    const parsed = vehiclesEnvelopeSchema.safeParse(payload);
    if (!parsed.success) {
      recordTelemetryEvent({ name: "request_malformed_response", resource: "vehicles" });
      throw new VehicleContractError("La respuesta de vehículos no respeta el contrato esperado.", {
        cause: parsed.error,
      });
    }
    return {
      vehicles: parsed.data.data,
      page: parsed.data.meta.page,
      pageSize: parsed.data.meta.pageSize,
      total: parsed.data.meta.total,
      totalPages: parsed.data.meta.totalPages,
    };
  },

  async get(id: string): Promise<Vehicle> {
    return parseVehicle(await send(`/api/vehicles/${id}`), "El detalle de vehículo no respeta el contrato esperado.");
  },

  async create(input: CreateVehicleInput): Promise<Vehicle> {
    const parsedInput = createVehicleInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new VehicleContractError("Los datos para registrar el vehículo son inválidos.", { cause: parsedInput.error });
    }
    return parseVehicle(
      await send("/api/vehicles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsedInput.data),
      }),
      "La respuesta de creación de vehículo no respeta el contrato esperado.",
    );
  },

  async update(id: string, input: UpdateVehicleInput): Promise<Vehicle> {
    const parsedInput = updateVehicleInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new VehicleContractError("Los datos para actualizar el vehículo son inválidos.", { cause: parsedInput.error });
    }
    return parseVehicle(
      await send(`/api/vehicles/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsedInput.data),
      }),
      "La respuesta de actualización de vehículo no respeta el contrato esperado.",
    );
  },

  async remove(id: string): Promise<Vehicle> {
    return parseVehicle(
      await send(`/api/vehicles/${id}`, { method: "DELETE" }),
      "La respuesta de baja de vehículo no respeta el contrato esperado.",
    );
  },
};
