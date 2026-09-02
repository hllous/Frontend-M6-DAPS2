// PROTOTYPE fixture data for Wayfinder ticket #14 (map-and-table workspace).
// No backend exists yet (see CONTRACTS.md) — this stands in for a real
// GET /services?... response. Shape is illustrative, not a contract.

export type ServiceStatus =
  | "SCHEDULED"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "SERVICED"
  | "COMPLETED"
  | "SUSPENDED"
  | "CANCELLED";

export type ServiceKind = "ROUTE" | "POINT";

export interface StatusEvent {
  label: string;
  at: string; // display timestamp
  done: boolean;
}

export interface MockService {
  id: string;
  kind: ServiceKind;
  title: string;
  zone: string;
  status: ServiceStatus;
  crew: string;
  scheduledFor: string;
  /** 0-100 mock plane coordinates standing in for real lat/lng. */
  x: number;
  y: number;
  flag?: "delayed" | "conflict";
  history: StatusEvent[];
}

export const STATUS_LABEL: Record<ServiceStatus, string> = {
  SCHEDULED: "Programado",
  ASSIGNED: "Asignado",
  IN_PROGRESS: "En curso",
  SERVICED: "Atendido",
  COMPLETED: "Completado",
  SUSPENDED: "Suspendido",
  CANCELLED: "Cancelado",
};

export const ZONES = ["Zona Norte", "Zona Sur", "Zona Centro", "Zona Ribera"];

// Lifecycle order (not alphabetical) so sorting the Estado column reads as
// "where in the process is this", matching ADR-0001's Service lifecycle.
export const STATUS_ORDER: Record<ServiceStatus, number> = {
  SCHEDULED: 0,
  ASSIGNED: 1,
  IN_PROGRESS: 2,
  SERVICED: 3,
  COMPLETED: 4,
  SUSPENDED: 5,
  CANCELLED: 6,
};

function history(...steps: Array<[string, string, boolean]>): StatusEvent[] {
  return steps.map(([label, at, done]) => ({ label, at, done }));
}

export const MOCK_SERVICES: MockService[] = [
  {
    id: "SVC-1042",
    kind: "ROUTE",
    title: "Recolección de residuos — Recorrido 4",
    zone: "Zona Norte",
    status: "IN_PROGRESS",
    crew: "Cuadrilla A · López",
    scheduledFor: "Hoy 09:00",
    x: 22,
    y: 30,
    history: history(
      ["Programado", "Ayer 18:40", true],
      ["Asignado", "Ayer 19:05", true],
      ["En curso", "Hoy 09:02", true],
      ["Atendido", "—", false],
    ),
  },
  {
    id: "SVC-1043",
    kind: "POINT",
    title: "Poda de árbol — Av. Rivadavia 2200",
    zone: "Zona Norte",
    status: "SCHEDULED",
    crew: "Sin asignar",
    scheduledFor: "Hoy 14:00",
    x: 28,
    y: 22,
    history: history(["Programado", "Hoy 08:00", true]),
  },
  {
    id: "SVC-1044",
    kind: "POINT",
    title: "Retiro de contenedor dañado",
    zone: "Zona Norte",
    status: "SUSPENDED",
    crew: "Cuadrilla A · López",
    scheduledFor: "Ayer 11:00",
    x: 34,
    y: 34,
    flag: "conflict",
    history: history(
      ["Programado", "Hace 2 días", true],
      ["Asignado", "Hace 2 días", true],
      ["En curso", "Ayer 11:05", true],
      ["Suspendido", "Ayer 11:40", true],
    ),
  },
  {
    id: "SVC-1051",
    kind: "ROUTE",
    title: "Barrido mecánico — Recorrido 1",
    zone: "Zona Centro",
    status: "ASSIGNED",
    crew: "Cuadrilla B · Fernández",
    scheduledFor: "Hoy 11:30",
    x: 52,
    y: 46,
    history: history(
      ["Programado", "Hoy 07:00", true],
      ["Asignado", "Hoy 07:20", true],
    ),
  },
  {
    id: "SVC-1052",
    kind: "POINT",
    title: "Inspección punto verde — Plaza San Martín",
    zone: "Zona Centro",
    status: "COMPLETED",
    crew: "Cuadrilla B · Fernández",
    scheduledFor: "Hoy 08:00",
    x: 58,
    y: 40,
    history: history(
      ["Programado", "Hoy 07:00", true],
      ["Asignado", "Hoy 07:20", true],
      ["En curso", "Hoy 08:05", true],
      ["Atendido", "Hoy 08:40", true],
      ["Completado", "Hoy 08:45", true],
    ),
  },
  {
    id: "SVC-1053",
    kind: "POINT",
    title: "Denuncia — acumulación de residuos",
    zone: "Zona Centro",
    status: "ASSIGNED",
    crew: "Cuadrilla C · Ibáñez",
    scheduledFor: "Hoy 16:00",
    x: 47,
    y: 55,
    flag: "delayed",
    history: history(
      ["Programado", "Hoy 06:30", true],
      ["Asignado", "Hoy 07:00", true],
    ),
  },
  {
    id: "SVC-1061",
    kind: "ROUTE",
    title: "Recolección de residuos — Recorrido 7",
    zone: "Zona Sur",
    status: "SERVICED",
    crew: "Cuadrilla D · Gómez",
    scheduledFor: "Hoy 07:00",
    x: 40,
    y: 74,
    history: history(
      ["Programado", "Ayer 20:00", true],
      ["Asignado", "Ayer 20:15", true],
      ["En curso", "Hoy 07:05", true],
      ["Atendido", "Hoy 09:50", true],
    ),
  },
  {
    id: "SVC-1062",
    kind: "POINT",
    title: "Poda de árbol — Ribera Sur 88",
    zone: "Zona Sur",
    status: "SCHEDULED",
    crew: "Sin asignar",
    scheduledFor: "Mañana 09:00",
    x: 46,
    y: 82,
    history: history(["Programado", "Hoy 10:00", true]),
  },
  {
    id: "SVC-1063",
    kind: "POINT",
    title: "Relevamiento de contenedor — Sector 12",
    zone: "Zona Sur",
    status: "IN_PROGRESS",
    crew: "Cuadrilla D · Gómez",
    scheduledFor: "Hoy 10:00",
    x: 33,
    y: 68,
    history: history(
      ["Programado", "Hoy 06:00", true],
      ["Asignado", "Hoy 06:20", true],
      ["En curso", "Hoy 10:05", true],
    ),
  },
  {
    id: "SVC-1071",
    kind: "ROUTE",
    title: "Barrido mecánico — Costanera",
    zone: "Zona Ribera",
    status: "CANCELLED",
    crew: "Sin asignar",
    scheduledFor: "Hoy 06:00",
    x: 70,
    y: 60,
    history: history(
      ["Programado", "Hace 3 días", true],
      ["Cancelado", "Ayer 18:00", true],
    ),
  },
  {
    id: "SVC-1072",
    kind: "POINT",
    title: "Inspección ambiental — Costanera km 3",
    zone: "Zona Ribera",
    status: "ASSIGNED",
    crew: "Cuadrilla E · Torres",
    scheduledFor: "Hoy 13:00",
    x: 76,
    y: 50,
    history: history(
      ["Programado", "Hoy 08:30", true],
      ["Asignado", "Hoy 08:50", true],
    ),
  },
  {
    id: "SVC-1073",
    kind: "POINT",
    title: "Retiro de ramas caídas",
    zone: "Zona Ribera",
    status: "COMPLETED",
    crew: "Cuadrilla E · Torres",
    scheduledFor: "Hoy 07:30",
    x: 80,
    y: 42,
    history: history(
      ["Programado", "Hoy 06:00", true],
      ["Asignado", "Hoy 06:15", true],
      ["En curso", "Hoy 07:35", true],
      ["Atendido", "Hoy 08:10", true],
      ["Completado", "Hoy 08:15", true],
    ),
  },
  {
    id: "SVC-1081",
    kind: "POINT",
    title: "Poda de árbol — Bv. Illia 450",
    zone: "Zona Centro",
    status: "SCHEDULED",
    crew: "Sin asignar",
    scheduledFor: "Mañana 08:00",
    x: 55,
    y: 32,
    history: history(["Programado", "Hoy 09:15", true]),
  },
  {
    id: "SVC-1082",
    kind: "ROUTE",
    title: "Recolección de residuos — Recorrido 9",
    zone: "Zona Norte",
    status: "SCHEDULED",
    crew: "Sin asignar",
    scheduledFor: "Mañana 07:00",
    x: 18,
    y: 44,
    history: history(["Programado", "Hoy 09:40", true]),
  },
];
