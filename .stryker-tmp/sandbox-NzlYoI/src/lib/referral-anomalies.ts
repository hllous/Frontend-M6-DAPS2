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
import { compareStrings } from "./utils";
import type { Referral } from "./referrals";
import type { Service } from "./services";

/**
 * Frontend hypothesis until M3/M7 publish an expected-response SLA.
 * Keep this in one place so the warning can be tuned without changing the UI.
 */
export const REFERRAL_STALE_AFTER_HOURS = 72;
export const REFERRAL_STALE_AFTER_MS = stryMutAct_9fa48("12685") ? REFERRAL_STALE_AFTER_HOURS * 60 * 60 / 1000 : (stryCov_9fa48("12685"), (stryMutAct_9fa48("12686") ? REFERRAL_STALE_AFTER_HOURS * 60 / 60 : (stryCov_9fa48("12686"), (stryMutAct_9fa48("12687") ? REFERRAL_STALE_AFTER_HOURS / 60 : (stryCov_9fa48("12687"), REFERRAL_STALE_AFTER_HOURS * 60)) * 60)) * 1000);
export type ReferralSourceChange = {
  field: string;
  recordedValue: string;
  currentValue: string;
};
export type ReferralAnomaly = {
  isStale: boolean;
  duplicateReferralIds: string[];
  sourceChanges: ReferralSourceChange[];
};
const terminalStatuses = new Set(stryMutAct_9fa48("12688") ? [] : (stryCov_9fa48("12688"), [stryMutAct_9fa48("12689") ? "" : (stryCov_9fa48("12689"), "CLOSED"), stryMutAct_9fa48("12690") ? "" : (stryCov_9fa48("12690"), "REJECTED"), stryMutAct_9fa48("12691") ? "" : (stryCov_9fa48("12691"), "ENDED"), stryMutAct_9fa48("12692") ? "" : (stryCov_9fa48("12692"), "EXPIRED")]));
function normalizedLocation(value: string | null): string {
  if (stryMutAct_9fa48("12693")) {
    {}
  } else {
    stryCov_9fa48("12693");
    return stryMutAct_9fa48("12695") ? (value ?? "").replace(/\s+/g, " ").toLowerCase() : stryMutAct_9fa48("12694") ? (value ?? "").trim().replace(/\s+/g, " ").toUpperCase() : (stryCov_9fa48("12694", "12695"), (stryMutAct_9fa48("12696") ? value && "" : (stryCov_9fa48("12696"), value ?? (stryMutAct_9fa48("12697") ? "Stryker was here!" : (stryCov_9fa48("12697"), "")))).trim().replace(stryMutAct_9fa48("12699") ? /\S+/g : stryMutAct_9fa48("12698") ? /\s/g : (stryCov_9fa48("12698", "12699"), /\s+/g), stryMutAct_9fa48("12700") ? "" : (stryCov_9fa48("12700"), " ")).toLowerCase());
  }
}
function closureSectionsKey(sections: Array<{
  streetName: string;
  fromCross: string;
  toCross: string;
}>): string {
  if (stryMutAct_9fa48("12701")) {
    {}
  } else {
    stryCov_9fa48("12701");
    return JSON.stringify(stryMutAct_9fa48("12702") ? sections.map(section => JSON.stringify([section.streetName, section.fromCross, section.toCross].map(normalizedLocation))) : (stryCov_9fa48("12702"), sections.map(stryMutAct_9fa48("12703") ? () => undefined : (stryCov_9fa48("12703"), section => JSON.stringify((stryMutAct_9fa48("12704") ? [] : (stryCov_9fa48("12704"), [section.streetName, section.fromCross, section.toCross])).map(normalizedLocation)))).sort(compareStrings)));
  }
}
function hasSameDuplicateCriteria(referral: Referral, candidate: Referral): boolean {
  if (stryMutAct_9fa48("12705")) {
    {}
  } else {
    stryCov_9fa48("12705");
    if (stryMutAct_9fa48("12708") ? referral.kind !== candidate.kind && referral.sourceId !== candidate.sourceId : stryMutAct_9fa48("12707") ? false : stryMutAct_9fa48("12706") ? true : (stryCov_9fa48("12706", "12707", "12708"), (stryMutAct_9fa48("12710") ? referral.kind === candidate.kind : stryMutAct_9fa48("12709") ? false : (stryCov_9fa48("12709", "12710"), referral.kind !== candidate.kind)) || (stryMutAct_9fa48("12712") ? referral.sourceId === candidate.sourceId : stryMutAct_9fa48("12711") ? false : (stryCov_9fa48("12711", "12712"), referral.sourceId !== candidate.sourceId)))) return stryMutAct_9fa48("12713") ? true : (stryCov_9fa48("12713"), false);
    if (stryMutAct_9fa48("12716") ? referral.kind === "REPAIR_REQUEST" || candidate.kind === "REPAIR_REQUEST" : stryMutAct_9fa48("12715") ? false : stryMutAct_9fa48("12714") ? true : (stryCov_9fa48("12714", "12715", "12716"), (stryMutAct_9fa48("12718") ? referral.kind !== "REPAIR_REQUEST" : stryMutAct_9fa48("12717") ? true : (stryCov_9fa48("12717", "12718"), referral.kind === (stryMutAct_9fa48("12719") ? "" : (stryCov_9fa48("12719"), "REPAIR_REQUEST")))) && (stryMutAct_9fa48("12721") ? candidate.kind !== "REPAIR_REQUEST" : stryMutAct_9fa48("12720") ? true : (stryCov_9fa48("12720", "12721"), candidate.kind === (stryMutAct_9fa48("12722") ? "" : (stryCov_9fa48("12722"), "REPAIR_REQUEST")))))) {
      if (stryMutAct_9fa48("12723")) {
        {}
      } else {
        stryCov_9fa48("12723");
        return stryMutAct_9fa48("12726") ? referral.request.detectedInType === candidate.request.detectedInType && referral.request.damageType === candidate.request.damageType || normalizedLocation(referral.request.address) === normalizedLocation(candidate.request.address) : stryMutAct_9fa48("12725") ? false : stryMutAct_9fa48("12724") ? true : (stryCov_9fa48("12724", "12725", "12726"), (stryMutAct_9fa48("12728") ? referral.request.detectedInType === candidate.request.detectedInType || referral.request.damageType === candidate.request.damageType : stryMutAct_9fa48("12727") ? true : (stryCov_9fa48("12727", "12728"), (stryMutAct_9fa48("12730") ? referral.request.detectedInType !== candidate.request.detectedInType : stryMutAct_9fa48("12729") ? true : (stryCov_9fa48("12729", "12730"), referral.request.detectedInType === candidate.request.detectedInType)) && (stryMutAct_9fa48("12732") ? referral.request.damageType !== candidate.request.damageType : stryMutAct_9fa48("12731") ? true : (stryCov_9fa48("12731", "12732"), referral.request.damageType === candidate.request.damageType)))) && (stryMutAct_9fa48("12734") ? normalizedLocation(referral.request.address) !== normalizedLocation(candidate.request.address) : stryMutAct_9fa48("12733") ? true : (stryCov_9fa48("12733", "12734"), normalizedLocation(referral.request.address) === normalizedLocation(candidate.request.address))));
      }
    }
    if (stryMutAct_9fa48("12737") ? referral.kind === "STREET_CLOSURE_REQUEST" || candidate.kind === "STREET_CLOSURE_REQUEST" : stryMutAct_9fa48("12736") ? false : stryMutAct_9fa48("12735") ? true : (stryCov_9fa48("12735", "12736", "12737"), (stryMutAct_9fa48("12739") ? referral.kind !== "STREET_CLOSURE_REQUEST" : stryMutAct_9fa48("12738") ? true : (stryCov_9fa48("12738", "12739"), referral.kind === (stryMutAct_9fa48("12740") ? "" : (stryCov_9fa48("12740"), "STREET_CLOSURE_REQUEST")))) && (stryMutAct_9fa48("12742") ? candidate.kind !== "STREET_CLOSURE_REQUEST" : stryMutAct_9fa48("12741") ? true : (stryCov_9fa48("12741", "12742"), candidate.kind === (stryMutAct_9fa48("12743") ? "" : (stryCov_9fa48("12743"), "STREET_CLOSURE_REQUEST")))))) {
      if (stryMutAct_9fa48("12744")) {
        {}
      } else {
        stryCov_9fa48("12744");
        return stryMutAct_9fa48("12747") ? referral.sourceType === candidate.sourceType && referral.request.closureType !== null && referral.request.closureType === candidate.request.closureType || closureSectionsKey(referral.request.affectedSections) === closureSectionsKey(candidate.request.affectedSections) : stryMutAct_9fa48("12746") ? false : stryMutAct_9fa48("12745") ? true : (stryCov_9fa48("12745", "12746", "12747"), (stryMutAct_9fa48("12749") ? referral.sourceType === candidate.sourceType && referral.request.closureType !== null || referral.request.closureType === candidate.request.closureType : stryMutAct_9fa48("12748") ? true : (stryCov_9fa48("12748", "12749"), (stryMutAct_9fa48("12751") ? referral.sourceType === candidate.sourceType || referral.request.closureType !== null : stryMutAct_9fa48("12750") ? true : (stryCov_9fa48("12750", "12751"), (stryMutAct_9fa48("12753") ? referral.sourceType !== candidate.sourceType : stryMutAct_9fa48("12752") ? true : (stryCov_9fa48("12752", "12753"), referral.sourceType === candidate.sourceType)) && (stryMutAct_9fa48("12755") ? referral.request.closureType === null : stryMutAct_9fa48("12754") ? true : (stryCov_9fa48("12754", "12755"), referral.request.closureType !== null)))) && (stryMutAct_9fa48("12757") ? referral.request.closureType !== candidate.request.closureType : stryMutAct_9fa48("12756") ? true : (stryCov_9fa48("12756", "12757"), referral.request.closureType === candidate.request.closureType)))) && (stryMutAct_9fa48("12759") ? closureSectionsKey(referral.request.affectedSections) !== closureSectionsKey(candidate.request.affectedSections) : stryMutAct_9fa48("12758") ? true : (stryCov_9fa48("12758", "12759"), closureSectionsKey(referral.request.affectedSections) === closureSectionsKey(candidate.request.affectedSections))));
      }
    }
    return stryMutAct_9fa48("12760") ? true : (stryCov_9fa48("12760"), false);
  }
}
export function isReferralOpen(referral: Referral): boolean {
  if (stryMutAct_9fa48("12761")) {
    {}
  } else {
    stryCov_9fa48("12761");
    return stryMutAct_9fa48("12762") ? terminalStatuses.has(referral.status) : (stryCov_9fa48("12762"), !terminalStatuses.has(referral.status));
  }
}
export function isReferralStale(referral: Referral, now = new Date()): boolean {
  if (stryMutAct_9fa48("12763")) {
    {}
  } else {
    stryCov_9fa48("12763");
    if (stryMutAct_9fa48("12766") ? false : stryMutAct_9fa48("12765") ? true : stryMutAct_9fa48("12764") ? isReferralOpen(referral) : (stryCov_9fa48("12764", "12765", "12766"), !isReferralOpen(referral))) return stryMutAct_9fa48("12767") ? true : (stryCov_9fa48("12767"), false);
    const lastActivity = Date.parse(stryMutAct_9fa48("12770") ? referral.updatedAt && referral.createdAt : stryMutAct_9fa48("12769") ? false : stryMutAct_9fa48("12768") ? true : (stryCov_9fa48("12768", "12769", "12770"), referral.updatedAt || referral.createdAt));
    if (stryMutAct_9fa48("12772") ? false : stryMutAct_9fa48("12771") ? true : (stryCov_9fa48("12771", "12772"), Number.isNaN(lastActivity))) return stryMutAct_9fa48("12773") ? true : (stryCov_9fa48("12773"), false);
    return stryMutAct_9fa48("12777") ? now.getTime() - lastActivity <= REFERRAL_STALE_AFTER_MS : stryMutAct_9fa48("12776") ? now.getTime() - lastActivity >= REFERRAL_STALE_AFTER_MS : stryMutAct_9fa48("12775") ? false : stryMutAct_9fa48("12774") ? true : (stryCov_9fa48("12774", "12775", "12776", "12777"), (stryMutAct_9fa48("12778") ? now.getTime() + lastActivity : (stryCov_9fa48("12778"), now.getTime() - lastActivity)) > REFERRAL_STALE_AFTER_MS);
  }
}
function duplicateIdsFor(referral: Referral, referrals: Referral[]): string[] {
  if (stryMutAct_9fa48("12779")) {
    {}
  } else {
    stryCov_9fa48("12779");
    if (stryMutAct_9fa48("12782") ? false : stryMutAct_9fa48("12781") ? true : stryMutAct_9fa48("12780") ? isReferralOpen(referral) : (stryCov_9fa48("12780", "12781", "12782"), !isReferralOpen(referral))) return stryMutAct_9fa48("12783") ? ["Stryker was here"] : (stryCov_9fa48("12783"), []);
    return stryMutAct_9fa48("12785") ? referrals.map(candidate => candidate.id).filter(id => id !== referral.id) : stryMutAct_9fa48("12784") ? referrals.filter(candidate => hasSameDuplicateCriteria(referral, candidate) && isReferralOpen(candidate)).map(candidate => candidate.id) : (stryCov_9fa48("12784", "12785"), referrals.filter(stryMutAct_9fa48("12786") ? () => undefined : (stryCov_9fa48("12786"), candidate => stryMutAct_9fa48("12789") ? hasSameDuplicateCriteria(referral, candidate) || isReferralOpen(candidate) : stryMutAct_9fa48("12788") ? false : stryMutAct_9fa48("12787") ? true : (stryCov_9fa48("12787", "12788", "12789"), hasSameDuplicateCriteria(referral, candidate) && isReferralOpen(candidate)))).map(stryMutAct_9fa48("12790") ? () => undefined : (stryCov_9fa48("12790"), candidate => candidate.id)).filter(stryMutAct_9fa48("12791") ? () => undefined : (stryCov_9fa48("12791"), id => stryMutAct_9fa48("12794") ? id === referral.id : stryMutAct_9fa48("12793") ? false : stryMutAct_9fa48("12792") ? true : (stryCov_9fa48("12792", "12793", "12794"), id !== referral.id))));
  }
}
function valueOrDash(value: string | null | undefined): string {
  if (stryMutAct_9fa48("12795")) {
    {}
  } else {
    stryCov_9fa48("12795");
    return stryMutAct_9fa48("12798") ? value && "—" : stryMutAct_9fa48("12797") ? false : stryMutAct_9fa48("12796") ? true : (stryCov_9fa48("12796", "12797", "12798"), value || (stryMutAct_9fa48("12799") ? "" : (stryCov_9fa48("12799"), "—")));
  }
}
function sourceChangesFor(referral: Referral, service: Service | null | undefined): ReferralSourceChange[] {
  if (stryMutAct_9fa48("12800")) {
    {}
  } else {
    stryCov_9fa48("12800");
    if (stryMutAct_9fa48("12803") ? !service && referral.sourceType === "TREE_INTERVENTION" : stryMutAct_9fa48("12802") ? false : stryMutAct_9fa48("12801") ? true : (stryCov_9fa48("12801", "12802", "12803"), (stryMutAct_9fa48("12804") ? service : (stryCov_9fa48("12804"), !service)) || (stryMutAct_9fa48("12806") ? referral.sourceType !== "TREE_INTERVENTION" : stryMutAct_9fa48("12805") ? false : (stryCov_9fa48("12805", "12806"), referral.sourceType === (stryMutAct_9fa48("12807") ? "" : (stryCov_9fa48("12807"), "TREE_INTERVENTION")))))) return stryMutAct_9fa48("12808") ? ["Stryker was here"] : (stryCov_9fa48("12808"), []);
    if (stryMutAct_9fa48("12811") ? referral.kind !== "REPAIR_REQUEST" : stryMutAct_9fa48("12810") ? false : stryMutAct_9fa48("12809") ? true : (stryCov_9fa48("12809", "12810", "12811"), referral.kind === (stryMutAct_9fa48("12812") ? "" : (stryCov_9fa48("12812"), "REPAIR_REQUEST")))) {
      if (stryMutAct_9fa48("12813")) {
        {}
      } else {
        stryCov_9fa48("12813");
        return (stryMutAct_9fa48("12816") ? referral.sourceLabel !== service.title : stryMutAct_9fa48("12815") ? false : stryMutAct_9fa48("12814") ? true : (stryCov_9fa48("12814", "12815", "12816"), referral.sourceLabel === service.title)) ? stryMutAct_9fa48("12817") ? ["Stryker was here"] : (stryCov_9fa48("12817"), []) : stryMutAct_9fa48("12818") ? [] : (stryCov_9fa48("12818"), [stryMutAct_9fa48("12819") ? {} : (stryCov_9fa48("12819"), {
          field: stryMutAct_9fa48("12820") ? "" : (stryCov_9fa48("12820"), "Nombre del Servicio"),
          recordedValue: referral.sourceLabel,
          currentValue: service.title
        })]);
      }
    }
    const recorded = referral.request.sourceContext;
    if (stryMutAct_9fa48("12823") ? recorded?.sourceType === "SERVICE" : stryMutAct_9fa48("12822") ? false : stryMutAct_9fa48("12821") ? true : (stryCov_9fa48("12821", "12822", "12823"), (stryMutAct_9fa48("12824") ? recorded.sourceType : (stryCov_9fa48("12824"), recorded?.sourceType)) !== (stryMutAct_9fa48("12825") ? "" : (stryCov_9fa48("12825"), "SERVICE")))) return stryMutAct_9fa48("12826") ? ["Stryker was here"] : (stryCov_9fa48("12826"), []);
    const comparisons: Array<[string, string, string]> = stryMutAct_9fa48("12827") ? [] : (stryCov_9fa48("12827"), [stryMutAct_9fa48("12828") ? [] : (stryCov_9fa48("12828"), [stryMutAct_9fa48("12829") ? "" : (stryCov_9fa48("12829"), "Nombre del Servicio"), recorded.title, service.title]), stryMutAct_9fa48("12830") ? [] : (stryCov_9fa48("12830"), [stryMutAct_9fa48("12831") ? "" : (stryCov_9fa48("12831"), "Modalidad"), recorded.mode, service.mode]), stryMutAct_9fa48("12832") ? [] : (stryCov_9fa48("12832"), [stryMutAct_9fa48("12833") ? "" : (stryCov_9fa48("12833"), "Tipo de Servicio"), recorded.serviceTypeName, service.serviceTypeName]), stryMutAct_9fa48("12834") ? [] : (stryCov_9fa48("12834"), [stryMutAct_9fa48("12835") ? "" : (stryCov_9fa48("12835"), "Fecha programada"), recorded.scheduledDate, service.scheduledDate]), stryMutAct_9fa48("12836") ? [] : (stryCov_9fa48("12836"), [stryMutAct_9fa48("12837") ? "" : (stryCov_9fa48("12837"), "Inicio de ventana"), valueOrDash(recorded.windowFrom), valueOrDash(service.windowFrom)]), stryMutAct_9fa48("12838") ? [] : (stryCov_9fa48("12838"), [stryMutAct_9fa48("12839") ? "" : (stryCov_9fa48("12839"), "Fin de ventana"), valueOrDash(recorded.windowTo), valueOrDash(service.windowTo)])]);
    return stryMutAct_9fa48("12840") ? comparisons.map(([field, recordedValue, currentValue]) => ({
      field,
      recordedValue,
      currentValue
    })) : (stryCov_9fa48("12840"), comparisons.filter(stryMutAct_9fa48("12841") ? () => undefined : (stryCov_9fa48("12841"), ([, recordedValue, currentValue]) => stryMutAct_9fa48("12844") ? recordedValue === currentValue : stryMutAct_9fa48("12843") ? false : stryMutAct_9fa48("12842") ? true : (stryCov_9fa48("12842", "12843", "12844"), recordedValue !== currentValue))).map(stryMutAct_9fa48("12845") ? () => undefined : (stryCov_9fa48("12845"), ([field, recordedValue, currentValue]) => stryMutAct_9fa48("12846") ? {} : (stryCov_9fa48("12846"), {
      field,
      recordedValue,
      currentValue
    }))));
  }
}
export function getReferralAnomaly(referral: Referral, referrals: Referral[], sourceService: Service | null | undefined, now = new Date()): ReferralAnomaly {
  if (stryMutAct_9fa48("12847")) {
    {}
  } else {
    stryCov_9fa48("12847");
    return stryMutAct_9fa48("12848") ? {} : (stryCov_9fa48("12848"), {
      isStale: isReferralStale(referral, now),
      duplicateReferralIds: duplicateIdsFor(referral, referrals),
      sourceChanges: sourceChangesFor(referral, sourceService)
    });
  }
}
export function getReferralAnomalies(referrals: Referral[], sourceServices: ReadonlyMap<string, Service>, now = new Date()): Map<string, ReferralAnomaly> {
  if (stryMutAct_9fa48("12849")) {
    {}
  } else {
    stryCov_9fa48("12849");
    return new Map(referrals.map(stryMutAct_9fa48("12850") ? () => undefined : (stryCov_9fa48("12850"), referral => stryMutAct_9fa48("12851") ? [] : (stryCov_9fa48("12851"), [referral.id, getReferralAnomaly(referral, referrals, referral.sourceServiceId ? sourceServices.get(referral.sourceServiceId) : undefined, now)]))));
  }
}