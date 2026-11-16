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
import { authorize, backendMode, errorResponse, forwardResponse, handleRouteError } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { getContainerFixture, confirmRelocationFixture } from "@/lib/containers-fixtures";
import { confirmRelocationInputSchema } from "@/lib/containers";
import { getRequiredSession } from "@/lib/session";
async function targetId(context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("241")) {
    {}
  } else {
    stryCov_9fa48("241");
    return (await context.params).id;
  }
}
export async function POST(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("242")) {
    {}
  } else {
    stryCov_9fa48("242");
    const id = await targetId(context);
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("243")) {
        {}
      } else {
        stryCov_9fa48("243");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("245") ? {} : (stryCov_9fa48("245"), {
          capability: stryMutAct_9fa48("246") ? "" : (stryCov_9fa48("246"), "container:manage"),
          capabilityMessage: stryMutAct_9fa48("247") ? "" : (stryCov_9fa48("247"), "No tiene permisos para confirmar la reubicación de contenedores."),
          throwOnError: stryMutAct_9fa48("248") ? false : (stryCov_9fa48("248"), true)
        }));
        let body: unknown;
        try {
          if (stryMutAct_9fa48("249")) {
            {}
          } else {
            stryCov_9fa48("249");
            body = await request.json();
          }
        } catch {
          if (stryMutAct_9fa48("250")) {
            {}
          } else {
            stryCov_9fa48("250");
            return errorResponse(400, stryMutAct_9fa48("251") ? "" : (stryCov_9fa48("251"), "El cuerpo de la solicitud debe ser un JSON válido."), path);
          }
        }
        const parsed = confirmRelocationInputSchema.safeParse(body);
        if (stryMutAct_9fa48("254") ? false : stryMutAct_9fa48("253") ? true : stryMutAct_9fa48("252") ? parsed.success : (stryCov_9fa48("252", "253", "254"), !parsed.success)) {
          if (stryMutAct_9fa48("255")) {
            {}
          } else {
            stryCov_9fa48("255");
            return errorResponse(400, parsed.error.issues.map(stryMutAct_9fa48("256") ? () => undefined : (stryCov_9fa48("256"), i => i.message)).join(stryMutAct_9fa48("257") ? "" : (stryCov_9fa48("257"), " ")), path);
          }
        }
        if (stryMutAct_9fa48("259") ? false : stryMutAct_9fa48("258") ? true : (stryCov_9fa48("258", "259"), backendMode(session))) {
          if (stryMutAct_9fa48("260")) {
            {}
          } else {
            stryCov_9fa48("260");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("261") ? `` : (stryCov_9fa48("261"), `/containers/${pathId(id)}/confirm-relocation`), stryMutAct_9fa48("262") ? "" : (stryCov_9fa48("262"), "container:manage"), stryMutAct_9fa48("263") ? {} : (stryCov_9fa48("263"), {
              method: stryMutAct_9fa48("264") ? "" : (stryCov_9fa48("264"), "POST"),
              headers: stryMutAct_9fa48("265") ? {} : (stryCov_9fa48("265"), {
                "content-type": stryMutAct_9fa48("266") ? "" : (stryCov_9fa48("266"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(backendResponse);
          }
        }
        const container = getContainerFixture(id);
        if (stryMutAct_9fa48("269") ? false : stryMutAct_9fa48("268") ? true : stryMutAct_9fa48("267") ? container : (stryCov_9fa48("267", "268", "269"), !container)) {
          if (stryMutAct_9fa48("270")) {
            {}
          } else {
            stryCov_9fa48("270");
            return errorResponse(404, stryMutAct_9fa48("271") ? `` : (stryCov_9fa48("271"), `Contenedor ${id} no encontrado.`), path);
          }
        }
        if (stryMutAct_9fa48("274") ? container.status === "RELOCATING" : stryMutAct_9fa48("273") ? false : stryMutAct_9fa48("272") ? true : (stryCov_9fa48("272", "273", "274"), container.status !== (stryMutAct_9fa48("275") ? "" : (stryCov_9fa48("275"), "RELOCATING")))) {
          if (stryMutAct_9fa48("276")) {
            {}
          } else {
            stryCov_9fa48("276");
            return errorResponse(409, stryMutAct_9fa48("277") ? `` : (stryCov_9fa48("277"), `Solo se puede confirmar la reubicación en contenedores en estado de reubicación. Estado actual: ${container.status}`), path);
          }
        }
        const updated = confirmRelocationFixture(id, parsed.data);
        return NextResponse.json(updated, stryMutAct_9fa48("278") ? {} : (stryCov_9fa48("278"), {
          status: 200
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("279")) {
        {}
      } else {
        stryCov_9fa48("279");
        return handleRouteError(error, path, stryMutAct_9fa48("280") ? "" : (stryCov_9fa48("280"), "No se pudo confirmar la reubicación del contenedor."));
      }
    }
  }
}