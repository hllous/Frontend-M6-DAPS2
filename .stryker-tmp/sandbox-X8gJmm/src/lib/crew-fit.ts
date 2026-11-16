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
import type { Crew } from "./crews";

// Backend: src/modules/crews/crew-specialty.ts (SERVICE_TYPE_SPECIALTY).
const specialties: Record<string, Crew["specialty"]> = stryMutAct_9fa48("0") ? {} : (stryCov_9fa48("0"), {
  "REC-DOM": stryMutAct_9fa48("1") ? "" : (stryCov_9fa48("1"), "COLLECTION"),
  "REC-VOL": stryMutAct_9fa48("2") ? "" : (stryCov_9fa48("2"), "COLLECTION"),
  "CONT-VAC": stryMutAct_9fa48("3") ? "" : (stryCov_9fa48("3"), "COLLECTION"),
  "REC-REC": stryMutAct_9fa48("4") ? "" : (stryCov_9fa48("4"), "RECYCLING"),
  "BAR-MEC": stryMutAct_9fa48("5") ? "" : (stryCov_9fa48("5"), "SWEEPING"),
  "BAR-MAN": stryMutAct_9fa48("6") ? "" : (stryCov_9fa48("6"), "SWEEPING"),
  "HIG-LAV": stryMutAct_9fa48("7") ? "" : (stryCov_9fa48("7"), "CLEANING"),
  "CONT-LAV": stryMutAct_9fa48("8") ? "" : (stryCov_9fa48("8"), "CLEANING"),
  "ARB-POD": stryMutAct_9fa48("9") ? "" : (stryCov_9fa48("9"), "TREES"),
  "ARB-CENSO": stryMutAct_9fa48("10") ? "" : (stryCov_9fa48("10"), "TREES"),
  "EV-RIEGO": stryMutAct_9fa48("11") ? "" : (stryCov_9fa48("11"), "GREEN_SPACES"),
  "EV-MANT": stryMutAct_9fa48("12") ? "" : (stryCov_9fa48("12"), "GREEN_SPACES"),
  "AMB-INSP": stryMutAct_9fa48("13") ? "" : (stryCov_9fa48("13"), "INSPECTION")
});
export function crewFit(crew: Crew | undefined, zones: string[], code?: string) {
  if (stryMutAct_9fa48("14")) {
    {}
  } else {
    stryCov_9fa48("14");
    return stryMutAct_9fa48("15") ? {} : (stryCov_9fa48("15"), {
      zone: Boolean(stryMutAct_9fa48("18") ? crew?.effectiveZoneId && zones.length || !zones.includes(crew.effectiveZoneId) : stryMutAct_9fa48("17") ? false : stryMutAct_9fa48("16") ? true : (stryCov_9fa48("16", "17", "18"), (stryMutAct_9fa48("20") ? crew?.effectiveZoneId || zones.length : stryMutAct_9fa48("19") ? true : (stryCov_9fa48("19", "20"), (stryMutAct_9fa48("21") ? crew.effectiveZoneId : (stryCov_9fa48("21"), crew?.effectiveZoneId)) && zones.length)) && (stryMutAct_9fa48("22") ? zones.includes(crew.effectiveZoneId) : (stryCov_9fa48("22"), !zones.includes(crew.effectiveZoneId))))),
      specialty: Boolean(stryMutAct_9fa48("25") ? crew?.specialty && code && specialties[code] || crew.specialty !== specialties[code] : stryMutAct_9fa48("24") ? false : stryMutAct_9fa48("23") ? true : (stryCov_9fa48("23", "24", "25"), (stryMutAct_9fa48("27") ? crew?.specialty && code || specialties[code] : stryMutAct_9fa48("26") ? true : (stryCov_9fa48("26", "27"), (stryMutAct_9fa48("29") ? crew?.specialty || code : stryMutAct_9fa48("28") ? true : (stryCov_9fa48("28", "29"), (stryMutAct_9fa48("30") ? crew.specialty : (stryCov_9fa48("30"), crew?.specialty)) && code)) && specialties[code])) && (stryMutAct_9fa48("32") ? crew.specialty === specialties[code] : stryMutAct_9fa48("31") ? true : (stryCov_9fa48("31", "32"), crew.specialty !== specialties[code]))))
    });
  }
}
export function crewsInZoneFirst(crews: Crew[], zones: string[]) {
  if (stryMutAct_9fa48("33")) {
    {}
  } else {
    stryCov_9fa48("33");
    return stryMutAct_9fa48("34") ? [...crews] : (stryCov_9fa48("34"), (stryMutAct_9fa48("35") ? [] : (stryCov_9fa48("35"), [...crews])).sort(stryMutAct_9fa48("36") ? () => undefined : (stryCov_9fa48("36"), (a, b) => stryMutAct_9fa48("37") ? Number(Boolean(b.effectiveZoneId && zones.includes(b.effectiveZoneId))) + Number(Boolean(a.effectiveZoneId && zones.includes(a.effectiveZoneId))) : (stryCov_9fa48("37"), Number(Boolean(stryMutAct_9fa48("40") ? b.effectiveZoneId || zones.includes(b.effectiveZoneId) : stryMutAct_9fa48("39") ? false : stryMutAct_9fa48("38") ? true : (stryCov_9fa48("38", "39", "40"), b.effectiveZoneId && zones.includes(b.effectiveZoneId)))) - Number(Boolean(stryMutAct_9fa48("43") ? a.effectiveZoneId || zones.includes(a.effectiveZoneId) : stryMutAct_9fa48("42") ? false : stryMutAct_9fa48("41") ? true : (stryCov_9fa48("41", "42", "43"), a.effectiveZoneId && zones.includes(a.effectiveZoneId))))))));
  }
}

// El backend no manda un código en el 409 de asignación: siempre pide `overrideNote` en el mensaje, sea por solape, zona o especialidad.
export function asksForOverrideNote(message: string) {
  if (stryMutAct_9fa48("44")) {
    {}
  } else {
    stryCov_9fa48("44");
    return /overrideNote/.test(message);
  }
}
export function crewFitWarnings(fit: {
  zone: boolean;
  specialty: boolean;
}) {
  if (stryMutAct_9fa48("45")) {
    {}
  } else {
    stryCov_9fa48("45");
    return stryMutAct_9fa48("46") ? [] : (stryCov_9fa48("46"), [...(fit.zone ? stryMutAct_9fa48("47") ? [] : (stryCov_9fa48("47"), [stryMutAct_9fa48("48") ? "" : (stryCov_9fa48("48"), "La cuadrilla trabaja en una zona distinta.")]) : stryMutAct_9fa48("49") ? ["Stryker was here"] : (stryCov_9fa48("49"), [])), ...(fit.specialty ? stryMutAct_9fa48("50") ? [] : (stryCov_9fa48("50"), [stryMutAct_9fa48("51") ? "" : (stryCov_9fa48("51"), "La cuadrilla tiene una especialidad distinta.")]) : stryMutAct_9fa48("52") ? ["Stryker was here"] : (stryCov_9fa48("52"), []))]);
  }
}