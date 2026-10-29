import type { Session } from "./session";
import { DEMO_IDENTITIES } from "./demo-identities";
import { actorKindForRoles, capabilitiesForRoles, type M6Role } from "./m6-roles";

export type Capability =
  | "service:view"
  | "service:execute"
  // Frontend hypothesis: #8 defines Office catalog configuration, but not per-resource names.
  | "serviceType:manage"
  | "disposalSite:manage"
  | "inventory:view"
  | "environmentalReport:view"
  | "environmentalReport:create"
  | "environmentalReport:review"
  | "environmentalReport:close"
  // Frontend hypothesis: backend capability names for inspection scheduling await confirmation.
  | "environmentalInspection:view"
  | "environmentalInspection:schedule"
  | "environmentalInspection:execute"
  | "violationNotice:issue"
  | "violationNotice:view"
  | "sanctionOutcome:view"
  | "map:view"
  | "catalog:view"
  | "indicator:view"
  // Frontend hypotheses for Phase 2c catalogs
  | "zone:manage"
  | "route:manage"
  // Frontend hypothesis: #8 defines Office catalog configuration, but not per-resource names.
  | "serviceFrequency:manage"
  // Frontend hypotheses for Phase 2 resource management; M1 capability claims remain unconfirmed.
  | "vehicle:manage"
  | "crew:manage"
  | "greenSpace:manage"
  // Frontend hypothesis for Phase 4 Green Point management
  | "greenPoint:manage"
  // Frontend hypothesis for Phase 4 Container management
  | "container:manage"
  // Frontend hypothesis for Phase 4 Container reporting
  | "container:report"
  // Vaciar un contenedor desbordado es de Campo (cuadrilla), no de Oficina (Backend #161).
  | "container:empty"
  // Frontend hypothesis for Phase 5 Tree management
  | "tree:manage"
  | "tree:survey"
  | "treeIntervention:request"
  | "treeIntervention:authorize"
  | "service:assign"
  | "service:cancel"
  | "service:reschedule"
  | "service:schedule"
  // Derivaciones a M3/M7: crear (Operaciones y Admin) y reconciliar a mano (solo Admin), según la tabla del backend.
  | "repairRequest:create"
  | "streetClosureRequest:create"
  | "referral:reconcile";

export type ScenarioId =
  | "office-duty-queue"
  | "field-crew-leader-route"
  | "field-crew-member-route"
  | "office-limited-intake"
  | "office-operations"
  | "office-environmental"
  | "field-inspector"
  | "employee-no-role"
  | "citizen";

export type OperationalScenario = {
  subType?: "EMPLEADO" | "CIUDADANO";
  id: ScenarioId;
  label: string;
  actor: {
    userId: string;
    name: string;
    kind: "OFFICE" | "FIELD";
    fieldRole?: "CREW_LEADER" | "CREW_MEMBER";
    /** Id de la cuadrilla en los fixtures del modo mock. */
    crewId?: string;
    crewName?: string;
    /**
     * Nombre exacto de la cuadrilla en el backend (el seed no le da código y el id cambia con cada seed).
     * En modo backend el login lo resuelve contra GET /crews y la sesión guarda el id real.
     */
    backendCrewName?: string;
  };
  /** Roles de M6 del actor: en modo backend salen de GET /me; en mock, de este fixture. */
  roles: M6Role[];
  /** Derivadas de `roles` (nunca declaradas a mano): lo que la UI muestra u oculta. */
  capabilities: Capability[];
  work: {
    title: string;
    summary: string;
    items: string[];
  };
};

type ScenarioFixture = Omit<OperationalScenario, "capabilities">;

const scenarioFixtures: Record<
  "officeDutyQueue" | "fieldCrewLeader" | "fieldCrewMember" | "officeLimited",
  ScenarioFixture
> = {
  officeDutyQueue: {
    id: "office-duty-queue",
    label: "Oficina · cola de decisiones",
    actor: { userId: "user-lucia", name: "Lucía Fernández", kind: "OFFICE" },
    roles: ["M6_ADMIN"],
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
      userId: "user-martin",
      name: "Martín Acosta",
      kind: "FIELD",
      fieldRole: "CREW_LEADER",
      crewId: "crew-b",
      crewName: "Cuadrilla B · Fernández",
      backendCrewName: "Cuadrilla Belgrano — Recolección",
    },
    roles: ["M6_CAMPO_CUADRILLA", "M6_CAMPO_INSPECTOR"],
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
      userId: "user-sofia",
      name: "Sofía Navarro",
      kind: "FIELD",
      fieldRole: "CREW_MEMBER",
      crewId: "crew-b",
      crewName: "Cuadrilla B · Fernández",
      backendCrewName: "Cuadrilla Belgrano — Recolección",
    },
    roles: ["M6_CAMPO_CUADRILLA"],
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
    actor: { userId: "user-ana", name: "Andrea Ríos", kind: "OFFICE" },
    roles: ["M6_AUDITOR"],
    work: {
      title: "Acciones de la jornada",
      summary: "Ingreso de avisos con permisos acotados para esta sesión.",
      items: ["Clasificar aviso ambiental recibido"],
    },
  },
};

/** Un escenario con otros roles: capacidades y tipo de actor siguen a los roles. */
export function scenarioForRoles(scenario: ScenarioFixture, roles: readonly M6Role[]): OperationalScenario {
  // Responsable vs integrante no es un rol de M6 sino un dato de la cuadrilla (Crew.leaderUserId): solo el responsable
  // cambia el estado del servicio, el integrante consulta. Se aplica sobre los roles, nunca en lugar de ellos.
  const capabilities = capabilitiesForRoles(roles).filter(
    (capability) => !(scenario.actor.fieldRole === "CREW_MEMBER" && capability === "service:execute"),
  );
  return {
    ...scenario,
    roles: [...roles],
    capabilities,
    actor: { ...scenario.actor, kind: actorKindForRoles(roles) },
  };
}

function roleFixture(base: ScenarioFixture, id: ScenarioId, label: string, roles: M6Role[]): OperationalScenario {
  return scenarioForRoles({ ...base, id, label }, roles);
}

export const scenarios = {
  ...Object.fromEntries(Object.entries(scenarioFixtures).map(([key, fixture]) => [key, scenarioForRoles(fixture, fixture.roles)])) as Record<keyof typeof scenarioFixtures, OperationalScenario>,
  officeOperations: roleFixture(scenarioFixtures.officeDutyQueue, "office-operations", "Oficina · operaciones", ["M6_OFICINA_OPERACIONES"]),
  officeEnvironmental: roleFixture(scenarioFixtures.officeDutyQueue, "office-environmental", "Oficina · ambiental", ["M6_OFICINA_AMBIENTAL"]),
  fieldInspector: roleFixture(scenarioFixtures.fieldCrewLeader, "field-inspector", "Campo · inspector ambiental", ["M6_CAMPO_INSPECTOR"]),
  employeeNoRole: roleFixture(scenarioFixtures.officeDutyQueue, "employee-no-role", "Empleado · sin rol en Ambiente", []),
  citizen: { ...roleFixture(scenarioFixtures.officeLimited, "citizen", "Ciudadano · sin acceso", []), subType: "CIUDADANO" as const },
};

const scenariosById = Object.values(scenarios).reduce(
  (byId, scenario) => ({ ...byId, [scenario.id]: scenario }),
  {} as Record<ScenarioId, OperationalScenario>,
);

export type ScenarioCrew = { id: string; name: string };

/** Con una sesión, la cuadrilla resuelta contra el backend pisa la de fixture del escenario. */
export function getScenario(
  ref: ScenarioId | { scenarioId: ScenarioId; crew?: ScenarioCrew; roles?: readonly M6Role[]; source?: Session["source"] },
): OperationalScenario {
  if (typeof ref === "string") return scenariosById[ref];
  let scenario = scenariosById[ref.scenarioId];
  if (ref.roles) scenario = scenarioForRoles(scenario, ref.roles);
  // Sesión de demo firmada: el actor es la persona real del seed, no el nombre de fixture del escenario.
  if (ref.source === "demo") {
    const { sub, name } = DEMO_IDENTITIES[ref.scenarioId];
    scenario = { ...scenario, actor: { ...scenario.actor, userId: sub, name } };
  }
  if (!ref.crew) return scenario;
  return { ...scenario, actor: { ...scenario.actor, crewId: ref.crew.id, crewName: ref.crew.name } };
}

export function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === "string" && Object.hasOwn(scenariosById, value);
}
