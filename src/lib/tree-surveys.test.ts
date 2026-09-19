import { afterEach, describe, expect, it, vi } from "vitest";

import { treeSurveysAdapter, TreeSurveyContractError, TreeSurveyRequestError } from "./tree-surveys";

afterEach(() => vi.restoreAllMocks());

const survey = {
  id: "survey-1",
  treeId: "tree-2",
  surveyedAt: "2026-09-06T14:30:00.000Z",
  inspectorId: "field-user-1",
  healthStatus: "WEAKENED",
  riskLevel: "HIGH",
  riskType: "FALLING_BRANCH",
  suggestedIntervention: "SAFETY_PRUNING",
  requiresStreetClosure: true,
  requiresPublicWorks: false,
  notes: "Ramas secas sobre la vereda.",
};

describe("treeSurveysAdapter", () => {
  it("forwards tree history filters and validates the paginated response", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ data: [survey], meta: { total: 1, page: 1, pageSize: 10, totalPages: 1 } })));

    await expect(treeSurveysAdapter.getTreeSurveys("tree-2", { healthStatus: "WEAKENED", riskLevel: "HIGH", page: 1, pageSize: 10 })).resolves.toMatchObject({ surveys: [survey], totalPages: 1 });
    expect(fetchMock).toHaveBeenCalledWith("/api/trees/tree-2/surveys?healthStatus=WEAKENED&riskLevel=HIGH&page=1&pageSize=10", expect.objectContaining({ cache: "no-store" }));
  });

  it("creates a survey with the documented ambient shape and reads its detail", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(survey), { status: 201 }));
    const input = { surveyedAt: survey.surveyedAt, healthStatus: "WEAKENED" as const, riskLevel: "HIGH" as const, riskType: "FALLING_BRANCH" as const, suggestedIntervention: "SAFETY_PRUNING" as const, requiresStreetClosure: true, requiresPublicWorks: false, notes: survey.notes };

    await expect(treeSurveysAdapter.createTreeSurvey("tree-2", input)).resolves.toEqual(survey);
    expect(fetchMock).toHaveBeenCalledWith("/api/trees/tree-2/surveys", expect.objectContaining({ method: "POST", body: JSON.stringify(input) }));

    fetchMock.mockResolvedValue(new Response(JSON.stringify(survey)));
    await expect(treeSurveysAdapter.getTreeSurvey("tree-2", "survey-1")).resolves.toEqual(survey);
    expect(fetchMock).toHaveBeenLastCalledWith("/api/trees/tree-2/surveys/survey-1", expect.objectContaining({ cache: "no-store" }));
  });

  it("rejects malformed success and error responses", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ malformed: true })));
    await expect(treeSurveysAdapter.getTreeSurveys("tree-2")).rejects.toBeInstanceOf(TreeSurveyContractError);

    fetchMock.mockResolvedValue(new Response(JSON.stringify({ statusCode: 403, message: "Sin permiso", error: "Forbidden", timestamp: "now", path: "/api/trees/tree-2/surveys" }), { status: 403 }));
    await expect(treeSurveysAdapter.getTreeSurveys("tree-2")).rejects.toMatchObject({ constructor: TreeSurveyRequestError, status: 403 });
  });
});
