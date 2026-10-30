import { crewSchema, type Crew, type CrewQuery } from "./crews";

const initialCrews: Crew[] = [
  { id: "crew-a", name: "Cuadrilla A · López", crewType: "MUNICIPAL", leaderUserId: "user-carlos", leaderName: "Carlos López", members: [{ userId: "user-carlos", displayName: "Carlos López" }, { userId: "user-lucia", displayName: null }], organizationName: "Municipalidad", memberUserIds: ["user-carlos", "user-lucia"], organizationId: "org-municipal", defaultShift: "MORNING", active: true },
  { id: "crew-b", name: "Cuadrilla B · Fernández", crewType: "COOPERATIVE", leaderUserId: "user-maria", leaderName: null, members: [{ userId: "user-maria", displayName: "María Fernández" }, { userId: "user-jorge", displayName: "Jorge Ibáñez" }], memberUserIds: ["user-maria", "user-jorge"], organizationId: "org-cooperativa", defaultShift: "MORNING", active: true },
  { id: "crew-c", name: "Cuadrilla C · Ibáñez", crewType: "CONTRACTOR", leaderUserId: "user-jorge", leaderName: "Jorge Ibáñez", organizationName: "Servicios Urbanos S.A.", memberUserIds: ["user-jorge"], organizationId: "org-contratista", defaultShift: "AFTERNOON", active: true },
  { id: "crew-d", name: "Cuadrilla D · Gómez", crewType: "MUNICIPAL", leaderUserId: null, memberUserIds: ["user-lucia"], organizationId: null, defaultShift: "NIGHT", active: false },
  { id: "crew-membership", name: "Cuadrilla E - Membresia", crewType: "MUNICIPAL", leaderUserId: "user-ana", leaderName: "Ana Morales", members: [{ userId: "user-ana", displayName: "Ana Morales" }], organizationName: "Municipalidad", memberUserIds: ["user-ana"], organizationId: "org-municipal", defaultShift: "MORNING", active: true },
].map((crew) => crewSchema.parse(crew));
export const crewFixtures: Crew[] = structuredClone(initialCrews);
export function filterCrewFixtures(query: CrewQuery & { crewId?: string }) { return crewFixtures.filter((crew) => (query.crewId === undefined || crew.id === query.crewId) && (query.active === undefined || crew.active === query.active) && (!query.crewType || crew.crewType === query.crewType) && (!query.defaultShift || crew.defaultShift === query.defaultShift)); }
export function paginateCrewFixtures(crews: Crew[], page = 1, pageSize = 20) { const start = (page - 1) * pageSize; return { data: crews.slice(start, start + pageSize), meta: { total: crews.length, page, pageSize, totalPages: Math.max(1, Math.ceil(crews.length / pageSize)) } }; }
export function addCrewFixture(crew: Crew) { crewFixtures.push(crew); }
export function resetCrewFixtures() { crewFixtures.splice(0, crewFixtures.length, ...structuredClone(initialCrews)); }
