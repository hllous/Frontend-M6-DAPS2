import { z } from "zod";

export class BackendContractError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "BackendContractError";
  }
}

export class BackendRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "BackendRequestError";
    this.status = status;
  }
}

const errorResponseSchema = z.object({
  statusCode: z.number(),
  message: z.union([z.string(), z.array(z.string())]),
  error: z.string(),
  timestamp: z.string(),
  path: z.string(),
});

export async function readJsonBody(response: Response, resource: string): Promise<unknown> {
  try {
    return await response.json();
  } catch (cause) {
    throw new BackendContractError(`La respuesta de ${resource} no es JSON válido.`, { cause });
  }
}

export function parseBackendError(payload: unknown, resource: string): BackendRequestError | BackendContractError {
  const parsed = errorResponseSchema.safeParse(payload);
  if (!parsed.success) {
    return new BackendContractError(`La respuesta de error de ${resource} no respeta el contrato documentado.`, {
      cause: parsed.error,
    });
  }
  const message = Array.isArray(parsed.data.message) ? parsed.data.message.join(" ") : parsed.data.message;
  return new BackendRequestError(message, parsed.data.statusCode);
}
