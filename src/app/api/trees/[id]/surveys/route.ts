import { NextResponse } from "next/server";

import { fetchBackend } from "@/lib/bff-backend";
import { updateTreeFixture } from "@/lib/tree-fixtures";
import { addTreeSurveyFixture, createTreeSurveyFixture, filterTreeSurveyFixtures, paginateTreeSurveyFixtures } from "@/lib/tree-survey-fixtures";
import { treeHealthStatusSchema, treeSurveyCreateInputSchema, riskLevelSchema, type TreeSurveyQuery } from "@/lib/tree-surveys";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError, requireCapability } from "@/lib/session";

const ERROR_LABELS: Record<number, string> = { 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 503: "Service Unavailable", 500: "Internal Server Error" };
function errorResponse(status: number, message: string, path: string) { return NextResponse.json({ statusCode: status, message, error: ERROR_LABELS[status] ?? "Error", timestamp: new Date().toISOString(), path }, { status }); }
async function treeId(context: { params: Promise<{ id: string }> | { id: string } }) { return (await context.params).id; }
function queryFromUrl(url: URL): TreeSurveyQuery { return { healthStatus: treeHealthStatusSchema.safeParse(url.searchParams.get("healthStatus")).data, riskLevel: riskLevelSchema.safeParse(url.searchParams.get("riskLevel")).data, page: url.searchParams.has("page") ? Number(url.searchParams.get("page")) : undefined, pageSize: url.searchParams.has("pageSize") ? Number(url.searchParams.get("pageSize")) : undefined }; }

export async function GET(request: Request, context: { params: Promise<{ id: string }> | { id: string } }) {
  const path = new URL(request.url).pathname;
  try {
    const session = getRequiredSession(request);
    const id = await treeId(context);
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const response = await fetchBackend(request, `/trees/${id}/surveys${new URL(request.url).search}`);
      return new NextResponse(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
    }
    const query = queryFromUrl(new URL(request.url));
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
    if (session.mode === "backend-development" && process.env.M6_BACKEND_ORIGIN) {
      const response = await fetchBackend(request, `/trees/${id}/surveys`, "tree:survey", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(parsed.data) });
      return new NextResponse(await response.text(), { status: response.status, headers: { "content-type": response.headers.get("content-type") ?? "application/json" } });
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
