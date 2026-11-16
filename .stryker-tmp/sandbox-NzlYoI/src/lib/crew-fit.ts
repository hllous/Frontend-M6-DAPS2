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
const specialties: Record<string, Crew["specialty"]> = stryMutAct_9fa48("7794") ? {} : (stryCov_9fa48("7794"), {
  "REC-DOM": stryMutAct_9fa48("7795") ? "" : (stryCov_9fa48("7795"), "COLLECTION"),
  "REC-VOL": stryMutAct_9fa48("7796") ? "" : (stryCov_9fa48("7796"), "COLLECTION"),
  "CONT-VAC": stryMutAct_9fa48("7797") ? "" : (stryCov_9fa48("7797"), "COLLECTION"),
  "REC-REC": stryMutAct_9fa48("7798") ? "" : (stryCov_9fa48("7798"), "RECYCLING"),
  "BAR-MEC": stryMutAct_9fa48("7799") ? "" : (stryCov_9fa48("7799"), "SWEEPING"),
  "BAR-MAN": stryMutAct_9fa48("7800") ? "" : (stryCov_9fa48("7800"), "SWEEPING"),
  "HIG-LAV": stryMutAct_9fa48("7801") ? "" : (stryCov_9fa48("7801"), "CLEANING"),
  "CONT-LAV": stryMutAct_9fa48("7802") ? "" : (stryCov_9fa48("7802"), "CLEANING"),
  "ARB-POD": stryMutAct_9fa48("7803") ? "" : (stryCov_9fa48("7803"), "TREES"),
  "ARB-CENSO": stryMutAct_9fa48("7804") ? "" : (stryCov_9fa48("7804"), "TREES"),
  "EV-RIEGO": stryMutAct_9fa48("7805") ? "" : (stryCov_9fa48("7805"), "GREEN_SPACES"),
  "EV-MANT": stryMutAct_9fa48("7806") ? "" : (stryCov_9fa48("7806"), "GREEN_SPACES"),
  "AMB-INSP": stryMutAct_9fa48("7807") ? "" : (stryCov_9fa48("7807"), "INSPECTION")
});
export function crewFit(crew: Crew | undefined, zones: string[], code?: string) {
  if (stryMutAct_9fa48("7808")) {
    {}
  } else {
    stryCov_9fa48("7808");
    return stryMutAct_9fa48("7809") ? {} : (stryCov_9fa48("7809"), {
      zone: Boolean(stryMutAct_9fa48("7812") ? crew?.effectiveZoneId && zones.length || !zones.includes(crew.effectiveZoneId) : stryMutAct_9fa48("7811") ? false : stryMutAct_9fa48("7810") ? true : (stryCov_9fa48("7810", "7811", "7812"), (stryMutAct_9fa48("7814") ? crew?.effectiveZoneId || zones.length : stryMutAct_9fa48("7813") ? true : (stryCov_9fa48("7813", "7814"), (stryMutAct_9fa48("7815") ? crew.effectiveZoneId : (stryCov_9fa48("7815"), crew?.effectiveZoneId)) && zones.length)) && (stryMutAct_9fa48("7816") ? zones.includes(crew.effectiveZoneId) : (stryCov_9fa48("7816"), !zones.includes(crew.effectiveZoneId))))),
      specialty: Boolean(stryMutAct_9fa48("7819") ? crew?.specialty && code && specialties[code] || crew.specialty !== specialties[code] : stryMutAct_9fa48("7818") ? false : stryMutAct_9fa48("7817") ? true : (stryCov_9fa48("7817", "7818", "7819"), (stryMutAct_9fa48("7821") ? crew?.specialty && code || specialties[code] : stryMutAct_9fa48("7820") ? true : (stryCov_9fa48("7820", "7821"), (stryMutAct_9fa48("7823") ? crew?.specialty || code : stryMutAct_9fa48("7822") ? true : (stryCov_9fa48("7822", "7823"), (stryMutAct_9fa48("7824") ? crew.specialty : (stryCov_9fa48("7824"), crew?.specialty)) && code)) && specialties[code])) && (stryMutAct_9fa48("7826") ? crew.specialty === specialties[code] : stryMutAct_9fa48("7825") ? true : (stryCov_9fa48("7825", "7826"), crew.specialty !== specialties[code]))))
    });
  }
}
export function crewsInZoneFirst(crews: Crew[], zones: string[]) {
  if (stryMutAct_9fa48("7827")) {
    {}
  } else {
    stryCov_9fa48("7827");
    return stryMutAct_9fa48("7828") ? [...crews] : (stryCov_9fa48("7828"), (stryMutAct_9fa48("7829") ? [] : (stryCov_9fa48("7829"), [...crews])).sort(stryMutAct_9fa48("7830") ? () => undefined : (stryCov_9fa48("7830"), (a, b) => stryMutAct_9fa48("7831") ? Number(Boolean(b.effectiveZoneId && zones.includes(b.effectiveZoneId))) + Number(Boolean(a.effectiveZoneId && zones.includes(a.effectiveZoneId))) : (stryCov_9fa48("7831"), Number(Boolean(stryMutAct_9fa48("7834") ? b.effectiveZoneId || zones.includes(b.effectiveZoneId) : stryMutAct_9fa48("7833") ? false : stryMutAct_9fa48("7832") ? true : (stryCov_9fa48("7832", "7833", "7834"), b.effectiveZoneId && zones.includes(b.effectiveZoneId)))) - Number(Boolean(stryMutAct_9fa48("7837") ? a.effectiveZoneId || zones.includes(a.effectiveZoneId) : stryMutAct_9fa48("7836") ? false : stryMutAct_9fa48("7835") ? true : (stryCov_9fa48("7835", "7836", "7837"), a.effectiveZoneId && zones.includes(a.effectiveZoneId))))))));
  }
}

// El backend no manda un código en el 409 de asignación: siempre pide `overrideNote` en el mensaje, sea por solape, zona o especialidad.
export function asksForOverrideNote(message: string) {
  if (stryMutAct_9fa48("7838")) {
    {}
  } else {
    stryCov_9fa48("7838");
    return /overrideNote/.test(message);
  }
}
export function crewFitWarnings(fit: {
  zone: boolean;
  specialty: boolean;
}) {
  if (stryMutAct_9fa48("7839")) {
    {}
  } else {
    stryCov_9fa48("7839");
    return stryMutAct_9fa48("7840") ? [] : (stryCov_9fa48("7840"), [...(fit.zone ? stryMutAct_9fa48("7841") ? [] : (stryCov_9fa48("7841"), [stryMutAct_9fa48("7842") ? "" : (stryCov_9fa48("7842"), "La cuadrilla trabaja en una zona distinta.")]) : stryMutAct_9fa48("7843") ? ["Stryker was here"] : (stryCov_9fa48("7843"), [])), ...(fit.specialty ? stryMutAct_9fa48("7844") ? [] : (stryCov_9fa48("7844"), [stryMutAct_9fa48("7845") ? "" : (stryCov_9fa48("7845"), "La cuadrilla tiene una especialidad distinta.")]) : stryMutAct_9fa48("7846") ? ["Stryker was here"] : (stryCov_9fa48("7846"), []))]);
  }
}