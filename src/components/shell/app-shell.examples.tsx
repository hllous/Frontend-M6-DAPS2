import { scenarios } from "@/lib/scenarios";
import { AppShell } from "./app-shell";

export const appShellExamples = {
  officeQueue: <AppShell scenario={scenarios.officeDutyQueue} />,
  fieldLeaderRoute: <AppShell scenario={scenarios.fieldCrewLeader} />,
  fieldMemberRoute: <AppShell scenario={scenarios.fieldCrewMember} />,
  limitedOfficeIntake: <AppShell scenario={scenarios.officeLimited} />,
};
