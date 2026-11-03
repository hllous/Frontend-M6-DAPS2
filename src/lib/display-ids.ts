const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (id: string): boolean => UUID.test(id);

/** Short human handle for a record with no business number: `#88ef5782` for a UUID, other ids as they are. */
export function shortId(id: string): string {
  return UUID.test(id) ? `#${id.slice(0, 8)}` : id;
}

/** What operators call a report: its `publicId` (`TK-2026-000123`), else a short handle. Never the full UUID. */
export function reportLabel(report: { id: string; publicId?: string | null }): string {
  return report.publicId || shortId(report.id);
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
