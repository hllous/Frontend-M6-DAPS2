import { authenticatedFetch } from "@/lib/authenticated-fetch";

export class ApiRequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export async function readApiJson<T>(url: string, schema: { safeParse: (value: unknown) => { success: true; data: T } | { success: false } }, init?: RequestInit): Promise<T> {
  const response = await authenticatedFetch(url, init);
  const body = await response.json().catch(() => undefined) as { message?: unknown } | undefined;
  if (!response.ok) {
    const message = Array.isArray(body?.message)
      ? body.message.filter((part): part is string => typeof part === "string").join(" ")
      : typeof body?.message === "string" ? body.message : "No se pudo completar la solicitud.";
    throw new ApiRequestError(response.status, message);
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw new ApiRequestError(502, "La respuesta recibida no tiene el formato esperado.");
  return parsed.data;
}

export function dateTime(value: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(value));
}
