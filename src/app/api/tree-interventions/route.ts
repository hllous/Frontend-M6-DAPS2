import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { addTreeInterventionFixture, createTreeInterventionFixture, filterTreeInterventionFixtures, paginateTreeInterventionFixtures } from "@/lib/tree-intervention-fixtures";
import { treeInterventionCreateInputSchema, treeInterventionStatusSchema, treeInterventionTypeSchema, type TreeInterventionQuery } from "@/lib/tree-interventions";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { pageParam, pageSizeParam } from "@/lib/input-limits";



function queryFromUrl(url: URL): TreeInterventionQuery {
  return {
    interventionType: treeInterventionTypeSchema.safeParse(url.searchParams.get("interventionType")).data,
    status: treeInterventionStatusSchema.safeParse(url.searchParams.get("status")).data,
    page: pageParam(url.searchParams),
    pageSize: pageSizeParam(url.searchParams),
  };
}

function queryString(query: TreeInterventionQuery) {
  const params = new URLSearchParams();
  if (query.interventionType !== undefined) params.set("interventionType", String(query.interventionType));
  if (query.status !== undefined) params.set("status", String(query.status));
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const value = params.toString();
  return value ? `?${value}` : "";
}

export async function GET(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const query = queryFromUrl(new URL(request.url));
    if (backendMode(session)) {
      const response = await fetchBackend(request, `/tree-interventions${queryString(query)}`);
      return forwardResponse(response);
    }
    return NextResponse.json(paginateTreeInterventionFixtures(filterTreeInterventionFixtures(query), query.page, query.pageSize));
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudieron cargar las intervenciones de arbolado.");
  }
}

export async function POST(request: Request) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    authorize(session, { capability: "treeIntervention:request", throwOnError: true });
    const parsed = treeInterventionCreateInputSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
    if (backendMode(session)) {
      const response = await fetchBackend(request, "/tree-interventions", "treeIntervention:request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) });
      return forwardResponse(response);
    }
    const created = createTreeInterventionFixture(parsed.data);
    addTreeInterventionFixture(created);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, error.message, path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return mapSessionError(error, path, "No se pudo crear la intervención de arbolado.");
  }
}
