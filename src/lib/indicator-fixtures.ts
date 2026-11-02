import type { ComplianceWire, CoverageWire, IncidentsWire, WasteWire } from "./indicators";

// Copian la forma real de GET /indicators/* del backend (docs/backend-context/api/endpoints.md).
// Los valores son inventados; la estructura no: si el backend cambia, estas fixtures
// y los schemas de indicators.ts se corrigen juntos.
const period = { from: "2026-08-08", to: "2026-09-06" };

export const coverageIndicatorFixture: CoverageWire = {
  period,
  totals: { scheduled: 472, served: 388, partial: 30, notServiced: 24, pending: 30, upcoming: 14, coveragePct: 82.2 },
  byZone: [
    { id: "zone-1", code: "Z-CEN", name: "Centro", scheduled: 156, served: 140, partial: 6, notServiced: 4, pending: 6, upcoming: 4, lowSample: false, coveragePct: 89.7 },
    { id: "zone-2", code: "Z-COS", name: "Costera", scheduled: 154, served: 126, partial: 12, notServiced: 8, pending: 8, upcoming: 4, lowSample: false, coveragePct: 81.8 },
    { id: "zone-3", code: "Z-NOR", name: "Norte", scheduled: 108, served: 82, partial: 8, notServiced: 10, pending: 8, upcoming: 4, lowSample: false, coveragePct: 75.9 },
    { id: "zone-4", code: "Z-OES", name: "Oeste", scheduled: 54, served: 40, partial: 4, notServiced: 2, pending: 8, upcoming: 2, lowSample: false, coveragePct: 74.1 },
  ],
  targets: { coveragePct: { direction: "min", value: 95 } },
  series: [{ from: "2026-08-08", to: "2026-09-06", scheduled: 472, served: 388, partial: 30, notServiced: 24, pending: 30, upcoming: 14, coveragePct: 82.2 }],
  previous: { period: { from: "2026-07-09", to: "2026-08-07" }, totals: { scheduled: 400, served: 320, partial: 30, notServiced: 20, pending: 30, upcoming: 0, coveragePct: 80 } },
  delta: { coveragePct: 2.2 },
  byServiceType: [
    { id: "st-waste-route", code: "REC-DOM", name: "Recolección domiciliaria", scheduled: 198, served: 176, partial: 10, notServiced: 6, pending: 6, upcoming: 5, lowSample: false, coveragePct: 88.9 },
    { id: "st-cleaning-route", code: "BAR-CAL", name: "Barrido de calles", scheduled: 168, served: 132, partial: 12, notServiced: 12, pending: 12, upcoming: 4, lowSample: false, coveragePct: 78.6 },
    { id: "st-green-point", code: "ESP-VER", name: "Mantenimiento de espacios verdes", scheduled: 104, served: 78, partial: 8, notServiced: 6, pending: 12, upcoming: 4, lowSample: false, coveragePct: 75 },
    { id: "st-small", code: "ESP-PUN", name: "Intervención puntual", scheduled: 2, served: 2, partial: 0, notServiced: 0, pending: 0, upcoming: 1, lowSample: true, coveragePct: 100 },
  ],
};

export const complianceIndicatorFixture: ComplianceWire = {
  period,
  finished: { total: 390, onTime: 344, late: 46, onTimePct: 88.2 },
  schedulingDeviation: { total: 400, deviated: 35, deviatedPct: 8.8 },
  targets: { compliancePct: { value: 90, direction: "min" }, schedulingDeviationPct: { value: 10, direction: "max" } },
  series: [{ from: period.from, to: period.to, finished: { total: 390, onTime: 344, late: 46, onTimePct: 88.2 }, schedulingDeviation: { total: 400, deviated: 35, deviatedPct: 8.8 } }],
  previous: { period, totals: { finished: { total: 300, onTime: 260, late: 40, onTimePct: 86.7 }, schedulingDeviation: { total: 310, deviated: 30, deviatedPct: 9.7 } } },
  delta: { onTimePct: 1.5, deviatedPct: -0.9 },
  notServicedRanking: [
    { zoneId: "zone-3", code: "Z-NOR", name: "Norte", count: 12, reasons: [{ reason: "CREW_UNAVAILABLE", count: 7 }, { reason: "WEATHER", count: 5 }] },
    { zoneId: "zone-2", code: "Z-COS", name: "Costera", count: 8, reasons: [{ reason: "VEHICLE_BREAKDOWN", count: 5 }, { reason: "BLOCKED_ACCESS", count: 3 }] },
    { zoneId: "zone-1", code: "Z-CEN", name: "Centro", count: 4, reasons: [{ reason: "STREET_CLOSURE", count: 4 }] },
  ],
};

export const incidentsIndicatorFixture: IncidentsWire = {
  period,
  targets: { resolutionBusinessDays: { value: 5, direction: "max" }, reportsWithinDeadlinePct: { value: 85, direction: "min" }, reportsOverduePct: { value: 10, direction: "max" }, overflowTrend: { value: null, direction: "down" }, pendingDamageTrend: { value: null, direction: "down" } },
  containers: {
    history: { overflowIncidents: 7, damageIncidents: 4, pendingDamage: null, trackingSince: "2026-10-30T15:00:00.000Z" },
    byStatus: [
      { status: "ACTIVE", count: 142 },
      { status: "OVERFLOWED", count: 14 },
      { status: "DAMAGED", count: 7 },
      { status: "UNDER_REPAIR", count: 4 },
      { status: "RELOCATING", count: 2 },
      { status: "REMOVED", count: 3 },
    ],
    byZone: [
      { zoneId: "zone-1", code: "Z-CEN", name: "Centro", overflowed: 6, damaged: 2, total: 68 },
      { zoneId: "zone-2", code: "Z-COS", name: "Costera", overflowed: 3, damaged: 4, total: 54 },
      { zoneId: "zone-3", code: "Z-NOR", name: "Norte", overflowed: 5, damaged: 1, total: 50 },
    ],
  },
  series: [{ from: period.from, to: period.to, total: 32, avgResolutionDays: 2.4, avgResolutionBusinessDays: 1.8, withinDeadline: { resolved: 18, withinDeadline: 16, pct: 88.9 }, containers: { overflowIncidents: 7, damageIncidents: 4, pendingDamage: null } }],
  previous: { period, totals: { total: 25, avgResolutionDays: 3, avgResolutionBusinessDays: 2, withinDeadline: { resolved: 12, withinDeadline: 10, pct: 83.3 }, containers: { overflowIncidents: 9, damageIncidents: 3, pendingDamage: null } } },
  delta: { avgResolutionDays: -0.6, avgResolutionBusinessDays: -0.2, withinDeadlinePct: 5.6, overflowIncidents: -2, pendingDamage: null },
  trees: {
    byRiskLevel: [
      { riskLevel: "LOW", count: 84 },
      { riskLevel: "CRITICAL", count: 3 },
      { riskLevel: "MEDIUM", count: 31 },
      { riskLevel: "HIGH", count: 9 },
      { riskLevel: "NONE", count: 120 },
    ],
  },
  reports: {
    total: 32,
    byType: [
      { reportType: "ILLEGAL_DUMPSITE", count: 14 },
      { reportType: "NOISE", count: 7 },
      { reportType: "ODOR", count: 6 },
      { reportType: "AIR_EMISSION", count: 5 },
    ],
    byStatus: [
      { status: "RECEIVED", count: 8 },
      { status: "UNDER_REVIEW", count: 6 },
      { status: "CLOSED", count: 18 },
    ],
    avgResolutionDays: 2.4,
    avgResolutionBusinessDays: 1.8, deadlineBusinessDays: 5,
    withinDeadline: { resolved: 18, withinDeadline: 16, pct: 88.9 },
    overdue: { open: 14, overdue: 2, pct: 14.3 },
  },
};

export const wasteIndicatorFixture: WasteWire = {
  period,
  totals: { weightKg: 24860, volumeM3: 176.4, divertedKg: 10620, divertedPct: 42.7 },
  targets: { landfillDiversionPct: null },
  series: [{ from: period.from, to: period.to, weightKg: 24860, volumeM3: 176.4, divertedKg: 10620, divertedPct: 42.7 }],
  previous: { period, totals: { weightKg: 20000, volumeM3: 150, divertedKg: 8000, divertedPct: 40 } },
  delta: { divertedPct: 2.7 },
  byWasteType: [
    { wasteType: "HOUSEHOLD", weightKg: 9300, volumeM3: 59.4 },
    { wasteType: "RECYCLABLE", weightKg: 8840, volumeM3: 62.8 },
    { wasteType: "GREEN", weightKg: 6720, volumeM3: 54.2 },
  ],
  byDisposalSite: [
    { disposalSiteId: "site-recovery", code: "DS-REC", name: "Centro de recuperación", siteType: "RECYCLING_PLANT", weightKg: 10620, volumeM3: 72.4 },
    { disposalSiteId: "site-compost", code: "DS-COM", name: "Compostaje municipal", siteType: "COMPOSTING", weightKg: 3930, volumeM3: 31.1 },
    { disposalSiteId: "site-landfill", code: "DS-REL", name: "Relleno sanitario", siteType: "LANDFILL", weightKg: 10310, volumeM3: 72.9 },
  ],
  records: 148,
};

// Variantes de `series` para la tendencia de cobertura (#780). Las fixtures base no cambian.
export const coverageWeeklySeries: NonNullable<CoverageWire["series"]> = [
  { from: "2026-08-03", to: "2026-08-09", scheduled: 100, served: 90, partial: 4, notServiced: 2, pending: 4, upcoming: 0, coveragePct: 90 },
  { from: "2026-08-10", to: "2026-08-16", scheduled: 120, served: 110, partial: 4, notServiced: 2, pending: 4, upcoming: 0, coveragePct: 91.7 },
  { from: "2026-08-17", to: "2026-08-23", scheduled: 0, served: 0, partial: 0, notServiced: 0, pending: 0, upcoming: 6, coveragePct: 0 },
  { from: "2026-08-24", to: "2026-08-30", scheduled: 80, served: 78, partial: 1, notServiced: 0, pending: 1, upcoming: 3, coveragePct: 97.5 },
];

export const coverageMonthlySeries: NonNullable<CoverageWire["series"]> = [
  { from: "2026-07-15", to: "2026-07-31", scheduled: 50, served: 40, partial: 5, notServiced: 2, pending: 3, upcoming: 0, coveragePct: 80 },
  { from: "2026-08-01", to: "2026-08-31", scheduled: 200, served: 190, partial: 4, notServiced: 2, pending: 4, upcoming: 0, coveragePct: 95 },
];

export const coverageWeeklyFixture: CoverageWire = { ...coverageIndicatorFixture, series: coverageWeeklySeries };
export const coverageMonthlyFixture: CoverageWire = { ...coverageIndicatorFixture, series: coverageMonthlySeries };
export const coverageWithoutSeriesFixture: CoverageWire = (({ series, ...rest }) => (void series, rest))(coverageIndicatorFixture);
