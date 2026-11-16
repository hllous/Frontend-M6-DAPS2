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
import { authorize, backendMode, errorResponse, mapSessionError, forwardResponse, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { crewFixtures } from "@/lib/crew-fixtures";
import { addCrewMembersInputSchema } from "@/lib/crews";
import { AuthUnavailableError, ForbiddenSessionError, InvalidSessionError } from "@/lib/session";
type PostContext = {
  params: Promise<{
    id: string;
  }>;
};
function requireOfficeCapability(request: Request) {
  if (stryMutAct_9fa48("719")) {
    {}
  } else {
    stryCov_9fa48("719");
    return authorize(request, stryMutAct_9fa48("720") ? {} : (stryCov_9fa48("720"), {
      office: stryMutAct_9fa48("721") ? false : (stryCov_9fa48("721"), true),
      officeMessage: stryMutAct_9fa48("722") ? "" : (stryCov_9fa48("722"), "Solo Oficina puede administrar integrantes de cuadrillas."),
      capability: stryMutAct_9fa48("723") ? "" : (stryCov_9fa48("723"), "crew:manage"),
      throwOnError: stryMutAct_9fa48("724") ? false : (stryCov_9fa48("724"), true)
    })).session;
  }
}

// El backend nombra el campo userIds en POST /crews/{id}/members; adentro se sigue
// llamando memberUserIds, asi que la traduccion queda en el borde, que es el BFF.
export async function POST(request: Request, routeContext: PostContext) {
  if (stryMutAct_9fa48("725")) {
    {}
  } else {
    stryCov_9fa48("725");
    const {
      id
    } = await routeContext.params;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("726")) {
        {}
      } else {
        stryCov_9fa48("726");
        const session = requireOfficeCapability(request);
        const parsed = await parseJsonBody(request, addCrewMembersInputSchema, path);
        if (stryMutAct_9fa48("728") ? false : stryMutAct_9fa48("727") ? true : (stryCov_9fa48("727", "728"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("730") ? false : stryMutAct_9fa48("729") ? true : (stryCov_9fa48("729", "730"), backendMode(session))) return forwardResponse(await fetchBackend(request, stryMutAct_9fa48("731") ? `` : (stryCov_9fa48("731"), `/crews/${pathId(id)}/members`), stryMutAct_9fa48("732") ? "" : (stryCov_9fa48("732"), "crew:manage"), stryMutAct_9fa48("733") ? {} : (stryCov_9fa48("733"), {
          method: stryMutAct_9fa48("734") ? "" : (stryCov_9fa48("734"), "POST"),
          headers: stryMutAct_9fa48("735") ? {} : (stryCov_9fa48("735"), {
            "content-type": stryMutAct_9fa48("736") ? "" : (stryCov_9fa48("736"), "application/json")
          }),
          body: JSON.stringify(stryMutAct_9fa48("737") ? {} : (stryCov_9fa48("737"), {
            ...((stryMutAct_9fa48("740") ? parsed.data.userIds && parsed.data.memberUserIds : stryMutAct_9fa48("739") ? false : stryMutAct_9fa48("738") ? true : (stryCov_9fa48("738", "739", "740"), parsed.data.userIds || parsed.data.memberUserIds)) ? stryMutAct_9fa48("741") ? {} : (stryCov_9fa48("741"), {
              userIds: stryMutAct_9fa48("742") ? parsed.data.userIds && parsed.data.memberUserIds : (stryCov_9fa48("742"), parsed.data.userIds ?? parsed.data.memberUserIds)
            }) : {}),
            ...(parsed.data.members ? stryMutAct_9fa48("743") ? {} : (stryCov_9fa48("743"), {
              members: parsed.data.members
            }) : {})
          }))
        })));
        const crew = crewFixtures.find(stryMutAct_9fa48("744") ? () => undefined : (stryCov_9fa48("744"), item => stryMutAct_9fa48("747") ? item.id !== id : stryMutAct_9fa48("746") ? false : stryMutAct_9fa48("745") ? true : (stryCov_9fa48("745", "746", "747"), item.id === id)));
        if (stryMutAct_9fa48("750") ? false : stryMutAct_9fa48("749") ? true : stryMutAct_9fa48("748") ? crew : (stryCov_9fa48("748", "749", "750"), !crew)) return errorResponse(404, stryMutAct_9fa48("751") ? `` : (stryCov_9fa48("751"), `La cuadrilla ${id} no existe.`), path);
        const incoming = stryMutAct_9fa48("752") ? [] : (stryCov_9fa48("752"), [...(stryMutAct_9fa48("753") ? (parsed.data.userIds ?? parsed.data.memberUserIds) && [] : (stryCov_9fa48("753"), (stryMutAct_9fa48("754") ? parsed.data.userIds && parsed.data.memberUserIds : (stryCov_9fa48("754"), parsed.data.userIds ?? parsed.data.memberUserIds)) ?? (stryMutAct_9fa48("755") ? ["Stryker was here"] : (stryCov_9fa48("755"), [])))).map(stryMutAct_9fa48("756") ? () => undefined : (stryCov_9fa48("756"), userId => stryMutAct_9fa48("757") ? {} : (stryCov_9fa48("757"), {
          userId,
          displayName: null
        }))), ...(stryMutAct_9fa48("758") ? parsed.data.members && [] : (stryCov_9fa48("758"), parsed.data.members ?? (stryMutAct_9fa48("759") ? ["Stryker was here"] : (stryCov_9fa48("759"), [])))).map(stryMutAct_9fa48("760") ? () => undefined : (stryCov_9fa48("760"), member => stryMutAct_9fa48("761") ? {} : (stryCov_9fa48("761"), {
          userId: member.userId,
          displayName: stryMutAct_9fa48("762") ? member.displayName && null : (stryCov_9fa48("762"), member.displayName ?? null)
        })))]);
        for (const member of incoming) if (stryMutAct_9fa48("765") ? false : stryMutAct_9fa48("764") ? true : stryMutAct_9fa48("763") ? crew.members.some(item => item.userId === member.userId) : (stryCov_9fa48("763", "764", "765"), !(stryMutAct_9fa48("766") ? crew.members.every(item => item.userId === member.userId) : (stryCov_9fa48("766"), crew.members.some(stryMutAct_9fa48("767") ? () => undefined : (stryCov_9fa48("767"), item => stryMutAct_9fa48("770") ? item.userId !== member.userId : stryMutAct_9fa48("769") ? false : stryMutAct_9fa48("768") ? true : (stryCov_9fa48("768", "769", "770"), item.userId === member.userId))))))) if (stryMutAct_9fa48("771")) {
          ;
        } else {
          stryCov_9fa48("771");
          crew.members.push(member);
        }
        crew.memberUserIds = crew.members.map(stryMutAct_9fa48("772") ? () => undefined : (stryCov_9fa48("772"), member => member.userId));
        return NextResponse.json(crew);
      }
    } catch (error) {
      if (stryMutAct_9fa48("773")) {
        {}
      } else {
        stryCov_9fa48("773");
        if (stryMutAct_9fa48("775") ? false : stryMutAct_9fa48("774") ? true : (stryCov_9fa48("774", "775"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("776") ? "" : (stryCov_9fa48("776"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("778") ? false : stryMutAct_9fa48("777") ? true : (stryCov_9fa48("777", "778"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("780") ? false : stryMutAct_9fa48("779") ? true : (stryCov_9fa48("779", "780"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("781") ? "" : (stryCov_9fa48("781"), "No se pudieron agregar los integrantes."));
      }
    }
  }
}