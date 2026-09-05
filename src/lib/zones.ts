import { z } from "zod";

export type ZoneQuery = {
  active?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type ZonesPage = {
  zones: Zone[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export class ZoneContractError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ZoneContractError";
  }
}

export class ZoneRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ZoneRequestError";
    this.status = status;
  }
}

const zoneSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  active: z.boolean(),
  neighborhoodIds: z.array(z.string()),
});

export type Zone = z.infer<typeof zoneSchema>;

const zonesEnvelopeSchema = z.object({
  data: z.array(zoneSchema),
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

function buildZonesQueryString(query: ZoneQuery): string {
  const params = new URLSearchParams();
  if (query.active !== undefined) params.set("active", String(query.active));
  if (query.search) params.set("search", query.search);
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause) {
    throw new ZoneContractError("La respuesta de zonas no es JSON válido.", { cause });
  }
}

export const zonesAdapter = {
  async list(query: ZoneQuery = {}): Promise<ZonesPage> {
    const response = await fetch(`/api/zones${buildZonesQueryString(query)}`, { cache: "no-store" });
    const payload = await readJsonBody(response);

    if (!response.ok) {
      const parsedError = errorResponseSchema.safeParse(payload);
      if (!parsedError.success) {
        throw new ZoneContractError(
          "La respuesta de error de zonas no respeta el contrato documentado.",
          { cause: parsedError.error },
        );
      }

      const message = Array.isArray(parsedError.data.message)
        ? parsedError.data.message.join(" ")
        : parsedError.data.message;
      throw new ZoneRequestError(message, parsedError.data.statusCode);
    }

    const parsed = zonesEnvelopeSchema.safeParse(payload);
    if (!parsed.success) {
      throw new ZoneContractError("La respuesta de zonas no respeta el contrato esperado.", {
        cause: parsed.error,
      });
    }

    return {
      zones: parsed.data.data,
      page: parsed.data.meta.page,
      pageSize: parsed.data.meta.pageSize,
      total: parsed.data.meta.total,
      totalPages: parsed.data.meta.totalPages,
    };
  },
};
