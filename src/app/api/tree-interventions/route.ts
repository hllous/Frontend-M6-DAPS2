import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { addTreeInterventionFixture, createTreeInterventionFixture, filterTreeInterventionFixtures, paginateTreeInterventionFixtures } from "@/lib/tree-intervention-fixtures";
import { treeInterventionCreateInputSchema, treeInterventionStatusSchema, treeInterventionTypeSchema, type TreeInterventionQuery } from "@/lib/tree-interventions";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError, requireCapability } from "@/lib/session";

const ERROR_LABELS: Record<number, string> = { 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 503: "Service Unavailable", 500: "Internal Server Error" };
function errorResponse(status: number, message: string, path: string) { return NextResponse.json({ statusCode: status, message, error: ERROR_LABELS[status] ?? "Error", timestamp: new Date().toISOString(), path }, { status }); }
function queryFromUrl(url: URL): TreeInterventionQuery {
  return {
    interventionType: treeInterventionTypeSchema.safeParse(url.searchParams.get("interventionType")).data,
    status: treeInterventionStatusSchema.safeParse(url.searchParams.get("status")).data,
    page: url.searchParams.has("page") ? Number(url.searchParams.get("page")) : undefined,
    pageSize: url.searchParams.has("pageSize") ? Number(url.searchParams.get("pageSize")) : undefined,
  };
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const response = await fetchBackend(request, `/tree-interventions${new URL(request.url).search}`);
      return new NextResponse(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
    }
    const query = queryFromUrl(new URL(request.url));
    return NextResponse.json(paginateTreeInterventionFixtures(filterTreeInterventionFixtures(query), query.page, query.pageSize));
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudieron cargar las intervenciones de arbolado.", path);
  }
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    requireCapability(session, "treeIntervention:request");
    const parsed = treeInterventionCreateInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const response = await fetchBackend(request, "/tree-interventions", "treeIntervention:request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) });
      return new NextResponse(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
    }
    const created = createTreeInterventionFixture(parsed.data);
    addTreeInterventionFixture(created);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, error.message, path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo crear la intervención de arbolado.", path);
  }
}
