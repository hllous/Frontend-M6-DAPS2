import { todayInArgentina } from "./argentina-date";
import type { CrewZoneAssignment } from "./crew-zone-assignments";
import { crewSchema, type Crew, type CrewQuery } from "./crews";

function dayFromToday(offset: number) { const date = new Date(`${todayInArgentina()}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0, 10); }

const initialCrews: Crew[] = [
  { id: "crew-a", name: "Cuadrilla A · López", crewType: "MUNICIPAL", leaderUserId: "user-carlos", leaderName: "Carlos López", members: [{ userId: "user-carlos", displayName: "Carlos López" }, { userId: "user-lucia", displayName: null }], organizationName: "Municipalidad", memberUserIds: ["user-carlos", "user-lucia"], organizationId: "org-municipal", specialty: "COLLECTION", homeZoneId: "zone-1", effectiveZoneId: "zone-1", defaultShift: "MORNING", active: true },
  { id: "crew-b", name: "Cuadrilla B · Fernández", crewType: "COOPERATIVE", leaderUserId: "user-maria", leaderName: null, members: [{ userId: "user-maria", displayName: "María Fernández" }, { userId: "user-jorge", displayName: "Jorge Ibáñez" }], memberUserIds: ["user-maria", "user-jorge"], organizationId: "org-cooperativa", specialty: "SWEEPING", homeZoneId: "zone-2", effectiveZoneId: "zone-2", defaultShift: "MORNING", active: true },
  { id: "crew-c", name: "Cuadrilla C · Ibáñez", crewType: "CONTRACTOR", leaderUserId: "user-jorge", leaderName: "Jorge Ibáñez", organizationName: "Servicios Urbanos S.A.", memberUserIds: ["user-jorge"], organizationId: "org-contratista", specialty: "TREES", homeZoneId: "zone-3", effectiveZoneId: "zone-4", defaultShift: "AFTERNOON", active: true },
  { id: "crew-d", name: "Cuadrilla D · Gómez", crewType: "MUNICIPAL", leaderUserId: null, memberUserIds: ["user-lucia"], organizationId: null, specialty: null, homeZoneId: "zone-5", effectiveZoneId: "zone-5", defaultShift: "NIGHT", active: false },
  { id: "crew-membership", name: "Cuadrilla E - Membresia", crewType: "MUNICIPAL", leaderUserId: "user-ana", leaderName: "Ana Morales", members: [{ userId: "user-ana", displayName: "Ana Morales" }], organizationName: "Municipalidad", memberUserIds: ["user-ana"], organizationId: "org-municipal", specialty: "RECYCLING", homeZoneId: null, effectiveZoneId: null, defaultShift: "MORNING", active: true },
].map((crew) => crewSchema.parse(crew));
export const crewFixtures: Crew[] = structuredClone(initialCrews);
export function filterCrewFixtures(query: CrewQuery & { crewId?: string }) { return crewFixtures.filter((crew) => (query.crewId === undefined || crew.id === query.crewId) && (query.active === undefined || crew.active === query.active) && (!query.crewType || crew.crewType === query.crewType) && (!query.defaultShift || crew.defaultShift === query.defaultShift) && (!query.zoneId || crew.effectiveZoneId === query.zoneId) && (!query.specialty || crew.specialty === query.specialty)); }
export function paginateCrewFixtures(crews: Crew[], page = 1, pageSize = 20) { const start = (page - 1) * pageSize; return { data: crews.slice(start, start + pageSize), meta: { total: crews.length, page, pageSize, totalPages: Math.max(1, Math.ceil(crews.length / pageSize)) } }; }
export function addCrewFixture(crew: Crew) { crewFixtures.push(crew); }
export function resetCrewFixtures() { crewFixtures.splice(0, crewFixtures.length, ...structuredClone(initialCrews)); crewZoneAssignmentFixtures.splice(0, crewZoneAssignmentFixtures.length, ...initialZoneAssignments()); }

// Moves keep crew-c (home zone-3, effective zone-4) consistent with an active move; dates follow today so it stays active.
const initialZoneAssignments = (): CrewZoneAssignment[] => [
  { id: "move-crew-c-past", crewId: "crew-c", zoneId: "zone-2", validFrom: dayFromToday(-60), validTo: dayFromToday(-45), reason: "Refuerzo de poda por temporal", createdBy: "3", createdAt: `${dayFromToday(-61)}T12:00:00.000Z` },
  { id: "move-crew-c-active", crewId: "crew-c", zoneId: "zone-4", validFrom: dayFromToday(-5), validTo: dayFromToday(10), reason: "Operativo de arbolado en la zona 4", createdBy: "3", createdAt: `${dayFromToday(-6)}T12:00:00.000Z` },
];
export const crewZoneAssignmentFixtures: CrewZoneAssignment[] = initialZoneAssignments();
export function listCrewZoneAssignmentFixtures(crewId: string) { return crewZoneAssignmentFixtures.filter((move) => move.crewId === crewId).sort((a, b) => b.validFrom.localeCompare(a.validFrom)); }
export function overlapsCrewZoneAssignment(crewId: string, validFrom: string, validTo: string | null | undefined) { return crewZoneAssignmentFixtures.some((move) => move.crewId === crewId && validFrom <= (move.validTo ?? "9999-12-31") && move.validFrom <= (validTo ?? "9999-12-31")); }
export function addCrewZoneAssignmentFixture(move: CrewZoneAssignment) {
  crewZoneAssignmentFixtures.push(move);
  const crew = crewFixtures.find((item) => item.id === move.crewId);
  const today = todayInArgentina();
  if (crew && move.validFrom <= today && (move.validTo ?? "9999-12-31") >= today) crew.effectiveZoneId = move.zoneId;
}
