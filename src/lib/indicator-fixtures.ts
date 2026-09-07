import type { ComplianceWire, CoverageWire, IncidentsWire, WasteWire } from "./indicators";

const freshness = { updatedAt: "2026-09-06T09:30:00.000Z" };

export const coverageIndicatorFixture: CoverageWire = {
  period: { from: "2026-08-08", to: "2026-09-06" },
  freshness,
  summary: { attended: 418, scheduled: 472, rate: 88.6 },
  byZone: [
    { id: "zone-1", label: "Centro", attended: 146, scheduled: 156, rate: 93.6 },
    { id: "zone-2", label: "Costera", attended: 132, scheduled: 154, rate: 85.7 },
    { id: "zone-3", label: "Norte", attended: 89, scheduled: 108, rate: 82.4 },
  ],
  byServiceType: [
    { id: "service-collection", label: "Recolección", attended: 182, scheduled: 198, rate: 91.9 },
    { id: "service-sweeping", label: "Barrido", attended: 144, scheduled: 168, rate: 85.7 },
    { id: "service-green", label: "Espacios verdes", attended: 92, scheduled: 106, rate: 86.8 },
  ],
};

export const complianceIndicatorFixture: ComplianceWire = {
  period: coverageIndicatorFixture.period,
  freshness,
  summary: { completed: 390, onTime: 344, delayed: 46, onTimeRate: 88.2 },
  unattendedZones: [
    { id: "zone-3", label: "Norte", unattended: 12, reason: "Falta de cuadrilla" },
    { id: "zone-2", label: "Costera", unattended: 8, reason: "Vehículo fuera de servicio" },
    { id: "zone-1", label: "Centro", unattended: 4, reason: "Reprogramación por lluvia" },
  ],
};

export const incidentsIndicatorFixture: IncidentsWire = {
  period: coverageIndicatorFixture.period,
  freshness,
  containers: {
    byZone: [
      { id: "zone-1", label: "Centro", overflow: 6, damage: 2 },
      { id: "zone-2", label: "Costera", overflow: 3, damage: 4 },
      { id: "zone-3", label: "Norte", overflow: 5, damage: 1 },
    ],
  },
  treeRisk: { byLevel: [{ id: "high", label: "Alto", count: 9 }, { id: "medium", label: "Medio", count: 31 }, { id: "low", label: "Bajo", count: 84 }] },
  reports: {
    byType: [{ id: "overflow", label: "Desborde", count: 14 }, { id: "damage", label: "Daño", count: 7 }, { id: "pruning", label: "Poda", count: 11 }],
    byStatus: [{ id: "open", label: "Abiertos", count: 8 }, { id: "progress", label: "En curso", count: 6 }, { id: "closed", label: "Cerrados", count: 18 }],
    meanResolutionHours: 21.5,
  },
};

export const wasteIndicatorFixture: WasteWire = {
  period: coverageIndicatorFixture.period,
  freshness,
  summary: { kilograms: 24860, cubicMeters: 176.4, divertedRate: 42.7 },
  byType: [
    { id: "recyclable", label: "Reciclables", kilograms: 8840, cubicMeters: 62.8 },
    { id: "green", label: "Verdes", kilograms: 6720, cubicMeters: 54.2 },
    { id: "household", label: "Domiciliarios", kilograms: 9300, cubicMeters: 59.4 },
  ],
  byDestination: [
    { id: "recovery", label: "Centro de recuperación", kilograms: 10620, cubicMeters: 72.4 },
    { id: "compost", label: "Compostaje municipal", kilograms: 3930, cubicMeters: 31.1 },
    { id: "landfill", label: "Relleno sanitario", kilograms: 10310, cubicMeters: 72.9 },
  ],
};
