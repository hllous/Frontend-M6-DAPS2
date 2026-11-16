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
import { backendMode, errorResponse, handleRouteError } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import type { ZoneReferenceReport } from "@/lib/zones";
import { AuthUnavailableError, getRequiredSession } from "@/lib/session";
import { getZoneFixture, getZoneReferences } from "@/lib/zones-fixtures";
async function targetId(context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("6531")) {
    {}
  } else {
    stryCov_9fa48("6531");
    const resolved = await context.params;
    return resolved.id;
  }
}
export async function GET(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("6532")) {
    {}
  } else {
    stryCov_9fa48("6532");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("6533")) {
        {}
      } else {
        stryCov_9fa48("6533");
        const session = getRequiredSession(request);
        const id = await targetId(context);
        if (stryMutAct_9fa48("6535") ? false : stryMutAct_9fa48("6534") ? true : (stryCov_9fa48("6534", "6535"), backendMode(session))) {
          if (stryMutAct_9fa48("6536")) {
            {}
          } else {
            stryCov_9fa48("6536");
            const detail = await fetchBackend(request, stryMutAct_9fa48("6537") ? `` : (stryCov_9fa48("6537"), `/zones/${pathId(id)}`));
            if (stryMutAct_9fa48("6540") ? detail.status !== 404 : stryMutAct_9fa48("6539") ? false : stryMutAct_9fa48("6538") ? true : (stryCov_9fa48("6538", "6539", "6540"), detail.status === 404)) return errorResponse(404, stryMutAct_9fa48("6541") ? `` : (stryCov_9fa48("6541"), `Zona operativa ${id} no encontrada.`), path);
            if (stryMutAct_9fa48("6544") ? false : stryMutAct_9fa48("6543") ? true : stryMutAct_9fa48("6542") ? detail.ok : (stryCov_9fa48("6542", "6543", "6544"), !detail.ok)) throw new AuthUnavailableError(stryMutAct_9fa48("6546") ? "" : (stryCov_9fa48("6546"), "No se pudo consultar la zona."));
            z.object(stryMutAct_9fa48("6548") ? {} : (stryCov_9fa48("6548"), {
              id: z.literal(id)
            })).parse(await detail.json());
            const routesPageSchema = z.object(stryMutAct_9fa48("6549") ? {} : (stryCov_9fa48("6549"), {
              data: z.array(z.object(stryMutAct_9fa48("6550") ? {} : (stryCov_9fa48("6550"), {
                id: z.string(),
                code: z.string(),
                name: z.string(),
                active: z.boolean(),
                stops: z.array(z.object(stryMutAct_9fa48("6551") ? {} : (stryCov_9fa48("6551"), {
                  zoneId: z.string()
                })))
              }))),
              meta: z.object(stryMutAct_9fa48("6552") ? {} : (stryCov_9fa48("6552"), {
                totalPages: z.number().int().nonnegative()
              }))
            }));
            const activeRoutes: ZoneReferenceReport["activeRoutes"] = stryMutAct_9fa48("6553") ? ["Stryker was here"] : (stryCov_9fa48("6553"), []);
            let page = 1;
            let totalPages = 1;
            do {
              if (stryMutAct_9fa48("6554")) {
                {}
              } else {
                stryCov_9fa48("6554");
                const response = await fetchBackend(request, stryMutAct_9fa48("6555") ? `` : (stryCov_9fa48("6555"), `/routes?active=true&page=${page}&pageSize=100`));
                if (stryMutAct_9fa48("6558") ? false : stryMutAct_9fa48("6557") ? true : stryMutAct_9fa48("6556") ? response.ok : (stryCov_9fa48("6556", "6557", "6558"), !response.ok)) throw new AuthUnavailableError(stryMutAct_9fa48("6560") ? "" : (stryCov_9fa48("6560"), "No se pudieron verificar los recorridos."));
                const payload = routesPageSchema.parse(await response.json());
                totalPages = payload.meta.totalPages;
                activeRoutes.push(...(stryMutAct_9fa48("6562") ? payload.data.map(({
                  id: routeId,
                  code,
                  name
                }) => ({
                  id: routeId,
                  code,
                  name
                })) : (stryCov_9fa48("6562"), payload.data.filter(stryMutAct_9fa48("6563") ? () => undefined : (stryCov_9fa48("6563"), route => stryMutAct_9fa48("6566") ? route.active || route.stops.some(stop => stop.zoneId === id) : stryMutAct_9fa48("6565") ? false : stryMutAct_9fa48("6564") ? true : (stryCov_9fa48("6564", "6565", "6566"), route.active && (stryMutAct_9fa48("6567") ? route.stops.every(stop => stop.zoneId === id) : (stryCov_9fa48("6567"), route.stops.some(stryMutAct_9fa48("6568") ? () => undefined : (stryCov_9fa48("6568"), stop => stryMutAct_9fa48("6571") ? stop.zoneId !== id : stryMutAct_9fa48("6570") ? false : stryMutAct_9fa48("6569") ? true : (stryCov_9fa48("6569", "6570", "6571"), stop.zoneId === id)))))))).map(stryMutAct_9fa48("6572") ? () => undefined : (stryCov_9fa48("6572"), ({
                  id: routeId,
                  code,
                  name
                }) => stryMutAct_9fa48("6573") ? {} : (stryCov_9fa48("6573"), {
                  id: routeId,
                  code,
                  name
                }))))));
                stryMutAct_9fa48("6574") ? page -= 1 : (stryCov_9fa48("6574"), page += 1);
              }
            } while (stryMutAct_9fa48("6577") ? page > totalPages : stryMutAct_9fa48("6576") ? page < totalPages : stryMutAct_9fa48("6575") ? false : (stryCov_9fa48("6575", "6576", "6577"), page <= totalPages));
            const countSchema = z.object(stryMutAct_9fa48("6578") ? {} : (stryCov_9fa48("6578"), {
              meta: z.object(stryMutAct_9fa48("6579") ? {} : (stryCov_9fa48("6579"), {
                total: z.number().int().nonnegative()
              }))
            }));
            async function count(resource: string) {
              if (stryMutAct_9fa48("6580")) {
                {}
              } else {
                stryCov_9fa48("6580");
                const query = new URLSearchParams(stryMutAct_9fa48("6581") ? {} : (stryCov_9fa48("6581"), {
                  zoneId: id,
                  pageSize: stryMutAct_9fa48("6582") ? "" : (stryCov_9fa48("6582"), "1")
                }));
                const response = await fetchBackend(request, stryMutAct_9fa48("6583") ? `` : (stryCov_9fa48("6583"), `/${resource}?${query}`));
                if (stryMutAct_9fa48("6586") ? false : stryMutAct_9fa48("6585") ? true : stryMutAct_9fa48("6584") ? response.ok : (stryCov_9fa48("6584", "6585", "6586"), !response.ok)) throw new AuthUnavailableError(stryMutAct_9fa48("6588") ? "" : (stryCov_9fa48("6588"), "No se pudieron verificar los elementos de la zona."));
                return countSchema.parse(await response.json()).meta.total;
              }
            }
            const containersCount = await count(stryMutAct_9fa48("6589") ? "" : (stryCov_9fa48("6589"), "containers"));
            const treesCount = await count(stryMutAct_9fa48("6590") ? "" : (stryCov_9fa48("6590"), "trees"));
            const greenSpacesCount = await count(stryMutAct_9fa48("6591") ? "" : (stryCov_9fa48("6591"), "green-spaces"));
            return NextResponse.json(stryMutAct_9fa48("6592") ? {} : (stryCov_9fa48("6592"), {
              zoneId: id,
              activeRoutes,
              containersCount,
              treesCount,
              greenSpacesCount,
              totalReferences: stryMutAct_9fa48("6593") ? activeRoutes.length + containersCount + treesCount - greenSpacesCount : (stryCov_9fa48("6593"), (stryMutAct_9fa48("6594") ? activeRoutes.length + containersCount - treesCount : (stryCov_9fa48("6594"), (stryMutAct_9fa48("6595") ? activeRoutes.length - containersCount : (stryCov_9fa48("6595"), activeRoutes.length + containersCount)) + treesCount)) + greenSpacesCount)
            }));
          }
        }
        const zone = getZoneFixture(id);
        if (stryMutAct_9fa48("6598") ? false : stryMutAct_9fa48("6597") ? true : stryMutAct_9fa48("6596") ? zone : (stryCov_9fa48("6596", "6597", "6598"), !zone)) {
          if (stryMutAct_9fa48("6599")) {
            {}
          } else {
            stryCov_9fa48("6599");
            return errorResponse(404, stryMutAct_9fa48("6600") ? `` : (stryCov_9fa48("6600"), `Zona operativa ${id} no encontrada.`), path);
          }
        }
        const report = getZoneReferences(id);
        return NextResponse.json(report);
      }
    } catch (error) {
      if (stryMutAct_9fa48("6601")) {
        {}
      } else {
        stryCov_9fa48("6601");
        return handleRouteError(error, path, stryMutAct_9fa48("6602") ? "" : (stryCov_9fa48("6602"), "No se pudieron verificar las referencias de la zona."));
      }
    }
  }
}