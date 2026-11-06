import { ENVIRONMENTAL_REPORT_TYPE_LABELS, type EnvironmentalReportType } from "./environmental-reports";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (id: string): boolean => UUID.test(id);

/** Short human handle for a record with no business number: `#88ef5782` for a UUID, other ids as they are. */
export function shortId(id: string): string {
  return UUID.test(id) ? `#${id.slice(0, 8)}` : id;
}

/** Public report number or an understandable description when no number exists. */
export function reportLabel(report: { reportType: EnvironmentalReportType; address?: string | null; location?: { address?: string | null } | null; publicId?: string | null }): string {
  return report.publicId || `${ENVIRONMENTAL_REPORT_TYPE_LABELS[report.reportType]} · ${report.address || report.location?.address || "sin dirección"}`;
}

type ReferralLike =
  | { kind: "REPAIR_REQUEST"; request: { damageType: string; address: string | null } }
  | { kind: "STREET_CLOSURE_REQUEST"; request: { affectedSections: Array<{ streetName: string }>; reason: string } };

/** `Reparación · Sumidero obstruido · Av. Rivadavia 4500` / `Corte de calle · Rivadavia`, never the UUID. */
export function referralLabel(referral: ReferralLike, damageLabels: Record<string, string>): string {
  if (referral.kind === "REPAIR_REQUEST") {
    const { damageType, address } = referral.request;
    return `Reparación · ${damageLabels[damageType] ?? damageType} · ${address ?? "sin dirección"}`;
  }
  const street = referral.request.affectedSections[0]?.streetName;
  return `Corte de calle · ${street ?? referral.request.reason}`;
}
