export type Capability =
  | "service:view"
  | "service:execute"
  // Frontend hypothesis: #8 defines Office catalog configuration, but not per-resource names.
  | "serviceType:manage"
  | "disposalSite:manage"
  | "inventory:view"
  | "environmentalReport:view"
  | "map:view"
  | "catalog:view"
  | "indicator:view";

export type ScenarioId =
  | "office-duty-queue"
  | "field-crew-leader-route"
  | "field-crew-member-route"
  | "office-limited-intake";

export type OperationalScenario = {
  id: ScenarioId;
  label: string;
  actor: {
    name: string;
    kind: "OFFICE" | "FIELD";
    fieldRole?: "CREW_LEADER" | "CREW_MEMBER";
    crewId?: string;
    crewName?: string;
  };
  capabilities: Capability[];
  work: {
    title: string;
    summary: string;
    items: string[];
  };
};

export const scenarios: Record<
  "officeDutyQueue" | "fieldCrewLeader" | "fieldCrewMember" | "officeLimited",
  OperationalScenario
> = {
  officeDutyQueue: {
    id: "office-duty-queue",
    label: "Oficina · cola de decisiones",
    actor: { name: "Lucía Fernández", kind: "OFFICE" },
    capabilities: [
      "service:view",
      "inventory:view",
      "environmentalReport:view",
      "map:view",
      "catalog:view",
      "serviceType:manage",
      "disposalSite:manage",
      "indicator:view",
    ],
    work: {
      title: "Acciones de la jornada",
      summary: "Prioridades que requieren una decisión de Oficina.",
      items: [
        "Revisar reprogramación de barrido",
        "Confirmar cuadrilla para plaza del Parque",
        "Clasificar aviso ambiental recibido",
      ],
    },
  },
  fieldCrewLeader: {
    id: "field-crew-leader-route",
    label: "Campo · responsable de recorrido",
    actor: {
      name: "Martín Acosta",
      kind: "FIELD",
      fieldRole: "CREW_LEADER",
      crewId: "crew-b",
      crewName: "Cuadrilla B · Fernández",
    },
    capabilities: ["service:view", "service:execute", "map:view"],
    work: {
      title: "Servicios asignados",
      summary: "Recorrido de higiene urbana para el turno actual.",
      items: [
        "Recorrido de higiene urbana — corredor costero",
        "Revisión de punto verde — Plaza de las Artes",
      ],
    },
  },
  fieldCrewMember: {
    id: "field-crew-member-route",
    label: "Campo · integrante de cuadrilla",
    actor: {
      name: "Sofía Navarro",
      kind: "FIELD",
      fieldRole: "CREW_MEMBER",
      crewId: "crew-b",
      crewName: "Cuadrilla B · Fernández",
    },
    capabilities: ["service:view", "map:view"],
    work: {
      title: "Servicios asignados",
      summary: "Tareas del recorrido que integran su turno.",
      items: [
        "Recorrido de higiene urbana — corredor costero",
        "Control de contenedores — avenida central",
      ],
    },
  },
  officeLimited: {
    id: "office-limited-intake",
    label: "Oficina · ingreso con alcance limitado",
    actor: { name: "Andrea Ríos", kind: "OFFICE" },
    capabilities: ["service:view", "environmentalReport:view", "map:view"],
    work: {
      title: "Acciones de la jornada",
      summary: "Ingreso de avisos con permisos acotados para esta sesión.",
      items: ["Clasificar aviso ambiental recibido"],
    },
  },
};

const scenariosById = Object.values(scenarios).reduce(
  (byId, scenario) => ({ ...byId, [scenario.id]: scenario }),
  {} as Record<ScenarioId, OperationalScenario>,
);

export function getScenario(id: ScenarioId): OperationalScenario {
  return scenariosById[id];
}

export function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === "string" && value in scenariosById;
}
