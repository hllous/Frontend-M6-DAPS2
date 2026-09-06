import { z } from "zod";

import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";

export const greenSpaceTypeSchema = z.enum(["SQUARE", "PARK", "PLANTER", "MEDIAN", "PROMENADE"]);
export type GreenSpaceType = z.infer<typeof greenSpaceTypeSchema>;

export const greenSpaceSchema = z.object({
  id: z.string(),
  name: z.string(),
  spaceType: greenSpaceTypeSchema,
  areaM2: z.number(),
  zoneId: z.string(),
  active: z.boolean(),
});
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

export const createGreenSpaceInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio."),
  spaceType: greenSpaceTypeSchema,
  areaM2: z.number().positive("La superficie debe ser mayor que cero."),
  zoneId: z.string().trim().min(1, "La zona es obligatoria."),
});
export type CreateGreenSpaceInput = z.infer<typeof createGreenSpaceInputSchema>;

export const updateGreenSpaceInputSchema = createGreenSpaceInputSchema.partial().extend({
  active: z.boolean().optional(),
});
export type UpdateGreenSpaceInput = z.infer<typeof updateGreenSpaceInputSchema>;

export class GreenSpaceContractError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "GreenSpaceContractError";
  }
}

export class GreenSpaceRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "GreenSpaceRequestError";
    this.status = status;
  }
}

const greenSpacesEnvelopeSchema = z.object({
  data: z.array(greenSpaceSchema),
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

function buildQueryString(query: GreenSpaceQuery): string {
  const params = new URLSearchParams();
  if (query.active !== undefined) params.set("active", String(query.active));
  if (query.spaceType) params.set("spaceType", query.spaceType);
  if (query.zoneId) params.set("zoneId", query.zoneId);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "green-spaces" });
    throw new GreenSpaceContractError("La respuesta de espacios verdes no es JSON válido.", { cause });
  }
}

function requestError(payload: unknown): GreenSpaceRequestError | GreenSpaceContractError {
  const parsed = errorResponseSchema.safeParse(payload);
  if (!parsed.success) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "green-spaces" });
    return new GreenSpaceContractError("La respuesta de error de espacios verdes no respeta el contrato documentado.", {
      cause: parsed.error,
    });
  }
  const message = Array.isArray(parsed.data.message) ? parsed.data.message.join(" ") : parsed.data.message;
  return new GreenSpaceRequestError(message, parsed.data.statusCode);
}

async function send(input: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await authenticatedFetch(input, init);
  } catch (cause) {
    if (cause instanceof NetworkFailureError) {
      recordTelemetryEvent({ name: "request_network_failure", resource: "green-spaces" });
    }
    throw cause;
  }
  const payload = await readJsonBody(response);
  if (!response.ok) throw requestError(payload);
  return payload;
}

function parseGreenSpace(payload: unknown, message: string): GreenSpace {
  const parsed = greenSpaceSchema.safeParse(payload);
  if (!parsed.success) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "green-spaces" });
    throw new GreenSpaceContractError(message, { cause: parsed.error });
  }
  return parsed.data;
}

export const greenSpacesAdapter = {
  async list(query: GreenSpaceQuery = {}): Promise<GreenSpacesPage> {
    const payload = await send(`/api/green-spaces${buildQueryString(query)}`);
    const parsed = greenSpacesEnvelopeSchema.safeParse(payload);
    if (!parsed.success) {
      recordTelemetryEvent({ name: "request_malformed_response", resource: "green-spaces" });
      throw new GreenSpaceContractError("La respuesta de espacios verdes no respeta el contrato esperado.", {
        cause: parsed.error,
      });
    }
    return {
      greenSpaces: parsed.data.data,
      page: parsed.data.meta.page,
      pageSize: parsed.data.meta.pageSize,
      total: parsed.data.meta.total,
      totalPages: parsed.data.meta.totalPages,
    };
  },

  async get(id: string): Promise<GreenSpace> {
    return parseGreenSpace(await send(`/api/green-spaces/${id}`), "El detalle de espacio verde no respeta el contrato esperado.");
  },

  async create(input: CreateGreenSpaceInput): Promise<GreenSpace> {
    const parsedInput = createGreenSpaceInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new GreenSpaceContractError("Los datos para registrar el espacio verde son inválidos.", { cause: parsedInput.error });
    }
    return parseGreenSpace(
      await send("/api/green-spaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsedInput.data),
      }),
      "La respuesta de creación de espacio verde no respeta el contrato esperado.",
    );
  },

  async update(id: string, input: UpdateGreenSpaceInput): Promise<GreenSpace> {
    const parsedInput = updateGreenSpaceInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new GreenSpaceContractError("Los datos para actualizar el espacio verde son inválidos.", { cause: parsedInput.error });
    }
    return parseGreenSpace(
      await send(`/api/green-spaces/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsedInput.data),
      }),
      "La respuesta de actualización de espacio verde no respeta el contrato esperado.",
    );
  },

  async remove(id: string): Promise<GreenSpace> {
    return parseGreenSpace(
      await send(`/api/green-spaces/${id}`, { method: "DELETE" }),
      "La respuesta de baja de espacio verde no respeta el contrato esperado.",
    );
  },
};
