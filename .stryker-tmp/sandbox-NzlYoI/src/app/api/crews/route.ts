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
import { authorize, backendMode, backendQuery, errorResponse, mapSessionError, forwardResponse, handleRouteError, parseJsonBody } from "@/lib/bff-route";
import { NextResponse } from "next/server";
import { fetchBackend, pathId } from "@/lib/bff-backend";
import { addCrewFixture, filterCrewFixtures, paginateCrewFixtures } from "@/lib/crew-fixtures";
import { createCrewInputSchema, type CrewQuery, crewSchema, crewSpecialtySchema, crewTypeSchema, shiftSchema } from "@/lib/crews";
import { m1IdentityAdapter } from "@/lib/m1-identity";
import { getScenario } from "@/lib/scenarios";
import { AuthUnavailableError, ForbiddenSessionError, getRequiredSession, InvalidSessionError } from "@/lib/session";
import { pageParam, pageSizeParam } from "@/lib/input-limits";
function parseQuery(url: URL): CrewQuery {
  if (stryMutAct_9fa48("509")) {
    {}
  } else {
    stryCov_9fa48("509");
    const active = url.searchParams.get(stryMutAct_9fa48("510") ? "" : (stryCov_9fa48("510"), "active"));
    const crewType = crewTypeSchema.safeParse(url.searchParams.get(stryMutAct_9fa48("511") ? "" : (stryCov_9fa48("511"), "crewType")));
    const defaultShift = shiftSchema.safeParse(url.searchParams.get(stryMutAct_9fa48("512") ? "" : (stryCov_9fa48("512"), "defaultShift")));
    const specialty = crewSpecialtySchema.safeParse(url.searchParams.get(stryMutAct_9fa48("513") ? "" : (stryCov_9fa48("513"), "specialty")));
    const zoneId = stryMutAct_9fa48("515") ? url.searchParams.get("zoneId").trim() : stryMutAct_9fa48("514") ? url.searchParams.get("zoneId") : (stryCov_9fa48("514", "515"), url.searchParams.get(stryMutAct_9fa48("516") ? "" : (stryCov_9fa48("516"), "zoneId"))?.trim());
    return stryMutAct_9fa48("517") ? {} : (stryCov_9fa48("517"), {
      zoneId: stryMutAct_9fa48("520") ? zoneId && undefined : stryMutAct_9fa48("519") ? false : stryMutAct_9fa48("518") ? true : (stryCov_9fa48("518", "519", "520"), zoneId || undefined),
      specialty: specialty.success ? specialty.data : undefined,
      active: (stryMutAct_9fa48("523") ? active !== null : stryMutAct_9fa48("522") ? false : stryMutAct_9fa48("521") ? true : (stryCov_9fa48("521", "522", "523"), active === null)) ? undefined : stryMutAct_9fa48("526") ? active !== "true" : stryMutAct_9fa48("525") ? false : stryMutAct_9fa48("524") ? true : (stryCov_9fa48("524", "525", "526"), active === (stryMutAct_9fa48("527") ? "" : (stryCov_9fa48("527"), "true"))),
      crewType: crewType.success ? crewType.data : undefined,
      defaultShift: defaultShift.success ? defaultShift.data : undefined,
      page: pageParam(url.searchParams),
      pageSize: pageSizeParam(url.searchParams)
    });
  }
}
function normalizeCrewPayload(payload: unknown): unknown {
  if (stryMutAct_9fa48("528")) {
    {}
  } else {
    stryCov_9fa48("528");
    const raw = (stryMutAct_9fa48("531") ? payload && typeof payload === "object" && "data" in payload || !("id" in payload) : stryMutAct_9fa48("530") ? false : stryMutAct_9fa48("529") ? true : (stryCov_9fa48("529", "530", "531"), (stryMutAct_9fa48("533") ? payload && typeof payload === "object" || "data" in payload : stryMutAct_9fa48("532") ? true : (stryCov_9fa48("532", "533"), (stryMutAct_9fa48("535") ? payload || typeof payload === "object" : stryMutAct_9fa48("534") ? true : (stryCov_9fa48("534", "535"), payload && (stryMutAct_9fa48("537") ? typeof payload !== "object" : stryMutAct_9fa48("536") ? true : (stryCov_9fa48("536", "537"), typeof payload === (stryMutAct_9fa48("538") ? "" : (stryCov_9fa48("538"), "object")))))) && (stryMutAct_9fa48("539") ? "" : (stryCov_9fa48("539"), "data")) in payload)) && (stryMutAct_9fa48("540") ? "id" in payload : (stryCov_9fa48("540"), !((stryMutAct_9fa48("541") ? "" : (stryCov_9fa48("541"), "id")) in payload))))) ? (payload as {
      data: unknown;
    }).data : payload;
    if (stryMutAct_9fa48("544") ? (!raw || typeof raw !== "object") && Array.isArray(raw) : stryMutAct_9fa48("543") ? false : stryMutAct_9fa48("542") ? true : (stryCov_9fa48("542", "543", "544"), (stryMutAct_9fa48("546") ? !raw && typeof raw !== "object" : stryMutAct_9fa48("545") ? false : (stryCov_9fa48("545", "546"), (stryMutAct_9fa48("547") ? raw : (stryCov_9fa48("547"), !raw)) || (stryMutAct_9fa48("549") ? typeof raw === "object" : stryMutAct_9fa48("548") ? false : (stryCov_9fa48("548", "549"), typeof raw !== (stryMutAct_9fa48("550") ? "" : (stryCov_9fa48("550"), "object")))))) || Array.isArray(raw))) return raw;
    const crew = raw as Record<string, unknown>;
    if (stryMutAct_9fa48("553") ? Array.isArray(crew.members) || !Array.isArray(crew.memberUserIds) : stryMutAct_9fa48("552") ? false : stryMutAct_9fa48("551") ? true : (stryCov_9fa48("551", "552", "553"), Array.isArray(crew.members) && (stryMutAct_9fa48("554") ? Array.isArray(crew.memberUserIds) : (stryCov_9fa48("554"), !Array.isArray(crew.memberUserIds))))) {
      if (stryMutAct_9fa48("555")) {
        {}
      } else {
        stryCov_9fa48("555");
        return stryMutAct_9fa48("556") ? {} : (stryCov_9fa48("556"), {
          ...crew,
          memberUserIds: crew.members.flatMap(stryMutAct_9fa48("557") ? () => undefined : (stryCov_9fa48("557"), member => (stryMutAct_9fa48("560") ? member && typeof member === "object" && "userId" in member || typeof member.userId === "string" : stryMutAct_9fa48("559") ? false : stryMutAct_9fa48("558") ? true : (stryCov_9fa48("558", "559", "560"), (stryMutAct_9fa48("562") ? member && typeof member === "object" || "userId" in member : stryMutAct_9fa48("561") ? true : (stryCov_9fa48("561", "562"), (stryMutAct_9fa48("564") ? member || typeof member === "object" : stryMutAct_9fa48("563") ? true : (stryCov_9fa48("563", "564"), member && (stryMutAct_9fa48("566") ? typeof member !== "object" : stryMutAct_9fa48("565") ? true : (stryCov_9fa48("565", "566"), typeof member === (stryMutAct_9fa48("567") ? "" : (stryCov_9fa48("567"), "object")))))) && (stryMutAct_9fa48("568") ? "" : (stryCov_9fa48("568"), "userId")) in member)) && (stryMutAct_9fa48("570") ? typeof member.userId !== "string" : stryMutAct_9fa48("569") ? true : (stryCov_9fa48("569", "570"), typeof member.userId === (stryMutAct_9fa48("571") ? "" : (stryCov_9fa48("571"), "string")))))) ? stryMutAct_9fa48("572") ? [] : (stryCov_9fa48("572"), [member.userId]) : stryMutAct_9fa48("573") ? ["Stryker was here"] : (stryCov_9fa48("573"), [])))
        });
      }
    }
    return raw;
  }
}
function requireOfficeCapability(request: Request) {
  if (stryMutAct_9fa48("574")) {
    {}
  } else {
    stryCov_9fa48("574");
    return authorize(request, stryMutAct_9fa48("575") ? {} : (stryCov_9fa48("575"), {
      office: stryMutAct_9fa48("576") ? false : (stryCov_9fa48("576"), true),
      officeMessage: stryMutAct_9fa48("577") ? "" : (stryCov_9fa48("577"), "Solo Oficina puede administrar cuadrillas."),
      capability: stryMutAct_9fa48("578") ? "" : (stryCov_9fa48("578"), "crew:manage"),
      throwOnError: stryMutAct_9fa48("579") ? false : (stryCov_9fa48("579"), true)
    })).session;
  }
}
export async function GET(request: Request) {
  if (stryMutAct_9fa48("580")) {
    {}
  } else {
    stryCov_9fa48("580");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("581")) {
        {}
      } else {
        stryCov_9fa48("581");
        const session = getRequiredSession(request);
        const query = parseQuery(new URL(request.url));
        const scenario = getScenario(session);
        if (stryMutAct_9fa48("583") ? false : stryMutAct_9fa48("582") ? true : (stryCov_9fa48("582", "583"), backendMode(session))) {
          if (stryMutAct_9fa48("584")) {
            {}
          } else {
            stryCov_9fa48("584");
            if (stryMutAct_9fa48("587") ? scenario.actor.kind === "FIELD" : stryMutAct_9fa48("586") ? false : stryMutAct_9fa48("585") ? true : (stryCov_9fa48("585", "586", "587"), scenario.actor.kind !== (stryMutAct_9fa48("588") ? "" : (stryCov_9fa48("588"), "FIELD")))) return forwardResponse(await fetchBackend(request, stryMutAct_9fa48("589") ? `` : (stryCov_9fa48("589"), `/crews${backendQuery(query, stryMutAct_9fa48("590") ? [] : (stryCov_9fa48("590"), [stryMutAct_9fa48("591") ? "" : (stryCov_9fa48("591"), "active"), stryMutAct_9fa48("592") ? "" : (stryCov_9fa48("592"), "crewType"), stryMutAct_9fa48("593") ? "" : (stryCov_9fa48("593"), "defaultShift"), stryMutAct_9fa48("594") ? "" : (stryCov_9fa48("594"), "zoneId"), stryMutAct_9fa48("595") ? "" : (stryCov_9fa48("595"), "specialty"), stryMutAct_9fa48("596") ? "" : (stryCov_9fa48("596"), "page"), stryMutAct_9fa48("597") ? "" : (stryCov_9fa48("597"), "pageSize")]))}`)));
            const crewId = stryMutAct_9fa48("598") ? session.crew.id : (stryCov_9fa48("598"), session.crew?.id);
            if (stryMutAct_9fa48("601") ? false : stryMutAct_9fa48("600") ? true : stryMutAct_9fa48("599") ? crewId : (stryCov_9fa48("599", "600", "601"), !crewId)) return errorResponse(403, stryMutAct_9fa48("602") ? "" : (stryCov_9fa48("602"), "La sesión no tiene una cuadrilla asignada."), path);
            const backendResponse = await fetchBackend(request, stryMutAct_9fa48("603") ? `` : (stryCov_9fa48("603"), `/crews/${pathId(crewId)}`));
            if (stryMutAct_9fa48("606") ? false : stryMutAct_9fa48("605") ? true : stryMutAct_9fa48("604") ? backendResponse.ok : (stryCov_9fa48("604", "605", "606"), !backendResponse.ok)) return forwardResponse(backendResponse);
            let payload: unknown;
            try {
              if (stryMutAct_9fa48("607")) {
                {}
              } else {
                stryCov_9fa48("607");
                payload = await backendResponse.json();
              }
            } catch {
              if (stryMutAct_9fa48("608")) {
                {}
              } else {
                stryCov_9fa48("608");
                return errorResponse(502, stryMutAct_9fa48("609") ? "" : (stryCov_9fa48("609"), "La respuesta de cuadrilla no contiene JSON válido."), path);
              }
            }
            const parsedCrew = crewSchema.safeParse(normalizeCrewPayload(payload));
            if (stryMutAct_9fa48("612") ? false : stryMutAct_9fa48("611") ? true : stryMutAct_9fa48("610") ? parsedCrew.success : (stryCov_9fa48("610", "611", "612"), !parsedCrew.success)) return errorResponse(502, stryMutAct_9fa48("613") ? "" : (stryCov_9fa48("613"), "No se pudo obtener información válida de cuadrilla. Reintente en unos segundos."), path);
            const crew = parsedCrew.data;
            const matches = stryMutAct_9fa48("616") ? (query.active === undefined || crew.active === query.active) && (!query.crewType || crew.crewType === query.crewType) && (!query.defaultShift || crew.defaultShift === query.defaultShift) && (!query.zoneId || crew.effectiveZoneId === query.zoneId) || !query.specialty || crew.specialty === query.specialty : stryMutAct_9fa48("615") ? false : stryMutAct_9fa48("614") ? true : (stryCov_9fa48("614", "615", "616"), (stryMutAct_9fa48("618") ? (query.active === undefined || crew.active === query.active) && (!query.crewType || crew.crewType === query.crewType) && (!query.defaultShift || crew.defaultShift === query.defaultShift) || !query.zoneId || crew.effectiveZoneId === query.zoneId : stryMutAct_9fa48("617") ? true : (stryCov_9fa48("617", "618"), (stryMutAct_9fa48("620") ? (query.active === undefined || crew.active === query.active) && (!query.crewType || crew.crewType === query.crewType) || !query.defaultShift || crew.defaultShift === query.defaultShift : stryMutAct_9fa48("619") ? true : (stryCov_9fa48("619", "620"), (stryMutAct_9fa48("622") ? query.active === undefined || crew.active === query.active || !query.crewType || crew.crewType === query.crewType : stryMutAct_9fa48("621") ? true : (stryCov_9fa48("621", "622"), (stryMutAct_9fa48("624") ? query.active === undefined && crew.active === query.active : stryMutAct_9fa48("623") ? true : (stryCov_9fa48("623", "624"), (stryMutAct_9fa48("626") ? query.active !== undefined : stryMutAct_9fa48("625") ? false : (stryCov_9fa48("625", "626"), query.active === undefined)) || (stryMutAct_9fa48("628") ? crew.active !== query.active : stryMutAct_9fa48("627") ? false : (stryCov_9fa48("627", "628"), crew.active === query.active)))) && (stryMutAct_9fa48("630") ? !query.crewType && crew.crewType === query.crewType : stryMutAct_9fa48("629") ? true : (stryCov_9fa48("629", "630"), (stryMutAct_9fa48("631") ? query.crewType : (stryCov_9fa48("631"), !query.crewType)) || (stryMutAct_9fa48("633") ? crew.crewType !== query.crewType : stryMutAct_9fa48("632") ? false : (stryCov_9fa48("632", "633"), crew.crewType === query.crewType)))))) && (stryMutAct_9fa48("635") ? !query.defaultShift && crew.defaultShift === query.defaultShift : stryMutAct_9fa48("634") ? true : (stryCov_9fa48("634", "635"), (stryMutAct_9fa48("636") ? query.defaultShift : (stryCov_9fa48("636"), !query.defaultShift)) || (stryMutAct_9fa48("638") ? crew.defaultShift !== query.defaultShift : stryMutAct_9fa48("637") ? false : (stryCov_9fa48("637", "638"), crew.defaultShift === query.defaultShift)))))) && (stryMutAct_9fa48("640") ? !query.zoneId && crew.effectiveZoneId === query.zoneId : stryMutAct_9fa48("639") ? true : (stryCov_9fa48("639", "640"), (stryMutAct_9fa48("641") ? query.zoneId : (stryCov_9fa48("641"), !query.zoneId)) || (stryMutAct_9fa48("643") ? crew.effectiveZoneId !== query.zoneId : stryMutAct_9fa48("642") ? false : (stryCov_9fa48("642", "643"), crew.effectiveZoneId === query.zoneId)))))) && (stryMutAct_9fa48("645") ? !query.specialty && crew.specialty === query.specialty : stryMutAct_9fa48("644") ? true : (stryCov_9fa48("644", "645"), (stryMutAct_9fa48("646") ? query.specialty : (stryCov_9fa48("646"), !query.specialty)) || (stryMutAct_9fa48("648") ? crew.specialty !== query.specialty : stryMutAct_9fa48("647") ? false : (stryCov_9fa48("647", "648"), crew.specialty === query.specialty)))));
            const page = stryMutAct_9fa48("649") ? query.page && 1 : (stryCov_9fa48("649"), query.page ?? 1);
            const pageSize = stryMutAct_9fa48("650") ? query.pageSize && 20 : (stryCov_9fa48("650"), query.pageSize ?? 20);
            const total = matches ? 1 : 0;
            return NextResponse.json(stryMutAct_9fa48("651") ? {} : (stryCov_9fa48("651"), {
              data: (stryMutAct_9fa48("654") ? matches || page === 1 : stryMutAct_9fa48("653") ? false : stryMutAct_9fa48("652") ? true : (stryCov_9fa48("652", "653", "654"), matches && (stryMutAct_9fa48("656") ? page !== 1 : stryMutAct_9fa48("655") ? true : (stryCov_9fa48("655", "656"), page === 1)))) ? stryMutAct_9fa48("657") ? [] : (stryCov_9fa48("657"), [crew]) : stryMutAct_9fa48("658") ? ["Stryker was here"] : (stryCov_9fa48("658"), []),
              meta: stryMutAct_9fa48("659") ? {} : (stryCov_9fa48("659"), {
                total,
                page,
                pageSize,
                totalPages: stryMutAct_9fa48("660") ? Math.min(1, Math.ceil(total / pageSize)) : (stryCov_9fa48("660"), Math.max(1, Math.ceil(stryMutAct_9fa48("661") ? total * pageSize : (stryCov_9fa48("661"), total / pageSize))))
              })
            }));
          }
        }
        const scopedQuery = (stryMutAct_9fa48("664") ? scenario.actor.kind !== "FIELD" : stryMutAct_9fa48("663") ? false : stryMutAct_9fa48("662") ? true : (stryCov_9fa48("662", "663", "664"), scenario.actor.kind === (stryMutAct_9fa48("665") ? "" : (stryCov_9fa48("665"), "FIELD")))) ? stryMutAct_9fa48("666") ? {} : (stryCov_9fa48("666"), {
          ...query,
          crewId: scenario.actor.crewId
        }) : query;
        return NextResponse.json(paginateCrewFixtures(filterCrewFixtures(scopedQuery), query.page, query.pageSize));
      }
    } catch (error) {
      if (stryMutAct_9fa48("667")) {
        {}
      } else {
        stryCov_9fa48("667");
        return handleRouteError(error, path, stryMutAct_9fa48("668") ? "" : (stryCov_9fa48("668"), "No se pudieron cargar las cuadrillas."));
      }
    }
  }
}
export async function POST(request: Request) {
  if (stryMutAct_9fa48("669")) {
    {}
  } else {
    stryCov_9fa48("669");
    const path = new URL(request.url).pathname;
    try {
      if (stryMutAct_9fa48("670")) {
        {}
      } else {
        stryCov_9fa48("670");
        const session = requireOfficeCapability(request);
        const parsed = await parseJsonBody(request, createCrewInputSchema, path);
        if (stryMutAct_9fa48("672") ? false : stryMutAct_9fa48("671") ? true : (stryCov_9fa48("671", "672"), parsed instanceof Response)) return parsed;
        if (stryMutAct_9fa48("674") ? false : stryMutAct_9fa48("673") ? true : (stryCov_9fa48("673", "674"), backendMode(session))) return forwardResponse(await fetchBackend(request, stryMutAct_9fa48("675") ? "" : (stryCov_9fa48("675"), "/crews"), stryMutAct_9fa48("676") ? "" : (stryCov_9fa48("676"), "crew:manage"), stryMutAct_9fa48("677") ? {} : (stryCov_9fa48("677"), {
          method: stryMutAct_9fa48("678") ? "" : (stryCov_9fa48("678"), "POST"),
          headers: stryMutAct_9fa48("679") ? {} : (stryCov_9fa48("679"), {
            "content-type": stryMutAct_9fa48("680") ? "" : (stryCov_9fa48("680"), "application/json")
          }),
          body: JSON.stringify(parsed.data)
        })));
        const [users, organizations] = await Promise.all(stryMutAct_9fa48("681") ? [] : (stryCov_9fa48("681"), [m1IdentityAdapter.listUsers(), m1IdentityAdapter.listOrganizations()]));
        const crew = crewSchema.parse(stryMutAct_9fa48("682") ? {} : (stryCov_9fa48("682"), {
          leaderName: stryMutAct_9fa48("683") ? users.find(user => user.id === parsed.data.leaderUserId)?.displayName && null : (stryCov_9fa48("683"), (stryMutAct_9fa48("684") ? users.find(user => user.id === parsed.data.leaderUserId).displayName : (stryCov_9fa48("684"), users.find(stryMutAct_9fa48("685") ? () => undefined : (stryCov_9fa48("685"), user => stryMutAct_9fa48("688") ? user.id !== parsed.data.leaderUserId : stryMutAct_9fa48("687") ? false : stryMutAct_9fa48("686") ? true : (stryCov_9fa48("686", "687", "688"), user.id === parsed.data.leaderUserId)))?.displayName)) ?? null),
          organizationName: stryMutAct_9fa48("689") ? organizations.find(organization => organization.id === parsed.data.organizationId)?.displayName && null : (stryCov_9fa48("689"), (stryMutAct_9fa48("690") ? organizations.find(organization => organization.id === parsed.data.organizationId).displayName : (stryCov_9fa48("690"), organizations.find(stryMutAct_9fa48("691") ? () => undefined : (stryCov_9fa48("691"), organization => stryMutAct_9fa48("694") ? organization.id !== parsed.data.organizationId : stryMutAct_9fa48("693") ? false : stryMutAct_9fa48("692") ? true : (stryCov_9fa48("692", "693", "694"), organization.id === parsed.data.organizationId)))?.displayName)) ?? null),
          members: stryMutAct_9fa48("695") ? [] : (stryCov_9fa48("695"), [stryMutAct_9fa48("696") ? {} : (stryCov_9fa48("696"), {
            userId: parsed.data.leaderUserId,
            displayName: stryMutAct_9fa48("697") ? users.find(user => user.id === parsed.data.leaderUserId)?.displayName && null : (stryCov_9fa48("697"), (stryMutAct_9fa48("698") ? users.find(user => user.id === parsed.data.leaderUserId).displayName : (stryCov_9fa48("698"), users.find(stryMutAct_9fa48("699") ? () => undefined : (stryCov_9fa48("699"), user => stryMutAct_9fa48("702") ? user.id !== parsed.data.leaderUserId : stryMutAct_9fa48("701") ? false : stryMutAct_9fa48("700") ? true : (stryCov_9fa48("700", "701", "702"), user.id === parsed.data.leaderUserId)))?.displayName)) ?? null)
          })]),
          id: stryMutAct_9fa48("703") ? `` : (stryCov_9fa48("703"), `crew-${Date.now()}`),
          ...parsed.data,
          homeZoneId: stryMutAct_9fa48("704") ? parsed.data.homeZoneId && null : (stryCov_9fa48("704"), parsed.data.homeZoneId ?? null),
          effectiveZoneId: stryMutAct_9fa48("705") ? parsed.data.homeZoneId && null : (stryCov_9fa48("705"), parsed.data.homeZoneId ?? null),
          memberUserIds: stryMutAct_9fa48("706") ? [] : (stryCov_9fa48("706"), [parsed.data.leaderUserId]),
          active: stryMutAct_9fa48("707") ? false : (stryCov_9fa48("707"), true)
        }));
        if (stryMutAct_9fa48("708")) {
          ;
        } else {
          stryCov_9fa48("708");
          addCrewFixture(crew);
        }
        return NextResponse.json(crew, stryMutAct_9fa48("709") ? {} : (stryCov_9fa48("709"), {
          status: 201
        }));
      }
    } catch (error) {
      if (stryMutAct_9fa48("710")) {
        {}
      } else {
        stryCov_9fa48("710");
        if (stryMutAct_9fa48("712") ? false : stryMutAct_9fa48("711") ? true : (stryCov_9fa48("711", "712"), error instanceof InvalidSessionError)) return errorResponse(401, stryMutAct_9fa48("713") ? "" : (stryCov_9fa48("713"), "La sesión no está activa."), path);
        if (stryMutAct_9fa48("715") ? false : stryMutAct_9fa48("714") ? true : (stryCov_9fa48("714", "715"), error instanceof ForbiddenSessionError)) return mapSessionError(error, path, error.message);
        if (stryMutAct_9fa48("717") ? false : stryMutAct_9fa48("716") ? true : (stryCov_9fa48("716", "717"), error instanceof AuthUnavailableError)) return errorResponse(503, error.message, path);
        return mapSessionError(error, path, stryMutAct_9fa48("718") ? "" : (stryCov_9fa48("718"), "No se pudo registrar la cuadrilla."));
      }
    }
  }
}