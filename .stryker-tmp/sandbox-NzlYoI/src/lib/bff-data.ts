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
import { backendMode } from "./bff-route";
import { fetchMe } from "./me";
import type { M6Role } from "./m6-roles";
import { getScenario, type OperationalScenario, type ScenarioId } from "./scenarios";
import { ForbiddenSessionError, getRequiredSession, type Session } from "./session";

/**
 * El escenario de la sesión con los roles de M6 al día. En modo backend salen de GET /me (única fuente);
 * un usuario sin roles recibe el escenario igual, con `capabilities` vacías: la UI explica que falta asignarle uno.
 */
export async function loadAuthorizedScenario(request: Request, scenarioId: ScenarioId): Promise<{
  session: Session;
  roles: M6Role[];
  scenario: OperationalScenario;
}> {
  if (stryMutAct_9fa48("7188")) {
    {}
  } else {
    stryCov_9fa48("7188");
    const session = getRequiredSession(request);
    if (stryMutAct_9fa48("7191") ? session.scenarioId === scenarioId : stryMutAct_9fa48("7190") ? false : stryMutAct_9fa48("7189") ? true : (stryCov_9fa48("7189", "7190", "7191"), session.scenarioId !== scenarioId)) if (stryMutAct_9fa48("7192")) {
      ;
    } else {
      stryCov_9fa48("7192");
      throw new ForbiddenSessionError();
    }
    const roles = backendMode(session) ? (await fetchMe(request)).roles : session.roles;
    return stryMutAct_9fa48("7193") ? {} : (stryCov_9fa48("7193"), {
      session,
      roles,
      scenario: getScenario(stryMutAct_9fa48("7194") ? {} : (stryCov_9fa48("7194"), {
        ...session,
        roles
      }))
    });
  }
}