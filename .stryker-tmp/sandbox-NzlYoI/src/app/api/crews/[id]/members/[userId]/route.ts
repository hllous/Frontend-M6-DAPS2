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
import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { crewFixtures } from "@/lib/crew-fixtures";
import { AuthUnavailableError, ForbiddenSessionError, InvalidSessionError } from "@/lib/session";
type Context = {
  params: Promise<{
    id: string;
    userId: string;
  }>;
};
function requireOfficeCapability(request: Request) {
  if (stryMutAct_9fa48("782")) {
    {}
  } else {
    stryCov_9fa48("782");
    return authorize(request, stryMutAct_9fa48("783") ? {} : (stryCov_9fa48("783"), {
      office: stryMutAct_9fa48("784") ? false : (stryCov_9fa48("784"), true),
      officeMessage: stryMutAct_9fa48("785") ? "" : (stryCov_9fa48("785"), "Solo Oficina puede administrar integrantes de cuadrillas."),
      capability: stryMutAct_9fa48("786") ? "" : (stryCov_9fa48("786"), "crew:manage"),
      throwOnError: stryMutAct_9fa48("787") ? false : (stryCov_9fa48("787"), true)
    })).session;
  }
}
export async function DELETE(request: Request, routeContext: Context) {
  if (stryMutAct_9fa48("788")) {
    {}
  } else {
    stryCov_9fa48("788");
    const {
      id,
      userId
    } = await routeContext.params;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("789")) {
        {}
      } else {
        stryCov_9fa48("789");
        const session = requireOfficeCapability(request);
        if (stryMutAct_9fa48("791") ? false : stryMutAct_9fa48("790") ? true : (stryCov_9fa48("790", "791"), backendMode(session))) return forwardResponse(await fetchBackend(request, stryMutAct_9fa48("792") ? `` : (stryCov_9fa48("792"), `/crews/${pathId(id)}/members/${pathId(userId)}`), stryMutAct_9fa48("793") ? "" : (stryCov_9fa48("793"), "crew:manage"), stryMutAct_9fa48("794") ? {} : (stryCov_9fa48("794"), {
          method: stryMutAct_9fa48("795") ? "" : (stryCov_9fa48("795"), "DELETE")
        })));
        const crew = crewFixtures.find(stryMutAct_9fa48("796") ? () => undefined : (stryCov_9fa48("796"), item => stryMutAct_9fa48("799") ? item.id !== id : stryMutAct_9fa48("798") ? false : stryMutAct_9fa48("797") ? true : (stryCov_9fa48("797", "798", "799"), item.id === id)));
        if (stryMutAct_9fa48("802") ? false : stryMutAct_9fa48("801") ? true : stryMutAct_9fa48("800") ? crew : (stryCov_9fa48("800", "801", "802"), !crew)) return errorResponse(404, stryMutAct_9fa48("803") ? `` : (stryCov_9fa48("803"), `La cuadrilla ${id} no existe.`), path);
        crew.members = stryMutAct_9fa48("804") ? crew.members : (stryCov_9fa48("804"), crew.members.filter(stryMutAct_9fa48("805") ? () => undefined : (stryCov_9fa48("805"), member => stryMutAct_9fa48("808") ? member.userId === userId : stryMutAct_9fa48("807") ? false : stryMutAct_9fa48("806") ? true : (stryCov_9fa48("806", "807", "808"), member.userId !== userId))));
        crew.memberUserIds = stryMutAct_9fa48("809") ? crew.memberUserIds : (stryCov_9fa48("809"), crew.memberUserIds.filter(stryMutAct_9fa48("810") ? () => undefined : (stryCov_9fa48("810"), memberUserId => stryMutAct_9fa48("813") ? memberUserId === userId : stryMutAct_9fa48("812") ? false : stryMutAct_9fa48("811") ? true : (stryCov_9fa48("811", "812", "813"), memberUserId !== userId))));
        return NextResponse.json(crew);
      }
    } catch (error) {
      if (stryMutAct_9fa48("814")) {
        {}
      } else {
        stryCov_9fa48("814");
        if (stryMutAct_9fa48("816") ? false : stryMutAct_9fa48("815") ? true : (stryCov_9fa48("815", "816"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("817") ? "" : (stryCov_9fa48("817"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("819") ? false : stryMutAct_9fa48("818") ? true : (stryCov_9fa48("818", "819"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("821") ? false : stryMutAct_9fa48("820") ? true : (stryCov_9fa48("820", "821"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("822") ? "" : (stryCov_9fa48("822"), "No se pudo quitar el integrante."));
      }
    }
  }
}