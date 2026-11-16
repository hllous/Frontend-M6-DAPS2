import { NextResponse } from "next/server";

import { errorResponse } from "./bff-route";
import { STALE_RECORD_MESSAGE } from "./record-versions";
import { getRequiredSession } from "./session";

/**
 * Emulación en modo mock de la concurrencia optimista del backend (ADR-012): misma semántica que M6, para que la
 * interfaz y los e2e la ejerciten sin backend. El ETag es `W/"<ms de updatedAt>"`, como en el backend; cada escritura
 * exitosa mueve `updatedAt`. En modo backend no hace nada: `fetchBackend` reenvía `If-Match` y `forwardResponse` el `ETag`.
 */

/** `updatedAt` inicial de los fixtures que no lo traen, para que listados y detalle ya tengan versión. */
export const MOCK_SEED_UPDATED_AT = "2026-09-01T00:00:00.000Z";

type Versioned = { updatedAt?: string | null };
type Lookup = (id: string) => Promise<Versioned | null | undefined>;
type IdContext = { params: Promise<{ id: string }> };

function etagOf(record: Versioned): string | undefined {
  const ms = Date.parse(record.updatedAt ?? MOCK_SEED_UPDATED_AT);
  return Number.isFinite(ms) ? `W/"${ms}"` : undefined;
}

/** Comparación débil de RFC 9110 §13.1.1 (se ignora `W/`), con `*` y listas separadas por comas, como el backend. */
export function ifMatchSatisfied(ifMatch: string, etag: string | undefined): boolean {
  const opaque = (tag: string) => tag.trim().replace(/^W\//, "");
  const tags = ifMatch.split(",").map(opaque).filter(Boolean);
  if (tags.includes("*")) return true;
  return etag !== undefined && tags.includes(opaque(etag));
}

function isMockSession(request: Request): boolean {
  try {
    return getRequiredSession(request).mode === "mock";
  } catch {
    // Sin sesión válida decide la ruta (401): la emulación no se mete.
    return false;
  }
}

/**
 * Envuelve el handler de `GET /:id`, de una transición o del `PATCH` de un recurso versionado. En modo mock:
 * responde 412 si `If-Match` no coincide (sin ejecutar la escritura), mueve `updatedAt` tras una escritura exitosa y
 * agrega el `ETag` a la respuesta.
 */
export function withMockVersioning<C extends IdContext>(
  lookup: Lookup,
  handler: (request: Request, context: C) => Promise<Response>,
): (request: Request, context: C) => Promise<Response> {
  return async (request, context) => {
    if (!isMockSession(request)) return handler(request, context);
    const { id } = await context.params;
    const write = request.method !== "GET" && request.method !== "HEAD";
    const before = await lookup(id);
    const ifMatch = request.headers.get("if-match");
    if (write && before && ifMatch && !ifMatchSatisfied(ifMatch, etagOf(before))) {
      return errorResponse(412, STALE_RECORD_MESSAGE, new URL(request.url).pathname, "STALE_RECORD");
    }

    const response = await handler(request, context);
    const after = await lookup(id);
    if (!response.ok || !after) return response;
    if (!write) {
      const etag = etagOf(after);
      if (etag) response.headers.set("ETag", etag);
      return response;
    }

    const previous = Date.parse(before?.updatedAt ?? MOCK_SEED_UPDATED_AT);
    after.updatedAt = new Date(Math.max(Date.now(), (Number.isFinite(previous) ? previous : 0) + 1)).toISOString();
    const etag = etagOf(after);
    const body: unknown = await response.clone().json().catch(() => undefined);
    const headers = new Headers(response.headers);
    headers.delete("content-length");
    const rewritten = body && typeof body === "object" && !Array.isArray(body) && (body as { id?: unknown }).id === id
      ? NextResponse.json({ ...body, updatedAt: after.updatedAt }, { status: response.status, headers })
      : response;
    if (rewritten !== response) void response.body?.cancel().catch(() => undefined);
    if (etag) rewritten.headers.set("ETag", etag);
    return rewritten;
  };
}

// Los fixtures se cargan al usarse: así una ruta de contenedores no arrastra los fixtures de servicios.
export const versionedContainer = <C extends IdContext>(handler: (request: Request, context: C) => Promise<Response>) =>
  withMockVersioning<C>(async (id) => (await import("./containers-fixtures")).getContainerFixture(id), handler);
export const versionedService = <C extends IdContext>(handler: (request: Request, context: C) => Promise<Response>) =>
  withMockVersioning<C>(async (id) => (await import("./services-fixtures")).serviceFixtures.find((service) => service.id === id), handler);
export const versionedTreeIntervention = <C extends IdContext>(handler: (request: Request, context: C) => Promise<Response>) =>
  withMockVersioning<C>(async (id) => (await import("./tree-intervention-fixtures")).getTreeInterventionFixture(id), handler);
export const versionedEnvironmentalReport = <C extends IdContext>(handler: (request: Request, context: C) => Promise<Response>) =>
  withMockVersioning<C>(async (id) => (await import("./environmental-report-fixtures")).getEnvironmentalReportFixture(id), handler);
