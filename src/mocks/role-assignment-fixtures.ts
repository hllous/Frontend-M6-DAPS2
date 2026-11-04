import { m6RoleSchema, type M6Role } from "@/lib/m6-roles";
import { SCENARIO_IDENTITIES } from "@/lib/scenario-identities";
import { z } from "zod";

export const replacementSchema = z.object({ roles: z.array(m6RoleSchema).refine((roles) => new Set(roles).size === roles.length).refine((roles) => !(roles.some((role) => role === "M6_ADMIN" || role.startsWith("M6_OFICINA_")) && roles.some((role) => role.startsWith("M6_CAMPO_")))) }).strict();
export const validUserId = (id: string) => /^\d+$/.test(id);
const seed: Record<string, M6Role[]> = {
  [SCENARIO_IDENTITIES["office-duty-queue"].sub]: ["M6_ADMIN"],
  [SCENARIO_IDENTITIES["office-operations"].sub]: ["M6_OFICINA_OPERACIONES"],
  [SCENARIO_IDENTITIES["field-crew-leader-route"].sub]: ["M6_CAMPO_CUADRILLA"],
};
let assignments = structuredClone(seed);
export function resetRoleAssignmentFixtures() { assignments = structuredClone(seed); }
export function getRoles(userId: string) { return assignments[userId] ?? []; }
export function listRoles(page: number, pageSize: number) {
  const all = Object.keys(assignments).filter((id) => assignments[id].length > 0).sort().map((userId) => ({ userId, roles: assignments[userId] }));
  return { data: all.slice((page - 1) * pageSize, page * pageSize), meta: { total: all.length, page, pageSize, totalPages: Math.ceil(all.length / pageSize) } };
}
export function setRoles(userId: string, roles: M6Role[]) {
  if (getRoles(userId).includes("M6_ADMIN") && !roles.includes("M6_ADMIN") && !Object.entries(assignments).some(([id, value]) => id !== userId && value.includes("M6_ADMIN"))) return false;
  assignments[userId] = roles;
  return true;
}
