import { environmentalReportFixtures } from "@/lib/environmental-report-fixtures";
import { reportLabel } from "@/lib/display-ids";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Accessible-name matcher of a fixture report's queue row (its `publicId`, else its id). */
export function reportRowName(id: string): RegExp {
  const report = environmentalReportFixtures.find((candidate) => candidate.id === id);
  if (!report) throw new Error(`Unknown report fixture ${id}`);
  return new RegExp(escapeRegExp(reportLabel(report)));
}
