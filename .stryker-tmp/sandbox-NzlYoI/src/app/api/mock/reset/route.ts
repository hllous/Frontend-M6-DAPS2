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
import { resetRoleAssignmentFixtures } from "@/mocks/role-assignment-fixtures";
import { NextResponse } from "next/server";
import { resetContainerFixtures } from "@/lib/containers-fixtures";
import { resetCrewFixtures } from "@/lib/crew-fixtures";
import { resetDisposalSiteFixtures } from "@/lib/disposal-site-fixtures";
import { resetEnvironmentalInspectionFixtures, resetEnvironmentalReportFixtures, resetSanctionOutcomeFixtures, resetViolationNoticeFixtures } from "@/lib/environmental-report-fixtures";
import { resetGreenPointFixtures } from "@/lib/green-point-fixtures";
import { resetGreenSpaceFixtures } from "@/lib/green-space-fixtures";
import { resetIntegrationMonitorFixtures } from "@/mocks/integration-monitor-fixtures";
import { resetRepairRequestFixtures } from "@/lib/repair-request-fixtures";
import { resetRouteFixtures } from "@/lib/routes-fixtures";
import { resetServiceFrequencyFixtures } from "@/lib/service-frequency-fixtures";
import { resetServiceTypeFixtures } from "@/lib/service-type-fixtures";
import { resetServiceFixtures, resetZoneResultFixtures } from "@/lib/services-fixtures";
import { getAuthMode } from "@/lib/session";
import { getSessionMutationRejection } from "@/lib/session-request";
import { resetStreetClosureRequestFixtures } from "@/lib/street-closure-request-fixtures";
import { resetTreeFixtures } from "@/lib/tree-fixtures";
import { resetTreeInterventionFixtures } from "@/lib/tree-intervention-fixtures";
import { resetTreeSurveyFixtures } from "@/lib/tree-survey-fixtures";
import { resetVehicleFixtures } from "@/lib/vehicles-fixtures";
import { resetZoneFixtures } from "@/lib/zones-fixtures";

/** Every in-memory fixture a mock-mode BFF route can mutate. Add new `reset*Fixtures` here. */
const FIXTURE_RESETS = stryMutAct_9fa48("3104") ? [] : (stryCov_9fa48("3104"), [resetRoleAssignmentFixtures, resetContainerFixtures, resetCrewFixtures, resetDisposalSiteFixtures, resetEnvironmentalReportFixtures, resetEnvironmentalInspectionFixtures, resetViolationNoticeFixtures, resetSanctionOutcomeFixtures, resetGreenPointFixtures, resetGreenSpaceFixtures, resetIntegrationMonitorFixtures, resetRepairRequestFixtures, resetRouteFixtures, resetServiceFrequencyFixtures, resetServiceTypeFixtures, resetServiceFixtures, resetZoneResultFixtures, resetStreetClosureRequestFixtures, resetTreeFixtures, resetTreeInterventionFixtures, resetTreeSurveyFixtures, resetVehicleFixtures, resetZoneFixtures]);

/**
 * Restores the seeded mock data so a dev server can run e2e specs that change data again
 * without a restart. Exists only for a non-production server in mock mode.
 */
export async function POST(request: Request) {
  if (stryMutAct_9fa48("3105")) {
    {}
  } else {
    stryCov_9fa48("3105");
    if (stryMutAct_9fa48("3108") ? process.env.NODE_ENV === "production" && getAuthMode() !== "mock" : stryMutAct_9fa48("3107") ? false : stryMutAct_9fa48("3106") ? true : (stryCov_9fa48("3106", "3107", "3108"), (stryMutAct_9fa48("3110") ? process.env.NODE_ENV !== "production" : stryMutAct_9fa48("3109") ? false : (stryCov_9fa48("3109", "3110"), process.env.NODE_ENV === (stryMutAct_9fa48("3111") ? "" : (stryCov_9fa48("3111"), "production")))) || (stryMutAct_9fa48("3113") ? getAuthMode() === "mock" : stryMutAct_9fa48("3112") ? false : (stryCov_9fa48("3112", "3113"), getAuthMode() !== (stryMutAct_9fa48("3114") ? "" : (stryCov_9fa48("3114"), "mock")))))) {
      if (stryMutAct_9fa48("3115")) {
        {}
      } else {
        stryCov_9fa48("3115");
        return NextResponse.json(stryMutAct_9fa48("3116") ? {} : (stryCov_9fa48("3116"), {
          message: stryMutAct_9fa48("3117") ? "" : (stryCov_9fa48("3117"), "No encontrado.")
        }), stryMutAct_9fa48("3118") ? {} : (stryCov_9fa48("3118"), {
          status: 404
        }));
      }
    }
    const rejection = getSessionMutationRejection(request);
    if (stryMutAct_9fa48("3120") ? false : stryMutAct_9fa48("3119") ? true : (stryCov_9fa48("3119", "3120"), rejection)) {
      if (stryMutAct_9fa48("3121")) {
        {}
      } else {
        stryCov_9fa48("3121");
        return NextResponse.json(stryMutAct_9fa48("3122") ? {} : (stryCov_9fa48("3122"), {
          message: rejection.message
        }), stryMutAct_9fa48("3123") ? {} : (stryCov_9fa48("3123"), {
          status: rejection.status
        }));
      }
    }
    FIXTURE_RESETS.forEach(stryMutAct_9fa48("3125") ? () => undefined : (stryCov_9fa48("3125"), reset => reset()));
    return NextResponse.json(stryMutAct_9fa48("3126") ? {} : (stryCov_9fa48("3126"), {
      reset: FIXTURE_RESETS.length
    }));
  }
}