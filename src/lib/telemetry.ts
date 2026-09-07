// Closed event/field set (ADR-0006): no call site can attach a JWT, PII, an address, form content, Evidence, or a user identifier.
export type TelemetryEvent =
  | { name: "auth_session_expired"; status: 401 }
  | { name: "auth_forbidden"; status: 403 }
  | { name: "auth_logout_broadcast" }
  | { name: "request_malformed_response"; resource: "zones" | "routes" | "scenario" | "services" | "service-frequencies" | "vehicles" | "crews" | "green-spaces" | "green-points" | "trees" | "containers" | "street-closure-requests" | "repair-requests" }
  | { name: "request_network_failure"; resource: "zones" | "routes" | "scenario" | "services" | "service-frequencies" | "vehicles" | "crews" | "green-spaces" | "green-points" | "trees" | "containers" | "street-closure-requests" | "repair-requests" };

const ALLOWED_FIELDS = new Set(["name", "status", "resource"]);

export function recordTelemetryEvent(event: TelemetryEvent): void {
  const safeEvent = Object.fromEntries(
    Object.entries(event).filter(([field]) => ALLOWED_FIELDS.has(field)),
  );
  // No observability pipeline destination exists yet (#15); this is the one emission point every call site goes through.
  console.info("[m6-telemetry]", safeEvent);
}
