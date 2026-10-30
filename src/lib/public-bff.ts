import { NextResponse } from "next/server";
import type { ZodType } from "zod";

import { errorResponse } from "./bff-route";
import { getAuthMode } from "./session";

/**
 * Módulo BFF público: sin sesión. No lee la cookie ni usa `fetchBackend`, así que ningún
 * `Authorization` puede salir de acá. Las rutas de `/api/public/` lo comparten.
 */

const PUBLIC_BACKEND_TIMEOUT_MS = 15_000;
const UNAVAILABLE_MESSAGE = "El servicio no responde en este momento.";

export function publicMockMode(): boolean {
  return getAuthMode() === "mock";
}

/** Toda respuesta pública va sin caché salvo que la ruta indique otra cosa. */
export function withCacheControl<T extends Response>(response: T, cacheControl = "no-store"): T {
  response.headers.set("cache-control", cacheControl);
  return response;
}

export function publicError(status: number, message: string, path: string, retryAfter?: string | null): NextResponse {
  const response = errorResponse(status, message, path);
  if (retryAfter) response.headers.set("retry-after", retryAfter);
  return withCacheControl(response);
}

/** IP del vecino según la plataforma (primer salto de `X-Forwarded-For`). */
function residentIp(request: Request): string | undefined {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || undefined;
}

/** GET al backend sin credenciales; reenvía la IP del vecino para el límite de tasa por dirección. */
export async function fetchPublicBackend(request: Request, resourcePath: string): Promise<Response> {
  const origin = process.env.M6_BACKEND_ORIGIN;
  if (!origin) return publicError(503, UNAVAILABLE_MESSAGE, new URL(request.url).pathname);

  const headers = new Headers({ accept: "application/json" });
  const ip = residentIp(request);
  if (ip) headers.set("x-forwarded-for", ip);
  try {
    return await fetch(new URL(resourcePath, origin), {
      method: "GET",
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(PUBLIC_BACKEND_TIMEOUT_MS),
    });
  } catch {
    return publicError(503, UNAVAILABLE_MESSAGE, new URL(request.url).pathname);
  }
}

/**
 * Pasa 404 y 429 (con `Retry-After`) y convierte cualquier otro fallo en 502 sin filtrar el cuerpo del backend.
 * El cuerpo exitoso se parsea con el contrato público de la ruta: solo sale lo que el contrato declara, y un
 * cuerpo que no lo cumple es un 502.
 */
export async function relayPublicResponse<T>(
  response: Response,
  path: string,
  schema: ZodType<T>,
  cacheControl = "no-store",
): Promise<NextResponse> {
  if (response instanceof NextResponse && !response.ok) return response;
  if (response.ok) {
    const body: unknown = await response.json().catch(() => undefined);
    if (body === undefined) return publicError(502, UNAVAILABLE_MESSAGE, path);
    const parsed = schema.safeParse(body);
    if (!parsed.success) return publicError(502, UNAVAILABLE_MESSAGE, path);
    return withCacheControl(NextResponse.json(parsed.data), cacheControl);
  }
  void response.body?.cancel().catch(() => undefined);
  if (response.status === 404) return publicError(404, "No se encontró lo que buscabas.", path);
  if (response.status === 429) return publicError(429, "Demasiadas consultas seguidas.", path, response.headers.get("retry-after"));
  if (response.status === 400) return publicError(400, "La consulta no es válida.", path);
  return publicError(502, UNAVAILABLE_MESSAGE, path);
}
