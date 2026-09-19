import type { TreeSurvey, TreeSurveyCreateInput, TreeSurveyQuery } from "./tree-surveys";

const INITIAL_TREE_SURVEYS: TreeSurvey[] = [
  { id: "survey-1", treeId: "tree-2", surveyedAt: "2026-08-20T10:00:00.000Z", inspectorId: "field-user-1", healthStatus: "HEALTHY", riskLevel: "LOW", riskType: null, suggestedIntervention: null, requiresStreetClosure: false, requiresPublicWorks: false, notes: "Copa estable y sin daños visibles." },
  { id: "survey-2", treeId: "tree-2", surveyedAt: "2026-09-06T14:30:00.000Z", inspectorId: "field-user-1", healthStatus: "WEAKENED", riskLevel: "HIGH", riskType: "FALLING_BRANCH", suggestedIntervention: "SAFETY_PRUNING", requiresStreetClosure: true, requiresPublicWorks: false, notes: "Ramas secas sobre la vereda." },
  { id: "survey-4", treeId: "tree-4", surveyedAt: "2026-09-05T11:00:00.000Z", inspectorId: "field-user-1", healthStatus: "WEAKENED", riskLevel: "CRITICAL", riskType: "TRUNK_INSTABILITY", suggestedIntervention: "REMOVAL", requiresStreetClosure: true, requiresPublicWorks: false, notes: "Inestabilidad del tronco junto al sendero peatonal." },
  { id: "survey-3", treeId: "tree-1", surveyedAt: "2026-08-28T09:15:00.000Z", inspectorId: "office-user-1", healthStatus: "DISEASED", riskLevel: "MEDIUM", riskType: "PEST_INFESTATION", suggestedIntervention: "TREATMENT", requiresStreetClosure: false, requiresPublicWorks: false, notes: "Se observan signos de plaga." },
];

export const treeSurveyFixtures: TreeSurvey[] = structuredClone(INITIAL_TREE_SURVEYS);

export function resetTreeSurveyFixtures() {
  treeSurveyFixtures.splice(0, treeSurveyFixtures.length, ...structuredClone(INITIAL_TREE_SURVEYS));
}

export function filterTreeSurveyFixtures(treeId: string, query: TreeSurveyQuery) {
  return treeSurveyFixtures
    .filter((survey) => survey.treeId === treeId)
    .filter((survey) => !query.healthStatus || survey.healthStatus === query.healthStatus)
    .filter((survey) => !query.riskLevel || survey.riskLevel === query.riskLevel)
    .sort((left, right) => right.surveyedAt.localeCompare(left.surveyedAt));
}

export function paginateTreeSurveyFixtures(items: TreeSurvey[], page = 1, pageSize = 20) {
  const resolvedPage = Number.isInteger(page) && page > 0 ? page : 1;
  const resolvedPageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 20;
  return { data: items.slice((resolvedPage - 1) * resolvedPageSize, (resolvedPage - 1) * resolvedPageSize + resolvedPageSize), meta: { total: items.length, page: resolvedPage, pageSize: resolvedPageSize, totalPages: Math.max(1, Math.ceil(items.length / resolvedPageSize)) } };
}

export function addTreeSurveyFixture(survey: TreeSurvey) {
  treeSurveyFixtures.push(survey);
}

export function createTreeSurveyFixture(treeId: string, input: TreeSurveyCreateInput, inspectorId: string): TreeSurvey {
  return { id: `survey-${Date.now()}`, treeId, surveyedAt: input.surveyedAt, inspectorId, healthStatus: input.healthStatus, riskLevel: input.riskLevel, riskType: input.riskType ?? null, suggestedIntervention: input.suggestedIntervention ?? null, requiresStreetClosure: input.requiresStreetClosure, requiresPublicWorks: input.requiresPublicWorks, notes: input.notes?.trim() || null };
}

export function getTreeSurveyFixture(treeId: string, surveyId: string) {
  return treeSurveyFixtures.find((survey) => survey.treeId === treeId && survey.id === surveyId) ?? null;
}
