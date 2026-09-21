import { afterEach, describe, expect, it, vi } from "vitest";

import { treeSurveyCreateInputSchema, treeSurveysAdapter, TreeSurveyContractError, TreeSurveyRequestError } from "./tree-surveys";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

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

describe("treeSurveyCreateInputSchema", () => {
  const validInput = { surveyedAt: "2026-09-20T12:00:00.000Z", healthStatus: "HEALTHY" as const, riskLevel: "LOW" as const, requiresStreetClosure: false, requiresPublicWorks: false };

  function freezeAt(iso: string) {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(iso));
  }

  it("accepts today's Argentina date even when UTC already reads as tomorrow", () => {
    freezeAt("2026-09-21T01:30:00Z");
    expect(treeSurveyCreateInputSchema.safeParse(validInput).success).toBe(true);
  });

  it("rejects a survey dated after today in Argentina with a clear message", () => {
    freezeAt("2026-09-21T01:30:00Z");
    const result = treeSurveyCreateInputSchema.safeParse({ ...validInput, surveyedAt: "2026-09-21T12:00:00.000Z" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: ["surveyedAt"], message: "La fecha del relevamiento no puede ser futura." });
  });

  it("accepts past dates", () => {
    freezeAt("2026-09-20T15:00:00Z");
    expect(treeSurveyCreateInputSchema.safeParse({ ...validInput, surveyedAt: "2026-01-05T12:00:00.000Z" }).success).toBe(true);
  });

  it("requires riskType for HIGH and CRITICAL risk levels", () => {
    freezeAt("2026-09-20T15:00:00Z");
    for (const riskLevel of ["HIGH", "CRITICAL"] as const) {
      const result = treeSurveyCreateInputSchema.safeParse({ ...validInput, riskLevel });
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]).toMatchObject({ path: ["riskType"], message: "Indique el tipo de riesgo para niveles altos o críticos." });
    }
    expect(treeSurveyCreateInputSchema.safeParse({ ...validInput, riskLevel: "HIGH", riskType: "FALLING_BRANCH" }).success).toBe(true);
  });
});
