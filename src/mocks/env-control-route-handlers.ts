import { GET as listEnvironmentalReports, POST as createEnvironmentalReport } from "@/app/api/environmental-reports/route";
import { GET as getEnvironmentalReport } from "@/app/api/environmental-reports/[id]/route";
import { POST as closeEnvironmentalReport } from "@/app/api/environmental-reports/[id]/close/route";
import { POST as dismissEnvironmentalReport } from "@/app/api/environmental-reports/[id]/dismiss/route";
import { POST as forwardEnvironmentalReport } from "@/app/api/environmental-reports/[id]/forward/route";
import { POST as startEnvironmentalReportReview } from "@/app/api/environmental-reports/[id]/start-review/route";
import {
  GET as listEnvironmentalInspections,
  POST as scheduleEnvironmentalInspection,
} from "@/app/api/environmental-reports/[id]/inspections/route";
import { GET as getEnvironmentalInspection } from "@/app/api/environmental-inspections/[id]/route";
import { POST as completeEnvironmentalInspection } from "@/app/api/environmental-inspections/[id]/complete/route";
import {
  GET as getViolationNotice,
  POST as issueViolationNotice,
} from "@/app/api/environmental-inspections/[id]/violation-notice/route";
import { GET as getIndicators } from "@/app/api/indicators/[family]/route";
import { GET as listReferrals } from "@/app/api/referrals/route";
import { GET as getReferral } from "@/app/api/referrals/[id]/route";

import { routeHandlers } from "./route-handlers";

const byReportId = { id: "reportId" };
const byInspectionId = { id: "inspectionId" };

/** Office reads and actions run as `officeCookie`; completing an inspection is a Field crew action and runs as `crewCookie`. */
export function envControlRouteHandlers(officeCookie: string, crewCookie: string) {
  return [
    ...routeHandlers(officeCookie, [
      { method: "get", path: "*/api/referrals", route: listReferrals },
      { method: "get", path: "*/api/referrals/:referralId", route: getReferral, params: { id: "referralId" } },
      { method: "get", path: "*/api/indicators/:family", route: getIndicators, params: { family: "family" } },
      { method: "get", path: "*/api/environmental-reports", route: listEnvironmentalReports },
      { method: "get", path: "*/api/environmental-reports/:reportId", route: getEnvironmentalReport, params: byReportId },
      { method: "post", path: "*/api/environmental-reports", route: createEnvironmentalReport },
      { method: "get", path: "*/api/environmental-reports/:reportId/inspections", route: listEnvironmentalInspections, params: byReportId },
      { method: "post", path: "*/api/environmental-reports/:reportId/inspections", route: scheduleEnvironmentalInspection, params: byReportId },
      { method: "post", path: "*/api/environmental-reports/:reportId/start-review", route: startEnvironmentalReportReview, params: byReportId },
      { method: "post", path: "*/api/environmental-reports/:reportId/forward", route: forwardEnvironmentalReport, params: byReportId },
      { method: "post", path: "*/api/environmental-reports/:reportId/dismiss", route: dismissEnvironmentalReport, params: byReportId },
      { method: "post", path: "*/api/environmental-reports/:reportId/close", route: closeEnvironmentalReport, params: byReportId },
      { method: "get", path: "*/api/environmental-inspections/:inspectionId", route: getEnvironmentalInspection, params: byInspectionId },
      { method: "get", path: "*/api/environmental-inspections/:inspectionId/violation-notice", route: getViolationNotice, params: byInspectionId },
      { method: "post", path: "*/api/environmental-inspections/:inspectionId/violation-notice", route: issueViolationNotice, params: byInspectionId },
    ]),
    ...routeHandlers(crewCookie, [
      { method: "post", path: "*/api/environmental-inspections/:inspectionId/complete", route: completeEnvironmentalInspection, params: byInspectionId },
    ]),
  ];
}
