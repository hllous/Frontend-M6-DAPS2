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
import { todayInArgentina } from "@/lib/argentina-date";
import { serviceFrequencySchema } from "@/lib/service-frequencies";
import type { RouteReferenceReport } from "@/lib/routes";
import { AuthUnavailableError, getRequiredSession } from "@/lib/session";
import { getRouteFixture, getRouteReferences } from "@/lib/routes-fixtures";
export async function GET(request: Request, context: {
  params: Promise<{
    id: string;
  }>;
}) {
  if (stryMutAct_9fa48("3991")) {
    {}
  } else {
    stryCov_9fa48("3991");
    const {
      id
    } = await context.params;
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("3992")) {
        {}
      } else {
        stryCov_9fa48("3992");
        const session = getRequiredSession(request);
        if (stryMutAct_9fa48("3994") ? false : stryMutAct_9fa48("3993") ? true : (stryCov_9fa48("3993", "3994"), backendMode(session))) {
          if (stryMutAct_9fa48("3995")) {
            {}
          } else {
            stryCov_9fa48("3995");
            const detail = await fetchBackend(request, stryMutAct_9fa48("3996") ? `` : (stryCov_9fa48("3996"), `/routes/${pathId(id)}`));
            if (stryMutAct_9fa48("3999") ? detail.status !== 404 : stryMutAct_9fa48("3998") ? false : stryMutAct_9fa48("3997") ? true : (stryCov_9fa48("3997", "3998", "3999"), detail.status === 404)) return errorResponse(404, stryMutAct_9fa48("4000") ? "" : (stryCov_9fa48("4000"), "Recorrido no encontrado."), path);
            if (stryMutAct_9fa48("4003") ? false : stryMutAct_9fa48("4002") ? true : stryMutAct_9fa48("4001") ? detail.ok : (stryCov_9fa48("4001", "4002", "4003"), !detail.ok)) throw new AuthUnavailableError(stryMutAct_9fa48("4005") ? "" : (stryCov_9fa48("4005"), "No se pudo consultar el recorrido."));
            z.object(stryMutAct_9fa48("4007") ? {} : (stryCov_9fa48("4007"), {
              id: z.literal(id)
            })).parse(await detail.json());
            const pageSchema = z.object(stryMutAct_9fa48("4008") ? {} : (stryCov_9fa48("4008"), {
              data: z.array(serviceFrequencySchema.extend(stryMutAct_9fa48("4009") ? {} : (stryCov_9fa48("4009"), {
                serviceType: z.object(stryMutAct_9fa48("4010") ? {} : (stryCov_9fa48("4010"), {
                  name: z.string()
                })).optional()
              }))),
              meta: z.object(stryMutAct_9fa48("4011") ? {} : (stryCov_9fa48("4011"), {
                totalPages: z.number().int().nonnegative()
              }))
            }));
            const activeServiceFrequencies: RouteReferenceReport["activeServiceFrequencies"] = stryMutAct_9fa48("4012") ? ["Stryker was here"] : (stryCov_9fa48("4012"), []);
            const weekdays = stryMutAct_9fa48("4013") ? [] : (stryCov_9fa48("4013"), [stryMutAct_9fa48("4014") ? "Stryker was here!" : (stryCov_9fa48("4014"), ""), stryMutAct_9fa48("4015") ? "" : (stryCov_9fa48("4015"), "LUNES"), stryMutAct_9fa48("4016") ? "" : (stryCov_9fa48("4016"), "MARTES"), stryMutAct_9fa48("4017") ? "" : (stryCov_9fa48("4017"), "MIERCOLES"), stryMutAct_9fa48("4018") ? "" : (stryCov_9fa48("4018"), "JUEVES"), stryMutAct_9fa48("4019") ? "" : (stryCov_9fa48("4019"), "VIERNES"), stryMutAct_9fa48("4020") ? "" : (stryCov_9fa48("4020"), "SABADO"), stryMutAct_9fa48("4021") ? "" : (stryCov_9fa48("4021"), "DOMINGO")]);
            const shifts = stryMutAct_9fa48("4022") ? {} : (stryCov_9fa48("4022"), {
              MORNING: stryMutAct_9fa48("4023") ? "" : (stryCov_9fa48("4023"), "MAÑANA"),
              AFTERNOON: stryMutAct_9fa48("4024") ? "" : (stryCov_9fa48("4024"), "TARDE"),
              NIGHT: stryMutAct_9fa48("4025") ? "" : (stryCov_9fa48("4025"), "NOCHE")
            });
            let page = 1;
            let totalPages = 1;
            do {
              if (stryMutAct_9fa48("4026")) {
                {}
              } else {
                stryCov_9fa48("4026");
                const query = new URLSearchParams(stryMutAct_9fa48("4027") ? {} : (stryCov_9fa48("4027"), {
                  routeId: id,
                  validOn: todayInArgentina(),
                  page: String(page),
                  pageSize: stryMutAct_9fa48("4028") ? "" : (stryCov_9fa48("4028"), "100")
                }));
                const response = await fetchBackend(request, stryMutAct_9fa48("4029") ? `` : (stryCov_9fa48("4029"), `/service-frequencies?${query}`));
                if (stryMutAct_9fa48("4032") ? false : stryMutAct_9fa48("4031") ? true : stryMutAct_9fa48("4030") ? response.ok : (stryCov_9fa48("4030", "4031", "4032"), !response.ok)) throw new AuthUnavailableError(stryMutAct_9fa48("4034") ? "" : (stryCov_9fa48("4034"), "No se pudieron verificar las frecuencias de servicio."));
                const payload = pageSchema.parse(await response.json());
                totalPages = payload.meta.totalPages;
                activeServiceFrequencies.push(...payload.data.map(stryMutAct_9fa48("4036") ? () => undefined : (stryCov_9fa48("4036"), frequency => stryMutAct_9fa48("4037") ? {} : (stryCov_9fa48("4037"), {
                  id: frequency.id,
                  serviceTypeName: stryMutAct_9fa48("4038") ? frequency.serviceType?.name && "Tipo de servicio no disponible" : (stryCov_9fa48("4038"), (stryMutAct_9fa48("4039") ? frequency.serviceType.name : (stryCov_9fa48("4039"), frequency.serviceType?.name)) ?? (stryMutAct_9fa48("4040") ? "" : (stryCov_9fa48("4040"), "Tipo de servicio no disponible"))),
                  shift: shifts[frequency.shift],
                  weekdays: frequency.weekdays.map(stryMutAct_9fa48("4041") ? () => undefined : (stryCov_9fa48("4041"), day => weekdays[day]))
                }))));
                stryMutAct_9fa48("4042") ? page -= 1 : (stryCov_9fa48("4042"), page += 1);
              }
            } while (stryMutAct_9fa48("4045") ? page > totalPages : stryMutAct_9fa48("4044") ? page < totalPages : stryMutAct_9fa48("4043") ? false : (stryCov_9fa48("4043", "4044", "4045"), page <= totalPages));
            return NextResponse.json(stryMutAct_9fa48("4046") ? {} : (stryCov_9fa48("4046"), {
              routeId: id,
              activeServiceFrequencies,
              totalReferences: activeServiceFrequencies.length
            }));
          }
        }
        const route = getRouteFixture(id);
        if (stryMutAct_9fa48("4049") ? false : stryMutAct_9fa48("4048") ? true : stryMutAct_9fa48("4047") ? route : (stryCov_9fa48("4047", "4048", "4049"), !route)) {
          if (stryMutAct_9fa48("4050")) {
            {}
          } else {
            stryCov_9fa48("4050");
            return errorResponse(404, stryMutAct_9fa48("4051") ? "" : (stryCov_9fa48("4051"), "Recorrido no encontrado."), path);
          }
        }
        const report = getRouteReferences(id);
        return NextResponse.json(report);
      }
    } catch (error) {
      if (stryMutAct_9fa48("4052")) {
        {}
      } else {
        stryCov_9fa48("4052");
        return handleRouteError(error, path, stryMutAct_9fa48("4053") ? "" : (stryCov_9fa48("4053"), "No se pudieron obtener las referencias del recorrido."));
      }
    }
  }
}