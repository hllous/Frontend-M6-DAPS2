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
import { getScenario, type ScenarioId } from "./scenarios";
import { DEMO_IDENTITIES } from "./demo-identities";
import { personNameOrLegajo } from "./m1-identity";
import type { Session } from "./session";
export type SessionActor = {
  scenarioId: ScenarioId;
  userId: string;
  displayName: string;
  m1Identity?: {
    userId: string;
    label: string;
  };
};

/** M1 supplies its confirmed user id; demo and mock sessions use their seeded M1 subject. */
export function sessionUserId(session: Session): string | undefined {
  if (stryMutAct_9fa48("15470")) {
    {}
  } else {
    stryCov_9fa48("15470");
    if (stryMutAct_9fa48("15472") ? false : stryMutAct_9fa48("15471") ? true : (stryCov_9fa48("15471", "15472"), session.identity)) return session.identity.userId;
    return session.scenarioId ? DEMO_IDENTITIES[session.scenarioId].sub : undefined;
  }
}

/** One presentation actor for both demo sessions and identity confirmed by Backend GET /me. */
export async function sessionActor(session: Session): Promise<SessionActor> {
  if (stryMutAct_9fa48("15473")) {
    {}
  } else {
    stryCov_9fa48("15473");
    const scenarioId = stryMutAct_9fa48("15474") ? session.scenarioId && "employee-no-role" : (stryCov_9fa48("15474"), session.scenarioId ?? (stryMutAct_9fa48("15475") ? "" : (stryCov_9fa48("15475"), "employee-no-role")));
    const scenario = getScenario(stryMutAct_9fa48("15476") ? {} : (stryCov_9fa48("15476"), {
      ...session,
      scenarioId
    }));
    if (stryMutAct_9fa48("15478") ? false : stryMutAct_9fa48("15477") ? true : (stryCov_9fa48("15477", "15478"), session.identity)) {
      if (stryMutAct_9fa48("15479")) {
        {}
      } else {
        stryCov_9fa48("15479");
        const displayName = await personNameOrLegajo(session.identity.userId);
        return stryMutAct_9fa48("15480") ? {} : (stryCov_9fa48("15480"), {
          scenarioId,
          userId: session.identity.userId,
          displayName,
          m1Identity: stryMutAct_9fa48("15481") ? {} : (stryCov_9fa48("15481"), {
            userId: session.identity.userId,
            label: displayName
          })
        });
      }
    }
    return stryMutAct_9fa48("15482") ? {} : (stryCov_9fa48("15482"), {
      scenarioId,
      userId: stryMutAct_9fa48("15483") ? sessionUserId(session) && scenario.actor.userId : (stryCov_9fa48("15483"), sessionUserId(session) ?? scenario.actor.userId),
      displayName: DEMO_IDENTITIES[scenarioId].name
    });
  }
}