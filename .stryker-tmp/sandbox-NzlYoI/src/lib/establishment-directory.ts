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
export type EstablishmentDirectoryQuery = {
  query: string;
};
export type Establishment = {
  id: string;
  name: string;
  address: string;
};
export interface EstablishmentDirectoryAdapter {
  resolve(query: EstablishmentDirectoryQuery): Promise<Establishment | null>;
}
export const establishmentDirectoryFixtures: readonly Establishment[] = stryMutAct_9fa48("9057") ? [] : (stryCov_9fa48("9057"), [stryMutAct_9fa48("9058") ? {} : (stryCov_9fa48("9058"), {
  id: stryMutAct_9fa48("9059") ? "" : (stryCov_9fa48("9059"), "EST-BOEDO-1880"),
  name: stryMutAct_9fa48("9060") ? "" : (stryCov_9fa48("9060"), "Planta de tratamiento Boedo"),
  address: stryMutAct_9fa48("9061") ? "" : (stryCov_9fa48("9061"), "Av. Boedo 1880")
}), stryMutAct_9fa48("9062") ? {} : (stryCov_9fa48("9062"), {
  id: stryMutAct_9fa48("9063") ? "" : (stryCov_9fa48("9063"), "EST-BRASIL-2450"),
  name: stryMutAct_9fa48("9064") ? "" : (stryCov_9fa48("9064"), "Industrias Brasil"),
  address: stryMutAct_9fa48("9065") ? "" : (stryCov_9fa48("9065"), "Av. Brasil 2450")
})]);
function normalize(value: string) {
  if (stryMutAct_9fa48("9066")) {
    {}
  } else {
    stryCov_9fa48("9066");
    return stryMutAct_9fa48("9068") ? value.toLocaleLowerCase("es-AR") : stryMutAct_9fa48("9067") ? value.trim().toLocaleUpperCase("es-AR") : (stryCov_9fa48("9067", "9068"), value.trim().toLocaleLowerCase(stryMutAct_9fa48("9069") ? "" : (stryCov_9fa48("9069"), "es-AR")));
  }
}

/**
 * Temporary local implementation for development and tests. The M4 search
 * contract is not published yet, so production integration must replace this
 * adapter rather than adding M4-specific request details to the UI.
 */
export const localEstablishmentDirectoryAdapter: EstablishmentDirectoryAdapter = stryMutAct_9fa48("9070") ? {} : (stryCov_9fa48("9070"), {
  async resolve({
    query
  }: EstablishmentDirectoryQuery) {
    if (stryMutAct_9fa48("9071")) {
      {}
    } else {
      stryCov_9fa48("9071");
      const normalizedQuery = normalize(query);
      if (stryMutAct_9fa48("9074") ? false : stryMutAct_9fa48("9073") ? true : stryMutAct_9fa48("9072") ? normalizedQuery : (stryCov_9fa48("9072", "9073", "9074"), !normalizedQuery)) return null;
      return stryMutAct_9fa48("9075") ? establishmentDirectoryFixtures.find(establishment => [establishment.id, establishment.name, establishment.address].some(value => normalize(value).includes(normalizedQuery))) && null : (stryCov_9fa48("9075"), establishmentDirectoryFixtures.find(stryMutAct_9fa48("9076") ? () => undefined : (stryCov_9fa48("9076"), establishment => stryMutAct_9fa48("9077") ? [establishment.id, establishment.name, establishment.address].every(value => normalize(value).includes(normalizedQuery)) : (stryCov_9fa48("9077"), (stryMutAct_9fa48("9078") ? [] : (stryCov_9fa48("9078"), [establishment.id, establishment.name, establishment.address])).some(stryMutAct_9fa48("9079") ? () => undefined : (stryCov_9fa48("9079"), value => normalize(value).includes(normalizedQuery)))))) ?? null);
    }
  }
});
export let establishmentDirectoryAdapter: EstablishmentDirectoryAdapter = localEstablishmentDirectoryAdapter;
export function setEstablishmentDirectoryAdapter(adapter: EstablishmentDirectoryAdapter) {
  if (stryMutAct_9fa48("9080")) {
    {}
  } else {
    stryCov_9fa48("9080");
    establishmentDirectoryAdapter = adapter;
  }
}
export function resetEstablishmentDirectoryAdapter() {
  if (stryMutAct_9fa48("9081")) {
    {}
  } else {
    stryCov_9fa48("9081");
    establishmentDirectoryAdapter = localEstablishmentDirectoryAdapter;
  }
}