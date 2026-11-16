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
import { disposalSiteUpdateInputSchema } from "@/lib/disposal-sites";
import { disposalSiteFixtures, updateDisposalSiteFixture } from "@/lib/disposal-site-fixtures";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
async function targetId(context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("1091")) {
    {}
  } else {
    stryCov_9fa48("1091");
    return (await context.params).id;
  }
}
function requireOffice(request: Request) {
  if (stryMutAct_9fa48("1092")) {
    {}
  } else {
    stryCov_9fa48("1092");
    return authorize(request, stryMutAct_9fa48("1093") ? {} : (stryCov_9fa48("1093"), {
      office: stryMutAct_9fa48("1094") ? false : (stryCov_9fa48("1094"), true),
      officeMessage: stryMutAct_9fa48("1095") ? "" : (stryCov_9fa48("1095"), "Solo Oficina puede administrar sitios de disposición."),
      capability: stryMutAct_9fa48("1096") ? "" : (stryCov_9fa48("1096"), "disposalSite:manage"),
      throwOnError: stryMutAct_9fa48("1097") ? false : (stryCov_9fa48("1097"), true)
    })).session;
  }
}
export async function GET(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("1098")) {
    {}
  } else {
    stryCov_9fa48("1098");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("1099")) {
        {}
      } else {
        stryCov_9fa48("1099");
        const session = getRequiredSession(request);
        const id = await targetId(context);
        if (stryMutAct_9fa48("1101") ? false : stryMutAct_9fa48("1100") ? true : (stryCov_9fa48("1100", "1101"), backendMode(session))) {
          if (stryMutAct_9fa48("1102")) {
            {}
          } else {
            stryCov_9fa48("1102");
            const response = await fetchBackend(request, stryMutAct_9fa48("1103") ? `` : (stryCov_9fa48("1103"), `/disposal-sites/${pathId(id)}`));
            return forwardResponse(response);
          }
        }
        const item = disposalSiteFixtures.find(stryMutAct_9fa48("1104") ? () => undefined : (stryCov_9fa48("1104"), candidate => stryMutAct_9fa48("1107") ? candidate.id !== id : stryMutAct_9fa48("1106") ? false : stryMutAct_9fa48("1105") ? true : (stryCov_9fa48("1105", "1106", "1107"), candidate.id === id)));
        return item ? NextResponse.json(item) : errorResponse(404, stryMutAct_9fa48("1108") ? `` : (stryCov_9fa48("1108"), `Sitio de disposición ${id} no encontrado.`), path);
      }
    } catch (error) {
      if (stryMutAct_9fa48("1109")) {
        {}
      } else {
        stryCov_9fa48("1109");
        if (stryMutAct_9fa48("1111") ? false : stryMutAct_9fa48("1110") ? true : (stryCov_9fa48("1110", "1111"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("1112") ? "" : (stryCov_9fa48("1112"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("1114") ? false : stryMutAct_9fa48("1113") ? true : (stryCov_9fa48("1113", "1114"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("1115") ? "" : (stryCov_9fa48("1115"), "No se pudo cargar el sitio de disposición."));
      }
    }
  }
}
export async function PATCH(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("1116")) {
    {}
  } else {
    stryCov_9fa48("1116");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("1117")) {
        {}
      } else {
        stryCov_9fa48("1117");
        const session = requireOffice(request);
        const id = await targetId(context);
        const parsed = await parseJsonBody(request, disposalSiteUpdateInputSchema, path);
        if (stryMutAct_9fa48("1119") ? false : stryMutAct_9fa48("1118") ? true : (stryCov_9fa48("1118", "1119"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("1121") ? false : stryMutAct_9fa48("1120") ? true : (stryCov_9fa48("1120", "1121"), backendMode(session))) {
          if (stryMutAct_9fa48("1122")) {
            {}
          } else {
            stryCov_9fa48("1122");
            const response = await fetchBackend(request, stryMutAct_9fa48("1123") ? `` : (stryCov_9fa48("1123"), `/disposal-sites/${pathId(id)}`), stryMutAct_9fa48("1124") ? "" : (stryCov_9fa48("1124"), "disposalSite:manage"), stryMutAct_9fa48("1125") ? {} : (stryCov_9fa48("1125"), {
              method: stryMutAct_9fa48("1126") ? "" : (stryCov_9fa48("1126"), "PATCH"),
              headers: stryMutAct_9fa48("1127") ? {} : (stryCov_9fa48("1127"), {
                "content-type": stryMutAct_9fa48("1128") ? "" : (stryCov_9fa48("1128"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(response);
          }
        }
        const updated = updateDisposalSiteFixture(id, parsed.data);
        return updated ? NextResponse.json(updated) : errorResponse(404, stryMutAct_9fa48("1129") ? `` : (stryCov_9fa48("1129"), `Sitio de disposición ${id} no encontrado.`), path);
      }
    } catch (error) {
      if (stryMutAct_9fa48("1130")) {
        {}
      } else {
        stryCov_9fa48("1130");
        if (stryMutAct_9fa48("1132") ? false : stryMutAct_9fa48("1131") ? true : (stryCov_9fa48("1131", "1132"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("1133") ? "" : (stryCov_9fa48("1133"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("1135") ? false : stryMutAct_9fa48("1134") ? true : (stryCov_9fa48("1134", "1135"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("1137") ? false : stryMutAct_9fa48("1136") ? true : (stryCov_9fa48("1136", "1137"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("1138") ? "" : (stryCov_9fa48("1138"), "No se pudo actualizar el sitio de disposición."));
      }
    }
  }
}
export async function DELETE(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("1139")) {
    {}
  } else {
    stryCov_9fa48("1139");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("1140")) {
        {}
      } else {
        stryCov_9fa48("1140");
        const session = requireOffice(request);
        const id = await targetId(context);
        if (stryMutAct_9fa48("1142") ? false : stryMutAct_9fa48("1141") ? true : (stryCov_9fa48("1141", "1142"), backendMode(session))) {
          if (stryMutAct_9fa48("1143")) {
            {}
          } else {
            stryCov_9fa48("1143");
            const response = await fetchBackend(request, stryMutAct_9fa48("1144") ? `` : (stryCov_9fa48("1144"), `/disposal-sites/${pathId(id)}`), stryMutAct_9fa48("1145") ? "" : (stryCov_9fa48("1145"), "disposalSite:manage"), stryMutAct_9fa48("1146") ? {} : (stryCov_9fa48("1146"), {
              method: stryMutAct_9fa48("1147") ? "" : (stryCov_9fa48("1147"), "DELETE")
            }));
            return forwardResponse(response);
          }
        }
        const updated = updateDisposalSiteFixture(id, stryMutAct_9fa48("1148") ? {} : (stryCov_9fa48("1148"), {
          active: stryMutAct_9fa48("1149") ? true : (stryCov_9fa48("1149"), false)
        }));
        return updated ? NextResponse.json(updated) : errorResponse(404, stryMutAct_9fa48("1150") ? `` : (stryCov_9fa48("1150"), `Sitio de disposición ${id} no encontrado.`), path);
      }
    } catch (error) {
      if (stryMutAct_9fa48("1151")) {
        {}
      } else {
        stryCov_9fa48("1151");
        if (stryMutAct_9fa48("1153") ? false : stryMutAct_9fa48("1152") ? true : (stryCov_9fa48("1152", "1153"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("1154") ? "" : (stryCov_9fa48("1154"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("1156") ? false : stryMutAct_9fa48("1155") ? true : (stryCov_9fa48("1155", "1156"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("1158") ? false : stryMutAct_9fa48("1157") ? true : (stryCov_9fa48("1157", "1158"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("1159") ? "" : (stryCov_9fa48("1159"), "No se pudo dar de baja el sitio de disposición."));
      }
    }
  }
}