import type { ScenarioId } from "./scenarios";

// Identidades de los fixtures de escenarios locales y pruebas; no se usan para firmar ni autenticar tokens.

/** Identidad de fixture asociada a un escenario: `sub` numérico de M1 y rol de M1 para los roles de M6 del ejemplo. */
export type ScenarioIdentity = { sub: string; m1Role: "RESPONSABLE_AREA" | "ADMINISTRATIVO" | "AUDITOR" | "CIUDADANO"; name: string };

/**
 * Perfil del login -> persona. Las 12 cuentas de M1 (10000 a 10011) existen en el seed del backend; 900 y 901 no tienen filas de roles:
 * el empleado sin rol recibe `roles: []` de GET /me y el ciudadano un 403 por `sub_type`.
 */
export const SCENARIO_IDENTITIES: Record<ScenarioId, ScenarioIdentity> = {
  "office-duty-queue": { sub: "10000", m1Role: "RESPONSABLE_AREA", name: "Carlos Rodríguez" },
  "office-operations": { sub: "10002", m1Role: "ADMINISTRATIVO", name: "Julián López" },
  "office-environmental": { sub: "10004", m1Role: "ADMINISTRATIVO", name: "Diego Sosa" },
  "office-limited-intake": { sub: "10007", m1Role: "AUDITOR", name: "Camila Medina" },
  "field-crew-leader-route": { sub: "10009", m1Role: "ADMINISTRATIVO", name: "Sofía López" },
  "field-crew-member-route": { sub: "10010", m1Role: "ADMINISTRATIVO", name: "Diego Martínez" },
  "field-inspector": { sub: "10011", m1Role: "ADMINISTRATIVO", name: "Carlos Medina" },
  "employee-no-role": { sub: "900", m1Role: "ADMINISTRATIVO", name: "Empleado sin rol" },
  "citizen": { sub: "901", m1Role: "CIUDADANO", name: "Ciudadano" },
};
