import { backendMode, errorResponse, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";

import { fetchBackend, pathId } from "@/lib/bff-backend";
import { updateTreeFixture } from "@/lib/tree-fixtures";
import { addTreeSurveyFixture, createTreeSurveyFixture, filterTreeSurveyFixtures, paginateTreeSurveyFixtures } from "@/lib/tree-survey-fixtures";
import { treeHealthStatusSchema, treeSurveyCreateInputSchema, riskLevelSchema, type TreeSurveyQuery } from "@/lib/tree-surveys";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError, requireCapability } from "@/lib/session";
import { pageParam, pageSizeParam } from "@/lib/input-limits";



async function treeId(context: { params: Promise<{ id: string }> | { id: string } }) { return (await context.params).id; }
function queryFromUrl(url: URL): TreeSurveyQuery { return { healthStatus: treeHealthStatusSchema.safeParse(url.searchParams.get("healthStatus")).data, riskLevel: riskLevelSchema.safeParse(url.searchParams.get("riskLevel")).data, page: pageParam(url.searchParams), pageSize: pageSizeParam(url.searchParams) }; }

function queryString(query: TreeSurveyQuery) {
  const params = new URLSearchParams();
  if (query.healthStatus !== undefined) params.set("healthStatus", String(query.healthStatus));
  if (query.riskLevel !== undefined) params.set("riskLevel", String(query.riskLevel));
  if (query.page !== undefined) params.set("page", String(query.page));
  if (query.pageSize !== undefined) params.set("pageSize", String(query.pageSize));
  const value = params.toString();
  return value ? `?${value}` : "";
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const id = await treeId(context);
    const query = queryFromUrl(new URL(request.url));
    if (backendMode(session)) {
      const response = await fetchBackend(request, `/trees/${pathId(id)}/surveys${queryString(query)}`);
      return forwardResponse(response);
    }
    return NextResponse.json(paginateTreeSurveyFixtures(filterTreeSurveyFixtures(id, query), query.page, query.pageSize));
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo cargar el historial de relevamientos.", path);
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    requireCapability(session, "tree:survey");
    const id = await treeId(context);
    const body = await request.json().catch(() => undefined);
    const parsed = treeSurveyCreateInputSchema.safeParse(body);
    if (!parsed.success) return errorResponse(400, parsed.error.issues.map((issue) => issue.message).join(" "), path);
    if (backendMode(session)) {
      const response = await fetchBackend(request, `/trees/${pathId(id)}/surveys`, "tree:survey", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) });
      return forwardResponse(response);
    }
    const created = createTreeSurveyFixture(id, parsed.data, session.scenarioId);
    addTreeSurveyFixture(created);
    updateTreeFixture(id, {
      lastSurvey: {
        surveyedAt: created.surveyedAt,
        healthStatus: created.healthStatus,
        riskLevel: created.riskLevel,
        riskType: created.riskType,
        suggestedIntervention: created.suggestedIntervention,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof InvalidSessionError) return errorResponse(401, "La sesión no está activa.", path);
    if (error instanceof ForbiddenSessionError) return errorResponse(403, error.message, path);
    if (error instanceof AuthUnavailableError) return errorResponse(503, error.message, path);
    return errorResponse(500, "No se pudo registrar el relevamiento.", path);
  }
}
