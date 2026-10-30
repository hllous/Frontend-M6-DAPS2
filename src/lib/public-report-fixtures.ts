import type { PublicReport } from "./public-reports";

/** Código de seguimiento de demostración: el que usan el modo mock y el e2e. */
export const PUBLIC_DEMO_TICKET_ID = "550e8400-e29b-41d4-a716-446655440000";

export const publicReportFixtures: readonly PublicReport[] = [
  {
    ticketId: PUBLIC_DEMO_TICKET_ID,
    publicId: "TK-2026-000123",
    reportType: "NOISE",
    stage: "INSPECCIONADA",
    stageLabel: "Un inspector ya visitó el lugar y estamos evaluando lo que encontró.",
    address: "Av. Rivadavia 4500",
    openedAt: "2026-10-01T12:00:00.000Z",
    lastUpdateAt: "2026-10-05T15:30:00.000Z",
    inspectedAt: "2026-10-04",
    closed: false,
  },
  {
    ticketId: "6f1c2d3e-4a5b-4c6d-8e7f-a1b2c3d4e5f6",
    publicId: "TK-2026-000098",
    reportType: "DUMPING",
    stage: "CERRADA",
    stageLabel: "El trámite terminó. No hay más novedades por informar.",
    address: "Calle Sarmiento 1200",
    openedAt: "2026-09-02T12:00:00.000Z",
    lastUpdateAt: "2026-09-20T12:00:00.000Z",
    inspectedAt: "2026-09-10",
    closed: true,
  },
];

export function findPublicReportFixture(ticketId: string): PublicReport | undefined {
  return publicReportFixtures.find((report) => report.ticketId === ticketId.toLowerCase());
}
