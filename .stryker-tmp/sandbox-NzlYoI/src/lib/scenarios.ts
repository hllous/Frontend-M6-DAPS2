// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import type { Session } from "./session";
import { actorKindForRoles, capabilitiesForRoles, type M6Role } from "./m6-roles";
export type Capability = "role:manage" | "integrationMonitor:view" | "integrationMonitor:manage" | "service:view" | "service:execute"
// Frontend hypothesis: #8 defines Office catalog configuration, but not per-resource names.
| "serviceType:manage" | "disposalSite:manage" | "inventory:view" | "environmentalReport:view" | "environmentalReport:create" | "environmentalReport:review" | "environmentalReport:close"
// Frontend hypothesis: backend capability names for inspection scheduling await confirmation.
| "environmentalInspection:view" | "environmentalInspection:schedule" | "environmentalInspection:execute" | "violationNotice:issue" | "violationNotice:view" | "sanctionOutcome:view" | "map:view" | "catalog:view" | "indicator:view"
// Frontend hypotheses for Phase 2c catalogs
| "zone:manage" | "route:manage"
// Frontend hypothesis: #8 defines Office catalog configuration, but not per-resource names.
| "serviceFrequency:manage"
// Frontend hypotheses for Phase 2 resource management; M1 capability claims remain unconfirmed.
| "vehicle:manage" | "crew:manage" | "greenSpace:manage"
// Frontend hypothesis for Phase 4 Green Point management
| "greenPoint:manage"
// Frontend hypothesis for Phase 4 Container management
| "container:manage"
// Frontend hypothesis for Phase 4 Container reporting
| "container:report"
// Vaciar un contenedor desbordado es de Campo (cuadrilla), no de Oficina (Backend #161).
| "container:empty"
// Frontend hypothesis for Phase 5 Tree management
| "tree:manage" | "tree:survey" | "treeIntervention:request" | "treeIntervention:authorize" | "treeIntervention:authorizeRemoval" | "service:assign" | "service:cancel" | "service:reschedule" | "service:schedule"
// Derivaciones a M3/M7: crear (Operaciones y Admin) y reconciliar a mano (solo Admin), según la tabla del backend.
| "repairRequest:create" | "streetClosureRequest:create" | "referral:reconcile";
export type ScenarioId = "office-duty-queue" | "field-crew-leader-route" | "field-crew-member-route" | "office-limited-intake" | "office-operations" | "office-environmental" | "field-inspector" | "employee-no-role" | "citizen";
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
  };
};
type ScenarioFixture = Omit<OperationalScenario, "capabilities">;
const scenarioFixtures: Record<"officeDutyQueue" | "fieldCrewLeader" | "fieldCrewMember" | "officeLimited", ScenarioFixture> = stryMutAct_9fa48("13682") ? {} : (stryCov_9fa48("13682"), {
  officeDutyQueue: stryMutAct_9fa48("13683") ? {} : (stryCov_9fa48("13683"), {
    id: stryMutAct_9fa48("13684") ? "" : (stryCov_9fa48("13684"), "office-duty-queue"),
    label: stryMutAct_9fa48("13685") ? "" : (stryCov_9fa48("13685"), "Oficina · cola de decisiones"),
    actor: stryMutAct_9fa48("13686") ? {} : (stryCov_9fa48("13686"), {
      userId: stryMutAct_9fa48("13687") ? "" : (stryCov_9fa48("13687"), "user-lucia"),
      name: stryMutAct_9fa48("13688") ? "" : (stryCov_9fa48("13688"), "Lucía Fernández"),
      kind: stryMutAct_9fa48("13689") ? "" : (stryCov_9fa48("13689"), "OFFICE")
    }),
    roles: stryMutAct_9fa48("13690") ? [] : (stryCov_9fa48("13690"), [stryMutAct_9fa48("13691") ? "" : (stryCov_9fa48("13691"), "M6_ADMIN")]),
    work: stryMutAct_9fa48("13692") ? {} : (stryCov_9fa48("13692"), {
      title: stryMutAct_9fa48("13693") ? "" : (stryCov_9fa48("13693"), "Acciones de la jornada"),
      summary: stryMutAct_9fa48("13694") ? "" : (stryCov_9fa48("13694"), "Lo que espera una decisión de su parte, con lo más antiguo primero.")
    })
  }),
  fieldCrewLeader: stryMutAct_9fa48("13695") ? {} : (stryCov_9fa48("13695"), {
    id: stryMutAct_9fa48("13696") ? "" : (stryCov_9fa48("13696"), "field-crew-leader-route"),
    label: stryMutAct_9fa48("13697") ? "" : (stryCov_9fa48("13697"), "Campo · responsable de recorrido"),
    actor: stryMutAct_9fa48("13698") ? {} : (stryCov_9fa48("13698"), {
      userId: stryMutAct_9fa48("13699") ? "" : (stryCov_9fa48("13699"), "user-martin"),
      name: stryMutAct_9fa48("13700") ? "" : (stryCov_9fa48("13700"), "Martín Acosta"),
      kind: stryMutAct_9fa48("13701") ? "" : (stryCov_9fa48("13701"), "FIELD"),
      fieldRole: stryMutAct_9fa48("13702") ? "" : (stryCov_9fa48("13702"), "CREW_LEADER"),
      crewId: stryMutAct_9fa48("13703") ? "" : (stryCov_9fa48("13703"), "crew-b"),
      crewName: stryMutAct_9fa48("13704") ? "" : (stryCov_9fa48("13704"), "Cuadrilla B · Fernández"),
      backendCrewName: stryMutAct_9fa48("13705") ? "" : (stryCov_9fa48("13705"), "Cuadrilla Belgrano — Recolección")
    }),
    roles: stryMutAct_9fa48("13706") ? [] : (stryCov_9fa48("13706"), [stryMutAct_9fa48("13707") ? "" : (stryCov_9fa48("13707"), "M6_CAMPO_CUADRILLA"), stryMutAct_9fa48("13708") ? "" : (stryCov_9fa48("13708"), "M6_CAMPO_INSPECTOR")]),
    work: stryMutAct_9fa48("13709") ? {} : (stryCov_9fa48("13709"), {
      title: stryMutAct_9fa48("13710") ? "" : (stryCov_9fa48("13710"), "Servicios asignados"),
      summary: stryMutAct_9fa48("13711") ? "" : (stryCov_9fa48("13711"), "Recorrido de higiene urbana para el turno actual.")
    })
  }),
  fieldCrewMember: stryMutAct_9fa48("13712") ? {} : (stryCov_9fa48("13712"), {
    id: stryMutAct_9fa48("13713") ? "" : (stryCov_9fa48("13713"), "field-crew-member-route"),
    label: stryMutAct_9fa48("13714") ? "" : (stryCov_9fa48("13714"), "Campo · integrante de cuadrilla"),
    actor: stryMutAct_9fa48("13715") ? {} : (stryCov_9fa48("13715"), {
      userId: stryMutAct_9fa48("13716") ? "" : (stryCov_9fa48("13716"), "user-sofia"),
      name: stryMutAct_9fa48("13717") ? "" : (stryCov_9fa48("13717"), "Sofía Navarro"),
      kind: stryMutAct_9fa48("13718") ? "" : (stryCov_9fa48("13718"), "FIELD"),
      fieldRole: stryMutAct_9fa48("13719") ? "" : (stryCov_9fa48("13719"), "CREW_MEMBER"),
      crewId: stryMutAct_9fa48("13720") ? "" : (stryCov_9fa48("13720"), "crew-b"),
      crewName: stryMutAct_9fa48("13721") ? "" : (stryCov_9fa48("13721"), "Cuadrilla B · Fernández"),
      backendCrewName: stryMutAct_9fa48("13722") ? "" : (stryCov_9fa48("13722"), "Cuadrilla Belgrano — Recolección")
    }),
    roles: stryMutAct_9fa48("13723") ? [] : (stryCov_9fa48("13723"), [stryMutAct_9fa48("13724") ? "" : (stryCov_9fa48("13724"), "M6_CAMPO_CUADRILLA")]),
    work: stryMutAct_9fa48("13725") ? {} : (stryCov_9fa48("13725"), {
      title: stryMutAct_9fa48("13726") ? "" : (stryCov_9fa48("13726"), "Servicios asignados"),
      summary: stryMutAct_9fa48("13727") ? "" : (stryCov_9fa48("13727"), "Tareas del recorrido que integran su turno.")
    })
  }),
  officeLimited: stryMutAct_9fa48("13728") ? {} : (stryCov_9fa48("13728"), {
    id: stryMutAct_9fa48("13729") ? "" : (stryCov_9fa48("13729"), "office-limited-intake"),
    label: stryMutAct_9fa48("13730") ? "" : (stryCov_9fa48("13730"), "Oficina · ingreso con alcance limitado"),
    actor: stryMutAct_9fa48("13731") ? {} : (stryCov_9fa48("13731"), {
      userId: stryMutAct_9fa48("13732") ? "" : (stryCov_9fa48("13732"), "user-ana"),
      name: stryMutAct_9fa48("13733") ? "" : (stryCov_9fa48("13733"), "Andrea Ríos"),
      kind: stryMutAct_9fa48("13734") ? "" : (stryCov_9fa48("13734"), "OFFICE")
    }),
    roles: stryMutAct_9fa48("13735") ? [] : (stryCov_9fa48("13735"), [stryMutAct_9fa48("13736") ? "" : (stryCov_9fa48("13736"), "M6_AUDITOR")]),
    work: stryMutAct_9fa48("13737") ? {} : (stryCov_9fa48("13737"), {
      title: stryMutAct_9fa48("13738") ? "" : (stryCov_9fa48("13738"), "Acciones de la jornada"),
      summary: stryMutAct_9fa48("13739") ? "" : (stryCov_9fa48("13739"), "Su perfil consulta información y no tiene tareas asignadas.")
    })
  })
});

/** Un escenario con otros roles: capacidades y tipo de actor siguen a los roles. */
export function scenarioForRoles(scenario: ScenarioFixture, roles: readonly M6Role[]): OperationalScenario {
  if (stryMutAct_9fa48("13740")) {
    {}
  } else {
    stryCov_9fa48("13740");
    // Responsable vs integrante no es un rol de M6 sino un dato de la cuadrilla (Crew.leaderUserId): solo el responsable
    // cambia el estado del servicio, el integrante consulta. Se aplica sobre los roles, nunca en lugar de ellos.
    const capabilities = stryMutAct_9fa48("13741") ? capabilitiesForRoles(roles) : (stryCov_9fa48("13741"), capabilitiesForRoles(roles).filter(stryMutAct_9fa48("13742") ? () => undefined : (stryCov_9fa48("13742"), capability => stryMutAct_9fa48("13743") ? scenario.actor.fieldRole === "CREW_MEMBER" && capability === "service:execute" : (stryCov_9fa48("13743"), !(stryMutAct_9fa48("13746") ? scenario.actor.fieldRole === "CREW_MEMBER" || capability === "service:execute" : stryMutAct_9fa48("13745") ? false : stryMutAct_9fa48("13744") ? true : (stryCov_9fa48("13744", "13745", "13746"), (stryMutAct_9fa48("13748") ? scenario.actor.fieldRole !== "CREW_MEMBER" : stryMutAct_9fa48("13747") ? true : (stryCov_9fa48("13747", "13748"), scenario.actor.fieldRole === (stryMutAct_9fa48("13749") ? "" : (stryCov_9fa48("13749"), "CREW_MEMBER")))) && (stryMutAct_9fa48("13751") ? capability !== "service:execute" : stryMutAct_9fa48("13750") ? true : (stryCov_9fa48("13750", "13751"), capability === (stryMutAct_9fa48("13752") ? "" : (stryCov_9fa48("13752"), "service:execute"))))))))));
    return stryMutAct_9fa48("13753") ? {} : (stryCov_9fa48("13753"), {
      ...scenario,
      roles: stryMutAct_9fa48("13754") ? [] : (stryCov_9fa48("13754"), [...roles]),
      capabilities,
      actor: stryMutAct_9fa48("13755") ? {} : (stryCov_9fa48("13755"), {
        ...scenario.actor,
        kind: actorKindForRoles(roles)
      })
    });
  }
}
function roleFixture(base: ScenarioFixture, id: ScenarioId, label: string, roles: M6Role[]): OperationalScenario {
  if (stryMutAct_9fa48("13756")) {
    {}
  } else {
    stryCov_9fa48("13756");
    return scenarioForRoles(stryMutAct_9fa48("13757") ? {} : (stryCov_9fa48("13757"), {
      ...base,
      id,
      label
    }), roles);
  }
}
export const scenarios = stryMutAct_9fa48("13758") ? {} : (stryCov_9fa48("13758"), {
  ...(Object.fromEntries(Object.entries(scenarioFixtures).map(([key, fixture]) => [key, scenarioForRoles(fixture, fixture.roles)])) as Record<keyof typeof scenarioFixtures, OperationalScenario>),
  officeOperations: roleFixture(scenarioFixtures.officeDutyQueue, stryMutAct_9fa48("13759") ? "" : (stryCov_9fa48("13759"), "office-operations"), stryMutAct_9fa48("13760") ? "" : (stryCov_9fa48("13760"), "Oficina · operaciones"), stryMutAct_9fa48("13761") ? [] : (stryCov_9fa48("13761"), [stryMutAct_9fa48("13762") ? "" : (stryCov_9fa48("13762"), "M6_OFICINA_OPERACIONES")])),
  officeEnvironmental: roleFixture(scenarioFixtures.officeDutyQueue, stryMutAct_9fa48("13763") ? "" : (stryCov_9fa48("13763"), "office-environmental"), stryMutAct_9fa48("13764") ? "" : (stryCov_9fa48("13764"), "Oficina · ambiental"), stryMutAct_9fa48("13765") ? [] : (stryCov_9fa48("13765"), [stryMutAct_9fa48("13766") ? "" : (stryCov_9fa48("13766"), "M6_OFICINA_AMBIENTAL")])),
  fieldInspector: roleFixture(scenarioFixtures.fieldCrewLeader, stryMutAct_9fa48("13767") ? "" : (stryCov_9fa48("13767"), "field-inspector"), stryMutAct_9fa48("13768") ? "" : (stryCov_9fa48("13768"), "Campo · inspector ambiental"), stryMutAct_9fa48("13769") ? [] : (stryCov_9fa48("13769"), [stryMutAct_9fa48("13770") ? "" : (stryCov_9fa48("13770"), "M6_CAMPO_INSPECTOR")])),
  employeeNoRole: roleFixture(scenarioFixtures.officeDutyQueue, stryMutAct_9fa48("13771") ? "" : (stryCov_9fa48("13771"), "employee-no-role"), stryMutAct_9fa48("13772") ? "" : (stryCov_9fa48("13772"), "Empleado · sin rol en Ambiente"), stryMutAct_9fa48("13773") ? ["Stryker was here"] : (stryCov_9fa48("13773"), [])),
  citizen: stryMutAct_9fa48("13774") ? {} : (stryCov_9fa48("13774"), {
    ...roleFixture(scenarioFixtures.officeLimited, stryMutAct_9fa48("13775") ? "" : (stryCov_9fa48("13775"), "citizen"), stryMutAct_9fa48("13776") ? "" : (stryCov_9fa48("13776"), "Ciudadano · sin acceso"), stryMutAct_9fa48("13777") ? ["Stryker was here"] : (stryCov_9fa48("13777"), [])),
    subType: "CIUDADANO" as const
  })
});
const scenariosById = Object.values(scenarios).reduce(stryMutAct_9fa48("13778") ? () => undefined : (stryCov_9fa48("13778"), (byId, scenario) => stryMutAct_9fa48("13779") ? {} : (stryCov_9fa48("13779"), {
  ...byId,
  [scenario.id]: scenario
})), {} as Record<ScenarioId, OperationalScenario>);
export type ScenarioCrew = {
  id: string;
  name: string;
};

/** Con una sesión, la cuadrilla resuelta contra el backend pisa la de fixture del escenario. */
export function getScenario(ref: ScenarioId | Pick<Session, "scenarioId" | "crew" | "roles" | "mode" | "fieldRole">): OperationalScenario {
  if (stryMutAct_9fa48("13780")) {
    {}
  } else {
    stryCov_9fa48("13780");
    if (stryMutAct_9fa48("13783") ? typeof ref !== "string" : stryMutAct_9fa48("13782") ? false : stryMutAct_9fa48("13781") ? true : (stryCov_9fa48("13781", "13782", "13783"), typeof ref === (stryMutAct_9fa48("13784") ? "" : (stryCov_9fa48("13784"), "string")))) return scenariosById[ref];
    let scenario = ref.scenarioId ? scenariosById[ref.scenarioId] : scenarios.employeeNoRole;
    if (stryMutAct_9fa48("13787") ? ref.mode !== "real-m1" : stryMutAct_9fa48("13786") ? false : stryMutAct_9fa48("13785") ? true : (stryCov_9fa48("13785", "13786", "13787"), ref.mode === (stryMutAct_9fa48("13788") ? "" : (stryCov_9fa48("13788"), "real-m1")))) {
      if (stryMutAct_9fa48("13789")) {
        {}
      } else {
        stryCov_9fa48("13789");
        scenario = stryMutAct_9fa48("13790") ? {} : (stryCov_9fa48("13790"), {
          ...scenario,
          actor: stryMutAct_9fa48("13791") ? {} : (stryCov_9fa48("13791"), {
            ...scenario.actor,
            crewId: stryMutAct_9fa48("13792") ? ref.crew.id : (stryCov_9fa48("13792"), ref.crew?.id),
            crewName: stryMutAct_9fa48("13793") ? ref.crew.name : (stryCov_9fa48("13793"), ref.crew?.name),
            fieldRole: ref.fieldRole
          })
        });
      }
    }
    if (stryMutAct_9fa48("13795") ? false : stryMutAct_9fa48("13794") ? true : (stryCov_9fa48("13794", "13795"), ref.roles)) scenario = scenarioForRoles(scenario, ref.roles);
    if (stryMutAct_9fa48("13798") ? false : stryMutAct_9fa48("13797") ? true : stryMutAct_9fa48("13796") ? ref.crew : (stryCov_9fa48("13796", "13797", "13798"), !ref.crew)) return scenario;
    return stryMutAct_9fa48("13799") ? {} : (stryCov_9fa48("13799"), {
      ...scenario,
      actor: stryMutAct_9fa48("13800") ? {} : (stryCov_9fa48("13800"), {
        ...scenario.actor,
        crewId: ref.crew.id,
        crewName: ref.crew.name
      })
    });
  }
}
export function isScenarioId(value: unknown): value is ScenarioId {
  if (stryMutAct_9fa48("13801")) {
    {}
  } else {
    stryCov_9fa48("13801");
    return stryMutAct_9fa48("13804") ? typeof value === "string" || Object.hasOwn(scenariosById, value) : stryMutAct_9fa48("13803") ? false : stryMutAct_9fa48("13802") ? true : (stryCov_9fa48("13802", "13803", "13804"), (stryMutAct_9fa48("13806") ? typeof value !== "string" : stryMutAct_9fa48("13805") ? true : (stryCov_9fa48("13805", "13806"), typeof value === (stryMutAct_9fa48("13807") ? "" : (stryCov_9fa48("13807"), "string")))) && Object.hasOwn(scenariosById, value));
  }
}