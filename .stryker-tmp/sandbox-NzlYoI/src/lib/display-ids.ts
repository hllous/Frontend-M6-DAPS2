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
import { ENVIRONMENTAL_REPORT_TYPE_LABELS, type EnvironmentalReportType } from "./environmental-reports";
const UUID = stryMutAct_9fa48("8237") ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[^0-9a-f]{12}$/i : stryMutAct_9fa48("8236") ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]$/i : stryMutAct_9fa48("8235") ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[^0-9a-f]{4}-[0-9a-f]{12}$/i : stryMutAct_9fa48("8234") ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]-[0-9a-f]{12}$/i : stryMutAct_9fa48("8233") ? /^[0-9a-f]{8}-[0-9a-f]{4}-[^0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i : stryMutAct_9fa48("8232") ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]-[0-9a-f]{4}-[0-9a-f]{12}$/i : stryMutAct_9fa48("8231") ? /^[0-9a-f]{8}-[^0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i : stryMutAct_9fa48("8230") ? /^[0-9a-f]{8}-[0-9a-f]-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i : stryMutAct_9fa48("8229") ? /^[^0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i : stryMutAct_9fa48("8228") ? /^[0-9a-f]-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i : stryMutAct_9fa48("8227") ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i : stryMutAct_9fa48("8226") ? /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i : (stryCov_9fa48("8226", "8227", "8228", "8229", "8230", "8231", "8232", "8233", "8234", "8235", "8236", "8237"), /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
export const isUuid = stryMutAct_9fa48("8238") ? () => undefined : (stryCov_9fa48("8238"), (() => {
  const isUuid = (id: string): boolean => UUID.test(id);
  return isUuid;
})());

/** Short human handle for a record with no business number: `#88ef5782` for a UUID, other ids as they are. */
export function shortId(id: string): string {
  if (stryMutAct_9fa48("8239")) {
    {}
  } else {
    stryCov_9fa48("8239");
    return UUID.test(id) ? stryMutAct_9fa48("8240") ? `` : (stryCov_9fa48("8240"), `#${stryMutAct_9fa48("8241") ? id : (stryCov_9fa48("8241"), id.slice(0, 8))}`) : id;
  }
}
type ReportLabelInput = {
  reportType: EnvironmentalReportType;
  address?: string | null;
  location?: {
    address?: string | null;
  } | null;
  publicId?: string | null;
  caseNumber?: string | null;
};

/** Business number of a report: the citizen's `publicId` (TK-…) or, for office-opened ones, M6's `caseNumber` (EXP-…). */
export function reportNumber(report: Pick<ReportLabelInput, "publicId" | "caseNumber">): string | null {
  if (stryMutAct_9fa48("8242")) {
    {}
  } else {
    stryCov_9fa48("8242");
    return stryMutAct_9fa48("8245") ? (report.publicId || report.caseNumber) && null : stryMutAct_9fa48("8244") ? false : stryMutAct_9fa48("8243") ? true : (stryCov_9fa48("8243", "8244", "8245"), (stryMutAct_9fa48("8247") ? report.publicId && report.caseNumber : stryMutAct_9fa48("8246") ? false : (stryCov_9fa48("8246", "8247"), report.publicId || report.caseNumber)) || null);
  }
}

/** Report number or an understandable description when no number exists. */
export function reportLabel(report: ReportLabelInput): string {
  if (stryMutAct_9fa48("8248")) {
    {}
  } else {
    stryCov_9fa48("8248");
    return stryMutAct_9fa48("8251") ? reportNumber(report) && `${ENVIRONMENTAL_REPORT_TYPE_LABELS[report.reportType]} · ${report.address || report.location?.address || "sin dirección"}` : stryMutAct_9fa48("8250") ? false : stryMutAct_9fa48("8249") ? true : (stryCov_9fa48("8249", "8250", "8251"), reportNumber(report) || (stryMutAct_9fa48("8252") ? `` : (stryCov_9fa48("8252"), `${ENVIRONMENTAL_REPORT_TYPE_LABELS[report.reportType]} · ${stryMutAct_9fa48("8255") ? (report.address || report.location?.address) && "sin dirección" : stryMutAct_9fa48("8254") ? false : stryMutAct_9fa48("8253") ? true : (stryCov_9fa48("8253", "8254", "8255"), (stryMutAct_9fa48("8257") ? report.address && report.location?.address : stryMutAct_9fa48("8256") ? false : (stryCov_9fa48("8256", "8257"), report.address || (stryMutAct_9fa48("8258") ? report.location.address : (stryCov_9fa48("8258"), report.location?.address)))) || (stryMutAct_9fa48("8259") ? "" : (stryCov_9fa48("8259"), "sin dirección")))}`)));
  }
}
type ReferralLike = {
  kind: "REPAIR_REQUEST";
  request: {
    damageType: string;
    address: string | null;
  };
} | {
  kind: "STREET_CLOSURE_REQUEST";
  request: {
    affectedSections: Array<{
      streetName: string;
    }>;
    reason: string;
  };
};

/** `Reparación · Sumidero obstruido · Av. Rivadavia 4500` / `Corte de calle · Rivadavia`, never the UUID. */
export function referralLabel(referral: ReferralLike, damageLabels: Record<string, string>): string {
  if (stryMutAct_9fa48("8260")) {
    {}
  } else {
    stryCov_9fa48("8260");
    if (stryMutAct_9fa48("8263") ? referral.kind !== "REPAIR_REQUEST" : stryMutAct_9fa48("8262") ? false : stryMutAct_9fa48("8261") ? true : (stryCov_9fa48("8261", "8262", "8263"), referral.kind === (stryMutAct_9fa48("8264") ? "" : (stryCov_9fa48("8264"), "REPAIR_REQUEST")))) {
      if (stryMutAct_9fa48("8265")) {
        {}
      } else {
        stryCov_9fa48("8265");
        const {
          damageType,
          address
        } = referral.request;
        return stryMutAct_9fa48("8266") ? `` : (stryCov_9fa48("8266"), `Reparación · ${stryMutAct_9fa48("8267") ? damageLabels[damageType] && damageType : (stryCov_9fa48("8267"), damageLabels[damageType] ?? damageType)} · ${stryMutAct_9fa48("8268") ? address && "sin dirección" : (stryCov_9fa48("8268"), address ?? (stryMutAct_9fa48("8269") ? "" : (stryCov_9fa48("8269"), "sin dirección")))}`);
      }
    }
    const street = stryMutAct_9fa48("8270") ? referral.request.affectedSections[0].streetName : (stryCov_9fa48("8270"), referral.request.affectedSections[0]?.streetName);
    return stryMutAct_9fa48("8271") ? `` : (stryCov_9fa48("8271"), `Corte de calle · ${stryMutAct_9fa48("8272") ? street && referral.request.reason : (stryCov_9fa48("8272"), street ?? referral.request.reason)}`);
  }
}