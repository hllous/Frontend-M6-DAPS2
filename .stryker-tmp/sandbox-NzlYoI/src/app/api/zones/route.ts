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
import { authorize, backendMode, backendQuery, errorResponse, mapSessionError, forwardResponse, FORBIDDEN_CODES, handleRouteError, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchBackend } from "@/lib/bff-backend";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { recordTelemetryEvent } from "@/lib/telemetry";
import { addZoneFixture, findCommuneFixture, filterZoneFixtures, paginateZoneFixtures, zoneFixtures } from "@/lib/zones-fixtures";
import { createZoneInputSchema, type Zone, type ZoneQuery } from "@/lib/zones";
import { booleanParam, pageParam, pageSizeParam, searchParam } from "@/lib/input-limits";
function parseZoneQuery(url: URL): ZoneQuery {
  if (stryMutAct_9fa48("6357")) {
    {}
  } else {
    stryCov_9fa48("6357");
    return stryMutAct_9fa48("6358") ? {} : (stryCov_9fa48("6358"), {
      active: booleanParam(url.searchParams, stryMutAct_9fa48("6359") ? "" : (stryCov_9fa48("6359"), "active")),
      search: searchParam(url.searchParams),
      communeId: z.uuid().safeParse(url.searchParams.get(stryMutAct_9fa48("6360") ? "" : (stryCov_9fa48("6360"), "communeId"))).data,
      page: pageParam(url.searchParams),
      pageSize: pageSizeParam(url.searchParams)
    });
  }
}
export async function GET(request: Request) {
  if (stryMutAct_9fa48("6361")) {
    {}
  } else {
    stryCov_9fa48("6361");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("6362")) {
        {}
      } else {
        stryCov_9fa48("6362");
        const session = getRequiredSession(request);
        const query = parseZoneQuery(new URL(request.url));
        if (stryMutAct_9fa48("6364") ? false : stryMutAct_9fa48("6363") ? true : (stryCov_9fa48("6363", "6364"), backendMode(session))) {
          if (stryMutAct_9fa48("6365")) {
            {}
          } else {
            stryCov_9fa48("6365");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("6366") ? `` : (stryCov_9fa48("6366"), `/zones${backendQuery(query, stryMutAct_9fa48("6367") ? [] : (stryCov_9fa48("6367"), [stryMutAct_9fa48("6368") ? "" : (stryCov_9fa48("6368"), "active"), stryMutAct_9fa48("6369") ? "" : (stryCov_9fa48("6369"), "search"), stryMutAct_9fa48("6370") ? "" : (stryCov_9fa48("6370"), "communeId"), stryMutAct_9fa48("6371") ? "" : (stryCov_9fa48("6371"), "page"), stryMutAct_9fa48("6372") ? "" : (stryCov_9fa48("6372"), "pageSize")]))}`));
            return forwardResponse(backendResponse);
          }
        }
        return NextResponse.json(paginateZoneFixtures(filterZoneFixtures(query), query.page, query.pageSize));
      }
    } catch (error) {
      if (stryMutAct_9fa48("6373")) {
        {}
      } else {
        stryCov_9fa48("6373");
        return handleRouteError(error, path, stryMutAct_9fa48("6374") ? "" : (stryCov_9fa48("6374"), "No se pudieron cargar las zonas."));
      }
    }
  }
}
export async function POST(request: Request) {
  if (stryMutAct_9fa48("6375")) {
    {}
  } else {
    stryCov_9fa48("6375");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("6376")) {
        {}
      } else {
        stryCov_9fa48("6376");
        const session = getRequiredSession(request);
        authorize(session, stryMutAct_9fa48("6378") ? {} : (stryCov_9fa48("6378"), {
          office: stryMutAct_9fa48("6379") ? false : (stryCov_9fa48("6379"), true),
          officeMessage: stryMutAct_9fa48("6380") ? "" : (stryCov_9fa48("6380"), "Solo el rol de Oficina puede crear zonas operativas."),
          capability: stryMutAct_9fa48("6381") ? "" : (stryCov_9fa48("6381"), "zone:manage"),
          throwOnError: stryMutAct_9fa48("6382") ? false : (stryCov_9fa48("6382"), true)
        }));
        const parsed = await parseJsonBody(request, createZoneInputSchema, path);
        if (stryMutAct_9fa48("6384") ? false : stryMutAct_9fa48("6383") ? true : (stryCov_9fa48("6383", "6384"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("6386") ? false : stryMutAct_9fa48("6385") ? true : (stryCov_9fa48("6385", "6386"), backendMode(session))) {
          if (stryMutAct_9fa48("6387")) {
            {}
          } else {
            stryCov_9fa48("6387");
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("6388") ? "" : (stryCov_9fa48("6388"), "/zones"), stryMutAct_9fa48("6389") ? "" : (stryCov_9fa48("6389"), "zone:manage"), stryMutAct_9fa48("6390") ? {} : (stryCov_9fa48("6390"), {
              method: stryMutAct_9fa48("6391") ? "" : (stryCov_9fa48("6391"), "POST"),
              headers: stryMutAct_9fa48("6392") ? {} : (stryCov_9fa48("6392"), {
                "content-type": stryMutAct_9fa48("6393") ? "" : (stryCov_9fa48("6393"), "application/json")
              }),
              body: JSON.stringify(parsed.data)
            }));
            return forwardResponse(backendResponse);
          }
        }
        const existing = zoneFixtures.find(stryMutAct_9fa48("6394") ? () => undefined : (stryCov_9fa48("6394"), candidate => stryMutAct_9fa48("6397") ? candidate.code.toLowerCase() !== parsed.data.code.toLowerCase() : stryMutAct_9fa48("6396") ? false : stryMutAct_9fa48("6395") ? true : (stryCov_9fa48("6395", "6396", "6397"), (stryMutAct_9fa48("6398") ? candidate.code.toUpperCase() : (stryCov_9fa48("6398"), candidate.code.toLowerCase())) === (stryMutAct_9fa48("6399") ? parsed.data.code.toUpperCase() : (stryCov_9fa48("6399"), parsed.data.code.toLowerCase())))));
        if (stryMutAct_9fa48("6401") ? false : stryMutAct_9fa48("6400") ? true : (stryCov_9fa48("6400", "6401"), existing)) {
          if (stryMutAct_9fa48("6402")) {
            {}
          } else {
            stryCov_9fa48("6402");
            return errorResponse(409, stryMutAct_9fa48("6403") ? `` : (stryCov_9fa48("6403"), `Ya existe una zona operativa con el código ${parsed.data.code}.`), path);
          }
        }
        const commune = parsed.data.communeId ? findCommuneFixture(parsed.data.communeId) : null;
        if (stryMutAct_9fa48("6406") ? parsed.data.communeId || !commune : stryMutAct_9fa48("6405") ? false : stryMutAct_9fa48("6404") ? true : (stryCov_9fa48("6404", "6405", "6406"), parsed.data.communeId && (stryMutAct_9fa48("6407") ? commune : (stryCov_9fa48("6407"), !commune)))) return errorResponse(400, stryMutAct_9fa48("6408") ? "" : (stryCov_9fa48("6408"), "La comuna indicada no existe."), path);
        const newZone: Zone = stryMutAct_9fa48("6409") ? {} : (stryCov_9fa48("6409"), {
          id: stryMutAct_9fa48("6410") ? `` : (stryCov_9fa48("6410"), `zone-${Date.now()}`),
          code: parsed.data.code,
          name: parsed.data.name,
          active: stryMutAct_9fa48("6411") ? false : (stryCov_9fa48("6411"), true),
          commune,
          neighborhood: null,
          neighborhoodIds: stryMutAct_9fa48("6412") ? ["Stryker was here"] : (stryCov_9fa48("6412"), [])
        });
        if (stryMutAct_9fa48("6413")) {
          ;
        } else {
          stryCov_9fa48("6413");
          addZoneFixture(newZone);
        }
        return NextResponse.json(newZone, stryMutAct_9fa48("6414") ? {} : (stryCov_9fa48("6414"), {
          status: 201
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("6415")) {
        {}
      } else {
        stryCov_9fa48("6415");
        if (stryMutAct_9fa48("6417") ? false : stryMutAct_9fa48("6416") ? true : (stryCov_9fa48("6416", "6417"), error instanceof InvalidSessionError)) {
          if (stryMutAct_9fa48("6418")) {
            {}
          } else {
            stryCov_9fa48("6418");
            recordTelemetryEvent(stryMutAct_9fa48("6420") ? {} : (stryCov_9fa48("6420"), {
              name: stryMutAct_9fa48("6421") ? "" : (stryCov_9fa48("6421"), "auth_session_expired"),
              status: 401
            }));
            return errorResponse(401, stryMutAct_9fa48("6422") ? "" : (stryCov_9fa48("6422"), "La sesión no está activa."), path);
          }
        }
        if (stryMutAct_9fa48("6424") ? false : stryMutAct_9fa48("6423") ? true : (stryCov_9fa48("6423", "6424"), error instanceof ForbiddenSessionError)) {
          if (stryMutAct_9fa48("6425")) {
            {}
          } else {
            stryCov_9fa48("6425");
            recordTelemetryEvent(stryMutAct_9fa48("6427") ? {} : (stryCov_9fa48("6427"), {
              name: stryMutAct_9fa48("6428") ? "" : (stryCov_9fa48("6428"), "auth_forbidden"),
              status: 403
            }));
            return errorResponse(403, error.message, path, FORBIDDEN_CODES.roleRequired);
          }
        }
        if (stryMutAct_9fa48("6430") ? false : stryMutAct_9fa48("6429") ? true : (stryCov_9fa48("6429", "6430"), error instanceof AuthUnavailableError)) {
          if (stryMutAct_9fa48("6431")) {
            {}
          } else {
            stryCov_9fa48("6431");
            return errorResponse(503, error.message, path);
          }
        }
        return mapSessionError(error, path, stryMutAct_9fa48("6432") ? "" : (stryCov_9fa48("6432"), "No se pudo crear la zona operativa."));
      }
    }
  }
}