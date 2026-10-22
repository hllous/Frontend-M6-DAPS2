import { z } from "zod";

import type { Capability } from "./scenarios";

/** Catálogo cerrado de roles de M6 (Backend `M6Role`, ADR-008). */
export const M6_ROLES = [
  "M6_ADMIN",
  "M6_OFICINA_OPERACIONES",
  "M6_OFICINA_AMBIENTAL",
  "M6_CAMPO_CUADRILLA",
  "M6_CAMPO_INSPECTOR",
  "M6_AUDITOR",
] as const;
export type M6Role = (typeof M6_ROLES)[number];

export const m6RoleSchema = z.enum(M6_ROLES);

/** `GET /me` del backend: identidad del token y roles de M6 efectivos (asignados ∩ lo que permite el rol de M1). */
export const meSchema = z.object({
  userId: z.string(),
  subType: z.enum(["CIUDADANO", "EMPLEADO"]),
  m1Role: z.string(),
  roles: z.array(m6RoleSchema),
});
export type Me = z.infer<typeof meSchema>;

const OFFICE_ROLES: readonly M6Role[] = ["M6_ADMIN", "M6_OFICINA_OPERACIONES", "M6_OFICINA_AMBIENTAL"];
const FIELD_ROLES: readonly M6Role[] = ["M6_CAMPO_CUADRILLA", "M6_CAMPO_INSPECTOR"];

/**
 * Qué roles habilitan cada capacidad de UI. Espeja la tabla «Rol requerido por endpoint» del backend
 * (docs/api/endpoints.md); `null` = cualquier rol de M6. Es solo optimista: el backend decide (ADR-0005).
 */
const ROLES_BY_CAPABILITY: Record<Capability, readonly M6Role[] | null> = {
  "service:view": null,
  "inventory:view": null,
  "environmentalReport:view": null,
  "environmentalInspection:view": null,
  "map:view": null,
  "catalog:view": null,
  "indicator:view": null,
  "sanctionOutcome:view": OFFICE_ROLES,
  "violationNotice:view": ["M6_ADMIN", "M6_OFICINA_AMBIENTAL", "M6_CAMPO_INSPECTOR", "M6_AUDITOR"],
  "violationNotice:issue": ["M6_ADMIN", "M6_OFICINA_AMBIENTAL"],
  "environmentalReport:create": ["M6_ADMIN", "M6_OFICINA_AMBIENTAL", "M6_CAMPO_INSPECTOR"],
  "environmentalReport:review": ["M6_ADMIN", "M6_OFICINA_AMBIENTAL"],
  "environmentalReport:close": ["M6_ADMIN", "M6_OFICINA_AMBIENTAL"],
  "environmentalInspection:schedule": ["M6_ADMIN", "M6_OFICINA_AMBIENTAL"],
  "environmentalInspection:execute": ["M6_CAMPO_INSPECTOR"],
  "service:execute": ["M6_CAMPO_CUADRILLA"],
  "container:report": ["M6_CAMPO_CUADRILLA"],
  "container:empty": ["M6_CAMPO_CUADRILLA"],
  "tree:survey": ["M6_CAMPO_CUADRILLA"],
  "service:schedule": ["M6_ADMIN", "M6_OFICINA_OPERACIONES"],
  "service:assign": ["M6_ADMIN", "M6_OFICINA_OPERACIONES"],
  "service:cancel": ["M6_ADMIN", "M6_OFICINA_OPERACIONES"],
  "service:reschedule": ["M6_ADMIN", "M6_OFICINA_OPERACIONES"],
  "container:manage": ["M6_ADMIN", "M6_OFICINA_OPERACIONES"],
  "greenSpace:manage": ["M6_ADMIN", "M6_OFICINA_OPERACIONES"],
  "greenPoint:manage": ["M6_ADMIN", "M6_OFICINA_OPERACIONES"],
  "tree:manage": ["M6_ADMIN", "M6_OFICINA_OPERACIONES"],
  "treeIntervention:request": ["M6_ADMIN", "M6_OFICINA_OPERACIONES"],
  "treeIntervention:authorize": ["M6_ADMIN", "M6_OFICINA_OPERACIONES"],
  "repairRequest:create": ["M6_ADMIN", "M6_OFICINA_OPERACIONES"],
  "streetClosureRequest:create": ["M6_ADMIN", "M6_OFICINA_OPERACIONES"],
  "referral:reconcile": ["M6_ADMIN"],
  "serviceType:manage": ["M6_ADMIN"],
  "disposalSite:manage": ["M6_ADMIN"],
  "vehicle:manage": ["M6_ADMIN"],
  "crew:manage": ["M6_ADMIN"],
  "zone:manage": ["M6_ADMIN"],
  "route:manage": ["M6_ADMIN"],
  "serviceFrequency:manage": ["M6_ADMIN"],
};

export function capabilitiesForRoles(roles: readonly M6Role[]): Capability[] {
  if (roles.length === 0) return [];
  return (Object.keys(ROLES_BY_CAPABILITY) as Capability[]).filter((capability) => {
    const allowed = ROLES_BY_CAPABILITY[capability];
    return allowed === null || roles.some((role) => allowed.includes(role));
  });
}

/** Oficina y Campo no conviven (ADR-0002); un auditor solo lee, sin alcance de cuadrilla, así que se trata como Oficina. */
export function actorKindForRoles(roles: readonly M6Role[]): "OFFICE" | "FIELD" {
  return roles.some((role) => FIELD_ROLES.includes(role)) && !roles.some((role) => OFFICE_ROLES.includes(role))
    ? "FIELD"
    : "OFFICE";
}
