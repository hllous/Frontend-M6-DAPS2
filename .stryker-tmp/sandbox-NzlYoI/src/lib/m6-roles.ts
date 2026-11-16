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
import { z } from "zod";
import type { Capability } from "./scenarios";

/** Catálogo cerrado de roles de M6 (Backend `M6Role`, ADR-008). */
export const M6_ROLES = ["M6_ADMIN", "M6_OFICINA_OPERACIONES", "M6_OFICINA_AMBIENTAL", "M6_CAMPO_CUADRILLA", "M6_CAMPO_INSPECTOR", "M6_AUDITOR"] as const;
export type M6Role = typeof M6_ROLES[number];
export const m6RoleSchema = z.enum(M6_ROLES);
export function hasOfficeFieldRoleMix(roles: readonly M6Role[]): boolean {
  if (stryMutAct_9fa48("11155")) {
    {}
  } else {
    stryCov_9fa48("11155");
    const hasOfficeRole = stryMutAct_9fa48("11156") ? roles.every(role => role === "M6_ADMIN" || role.startsWith("M6_OFICINA_")) : (stryCov_9fa48("11156"), roles.some(stryMutAct_9fa48("11157") ? () => undefined : (stryCov_9fa48("11157"), role => stryMutAct_9fa48("11160") ? role === "M6_ADMIN" && role.startsWith("M6_OFICINA_") : stryMutAct_9fa48("11159") ? false : stryMutAct_9fa48("11158") ? true : (stryCov_9fa48("11158", "11159", "11160"), (stryMutAct_9fa48("11162") ? role !== "M6_ADMIN" : stryMutAct_9fa48("11161") ? false : (stryCov_9fa48("11161", "11162"), role === (stryMutAct_9fa48("11163") ? "" : (stryCov_9fa48("11163"), "M6_ADMIN")))) || (stryMutAct_9fa48("11164") ? role.endsWith("M6_OFICINA_") : (stryCov_9fa48("11164"), role.startsWith(stryMutAct_9fa48("11165") ? "" : (stryCov_9fa48("11165"), "M6_OFICINA_"))))))));
    return stryMutAct_9fa48("11168") ? hasOfficeRole || roles.some(role => role.startsWith("M6_CAMPO_")) : stryMutAct_9fa48("11167") ? false : stryMutAct_9fa48("11166") ? true : (stryCov_9fa48("11166", "11167", "11168"), hasOfficeRole && (stryMutAct_9fa48("11169") ? roles.every(role => role.startsWith("M6_CAMPO_")) : (stryCov_9fa48("11169"), roles.some(stryMutAct_9fa48("11170") ? () => undefined : (stryCov_9fa48("11170"), role => stryMutAct_9fa48("11171") ? role.endsWith("M6_CAMPO_") : (stryCov_9fa48("11171"), role.startsWith(stryMutAct_9fa48("11172") ? "" : (stryCov_9fa48("11172"), "M6_CAMPO_"))))))));
  }
}

/** `GET /me` del backend: identidad del token y roles de M6 efectivos (asignados ∩ lo que permite el rol de M1). */
export const meSchema = z.object(stryMutAct_9fa48("11173") ? {} : (stryCov_9fa48("11173"), {
  userId: z.string(),
  subType: z.enum(stryMutAct_9fa48("11174") ? [] : (stryCov_9fa48("11174"), [stryMutAct_9fa48("11175") ? "" : (stryCov_9fa48("11175"), "CIUDADANO"), stryMutAct_9fa48("11176") ? "" : (stryCov_9fa48("11176"), "EMPLEADO")])),
  m1Role: z.string(),
  roles: z.array(m6RoleSchema),
  crews: z.array(z.object(stryMutAct_9fa48("11177") ? {} : (stryCov_9fa48("11177"), {
    id: z.string(),
    name: z.string(),
    role: z.enum(stryMutAct_9fa48("11178") ? [] : (stryCov_9fa48("11178"), [stryMutAct_9fa48("11179") ? "" : (stryCov_9fa48("11179"), "LEADER"), stryMutAct_9fa48("11180") ? "" : (stryCov_9fa48("11180"), "MEMBER")]))
  }))).default(stryMutAct_9fa48("11181") ? ["Stryker was here"] : (stryCov_9fa48("11181"), [])),
  isAssignedInspector: z.boolean().optional()
}));
export type Me = z.infer<typeof meSchema>;
const OFFICE_ROLES: readonly M6Role[] = stryMutAct_9fa48("11182") ? [] : (stryCov_9fa48("11182"), [stryMutAct_9fa48("11183") ? "" : (stryCov_9fa48("11183"), "M6_ADMIN"), stryMutAct_9fa48("11184") ? "" : (stryCov_9fa48("11184"), "M6_OFICINA_OPERACIONES"), stryMutAct_9fa48("11185") ? "" : (stryCov_9fa48("11185"), "M6_OFICINA_AMBIENTAL")]);
const FIELD_ROLES: readonly M6Role[] = stryMutAct_9fa48("11186") ? [] : (stryCov_9fa48("11186"), [stryMutAct_9fa48("11187") ? "" : (stryCov_9fa48("11187"), "M6_CAMPO_CUADRILLA"), stryMutAct_9fa48("11188") ? "" : (stryCov_9fa48("11188"), "M6_CAMPO_INSPECTOR")]);

/**
 * Qué roles habilitan cada capacidad de UI. Espeja la tabla «Rol requerido por endpoint» del backend
 * (docs/api/endpoints.md); `null` = cualquier rol de M6. Es solo optimista: el backend decide (ADR-0005).
 */
const ROLES_BY_CAPABILITY: Record<Capability, readonly M6Role[] | null> = stryMutAct_9fa48("11189") ? {} : (stryCov_9fa48("11189"), {
  "role:manage": stryMutAct_9fa48("11190") ? [] : (stryCov_9fa48("11190"), [stryMutAct_9fa48("11191") ? "" : (stryCov_9fa48("11191"), "M6_ADMIN")]),
  "integrationMonitor:view": stryMutAct_9fa48("11192") ? [] : (stryCov_9fa48("11192"), [stryMutAct_9fa48("11193") ? "" : (stryCov_9fa48("11193"), "M6_ADMIN"), stryMutAct_9fa48("11194") ? "" : (stryCov_9fa48("11194"), "M6_AUDITOR")]),
  "integrationMonitor:manage": stryMutAct_9fa48("11195") ? [] : (stryCov_9fa48("11195"), [stryMutAct_9fa48("11196") ? "" : (stryCov_9fa48("11196"), "M6_ADMIN")]),
  "service:view": null,
  "inventory:view": null,
  "environmentalReport:view": null,
  "environmentalInspection:view": null,
  "map:view": null,
  "catalog:view": null,
  "indicator:view": null,
  "sanctionOutcome:view": OFFICE_ROLES,
  "violationNotice:view": stryMutAct_9fa48("11197") ? [] : (stryCov_9fa48("11197"), [stryMutAct_9fa48("11198") ? "" : (stryCov_9fa48("11198"), "M6_ADMIN"), stryMutAct_9fa48("11199") ? "" : (stryCov_9fa48("11199"), "M6_OFICINA_AMBIENTAL"), stryMutAct_9fa48("11200") ? "" : (stryCov_9fa48("11200"), "M6_CAMPO_INSPECTOR"), stryMutAct_9fa48("11201") ? "" : (stryCov_9fa48("11201"), "M6_AUDITOR")]),
  "violationNotice:issue": stryMutAct_9fa48("11202") ? [] : (stryCov_9fa48("11202"), [stryMutAct_9fa48("11203") ? "" : (stryCov_9fa48("11203"), "M6_ADMIN"), stryMutAct_9fa48("11204") ? "" : (stryCov_9fa48("11204"), "M6_OFICINA_AMBIENTAL")]),
  "environmentalReport:create": stryMutAct_9fa48("11205") ? [] : (stryCov_9fa48("11205"), [stryMutAct_9fa48("11206") ? "" : (stryCov_9fa48("11206"), "M6_ADMIN"), stryMutAct_9fa48("11207") ? "" : (stryCov_9fa48("11207"), "M6_OFICINA_AMBIENTAL"), stryMutAct_9fa48("11208") ? "" : (stryCov_9fa48("11208"), "M6_CAMPO_INSPECTOR")]),
  "environmentalReport:review": stryMutAct_9fa48("11209") ? [] : (stryCov_9fa48("11209"), [stryMutAct_9fa48("11210") ? "" : (stryCov_9fa48("11210"), "M6_ADMIN"), stryMutAct_9fa48("11211") ? "" : (stryCov_9fa48("11211"), "M6_OFICINA_AMBIENTAL")]),
  "environmentalReport:close": stryMutAct_9fa48("11212") ? [] : (stryCov_9fa48("11212"), [stryMutAct_9fa48("11213") ? "" : (stryCov_9fa48("11213"), "M6_ADMIN"), stryMutAct_9fa48("11214") ? "" : (stryCov_9fa48("11214"), "M6_OFICINA_AMBIENTAL")]),
  "environmentalInspection:schedule": stryMutAct_9fa48("11215") ? [] : (stryCov_9fa48("11215"), [stryMutAct_9fa48("11216") ? "" : (stryCov_9fa48("11216"), "M6_ADMIN"), stryMutAct_9fa48("11217") ? "" : (stryCov_9fa48("11217"), "M6_OFICINA_AMBIENTAL")]),
  "environmentalInspection:execute": stryMutAct_9fa48("11218") ? [] : (stryCov_9fa48("11218"), [stryMutAct_9fa48("11219") ? "" : (stryCov_9fa48("11219"), "M6_CAMPO_INSPECTOR")]),
  "service:execute": stryMutAct_9fa48("11220") ? [] : (stryCov_9fa48("11220"), [stryMutAct_9fa48("11221") ? "" : (stryCov_9fa48("11221"), "M6_CAMPO_CUADRILLA")]),
  "container:report": stryMutAct_9fa48("11222") ? [] : (stryCov_9fa48("11222"), [stryMutAct_9fa48("11223") ? "" : (stryCov_9fa48("11223"), "M6_CAMPO_CUADRILLA")]),
  "container:empty": stryMutAct_9fa48("11224") ? [] : (stryCov_9fa48("11224"), [stryMutAct_9fa48("11225") ? "" : (stryCov_9fa48("11225"), "M6_CAMPO_CUADRILLA")]),
  "tree:survey": stryMutAct_9fa48("11226") ? [] : (stryCov_9fa48("11226"), [stryMutAct_9fa48("11227") ? "" : (stryCov_9fa48("11227"), "M6_CAMPO_CUADRILLA")]),
  "service:schedule": stryMutAct_9fa48("11228") ? [] : (stryCov_9fa48("11228"), [stryMutAct_9fa48("11229") ? "" : (stryCov_9fa48("11229"), "M6_ADMIN"), stryMutAct_9fa48("11230") ? "" : (stryCov_9fa48("11230"), "M6_OFICINA_OPERACIONES")]),
  "service:assign": stryMutAct_9fa48("11231") ? [] : (stryCov_9fa48("11231"), [stryMutAct_9fa48("11232") ? "" : (stryCov_9fa48("11232"), "M6_ADMIN"), stryMutAct_9fa48("11233") ? "" : (stryCov_9fa48("11233"), "M6_OFICINA_OPERACIONES")]),
  "service:cancel": stryMutAct_9fa48("11234") ? [] : (stryCov_9fa48("11234"), [stryMutAct_9fa48("11235") ? "" : (stryCov_9fa48("11235"), "M6_ADMIN"), stryMutAct_9fa48("11236") ? "" : (stryCov_9fa48("11236"), "M6_OFICINA_OPERACIONES")]),
  "service:reschedule": stryMutAct_9fa48("11237") ? [] : (stryCov_9fa48("11237"), [stryMutAct_9fa48("11238") ? "" : (stryCov_9fa48("11238"), "M6_ADMIN"), stryMutAct_9fa48("11239") ? "" : (stryCov_9fa48("11239"), "M6_OFICINA_OPERACIONES")]),
  "container:manage": stryMutAct_9fa48("11240") ? [] : (stryCov_9fa48("11240"), [stryMutAct_9fa48("11241") ? "" : (stryCov_9fa48("11241"), "M6_ADMIN"), stryMutAct_9fa48("11242") ? "" : (stryCov_9fa48("11242"), "M6_OFICINA_OPERACIONES")]),
  "greenSpace:manage": stryMutAct_9fa48("11243") ? [] : (stryCov_9fa48("11243"), [stryMutAct_9fa48("11244") ? "" : (stryCov_9fa48("11244"), "M6_ADMIN"), stryMutAct_9fa48("11245") ? "" : (stryCov_9fa48("11245"), "M6_OFICINA_OPERACIONES")]),
  "greenPoint:manage": stryMutAct_9fa48("11246") ? [] : (stryCov_9fa48("11246"), [stryMutAct_9fa48("11247") ? "" : (stryCov_9fa48("11247"), "M6_ADMIN"), stryMutAct_9fa48("11248") ? "" : (stryCov_9fa48("11248"), "M6_OFICINA_OPERACIONES")]),
  "tree:manage": stryMutAct_9fa48("11249") ? [] : (stryCov_9fa48("11249"), [stryMutAct_9fa48("11250") ? "" : (stryCov_9fa48("11250"), "M6_ADMIN"), stryMutAct_9fa48("11251") ? "" : (stryCov_9fa48("11251"), "M6_OFICINA_OPERACIONES")]),
  "treeIntervention:request": stryMutAct_9fa48("11252") ? [] : (stryCov_9fa48("11252"), [stryMutAct_9fa48("11253") ? "" : (stryCov_9fa48("11253"), "M6_ADMIN"), stryMutAct_9fa48("11254") ? "" : (stryCov_9fa48("11254"), "M6_OFICINA_OPERACIONES")]),
  "treeIntervention:authorize": stryMutAct_9fa48("11255") ? [] : (stryCov_9fa48("11255"), [stryMutAct_9fa48("11256") ? "" : (stryCov_9fa48("11256"), "M6_ADMIN"), stryMutAct_9fa48("11257") ? "" : (stryCov_9fa48("11257"), "M6_OFICINA_OPERACIONES")]),
  "treeIntervention:authorizeRemoval": stryMutAct_9fa48("11258") ? [] : (stryCov_9fa48("11258"), [stryMutAct_9fa48("11259") ? "" : (stryCov_9fa48("11259"), "M6_ADMIN")]),
  "repairRequest:create": stryMutAct_9fa48("11260") ? [] : (stryCov_9fa48("11260"), [stryMutAct_9fa48("11261") ? "" : (stryCov_9fa48("11261"), "M6_ADMIN"), stryMutAct_9fa48("11262") ? "" : (stryCov_9fa48("11262"), "M6_OFICINA_OPERACIONES")]),
  "streetClosureRequest:create": stryMutAct_9fa48("11263") ? [] : (stryCov_9fa48("11263"), [stryMutAct_9fa48("11264") ? "" : (stryCov_9fa48("11264"), "M6_ADMIN"), stryMutAct_9fa48("11265") ? "" : (stryCov_9fa48("11265"), "M6_OFICINA_OPERACIONES")]),
  "referral:reconcile": stryMutAct_9fa48("11266") ? [] : (stryCov_9fa48("11266"), [stryMutAct_9fa48("11267") ? "" : (stryCov_9fa48("11267"), "M6_ADMIN")]),
  "serviceType:manage": stryMutAct_9fa48("11268") ? [] : (stryCov_9fa48("11268"), [stryMutAct_9fa48("11269") ? "" : (stryCov_9fa48("11269"), "M6_ADMIN")]),
  "disposalSite:manage": stryMutAct_9fa48("11270") ? [] : (stryCov_9fa48("11270"), [stryMutAct_9fa48("11271") ? "" : (stryCov_9fa48("11271"), "M6_ADMIN")]),
  "vehicle:manage": stryMutAct_9fa48("11272") ? [] : (stryCov_9fa48("11272"), [stryMutAct_9fa48("11273") ? "" : (stryCov_9fa48("11273"), "M6_ADMIN")]),
  "crew:manage": stryMutAct_9fa48("11274") ? [] : (stryCov_9fa48("11274"), [stryMutAct_9fa48("11275") ? "" : (stryCov_9fa48("11275"), "M6_ADMIN")]),
  "zone:manage": stryMutAct_9fa48("11276") ? [] : (stryCov_9fa48("11276"), [stryMutAct_9fa48("11277") ? "" : (stryCov_9fa48("11277"), "M6_ADMIN")]),
  "route:manage": stryMutAct_9fa48("11278") ? [] : (stryCov_9fa48("11278"), [stryMutAct_9fa48("11279") ? "" : (stryCov_9fa48("11279"), "M6_ADMIN")]),
  "serviceFrequency:manage": stryMutAct_9fa48("11280") ? [] : (stryCov_9fa48("11280"), [stryMutAct_9fa48("11281") ? "" : (stryCov_9fa48("11281"), "M6_ADMIN")])
});
export function capabilitiesForRoles(roles: readonly M6Role[]): Capability[] {
  if (stryMutAct_9fa48("11282")) {
    {}
  } else {
    stryCov_9fa48("11282");
    if (stryMutAct_9fa48("11285") ? roles.length !== 0 : stryMutAct_9fa48("11284") ? false : stryMutAct_9fa48("11283") ? true : (stryCov_9fa48("11283", "11284", "11285"), roles.length === 0)) return stryMutAct_9fa48("11286") ? ["Stryker was here"] : (stryCov_9fa48("11286"), []);
    return stryMutAct_9fa48("11287") ? Object.keys(ROLES_BY_CAPABILITY) as Capability[] : (stryCov_9fa48("11287"), (Object.keys(ROLES_BY_CAPABILITY) as Capability[]).filter(capability => {
      if (stryMutAct_9fa48("11288")) {
        {}
      } else {
        stryCov_9fa48("11288");
        const allowed = ROLES_BY_CAPABILITY[capability];
        return stryMutAct_9fa48("11291") ? allowed === null && roles.some(role => allowed.includes(role)) : stryMutAct_9fa48("11290") ? false : stryMutAct_9fa48("11289") ? true : (stryCov_9fa48("11289", "11290", "11291"), (stryMutAct_9fa48("11293") ? allowed !== null : stryMutAct_9fa48("11292") ? false : (stryCov_9fa48("11292", "11293"), allowed === null)) || (stryMutAct_9fa48("11294") ? roles.every(role => allowed.includes(role)) : (stryCov_9fa48("11294"), roles.some(stryMutAct_9fa48("11295") ? () => undefined : (stryCov_9fa48("11295"), role => allowed.includes(role))))));
      }
    }));
  }
}
/** Oficina y Campo no conviven (ADR-0002); un auditor solo lee, sin alcance de cuadrilla, así que se trata como Oficina. */
export function actorKindForRoles(roles: readonly M6Role[]): "OFFICE" | "FIELD" {
  if (stryMutAct_9fa48("11296")) {
    {}
  } else {
    stryCov_9fa48("11296");
    return (stryMutAct_9fa48("11299") ? roles.some(role => FIELD_ROLES.includes(role)) || !roles.some(role => OFFICE_ROLES.includes(role)) : stryMutAct_9fa48("11298") ? false : stryMutAct_9fa48("11297") ? true : (stryCov_9fa48("11297", "11298", "11299"), (stryMutAct_9fa48("11300") ? roles.every(role => FIELD_ROLES.includes(role)) : (stryCov_9fa48("11300"), roles.some(stryMutAct_9fa48("11301") ? () => undefined : (stryCov_9fa48("11301"), role => FIELD_ROLES.includes(role))))) && (stryMutAct_9fa48("11302") ? roles.some(role => OFFICE_ROLES.includes(role)) : (stryCov_9fa48("11302"), !(stryMutAct_9fa48("11303") ? roles.every(role => OFFICE_ROLES.includes(role)) : (stryCov_9fa48("11303"), roles.some(stryMutAct_9fa48("11304") ? () => undefined : (stryCov_9fa48("11304"), role => OFFICE_ROLES.includes(role))))))))) ? stryMutAct_9fa48("11305") ? "" : (stryCov_9fa48("11305"), "FIELD") : stryMutAct_9fa48("11306") ? "" : (stryCov_9fa48("11306"), "OFFICE");
  }
}