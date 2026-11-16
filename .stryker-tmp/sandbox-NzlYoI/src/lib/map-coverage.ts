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
import type { CoverageIndicator } from "./indicators";
import type { OperationalZone, OperationalZoneGeometry } from "./operational-zones";
export type CoverageBand = "no-data" | "low" | "partial" | "good" | "high";
export const COVERAGE_BAND_LABELS: Record<CoverageBand, string> = stryMutAct_9fa48("11509") ? {} : (stryCov_9fa48("11509"), {
  "no-data": stryMutAct_9fa48("11510") ? "" : (stryCov_9fa48("11510"), "Sin datos"),
  low: stryMutAct_9fa48("11511") ? "" : (stryCov_9fa48("11511"), "Cobertura baja"),
  partial: stryMutAct_9fa48("11512") ? "" : (stryCov_9fa48("11512"), "Cobertura parcial"),
  good: stryMutAct_9fa48("11513") ? "" : (stryCov_9fa48("11513"), "Cobertura buena"),
  high: stryMutAct_9fa48("11514") ? "" : (stryCov_9fa48("11514"), "Cobertura alta")
});
export const COVERAGE_BAND_CLASSES: Record<CoverageBand, string> = stryMutAct_9fa48("11515") ? {} : (stryCov_9fa48("11515"), {
  "no-data": stryMutAct_9fa48("11516") ? "" : (stryCov_9fa48("11516"), "rounded-full border px-2 py-1 text-xs font-semibold whitespace-nowrap bg-[var(--color-surface-subtle)] text-[var(--color-text-secondary)] border-[var(--color-border-strong)]"),
  low: stryMutAct_9fa48("11517") ? "" : (stryCov_9fa48("11517"), "rounded-full border px-2 py-1 text-xs font-semibold whitespace-nowrap bg-[var(--color-danger-fill)] text-[var(--color-danger)] border-[var(--color-danger-line)]"),
  partial: stryMutAct_9fa48("11518") ? "" : (stryCov_9fa48("11518"), "rounded-full border px-2 py-1 text-xs font-semibold whitespace-nowrap bg-[var(--color-warning-fill)] text-[var(--color-warning)] border-[var(--color-warning-line)]"),
  good: stryMutAct_9fa48("11519") ? "" : (stryCov_9fa48("11519"), "rounded-full border px-2 py-1 text-xs font-semibold whitespace-nowrap bg-[var(--color-info-fill)] text-[var(--color-info)] border-[var(--color-info-line)]"),
  high: stryMutAct_9fa48("11520") ? "" : (stryCov_9fa48("11520"), "rounded-full border px-2 py-1 text-xs font-semibold whitespace-nowrap bg-[var(--color-success-fill)] text-[var(--color-success)] border-[var(--color-success-line)]")
});
export const COVERAGE_BAND_PATH_OPTIONS: Record<CoverageBand, {
  color: string;
  fillColor: string;
  fillOpacity: number;
}> = stryMutAct_9fa48("11521") ? {} : (stryCov_9fa48("11521"), {
  "no-data": stryMutAct_9fa48("11522") ? {} : (stryCov_9fa48("11522"), {
    color: stryMutAct_9fa48("11523") ? "" : (stryCov_9fa48("11523"), "var(--color-border-strong)"),
    fillColor: stryMutAct_9fa48("11524") ? "" : (stryCov_9fa48("11524"), "var(--color-surface-subtle)"),
    fillOpacity: 0.45
  }),
  low: stryMutAct_9fa48("11525") ? {} : (stryCov_9fa48("11525"), {
    color: stryMutAct_9fa48("11526") ? "" : (stryCov_9fa48("11526"), "var(--color-danger)"),
    fillColor: stryMutAct_9fa48("11527") ? "" : (stryCov_9fa48("11527"), "var(--color-danger-fill)"),
    fillOpacity: 0.72
  }),
  partial: stryMutAct_9fa48("11528") ? {} : (stryCov_9fa48("11528"), {
    color: stryMutAct_9fa48("11529") ? "" : (stryCov_9fa48("11529"), "var(--color-warning)"),
    fillColor: stryMutAct_9fa48("11530") ? "" : (stryCov_9fa48("11530"), "var(--color-warning-fill)"),
    fillOpacity: 0.72
  }),
  good: stryMutAct_9fa48("11531") ? {} : (stryCov_9fa48("11531"), {
    color: stryMutAct_9fa48("11532") ? "" : (stryCov_9fa48("11532"), "var(--color-info)"),
    fillColor: stryMutAct_9fa48("11533") ? "" : (stryCov_9fa48("11533"), "var(--color-info-fill)"),
    fillOpacity: 0.72
  }),
  high: stryMutAct_9fa48("11534") ? {} : (stryCov_9fa48("11534"), {
    color: stryMutAct_9fa48("11535") ? "" : (stryCov_9fa48("11535"), "var(--color-success)"),
    fillColor: stryMutAct_9fa48("11536") ? "" : (stryCov_9fa48("11536"), "var(--color-success-fill)"),
    fillOpacity: 0.72
  })
});
export type CoverageZoneOverlay = {
  zoneId: string | null;
  zoneCode: string;
  zoneName: string;
  geometry: OperationalZoneGeometry;
  rate: number | null;
  note: string;
  band: CoverageBand;
};
export function coverageBandForRate(rate: number | null): CoverageBand {
  if (stryMutAct_9fa48("11537")) {
    {}
  } else {
    stryCov_9fa48("11537");
    if (stryMutAct_9fa48("11540") ? rate === null && !Number.isFinite(rate) : stryMutAct_9fa48("11539") ? false : stryMutAct_9fa48("11538") ? true : (stryCov_9fa48("11538", "11539", "11540"), (stryMutAct_9fa48("11542") ? rate !== null : stryMutAct_9fa48("11541") ? false : (stryCov_9fa48("11541", "11542"), rate === null)) || (stryMutAct_9fa48("11543") ? Number.isFinite(rate) : (stryCov_9fa48("11543"), !Number.isFinite(rate))))) return stryMutAct_9fa48("11544") ? "" : (stryCov_9fa48("11544"), "no-data");
    if (stryMutAct_9fa48("11548") ? rate >= 60 : stryMutAct_9fa48("11547") ? rate <= 60 : stryMutAct_9fa48("11546") ? false : stryMutAct_9fa48("11545") ? true : (stryCov_9fa48("11545", "11546", "11547", "11548"), rate < 60)) return stryMutAct_9fa48("11549") ? "" : (stryCov_9fa48("11549"), "low");
    if (stryMutAct_9fa48("11553") ? rate >= 80 : stryMutAct_9fa48("11552") ? rate <= 80 : stryMutAct_9fa48("11551") ? false : stryMutAct_9fa48("11550") ? true : (stryCov_9fa48("11550", "11551", "11552", "11553"), rate < 80)) return stryMutAct_9fa48("11554") ? "" : (stryCov_9fa48("11554"), "partial");
    if (stryMutAct_9fa48("11558") ? rate >= 90 : stryMutAct_9fa48("11557") ? rate <= 90 : stryMutAct_9fa48("11556") ? false : stryMutAct_9fa48("11555") ? true : (stryCov_9fa48("11555", "11556", "11557", "11558"), rate < 90)) return stryMutAct_9fa48("11559") ? "" : (stryCov_9fa48("11559"), "good");
    return stryMutAct_9fa48("11560") ? "" : (stryCov_9fa48("11560"), "high");
  }
}
export function buildCoverageZoneOverlays(zones: OperationalZone[], coverage: CoverageIndicator | null): CoverageZoneOverlay[] {
  if (stryMutAct_9fa48("11561")) {
    {}
  } else {
    stryCov_9fa48("11561");
    const zonePoints = stryMutAct_9fa48("11562") ? coverage?.breakdowns.find(breakdown => breakdown.id === "zones")?.points && [] : (stryCov_9fa48("11562"), (stryMutAct_9fa48("11564") ? coverage.breakdowns.find(breakdown => breakdown.id === "zones")?.points : stryMutAct_9fa48("11563") ? coverage?.breakdowns.find(breakdown => breakdown.id === "zones").points : (stryCov_9fa48("11563", "11564"), coverage?.breakdowns.find(stryMutAct_9fa48("11565") ? () => undefined : (stryCov_9fa48("11565"), breakdown => stryMutAct_9fa48("11568") ? breakdown.id !== "zones" : stryMutAct_9fa48("11567") ? false : stryMutAct_9fa48("11566") ? true : (stryCov_9fa48("11566", "11567", "11568"), breakdown.id === (stryMutAct_9fa48("11569") ? "" : (stryCov_9fa48("11569"), "zones")))))?.points)) ?? (stryMutAct_9fa48("11570") ? ["Stryker was here"] : (stryCov_9fa48("11570"), [])));
    const pointByZoneId = new Map(zonePoints.map(stryMutAct_9fa48("11571") ? () => undefined : (stryCov_9fa48("11571"), point => stryMutAct_9fa48("11572") ? [] : (stryCov_9fa48("11572"), [point.id, point]))));
    return zones.map(zone => {
      if (stryMutAct_9fa48("11573")) {
        {}
      } else {
        stryCov_9fa48("11573");
        const zoneId = stryMutAct_9fa48("11574") ? zone.zone?.id && null : (stryCov_9fa48("11574"), (stryMutAct_9fa48("11575") ? zone.zone.id : (stryCov_9fa48("11575"), zone.zone?.id)) ?? null);
        const point = zoneId ? pointByZoneId.get(zoneId) : undefined;
        const rate = stryMutAct_9fa48("11576") ? point?.value && null : (stryCov_9fa48("11576"), (stryMutAct_9fa48("11577") ? point.value : (stryCov_9fa48("11577"), point?.value)) ?? null);
        return stryMutAct_9fa48("11578") ? {} : (stryCov_9fa48("11578"), {
          zoneId,
          zoneCode: zone.code,
          zoneName: zone.name,
          geometry: zone,
          rate,
          note: stryMutAct_9fa48("11579") ? point?.note && "Sin datos para el período" : (stryCov_9fa48("11579"), (stryMutAct_9fa48("11580") ? point.note : (stryCov_9fa48("11580"), point?.note)) ?? (stryMutAct_9fa48("11581") ? "" : (stryCov_9fa48("11581"), "Sin datos para el período"))),
          band: coverageBandForRate(rate)
        });
      }
    });
  }
}