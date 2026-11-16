/** Pantallas del shell que se pueden retomar después de volver a ingresar (`/app?destination=<id>`). */
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
const APP_DESTINATIONS = stryMutAct_9fa48("10583") ? [] : (stryCov_9fa48("10583"), [stryMutAct_9fa48("10584") ? "" : (stryCov_9fa48("10584"), "work"), stryMutAct_9fa48("10585") ? "" : (stryCov_9fa48("10585"), "services"), stryMutAct_9fa48("10586") ? "" : (stryCov_9fa48("10586"), "referrals"), stryMutAct_9fa48("10587") ? "" : (stryCov_9fa48("10587"), "inventory"), stryMutAct_9fa48("10588") ? "" : (stryCov_9fa48("10588"), "environment"), stryMutAct_9fa48("10589") ? "" : (stryCov_9fa48("10589"), "map"), stryMutAct_9fa48("10590") ? "" : (stryCov_9fa48("10590"), "catalog"), stryMutAct_9fa48("10591") ? "" : (stryCov_9fa48("10591"), "dashboards")]);
export function safeDestination(value: string | string[] | null | undefined): string | undefined {
  if (stryMutAct_9fa48("10592")) {
    {}
  } else {
    stryCov_9fa48("10592");
    const candidate = Array.isArray(value) ? value[0] : value;
    return (stryMutAct_9fa48("10595") ? candidate || APP_DESTINATIONS.includes(candidate) : stryMutAct_9fa48("10594") ? false : stryMutAct_9fa48("10593") ? true : (stryCov_9fa48("10593", "10594", "10595"), candidate && APP_DESTINATIONS.includes(candidate))) ? candidate : undefined;
  }
}

/** Adónde vuelve el login: la pantalla de origen si es una conocida, si no el inicio. */
export function returnPathFor(destination: string | string[] | null | undefined): string {
  if (stryMutAct_9fa48("10596")) {
    {}
  } else {
    stryCov_9fa48("10596");
    const safe = safeDestination(destination);
    return safe ? stryMutAct_9fa48("10597") ? `` : (stryCov_9fa48("10597"), `/app?destination=${safe}`) : stryMutAct_9fa48("10598") ? "" : (stryCov_9fa48("10598"), "/app");
  }
}

/** Pantalla del shell que muestra una URL: `?destination=` o, en los alias /app/catalog y /app/dashboard, su destino. */
export function destinationOf(location: {
  pathname?: string;
  search?: string;
}): string | undefined {
  if (stryMutAct_9fa48("10599")) {
    {}
  } else {
    stryCov_9fa48("10599");
    if (stryMutAct_9fa48("10603") ? location.pathname.startsWith("/app/catalog") : stryMutAct_9fa48("10602") ? location.pathname?.endsWith("/app/catalog") : stryMutAct_9fa48("10601") ? false : stryMutAct_9fa48("10600") ? true : (stryCov_9fa48("10600", "10601", "10602", "10603"), location.pathname?.startsWith(stryMutAct_9fa48("10604") ? "" : (stryCov_9fa48("10604"), "/app/catalog")))) return stryMutAct_9fa48("10605") ? "" : (stryCov_9fa48("10605"), "catalog");
    if (stryMutAct_9fa48("10609") ? location.pathname.startsWith("/app/dashboard") : stryMutAct_9fa48("10608") ? location.pathname?.endsWith("/app/dashboard") : stryMutAct_9fa48("10607") ? false : stryMutAct_9fa48("10606") ? true : (stryCov_9fa48("10606", "10607", "10608", "10609"), location.pathname?.startsWith(stryMutAct_9fa48("10610") ? "" : (stryCov_9fa48("10610"), "/app/dashboard")))) return stryMutAct_9fa48("10611") ? "" : (stryCov_9fa48("10611"), "dashboards");
    return safeDestination(new URLSearchParams(stryMutAct_9fa48("10612") ? location.search && "" : (stryCov_9fa48("10612"), location.search ?? (stryMutAct_9fa48("10613") ? "Stryker was here!" : (stryCov_9fa48("10613"), "")))).get(stryMutAct_9fa48("10614") ? "" : (stryCov_9fa48("10614"), "destination")));
  }
}

/** Login al que se manda a una pestaña con la sesión caída, con aviso y la pantalla actual para retomarla. */
export function loginUrl({
  expired = stryMutAct_9fa48("10615") ? true : (stryCov_9fa48("10615"), false),
  destination
}: {
  expired?: boolean;
  destination?: string;
} = {}): string {
  if (stryMutAct_9fa48("10616")) {
    {}
  } else {
    stryCov_9fa48("10616");
    const params = new URLSearchParams();
    if (stryMutAct_9fa48("10618") ? false : stryMutAct_9fa48("10617") ? true : (stryCov_9fa48("10617", "10618"), expired)) params.set(stryMutAct_9fa48("10620") ? "" : (stryCov_9fa48("10620"), "expired"), stryMutAct_9fa48("10621") ? "" : (stryCov_9fa48("10621"), "1"));
    const safe = safeDestination(destination);
    if (stryMutAct_9fa48("10623") ? false : stryMutAct_9fa48("10622") ? true : (stryCov_9fa48("10622", "10623"), safe)) params.set(stryMutAct_9fa48("10625") ? "" : (stryCov_9fa48("10625"), "destination"), safe);
    const query = params.toString();
    return query ? stryMutAct_9fa48("10626") ? `` : (stryCov_9fa48("10626"), `/login?${query}`) : stryMutAct_9fa48("10627") ? "" : (stryCov_9fa48("10627"), "/login");
  }
}
export function expiredLoginUrl(location: {
  pathname?: string;
  search?: string;
}): string {
  if (stryMutAct_9fa48("10628")) {
    {}
  } else {
    stryCov_9fa48("10628");
    return loginUrl(stryMutAct_9fa48("10629") ? {} : (stryCov_9fa48("10629"), {
      expired: stryMutAct_9fa48("10630") ? false : (stryCov_9fa48("10630"), true),
      destination: destinationOf(location)
    }));
  }
}

/** Cabecera con la que el proxy le pasa a los Server Components la pantalla pedida. */
export const DESTINATION_HEADER = stryMutAct_9fa48("10631") ? "" : (stryCov_9fa48("10631"), "x-m6-destination");