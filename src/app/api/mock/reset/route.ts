import { NextResponse } from "next/server";

import { resetContainerFixtures } from "@/lib/containers-fixtures";
import { resetCrewFixtures } from "@/lib/crew-fixtures";
import { resetDisposalSiteFixtures } from "@/lib/disposal-site-fixtures";
import {
  resetEnvironmentalInspectionFixtures,
  resetEnvironmentalReportFixtures,
  resetSanctionOutcomeFixtures,
  resetViolationNoticeFixtures,
} from "@/lib/environmental-report-fixtures";
import { resetGreenPointFixtures } from "@/lib/green-point-fixtures";
import { resetGreenSpaceFixtures } from "@/lib/green-space-fixtures";
import { resetRepairRequestFixtures } from "@/lib/repair-request-fixtures";
import { resetRouteFixtures } from "@/lib/routes-fixtures";
import { resetServiceFrequencyFixtures } from "@/lib/service-frequency-fixtures";
import { resetServiceTypeFixtures } from "@/lib/service-type-fixtures";
import { resetServiceFixtures, resetZoneResultFixtures } from "@/lib/services-fixtures";
import { getAuthMode } from "@/lib/session";
import { getSessionMutationRejection } from "@/lib/session-request";
import { resetStreetClosureRequestFixtures } from "@/lib/street-closure-request-fixtures";
import { resetTreeFixtures } from "@/lib/tree-fixtures";
import { resetTreeInterventionFixtures } from "@/lib/tree-intervention-fixtures";
import { resetTreeSurveyFixtures } from "@/lib/tree-survey-fixtures";
import { resetVehicleFixtures } from "@/lib/vehicles-fixtures";
import { resetZoneFixtures } from "@/lib/zones-fixtures";

/** Every in-memory fixture a mock-mode BFF route can mutate. Add new `reset*Fixtures` here. */
const FIXTURE_RESETS = [
  resetContainerFixtures,
  resetCrewFixtures,
  resetDisposalSiteFixtures,
  resetEnvironmentalReportFixtures,
  resetEnvironmentalInspectionFixtures,
  resetViolationNoticeFixtures,
  resetSanctionOutcomeFixtures,
  resetGreenPointFixtures,
  resetGreenSpaceFixtures,
  resetRepairRequestFixtures,
  resetRouteFixtures,
  resetServiceFrequencyFixtures,
  resetServiceTypeFixtures,
  resetServiceFixtures,
  resetZoneResultFixtures,
  resetStreetClosureRequestFixtures,
  resetTreeFixtures,
  resetTreeInterventionFixtures,
  resetTreeSurveyFixtures,
  resetVehicleFixtures,
  resetZoneFixtures,
];

/**
 * Restores the seeded mock data so a dev server can run e2e specs that change data again
 * without a restart. Exists only for a non-production server in mock mode.
 */
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" || getAuthMode() !== "mock") {
    return NextResponse.json({ message: "No encontrado." }, { status: 404 });
  }

  const rejection = getSessionMutationRejection(request);
  if (rejection) {
    return NextResponse.json({ message: rejection.message }, { status: rejection.status });
  }

  FIXTURE_RESETS.forEach((reset) => reset());
  return NextResponse.json({ reset: FIXTURE_RESETS.length });
}
