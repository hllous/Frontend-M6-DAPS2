import { z } from "zod";

import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { attachmentSchema, type Attachment, type Service, type ServiceStatus } from "./services";
import { recordTelemetryEvent } from "./telemetry";

export { attachmentSchema, type Attachment };

export const containerTypeSchema = z.enum(["HOUSEHOLD", "RECYCLABLE", "BULKY", "GREEN"]);
export type ContainerType = z.infer<typeof containerTypeSchema>;

export const containerStatusSchema = z.enum([
  "ACTIVE",
  "OVERFLOWED",
  "DAMAGED",
  "UNDER_REPAIR",
  "RELOCATING",
  "REMOVED",
]);
export type ContainerStatus = z.infer<typeof containerStatusSchema>;

export const damageTypeSchema = z.enum([
  "STRUCTURAL",
  "BURNT",
  "LID_BROKEN",
  "WHEELS_BROKEN",
  "VANDALIZED",
  "MISSING",
]);
export type DamageType = z.infer<typeof damageTypeSchema>;

export const severitySchema = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type Severity = z.infer<typeof severitySchema>;

export const containerSchema = z.object({
  id: z.string(),
  code: z.string(),
  containerType: containerTypeSchema,
  zoneId: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  capacityLiters: z.number(),
  status: containerStatusSchema,
  damageType: damageTypeSchema.nullable().optional(),
  severity: severitySchema.nullable().optional(),
  requiresPublicWorks: z.boolean().nullable().optional(),
});
export type Container = z.infer<typeof containerSchema>;

export type ContainerQuery = {
  status?: ContainerStatus;
  containerType?: ContainerType;
  zoneId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

export type ContainersPage = {
  containers: Container[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export const createContainerInputSchema = z.object({
  code: z.string().trim().min(1, "El código es obligatorio."),
  containerType: containerTypeSchema,
  zoneId: z.string().trim().min(1, "La zona operativa es obligatoria."),
  address: z.string().trim().min(1, "La dirección es obligatoria."),
  lat: z.number({ message: "La latitud debe ser un número válido." }),
  lng: z.number({ message: "La longitud debe ser un número válido." }),
  capacityLiters: z
    .number({ message: "La capacidad debe ser un número." })
    .int("La capacidad debe ser un número entero.")
    .positive("La capacidad debe ser mayor a 0 litros."),
});
export type CreateContainerInput = z.infer<typeof createContainerInputSchema>;

export const updateContainerInputSchema = z.object({
  zoneId: z.string().trim().min(1, "La zona operativa es obligatoria.").optional(),
  address: z.string().trim().min(1, "La dirección es obligatoria.").optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  capacityLiters: z
    .number({ message: "La capacidad debe ser un número." })
    .int("La capacidad debe ser un número entero.")
    .positive("La capacidad debe ser mayor a 0 litros.")
    .optional(),
});
export type UpdateContainerInput = z.infer<typeof updateContainerInputSchema>;

export const reportDamageInputSchema = z.object({
  damageType: damageTypeSchema,
  severity: severitySchema,
  requiresPublicWorks: z.boolean().optional().default(false),
});
export type ReportDamageInput = z.input<typeof reportDamageInputSchema>;

export const confirmRelocationInputSchema = z.object({
  address: z.string().trim().min(1, "La dirección es obligatoria."),
  lat: z.number({ message: "La latitud debe ser un número válido." }),
  lng: z.number({ message: "La longitud debe ser un número válido." }),
  zoneId: z.string().trim().min(1).optional(),
});
export type ConfirmRelocationInput = z.infer<typeof confirmRelocationInputSchema>;

export function findInFlightServiceForContainer(
  container: Container,
  services: Service[],
): Service | undefined {
  const inFlightStatuses: ServiceStatus[] = [
    "SCHEDULED",
    "RESCHEDULED",
    "IN_PROGRESS",
    "SUSPENDED",
  ];
  return services.find(
    (s) =>
      s.mode !== "ROUTE" &&
      s.targetType === "CONTAINER" &&
      (s.targetId === container.id || s.targetRef === container.code) &&
      inFlightStatuses.includes(s.status),
  );
}

export class ContainerContractError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ContainerContractError";
  }
}

export class ContainerRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ContainerRequestError";
    this.status = status;
  }
}

export const CONTAINER_STATUS_LABELS: Record<ContainerStatus, string> = {
  ACTIVE: "Activo",
  OVERFLOWED: "Desbordado",
  DAMAGED: "Dañado",
  UNDER_REPAIR: "En reparación",
  RELOCATING: "En reubicación",
  REMOVED: "Retirado",
};

export const CONTAINER_STATUS_CLASSES: Record<ContainerStatus, string> = {
  ACTIVE: "bg-[var(--color-success-fill)] text-[var(--color-success)] border-[var(--color-success-line)]",
  OVERFLOWED: "bg-[var(--color-warning-fill)] text-[var(--color-warning)] border-[var(--color-warning-line)]",
  DAMAGED: "bg-[var(--color-danger-fill)] text-[var(--color-danger)] border-[var(--color-danger-line)]",
  UNDER_REPAIR: "bg-[var(--color-warning-fill)] text-[var(--color-warning)] border-[var(--color-warning-line)]",
  RELOCATING: "bg-[var(--color-info-fill)] text-[var(--color-info)] border-[var(--color-info-line)]",
  REMOVED: "bg-[var(--color-danger-fill)] text-[var(--color-danger)] border-[var(--color-danger-line)]",
};

export const CONTAINER_TYPE_LABELS: Record<ContainerType, string> = {
  HOUSEHOLD: "Residuos domiciliarios",
  RECYCLABLE: "Materiales reciclables",
  BULKY: "Residuos voluminosos",
  GREEN: "Restos verdes",
};

export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = {
  STRUCTURAL: "Estructural",
  BURNT: "Quemado",
  LID_BROKEN: "Tapa rota",
  WHEELS_BROKEN: "Ruedas rotas",
  VANDALIZED: "Vandalizado",
  MISSING: "Faltante",
};

export const SEVERITY_LABELS: Record<Severity, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};

const containersEnvelopeSchema = z.object({
  data: z.array(containerSchema),
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

function buildQueryString(query: ContainerQuery): string {
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.containerType) params.set("containerType", query.containerType);
  if (query.zoneId) params.set("zoneId", query.zoneId);
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
    recordTelemetryEvent({ name: "request_malformed_response", resource: "containers" });
    throw new ContainerContractError("La respuesta de contenedores no es JSON válido.", { cause });
  }
}

function requestError(payload: unknown): ContainerRequestError | ContainerContractError {
  const parsed = errorResponseSchema.safeParse(payload);
  if (!parsed.success) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "containers" });
    return new ContainerContractError(
      "La respuesta de error de contenedores no respeta el contrato documentado.",
      { cause: parsed.error },
    );
  }
  const message = Array.isArray(parsed.data.message)
    ? parsed.data.message.join(" ")
    : parsed.data.message;
  return new ContainerRequestError(message, parsed.data.statusCode);
}

async function send(input: string, init?: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await authenticatedFetch(input, init);
  } catch (cause) {
    if (cause instanceof NetworkFailureError) {
      recordTelemetryEvent({ name: "request_network_failure", resource: "containers" });
    }
    throw cause;
  }
  const payload = await readJsonBody(response);
  if (!response.ok) throw requestError(payload);
  return payload;
}

function parseContainer(payload: unknown, message: string): Container {
  const parsed = containerSchema.safeParse(payload);
  if (!parsed.success) {
    recordTelemetryEvent({ name: "request_malformed_response", resource: "containers" });
    throw new ContainerContractError(message, { cause: parsed.error });
  }
  return parsed.data;
}

export const containersAdapter = {
  async list(query: ContainerQuery = {}): Promise<ContainersPage> {
    const payload = await send(`/api/containers${buildQueryString(query)}`);
    const parsed = containersEnvelopeSchema.safeParse(payload);
    if (!parsed.success) {
      recordTelemetryEvent({ name: "request_malformed_response", resource: "containers" });
      throw new ContainerContractError("La respuesta de contenedores no respeta el contrato esperado.", {
        cause: parsed.error,
      });
    }
    return {
      containers: parsed.data.data,
      page: parsed.data.meta.page,
      pageSize: parsed.data.meta.pageSize,
      total: parsed.data.meta.total,
      totalPages: parsed.data.meta.totalPages,
    };
  },

  async get(id: string): Promise<Container> {
    return parseContainer(
      await send(`/api/containers/${id}`),
      "El detalle de contenedor no respeta el contrato esperado.",
    );
  },

  async create(input: CreateContainerInput): Promise<Container> {
    const parsedInput = createContainerInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new ContainerContractError("Los datos para registrar el contenedor son inválidos.", {
        cause: parsedInput.error,
      });
    }
    return parseContainer(
      await send("/api/containers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsedInput.data),
      }),
      "La respuesta de creación de contenedor no respeta el contrato esperado.",
    );
  },

  async update(id: string, input: UpdateContainerInput): Promise<Container> {
    const parsedInput = updateContainerInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new ContainerContractError("Los datos para actualizar el contenedor son inválidos.", {
        cause: parsedInput.error,
      });
    }
    return parseContainer(
      await send(`/api/containers/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsedInput.data),
      }),
      "La respuesta de actualización de contenedor no respeta el contrato esperado.",
    );
  },

  async reportOverflow(id: string): Promise<Container> {
    return parseContainer(
      await send(`/api/containers/${id}/report-overflow`, {
        method: "POST",
      }),
      "La respuesta de reporte de desborde no respeta el contrato esperado.",
    );
  },

  async reportDamage(id: string, input: ReportDamageInput): Promise<Container> {
    const parsedInput = reportDamageInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new ContainerContractError("Los datos para reportar daño son inválidos.", {
        cause: parsedInput.error,
      });
    }
    return parseContainer(
      await send(`/api/containers/${id}/report-damage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsedInput.data),
      }),
      "La respuesta de reporte de daño no respeta el contrato esperado.",
    );
  },

  async startRepair(id: string): Promise<Container> {
    return parseContainer(
      await send(`/api/containers/${id}/start-repair`, { method: "POST" }),
      "La respuesta de inicio de reparación no respeta el contrato esperado.",
    );
  },

  async completeRepair(id: string): Promise<Container> {
    return parseContainer(
      await send(`/api/containers/${id}/complete-repair`, { method: "POST" }),
      "La respuesta de finalización de reparación no respeta el contrato esperado.",
    );
  },

  async remove(id: string): Promise<Container> {
    return parseContainer(
      await send(`/api/containers/${id}/remove`, { method: "POST" }),
      "La respuesta de retiro de contenedor no respeta el contrato esperado.",
    );
  },

  async uploadEvidence(params: {
    file: File;
    containerId: string;
    idempotencyKey?: string;
  }): Promise<Attachment> {
    const key =
      params.idempotencyKey ||
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `idemp-${Date.now()}`);
    const formData = new FormData();
    formData.append("file", params.file);
    formData.append("fileName", params.file.name);
    formData.append("fileSize", String(params.file.size));
    formData.append("ownerType", "CONTAINER");
    formData.append("ownerId", params.containerId);

    let response: Response;
    try {
      response = await authenticatedFetch("/api/evidence", {
        method: "POST",
        headers: {
          "Idempotency-Key": key,
        },
        body: formData,
      });
    } catch (cause) {
      if (cause instanceof NetworkFailureError) {
        recordTelemetryEvent({ name: "request_network_failure", resource: "containers" });
      }
      throw cause;
    }

    const payload = await readJsonBody(response);

    if (!response.ok) {
      throw requestError(payload);
    }

    const parsedAttachment = attachmentSchema.safeParse(payload);
    if (!parsedAttachment.success) {
      recordTelemetryEvent({ name: "request_malformed_response", resource: "containers" });
      throw new ContainerContractError(
        "La respuesta de subida de evidencia no respeta el esquema de Attachment.",
        { cause: parsedAttachment.error },
      );
    }

    return parsedAttachment.data;
  },

  async getEvidence(containerId: string): Promise<Attachment[]> {
    const payload = await send(`/api/evidence?ownerType=CONTAINER&ownerId=${encodeURIComponent(containerId)}`);
    const parsed = z.array(attachmentSchema).safeParse(payload);
    if (!parsed.success) {
      recordTelemetryEvent({ name: "request_malformed_response", resource: "containers" });
      throw new ContainerContractError("La lista de evidencia de contenedores no respeta el contrato.", {
        cause: parsed.error,
      });
    }
    return parsed.data;
  },

  async empty(id: string): Promise<Container> {
    return parseContainer(
      await send(`/api/containers/${id}/empty`, {
        method: "POST",
      }),
      "La respuesta de vaciado de contenedor no respeta el contrato esperado.",
    );
  },

  async relocate(id: string): Promise<Container> {
    return parseContainer(
      await send(`/api/containers/${id}/relocate`, {
        method: "POST",
      }),
      "La respuesta de inicio de reubicación no respeta el contrato esperado.",
    );
  },

  async confirmRelocation(id: string, input: ConfirmRelocationInput): Promise<Container> {
    const parsedInput = confirmRelocationInputSchema.safeParse(input);
    if (!parsedInput.success) {
      throw new ContainerContractError("Los datos para confirmar la reubicación son inválidos.", {
        cause: parsedInput.error,
      });
    }
    return parseContainer(
      await send(`/api/containers/${id}/confirm-relocation`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsedInput.data),
      }),
      "La respuesta de confirmación de reubicación no respeta el contrato esperado.",
    );
  },
};

export async function empty(id: string): Promise<Container> {
  return containersAdapter.empty(id);
}

export async function startRelocation(id: string): Promise<Container> {
  return containersAdapter.relocate(id);
}

export async function confirmRelocation(
  id: string,
  input: ConfirmRelocationInput,
): Promise<Container> {
  return containersAdapter.confirmRelocation(id, input);
}
