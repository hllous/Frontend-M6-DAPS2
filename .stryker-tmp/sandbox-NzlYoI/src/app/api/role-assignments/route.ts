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
import { NextResponse } from "next/server";
import { authorize, backendMode, backendQuery, mapSessionError } from "@/lib/bff-route";
import { fetchBackend } from "@/lib/bff-backend";
import { roleAssignmentPageSchema, validatedRoleAssignmentResponse } from "@/lib/role-assignment-bff";
import { pageParam, pageSizeParam } from "@/lib/input-limits";
import { listRoles } from "@/mocks/role-assignment-fixtures";
export async function GET(request: Request) {
  if (stryMutAct_9fa48("3817")) {
    {}
  } else {
    stryCov_9fa48("3817");
    try {
      if (stryMutAct_9fa48("3818")) {
        {}
      } else {
        stryCov_9fa48("3818");
        const {
          session
        } = authorize(request, stryMutAct_9fa48("3819") ? {} : (stryCov_9fa48("3819"), {
          capability: stryMutAct_9fa48("3820") ? "" : (stryCov_9fa48("3820"), "role:manage"),
          throwOnError: stryMutAct_9fa48("3821") ? false : (stryCov_9fa48("3821"), true)
        }));
        const search = new URL(request.url).searchParams;
        const query = stryMutAct_9fa48("3822") ? {} : (stryCov_9fa48("3822"), {
          page: pageParam(search),
          pageSize: pageSizeParam(search)
        });
        if (stryMutAct_9fa48("3824") ? false : stryMutAct_9fa48("3823") ? true : (stryCov_9fa48("3823", "3824"), backendMode(session))) {
          if (stryMutAct_9fa48("3825")) {
            {}
          } else {
            stryCov_9fa48("3825");
            const response = await fetchBackend(request, stryMutAct_9fa48("3826") ? `` : (stryCov_9fa48("3826"), `/role-assignments${backendQuery(query, stryMutAct_9fa48("3827") ? [] : (stryCov_9fa48("3827"), [stryMutAct_9fa48("3828") ? "" : (stryCov_9fa48("3828"), "page"), stryMutAct_9fa48("3829") ? "" : (stryCov_9fa48("3829"), "pageSize")]))}`), stryMutAct_9fa48("3830") ? "" : (stryCov_9fa48("3830"), "role:manage"));
            return validatedRoleAssignmentResponse(response, roleAssignmentPageSchema, new URL(request.url).pathname);
          }
        }
        return NextResponse.json(listRoles(stryMutAct_9fa48("3831") ? query.page && 1 : (stryCov_9fa48("3831"), query.page ?? 1), stryMutAct_9fa48("3832") ? query.pageSize && 10 : (stryCov_9fa48("3832"), query.pageSize ?? 10)));
      }
    } catch (error) {
      if (stryMutAct_9fa48("3833")) {
        {}
      } else {
        stryCov_9fa48("3833");
        return mapSessionError(error, new URL(request.url).pathname, stryMutAct_9fa48("3834") ? "" : (stryCov_9fa48("3834"), "No se pudieron cargar las asignaciones."));
      }
    }
  }
}