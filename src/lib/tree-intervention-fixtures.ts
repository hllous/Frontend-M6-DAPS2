import type { Tree } from "./trees";
import { treeFixtures } from "./tree-fixtures";
import type { TreeIntervention, TreeInterventionCreateInput, TreeInterventionQuery } from "./tree-interventions";

function linkedTrees(treeIds: string[]) {
  return treeIds.flatMap((treeId) => {
    const tree = treeFixtures.find((candidate) => candidate.id === treeId);
    return tree ? [tree] : [];
  });
}

function intervention(input: Omit<TreeIntervention, "trees">): TreeIntervention {
  return { ...input, trees: linkedTrees(input.treeIds) };
}

const INITIAL_TREE_INTERVENTIONS: TreeIntervention[] = [
  intervention({ id: "intervention-1", interventionType: "SAFETY_PRUNING", treeIds: ["tree-2", "tree-4"], address: "Parque del Bicentenario, sector norte", requiresStreetClosure: true, priority: "HIGH", status: "REQUESTED", serviceId: null, justification: "Relevamiento 06/09/2026 (survey-2).", authorizedByUserId: null, authorizedAt: null }),
  intervention({ id: "intervention-2", interventionType: "TREATMENT", treeIds: ["tree-1"], address: "Av. Mitre 1140", requiresStreetClosure: false, priority: "MEDIUM", status: "AUTHORIZED", serviceId: null, justification: null, authorizedByUserId: "user-carlos", authorizedAt: "2026-09-06T10:15:00.000Z" }),
  intervention({ id: "intervention-3", interventionType: "REMOVAL", treeIds: ["tree-4"], address: "Paseo de la Costa 220", requiresStreetClosure: false, priority: "CRITICAL", status: "REQUESTED", serviceId: null, justification: "El ejemplar presenta inestabilidad crítica.", authorizedByUserId: null, authorizedAt: null }),
];

export const treeInterventionFixtures: TreeIntervention[] = structuredClone(INITIAL_TREE_INTERVENTIONS);

export function resetTreeInterventionFixtures() {
  treeInterventionFixtures.splice(0, treeInterventionFixtures.length, ...structuredClone(INITIAL_TREE_INTERVENTIONS));
}

export function filterTreeInterventionFixtures(query: TreeInterventionQuery) {
  return treeInterventionFixtures
    .filter((item) => !query.interventionType || item.interventionType === query.interventionType)
    .filter((item) => !query.status || item.status === query.status);
}

export function paginateTreeInterventionFixtures(items: TreeIntervention[], page = 1, pageSize = 20) {
  const resolvedPage = Number.isInteger(page) && page > 0 ? page : 1;
  const resolvedPageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 20;
  return { data: items.slice((resolvedPage - 1) * resolvedPageSize, (resolvedPage - 1) * resolvedPageSize + resolvedPageSize), meta: { total: items.length, page: resolvedPage, pageSize: resolvedPageSize, totalPages: Math.max(1, Math.ceil(items.length / resolvedPageSize)) } };
}

export function createTreeInterventionFixture(input: TreeInterventionCreateInput): TreeIntervention {
  return intervention({ id: `intervention-${Date.now()}`, interventionType: input.interventionType, treeIds: input.treeIds, address: input.address, requiresStreetClosure: input.requiresStreetClosure, priority: input.priority, status: "REQUESTED", serviceId: null, justification: input.justification?.trim() || null });
}

export function addTreeInterventionFixture(item: TreeIntervention) {
  treeInterventionFixtures.push(item);
}

export function getTreeInterventionFixture(id: string) {
  return treeInterventionFixtures.find((item) => item.id === id) ?? null;
}

export function updateTreeInterventionFixture(
  id: string,
  changes: Partial<Omit<TreeIntervention, "id" | "trees">>,
) {
  const index = treeInterventionFixtures.findIndex((item) => item.id === id);
  if (index < 0) return null;
  const updated = { ...treeInterventionFixtures[index], ...changes };
  treeInterventionFixtures[index] = updated;
  return updated;
}

export function refreshTreeInterventionLinks(item: TreeIntervention, trees: Tree[]) {
  return { ...item, trees: item.treeIds.flatMap((treeId) => trees.filter((tree) => tree.id === treeId)) };
}
