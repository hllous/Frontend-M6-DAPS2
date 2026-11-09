import { NextResponse } from "next/server";
import { z } from "zod";

import { errorResponse, forwardResponse } from "@/lib/bff-route";
import { pageParam, pageSizeParam } from "@/lib/input-limits";
import { auditQuerySchema, inboxQuerySchema, outboxQuerySchema } from "@/lib/integration-monitor";

export function noStore<T extends NextResponse>(response: T): T {
  response.headers.set("Cache-Control", "no-store, private, max-age=0");
  return response;
}

export function jsonNoStore(body: unknown, status = 200): NextResponse {
  return noStore(NextResponse.json(body, { status }));
}

export function parseOutboxQuery(url: URL) {
  const params = url.searchParams;
  return outboxQuerySchema.safeParse({
    status: params.get("status") ?? undefined,
    eventType: params.get("eventType") ?? undefined,
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    page: pageParam(params),
    pageSize: pageSizeParam(params),
  });
}

export function parseInboxQuery(url: URL) {
  const params = url.searchParams;
  return inboxQuerySchema.safeParse({
    status: params.get("status") ?? undefined,
    eventType: params.get("eventType") ?? undefined,
    sourceModule: params.get("sourceModule") ?? undefined,
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
    page: pageParam(params),
    pageSize: pageSizeParam(params),
  });
}

export function parseAuditQuery(url: URL) {
  const params = url.searchParams;
  return auditQuerySchema.safeParse({
    entityType: params.get("entityType") ?? undefined,
    entityId: params.get("entityId") ?? undefined,
    page: pageParam(params),
    pageSize: pageSizeParam(params),
  });
}

export async function validatedBackendResponse<T>(
  response: Response,
  schema: z.ZodType<T>,
  path: string,
  invalidMessage: string,
): Promise<NextResponse> {
  if (!response.ok) return noStore(forwardResponse(response));

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return noStore(errorResponse(502, invalidMessage, path));
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return noStore(errorResponse(502, invalidMessage, path));
  return jsonNoStore(parsed.data, response.status);
}

export function invalidQueryResponse(path: string, message: string): NextResponse {
  return noStore(errorResponse(400, message, path));
}

export function invalidContractResponse(path: string, message: string): NextResponse {
  return noStore(errorResponse(502, message, path));
}
