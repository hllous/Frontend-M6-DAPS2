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
import { getScenario } from "./scenarios";
import { LOGIN_TIMEOUT_MS } from "./m1-auth";
import type { NextResponse } from "next/server";
import { fetchBackend } from "./bff-backend";
import { meSchema, type Me, type M6Role } from "./m6-roles";
import type { ScenarioId } from "./scenarios";
import { AUTH_COOKIE_NAME, BackendUnavailableError, CitizenForbiddenError, InvalidSessionError, getRequiredSession, sealSession, sessionCookieOptions, type Session } from "./session";
export const ME_TIMEOUT_MS = LOGIN_TIMEOUT_MS;

/** Interpreta la respuesta de `GET /me`: 401 es sesión rechazada, 403 es un ciudadano, lo demás es indisponibilidad. */
export async function readMeResponse(response: Response): Promise<Me> {
  if (stryMutAct_9fa48("11589")) {
    {}
  } else {
    stryCov_9fa48("11589");
    if (stryMutAct_9fa48("11592") ? response.status !== 401 : stryMutAct_9fa48("11591") ? false : stryMutAct_9fa48("11590") ? true : (stryCov_9fa48("11590", "11591", "11592"), response.status === 401)) throw new InvalidSessionError(stryMutAct_9fa48("11594") ? "" : (stryCov_9fa48("11594"), "No pudimos confirmar su sesión. Vuelva a ingresar."));
    if (stryMutAct_9fa48("11597") ? response.status !== 403 : stryMutAct_9fa48("11596") ? false : stryMutAct_9fa48("11595") ? true : (stryCov_9fa48("11595", "11596", "11597"), response.status === 403)) if (stryMutAct_9fa48("11598")) {
      ;
    } else {
      stryCov_9fa48("11598");
      throw new CitizenForbiddenError();
    }
    if (stryMutAct_9fa48("11601") ? false : stryMutAct_9fa48("11600") ? true : stryMutAct_9fa48("11599") ? response.ok : (stryCov_9fa48("11599", "11600", "11601"), !response.ok)) {
      if (stryMutAct_9fa48("11602")) {
        {}
      } else {
        stryCov_9fa48("11602");
        throw new BackendUnavailableError(response.status, stryMutAct_9fa48("11604") ? "" : (stryCov_9fa48("11604"), "No pudimos confirmar su sesión. Reintente en unos segundos."));
      }
    }
    const parsed = meSchema.safeParse(await response.json().catch(() => undefined));
    if (stryMutAct_9fa48("11607") ? false : stryMutAct_9fa48("11606") ? true : stryMutAct_9fa48("11605") ? parsed.success : (stryCov_9fa48("11605", "11606", "11607"), !parsed.success)) {
      if (stryMutAct_9fa48("11608")) {
        {}
      } else {
        stryCov_9fa48("11608");
        throw new BackendUnavailableError(502, stryMutAct_9fa48("11610") ? "" : (stryCov_9fa48("11610"), "No pudimos confirmar su sesión. Reintente en unos segundos."));
      }
    }
    return parsed.data;
  }
}

/** Login: todavía no hay sesión, así que se pide con el token de demo. */
export async function fetchMeWithToken(origin: string, accessToken: string, options: {
  timeoutMs?: number;
} = {}): Promise<Me> {
  if (stryMutAct_9fa48("11611")) {
    {}
  } else {
    stryCov_9fa48("11611");
    let response: Response;
    try {
      if (stryMutAct_9fa48("11612")) {
        {}
      } else {
        stryCov_9fa48("11612");
        response = await fetch(new URL(stryMutAct_9fa48("11613") ? "" : (stryCov_9fa48("11613"), "/me"), origin), stryMutAct_9fa48("11614") ? {} : (stryCov_9fa48("11614"), {
          headers: stryMutAct_9fa48("11615") ? {} : (stryCov_9fa48("11615"), {
            Authorization: stryMutAct_9fa48("11616") ? `` : (stryCov_9fa48("11616"), `Bearer ${accessToken}`)
          }),
          signal: AbortSignal.timeout(stryMutAct_9fa48("11617") ? options.timeoutMs && ME_TIMEOUT_MS : (stryCov_9fa48("11617"), options.timeoutMs ?? ME_TIMEOUT_MS))
        }));
      }
    } catch {
      if (stryMutAct_9fa48("11618")) {
        {}
      } else {
        stryCov_9fa48("11618");
        if (stryMutAct_9fa48("11619")) {
          ;
        } else {
          stryCov_9fa48("11619");
          throw new BackendUnavailableError(503);
        }
      }
    }
    return readMeResponse(response);
  }
}

/** Con sesión: única fuente de los roles de M6 (se calculan en cada request del backend). */
export async function fetchMe(request: Request): Promise<Me> {
  if (stryMutAct_9fa48("11620")) {
    {}
  } else {
    stryCov_9fa48("11620");
    return readMeResponse(await fetchBackend(request, stryMutAct_9fa48("11621") ? "" : (stryCov_9fa48("11621"), "/me")));
  }
}
export function sameRoles(a: readonly M6Role[], b: readonly M6Role[]): boolean {
  if (stryMutAct_9fa48("11622")) {
    {}
  } else {
    stryCov_9fa48("11622");
    return stryMutAct_9fa48("11625") ? a.length === b.length || a.every((role, index) => role === b[index]) : stryMutAct_9fa48("11624") ? false : stryMutAct_9fa48("11623") ? true : (stryCov_9fa48("11623", "11624", "11625"), (stryMutAct_9fa48("11627") ? a.length !== b.length : stryMutAct_9fa48("11626") ? true : (stryCov_9fa48("11626", "11627"), a.length === b.length)) && (stryMutAct_9fa48("11628") ? a.some((role, index) => role === b[index]) : (stryCov_9fa48("11628"), a.every(stryMutAct_9fa48("11629") ? () => undefined : (stryCov_9fa48("11629"), (role, index) => stryMutAct_9fa48("11632") ? role !== b[index] : stryMutAct_9fa48("11631") ? false : stryMutAct_9fa48("11630") ? true : (stryCov_9fa48("11630", "11631", "11632"), role === b[index]))))));
  }
}

/** Si los roles cambiaron en el backend, la cookie los toma ya: el BFF autoriza con lo mismo que la UI. */
export function sealRolesIfChanged(response: NextResponse, request: Request, roles: readonly M6Role[]): void {
  if (stryMutAct_9fa48("11633")) {
    {}
  } else {
    stryCov_9fa48("11633");
    // Parte de la sesión del pedido (la renovada, si fetchMe renovó), no de una copia leída antes.
    const session = getRequiredSession(request);
    if (stryMutAct_9fa48("11635") ? false : stryMutAct_9fa48("11634") ? true : (stryCov_9fa48("11634", "11635"), sameRoles(session.roles, roles))) return;
    const next = stryMutAct_9fa48("11636") ? {} : (stryCov_9fa48("11636"), {
      ...session,
      roles: stryMutAct_9fa48("11637") ? [] : (stryCov_9fa48("11637"), [...roles])
    });
    response.cookies.set(stryMutAct_9fa48("11639") ? {} : (stryCov_9fa48("11639"), {
      name: AUTH_COOKIE_NAME,
      value: sealSession(next),
      ...sessionCookieOptions(next, request)
    }));
  }
}

/** Selecciona la cuadrilla del backend, priorizando liderazgo y luego el nombre del perfil. */
export function sessionFromMe(session: Session, me: Me): Session {
  if (stryMutAct_9fa48("11640")) {
    {}
  } else {
    stryCov_9fa48("11640");
    if (stryMutAct_9fa48("11643") ? session.identity || me.subType !== "EMPLEADO" || me.userId !== session.identity.userId : stryMutAct_9fa48("11642") ? false : stryMutAct_9fa48("11641") ? true : (stryCov_9fa48("11641", "11642", "11643"), session.identity && (stryMutAct_9fa48("11645") ? me.subType !== "EMPLEADO" && me.userId !== session.identity.userId : stryMutAct_9fa48("11644") ? true : (stryCov_9fa48("11644", "11645"), (stryMutAct_9fa48("11647") ? me.subType === "EMPLEADO" : stryMutAct_9fa48("11646") ? false : (stryCov_9fa48("11646", "11647"), me.subType !== (stryMutAct_9fa48("11648") ? "" : (stryCov_9fa48("11648"), "EMPLEADO")))) || (stryMutAct_9fa48("11650") ? me.userId === session.identity.userId : stryMutAct_9fa48("11649") ? false : (stryCov_9fa48("11649", "11650"), me.userId !== session.identity.userId)))))) {
      if (stryMutAct_9fa48("11651")) {
        {}
      } else {
        stryCov_9fa48("11651");
        throw new InvalidSessionError(stryMutAct_9fa48("11653") ? "" : (stryCov_9fa48("11653"), "No pudimos confirmar su sesión. Vuelva a ingresar."));
      }
    }
    const isFieldCrew = me.roles.includes(stryMutAct_9fa48("11654") ? "" : (stryCov_9fa48("11654"), "M6_CAMPO_CUADRILLA"));
    const candidates = isFieldCrew ? stryMutAct_9fa48("11655") ? me.crews : (stryCov_9fa48("11655"), me.crews.filter(stryMutAct_9fa48("11656") ? () => undefined : (stryCov_9fa48("11656"), crew => stryMutAct_9fa48("11659") ? crew.role !== (me.crews.some(item => item.role === "LEADER") ? "LEADER" : "MEMBER") : stryMutAct_9fa48("11658") ? false : stryMutAct_9fa48("11657") ? true : (stryCov_9fa48("11657", "11658", "11659"), crew.role === ((stryMutAct_9fa48("11660") ? me.crews.every(item => item.role === "LEADER") : (stryCov_9fa48("11660"), me.crews.some(stryMutAct_9fa48("11661") ? () => undefined : (stryCov_9fa48("11661"), item => stryMutAct_9fa48("11664") ? item.role !== "LEADER" : stryMutAct_9fa48("11663") ? false : stryMutAct_9fa48("11662") ? true : (stryCov_9fa48("11662", "11663", "11664"), item.role === (stryMutAct_9fa48("11665") ? "" : (stryCov_9fa48("11665"), "LEADER"))))))) ? stryMutAct_9fa48("11666") ? "" : (stryCov_9fa48("11666"), "LEADER") : stryMutAct_9fa48("11667") ? "" : (stryCov_9fa48("11667"), "MEMBER")))))) : stryMutAct_9fa48("11668") ? ["Stryker was here"] : (stryCov_9fa48("11668"), []);
    const scenarioId = stryMutAct_9fa48("11669") ? session.scenarioId && scenarioForMe(me, candidates[0]?.role) : (stryCov_9fa48("11669"), session.scenarioId ?? scenarioForMe(me, stryMutAct_9fa48("11670") ? candidates[0].role : (stryCov_9fa48("11670"), candidates[0]?.role)));
    const preferredName = scenarioId ? getScenario(scenarioId).actor.backendCrewName : undefined;
    const selected = stryMutAct_9fa48("11671") ? candidates.find(crew => crew.name === preferredName) && candidates[0] : (stryCov_9fa48("11671"), candidates.find(stryMutAct_9fa48("11672") ? () => undefined : (stryCov_9fa48("11672"), crew => stryMutAct_9fa48("11675") ? crew.name !== preferredName : stryMutAct_9fa48("11674") ? false : stryMutAct_9fa48("11673") ? true : (stryCov_9fa48("11673", "11674", "11675"), crew.name === preferredName))) ?? candidates[0]);
    return stryMutAct_9fa48("11676") ? {} : (stryCov_9fa48("11676"), {
      ...session,
      scenarioId,
      identity: session.identity ? stryMutAct_9fa48("11677") ? {} : (stryCov_9fa48("11677"), {
        userId: me.userId,
        subType: stryMutAct_9fa48("11678") ? "" : (stryCov_9fa48("11678"), "EMPLEADO"),
        m1Role: me.m1Role
      }) : undefined,
      roles: me.roles,
      crew: selected ? stryMutAct_9fa48("11679") ? {} : (stryCov_9fa48("11679"), {
        id: selected.id,
        name: selected.name
      }) : undefined,
      fieldRole: selected ? (stryMutAct_9fa48("11682") ? selected.role !== "LEADER" : stryMutAct_9fa48("11681") ? false : stryMutAct_9fa48("11680") ? true : (stryCov_9fa48("11680", "11681", "11682"), selected.role === (stryMutAct_9fa48("11683") ? "" : (stryCov_9fa48("11683"), "LEADER")))) ? stryMutAct_9fa48("11684") ? "" : (stryCov_9fa48("11684"), "CREW_LEADER") : stryMutAct_9fa48("11685") ? "" : (stryCov_9fa48("11685"), "CREW_MEMBER") : undefined
    });
  }
}
function scenarioForMe(me: Me, crewRole?: "LEADER" | "MEMBER"): ScenarioId | undefined {
  if (stryMutAct_9fa48("11686")) {
    {}
  } else {
    stryCov_9fa48("11686");
    if (stryMutAct_9fa48("11689") ? me.roles.length !== 0 : stryMutAct_9fa48("11688") ? false : stryMutAct_9fa48("11687") ? true : (stryCov_9fa48("11687", "11688", "11689"), me.roles.length === 0)) return undefined;
    if (stryMutAct_9fa48("11691") ? false : stryMutAct_9fa48("11690") ? true : (stryCov_9fa48("11690", "11691"), me.roles.includes(stryMutAct_9fa48("11692") ? "" : (stryCov_9fa48("11692"), "M6_CAMPO_CUADRILLA")))) {
      if (stryMutAct_9fa48("11693")) {
        {}
      } else {
        stryCov_9fa48("11693");
        return (stryMutAct_9fa48("11696") ? crewRole !== "MEMBER" : stryMutAct_9fa48("11695") ? false : stryMutAct_9fa48("11694") ? true : (stryCov_9fa48("11694", "11695", "11696"), crewRole === (stryMutAct_9fa48("11697") ? "" : (stryCov_9fa48("11697"), "MEMBER")))) ? stryMutAct_9fa48("11698") ? "" : (stryCov_9fa48("11698"), "field-crew-member-route") : stryMutAct_9fa48("11699") ? "" : (stryCov_9fa48("11699"), "field-crew-leader-route");
      }
    }
    if (stryMutAct_9fa48("11701") ? false : stryMutAct_9fa48("11700") ? true : (stryCov_9fa48("11700", "11701"), me.roles.includes(stryMutAct_9fa48("11702") ? "" : (stryCov_9fa48("11702"), "M6_CAMPO_INSPECTOR")))) return stryMutAct_9fa48("11703") ? "" : (stryCov_9fa48("11703"), "field-inspector");
    if (stryMutAct_9fa48("11705") ? false : stryMutAct_9fa48("11704") ? true : (stryCov_9fa48("11704", "11705"), me.roles.includes(stryMutAct_9fa48("11706") ? "" : (stryCov_9fa48("11706"), "M6_AUDITOR")))) return stryMutAct_9fa48("11707") ? "" : (stryCov_9fa48("11707"), "office-limited-intake");
    return stryMutAct_9fa48("11708") ? "" : (stryCov_9fa48("11708"), "office-duty-queue");
  }
}