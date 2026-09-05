"use client";

import { scenarios } from "@/lib/scenarios";
import { AppShell } from "./app-shell";
import { ShellError, ShellForbidden, ShellLoading, ShellUnauthenticated } from "./shell-states";

/**
 * Stable, reviewable examples of the shell's approved tokens, navigation, and shared
 * state primitives. Rendered on `/prototype/shell-examples` for visual review and
 * exercised by `app-shell.examples.test.tsx` and the Playwright accessibility suite
 * so this catalog can't silently drift from the real components.
 */
export const appShellExamples = {
  officeQueue: <AppShell scenario={scenarios.officeDutyQueue} />,
  fieldLeaderRoute: <AppShell scenario={scenarios.fieldCrewLeader} />,
  fieldMemberRoute: <AppShell scenario={scenarios.fieldCrewMember} />,
  limitedOfficeIntake: <AppShell scenario={scenarios.officeLimited} />,
};

export const shellStateExamples = {
  loading: <ShellLoading />,
  unauthenticated: <ShellUnauthenticated />,
  forbidden: <ShellForbidden />,
  error: <ShellError onRetry={() => undefined} />,
};
