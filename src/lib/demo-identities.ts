import type { ScenarioId } from "./scenarios";

// Datos puros (sin node:crypto): los lee también el navegador. La firma vive en demo-jwt.ts, solo servidor.

/** Persona del seed del backend (prisma/seed.ts): `sub` numérico de M1 y el rol de M1 que le permite sus roles de M6. */
export type DemoIdentity = { sub: string; m1Role: "RESPONSABLE_AREA" | "ADMINISTRATIVO" | "AUDITOR" | "CIUDADANO"; name: string };

/**
 * Perfil del login -> persona. Oficina 2 a 9 y Campo desde 101 existen en el seed; 900 y 901 no tienen filas de roles:
 * el empleado sin rol recibe `roles: []` de GET /me y el ciudadano un 403 por `sub_type`.
 */
export const DEMO_IDENTITIES: Record<ScenarioId, DemoIdentity> = {
  "office-duty-queue": { sub: "2", m1Role: "RESPONSABLE_AREA", name: "Carlos Rodríguez" },
  "office-operations": { sub: "3", m1Role: "ADMINISTRATIVO", name: "Julián López" },
  "office-environmental": { sub: "5", m1Role: "ADMINISTRATIVO", name: "Diego Sosa" },
  "office-limited-intake": { sub: "8", m1Role: "AUDITOR", name: "Camila Medina" },
  "field-crew-leader-route": { sub: "101", m1Role: "ADMINISTRATIVO", name: "Diego Domínguez" },
  "field-crew-member-route": { sub: "102", m1Role: "ADMINISTRATIVO", name: "Valeria Aguirre" },
  "field-inspector": { sub: "601", m1Role: "ADMINISTRATIVO", name: "Lucía López" },
  "employee-no-role": { sub: "900", m1Role: "ADMINISTRATIVO", name: "Empleado sin rol" },
  "citizen": { sub: "901", m1Role: "CIUDADANO", name: "Ciudadano" },
};
