import type { Tree, TreeQuery } from "./trees";

const INITIAL_TREES: Tree[] = [
  { id: "tree-1", surveyCode: "ARB-00442", zoneId: "zone-1", species: "Jacarandá", address: "Av. Cabildo 2100", lat: -34.5622, lng: -58.4562, heightM: 12.4, diameterCm: 48, active: true, lastSurvey: { surveyedAt: "2026-08-20T09:00:00.000Z", healthStatus: "WEAKENED", riskLevel: "HIGH", riskType: "FALLING_BRANCH", suggestedIntervention: "SAFETY_PRUNING" } },
  { id: "tree-2", surveyCode: "ARB-00443", zoneId: "zone-2", species: "Tipa", address: "Parque del Bicentenario, sector norte", lat: -34.5692, lng: -58.4051, heightM: 18, diameterCm: 72.5, active: true, lastSurvey: { surveyedAt: "2026-08-18T10:30:00.000Z", healthStatus: "HEALTHY", riskLevel: "LOW", riskType: null, suggestedIntervention: null } },
  { id: "tree-4", surveyCode: "ARB-00445", zoneId: "zone-3", species: "Ceibo", address: "Av. Las Heras 2100", lat: -34.587, lng: -58.397, heightM: 10.5, diameterCm: 44, active: true, lastSurvey: null },
  { id: "tree-3", surveyCode: "ARB-00444", zoneId: "zone-4", species: "Plátano", address: "Esmeralda 900", lat: -34.5981, lng: -58.3791, heightM: 9.2, diameterCm: 39, active: false, lastSurvey: { surveyedAt: "2026-08-12T14:00:00.000Z", healthStatus: "DISEASED", riskLevel: "CRITICAL", riskType: "TRUNK_INSTABILITY", suggestedIntervention: "REMOVAL" } },
];

export const treeFixtures: Tree[] = structuredClone(INITIAL_TREES);

export function resetTreeFixtures() {
  treeFixtures.splice(0, treeFixtures.length, ...structuredClone(INITIAL_TREES));
}

export function filterTreeFixtures(query: TreeQuery): Tree[] {
  return treeFixtures.filter((item) => {
    if (query.active !== undefined && item.active !== query.active) return false;
    if (query.zoneId && item.zoneId !== query.zoneId) return false;
    if (query.search && !`${item.species} ${item.address ?? ""}`.toLowerCase().includes(query.search.toLowerCase())) return false;
    return true;
  });
}

export function paginateTreeFixtures(items: Tree[], page = 1, pageSize = 20) {
  const start = (page - 1) * pageSize;
  return { data: items.slice(start, start + pageSize), meta: { total: items.length, page, pageSize, totalPages: Math.max(1, Math.ceil(items.length / pageSize)) } };
}

export function addTreeFixture(item: Tree) {
  treeFixtures.push(item);
}

export function updateTreeFixture(id: string, changes: Partial<Tree>): Tree | null {
  const index = treeFixtures.findIndex((item) => item.id === id);
  if (index === -1) return null;
  const current = treeFixtures[index];
  if (!current) return null;
  const { surveyCode: _immutableSurveyCode, id: _immutableId, ...editableChanges } = changes;
  const updated = { ...current, ...editableChanges };
  treeFixtures[index] = updated;
  return updated;
}
