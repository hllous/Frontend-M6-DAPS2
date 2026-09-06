export type M1IdentityKind = "USER" | "ORGANIZATION";
export type M1IdentityReference = { id: string; displayName: string; kind: M1IdentityKind };

const users: M1IdentityReference[] = [
  { id: "user-maria", displayName: "María Fernández", kind: "USER" },
  { id: "user-carlos", displayName: "Carlos López", kind: "USER" },
  { id: "user-jorge", displayName: "Jorge Ibáñez", kind: "USER" },
  { id: "user-lucia", displayName: "Lucía Gómez", kind: "USER" },
  { id: "user-ana", displayName: "Ana Morales", kind: "USER" },
  { id: "user-pedro", displayName: "Pedro Ruiz", kind: "USER" },
];
const organizations: M1IdentityReference[] = [
  { id: "org-municipal", displayName: "Municipalidad", kind: "ORGANIZATION" },
  { id: "org-cooperativa", displayName: "Cooperativa del Sur", kind: "ORGANIZATION" },
  { id: "org-contratista", displayName: "Servicios Urbanos S.A.", kind: "ORGANIZATION" },
];

// Replace this fixture implementation with the confirmed M1 lookup adapter when its contract exists.
export const m1IdentityAdapter = {
  async getUser(id: string) { return users.find((item) => item.id === id) ?? { id, displayName: "Usuario M1 no resuelto", kind: "USER" as const }; },
  async getOrganization(id: string) { return organizations.find((item) => item.id === id) ?? { id, displayName: "Organización M1 no resuelta", kind: "ORGANIZATION" as const }; },
  async listUsers() { return users; },
  async listOrganizations() { return organizations; },
};
