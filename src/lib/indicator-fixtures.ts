import type { ComplianceWire, CoverageWire, IncidentsWire, WasteWire } from "./indicators";

// Copian la forma real de GET /indicators/* del backend (docs/backend-context/api/endpoints.md).
// Los valores son inventados; la estructura no: si el backend cambia, estas fixtures
// y los schemas de indicators.ts se corrigen juntos.
const period = { from: "2026-08-08", to: "2026-09-06" };

export const coverageIndicatorFixture: CoverageWire = {
  period,
  totals: { scheduled: 472, served: 388, partial: 30, notServiced: 24, pending: 30, coveragePct: 82.2 },
  byZone: [
    { id: "zone-1", code: "Z-CEN", name: "Centro", scheduled: 156, served: 140, partial: 6, notServiced: 4, pending: 6, coveragePct: 89.7 },
    { id: "zone-2", code: "Z-COS", name: "Costera", scheduled: 154, served: 126, partial: 12, notServiced: 8, pending: 8, coveragePct: 81.8 },
    { id: "zone-3", code: "Z-NOR", name: "Norte", scheduled: 108, served: 82, partial: 8, notServiced: 10, pending: 8, coveragePct: 75.9 },
  ],
  byServiceType: [
    { id: "service-collection", code: "REC-DOM", name: "Recolección domiciliaria", scheduled: 198, served: 176, partial: 10, notServiced: 6, pending: 6, coveragePct: 88.9 },
    { id: "service-sweeping", code: "BAR-CAL", name: "Barrido de calles", scheduled: 168, served: 132, partial: 12, notServiced: 12, pending: 12, coveragePct: 78.6 },
    { id: "service-green", code: "ESP-VER", name: "Mantenimiento de espacios verdes", scheduled: 106, served: 80, partial: 8, notServiced: 6, pending: 12, coveragePct: 75.5 },
  ],
};

export const complianceIndicatorFixture: ComplianceWire = {
  period,
  finished: { total: 390, onTime: 344, late: 46, onTimePct: 88.2 },
  notServicedRanking: [
    { zoneId: "zone-3", code: "Z-NOR", name: "Norte", count: 12, reasons: [{ reason: "CREW_UNAVAILABLE", count: 7 }, { reason: "WEATHER", count: 5 }] },
    { zoneId: "zone-2", code: "Z-COS", name: "Costera", count: 8, reasons: [{ reason: "VEHICLE_BREAKDOWN", count: 5 }, { reason: "BLOCKED_ACCESS", count: 3 }] },
    { zoneId: "zone-1", code: "Z-CEN", name: "Centro", count: 4, reasons: [{ reason: "STREET_CLOSURE", count: 4 }] },
  ],
};

export const incidentsIndicatorFixture: IncidentsWire = {
  period,
  containers: {
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
  },
};

export const wasteIndicatorFixture: WasteWire = {
  period,
  totals: { weightKg: 24860, volumeM3: 176.4, divertedKg: 10620, divertedPct: 42.7 },
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
