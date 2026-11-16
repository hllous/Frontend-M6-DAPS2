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
import { treeFixtures, updateTreeFixture } from "@/lib/tree-fixtures";
import { treeUpdateInputSchema } from "@/lib/trees";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
async function targetId(context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("6046")) {
    {}
  } else {
    stryCov_9fa48("6046");
    return (await context.params).id;
  }
}
function requireOffice(request: Request) {
  if (stryMutAct_9fa48("6047")) {
    {}
  } else {
    stryCov_9fa48("6047");
    return authorize(request, stryMutAct_9fa48("6048") ? {} : (stryCov_9fa48("6048"), {
      office: stryMutAct_9fa48("6049") ? false : (stryCov_9fa48("6049"), true),
      officeMessage: stryMutAct_9fa48("6050") ? "" : (stryCov_9fa48("6050"), "Solo Oficina puede administrar árboles."),
      capability: stryMutAct_9fa48("6051") ? "" : (stryCov_9fa48("6051"), "tree:manage"),
      throwOnError: stryMutAct_9fa48("6052") ? false : (stryCov_9fa48("6052"), true)
    })).session;
  }
}
export async function GET(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("6053")) {
    {}
  } else {
    stryCov_9fa48("6053");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("6054")) {
        {}
      } else {
        stryCov_9fa48("6054");
        const session = getRequiredSession(request);
        const id = await targetId(context);
        if (stryMutAct_9fa48("6056") ? false : stryMutAct_9fa48("6055") ? true : (stryCov_9fa48("6055", "6056"), backendMode(session))) {
          if (stryMutAct_9fa48("6057")) {
            {}
          } else {
            stryCov_9fa48("6057");
            const response = await fetchBackend(request, stryMutAct_9fa48("6058") ? `` : (stryCov_9fa48("6058"), `/trees/${pathId(id)}`));
            return forwardResponse(response);
          }
        }
        const item = treeFixtures.find(stryMutAct_9fa48("6059") ? () => undefined : (stryCov_9fa48("6059"), candidate => stryMutAct_9fa48("6062") ? candidate.id !== id : stryMutAct_9fa48("6061") ? false : stryMutAct_9fa48("6060") ? true : (stryCov_9fa48("6060", "6061", "6062"), candidate.id === id)));
        return item ? NextResponse.json(item) : errorResponse(404, stryMutAct_9fa48("6063") ? `` : (stryCov_9fa48("6063"), `Árbol ${id} no encontrado.`), path);
      }
    } catch (error) {
      if (stryMutAct_9fa48("6064")) {
        {}
      } else {
        stryCov_9fa48("6064");
        if (stryMutAct_9fa48("6066") ? false : stryMutAct_9fa48("6065") ? true : (stryCov_9fa48("6065", "6066"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("6067") ? "" : (stryCov_9fa48("6067"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("6069") ? false : stryMutAct_9fa48("6068") ? true : (stryCov_9fa48("6068", "6069"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("6070") ? "" : (stryCov_9fa48("6070"), "No se pudo cargar el árbol."));
      }
    }
  }
}
export async function PATCH(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("6071")) {
    {}
  } else {
    stryCov_9fa48("6071");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("6072")) {
        {}
      } else {
        stryCov_9fa48("6072");
        const session = requireOffice(request);
        const id = await targetId(context);
        const parsed = await parseJsonBody(request, treeUpdateInputSchema, path);
        if (stryMutAct_9fa48("6074") ? false : stryMutAct_9fa48("6073") ? true : (stryCov_9fa48("6073", "6074"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("6076") ? false : stryMutAct_9fa48("6075") ? true : (stryCov_9fa48("6075", "6076"), backendMode(session))) {
          if (stryMutAct_9fa48("6077")) {
            {}
          } else {
            stryCov_9fa48("6077");
            const response = await fetchBackend(request, stryMutAct_9fa48("6078") ? `` : (stryCov_9fa48("6078"), `/trees/${pathId(id)}`), stryMutAct_9fa48("6079") ? "" : (stryCov_9fa48("6079"), "tree:manage"), stryMutAct_9fa48("6080") ? {} : (stryCov_9fa48("6080"), {
              method: stryMutAct_9fa48("6081") ? "" : (stryCov_9fa48("6081"), "PATCH"),
              headers: stryMutAct_9fa48("6082") ? {} : (stryCov_9fa48("6082"), {
                "content-type": stryMutAct_9fa48("6083") ? "" : (stryCov_9fa48("6083"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(response);
          }
        }
        const updated = updateTreeFixture(id, parsed.data);
        return updated ? NextResponse.json(updated) : errorResponse(404, stryMutAct_9fa48("6084") ? `` : (stryCov_9fa48("6084"), `Árbol ${id} no encontrado.`), path);
      }
    } catch (error) {
      if (stryMutAct_9fa48("6085")) {
        {}
      } else {
        stryCov_9fa48("6085");
        if (stryMutAct_9fa48("6087") ? false : stryMutAct_9fa48("6086") ? true : (stryCov_9fa48("6086", "6087"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("6088") ? "" : (stryCov_9fa48("6088"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("6090") ? false : stryMutAct_9fa48("6089") ? true : (stryCov_9fa48("6089", "6090"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("6092") ? false : stryMutAct_9fa48("6091") ? true : (stryCov_9fa48("6091", "6092"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("6093") ? "" : (stryCov_9fa48("6093"), "No se pudo actualizar el árbol."));
      }
    }
  }
}
export async function DELETE(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("6094")) {
    {}
  } else {
    stryCov_9fa48("6094");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("6095")) {
        {}
      } else {
        stryCov_9fa48("6095");
        const session = requireOffice(request);
        const id = await targetId(context);
        if (stryMutAct_9fa48("6097") ? false : stryMutAct_9fa48("6096") ? true : (stryCov_9fa48("6096", "6097"), backendMode(session))) {
          if (stryMutAct_9fa48("6098")) {
            {}
          } else {
            stryCov_9fa48("6098");
            const response = await fetchBackend(request, stryMutAct_9fa48("6099") ? `` : (stryCov_9fa48("6099"), `/trees/${pathId(id)}`), stryMutAct_9fa48("6100") ? "" : (stryCov_9fa48("6100"), "tree:manage"), stryMutAct_9fa48("6101") ? {} : (stryCov_9fa48("6101"), {
              method: stryMutAct_9fa48("6102") ? "" : (stryCov_9fa48("6102"), "DELETE")
            }));
            return forwardResponse(response);
          }
        }
        const updated = updateTreeFixture(id, stryMutAct_9fa48("6103") ? {} : (stryCov_9fa48("6103"), {
          active: stryMutAct_9fa48("6104") ? true : (stryCov_9fa48("6104"), false)
        }));
        return updated ? new NextResponse(null, stryMutAct_9fa48("6105") ? {} : (stryCov_9fa48("6105"), {
          status: 204
        })) : errorResponse(404, stryMutAct_9fa48("6106") ? `` : (stryCov_9fa48("6106"), `Árbol ${id} no encontrado.`), path);
      }
    } catch (error) {
      if (stryMutAct_9fa48("6107")) {
        {}
      } else {
        stryCov_9fa48("6107");
        if (stryMutAct_9fa48("6109") ? false : stryMutAct_9fa48("6108") ? true : (stryCov_9fa48("6108", "6109"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("6110") ? "" : (stryCov_9fa48("6110"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("6112") ? false : stryMutAct_9fa48("6111") ? true : (stryCov_9fa48("6111", "6112"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("6114") ? false : stryMutAct_9fa48("6113") ? true : (stryCov_9fa48("6113", "6114"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("6115") ? "" : (stryCov_9fa48("6115"), "No se pudo dar de baja el árbol."));
      }
    }
  }
}