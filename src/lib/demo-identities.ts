import type { ScenarioId } from "./scenarios";

// Datos puros (sin node:crypto): los lee también el navegador. La firma vive en demo-jwt.ts, solo servidor.

/** Persona del seed del backend (prisma/seed.ts): `sub` numérico de M1 y el rol de M1 que le permite sus roles de M6. */
export type DemoIdentity = { sub: string; m1Role: "RESPONSABLE_AREA" | "ADMINISTRATIVO" | "AUDITOR" | "CIUDADANO"; name: string };

/**
 * Perfil del login -> persona. Las 12 cuentas de M1 (10000 a 10011) existen en el seed del backend; 900 y 901 no tienen filas de roles:
 * el empleado sin rol recibe `roles: []` de GET /me y el ciudadano un 403 por `sub_type`.
 */
export const DEMO_IDENTITIES: Record<ScenarioId, DemoIdentity> = {
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
