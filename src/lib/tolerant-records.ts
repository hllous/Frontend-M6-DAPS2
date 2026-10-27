import { z } from "zod";

import { recordTelemetryEvent, type TelemetryEvent } from "./telemetry";

type Resource = Extract<TelemetryEvent, { name: "request_malformed_response" }>["resource"];

const droppedByPage = new WeakMap<object, number>();

/** How many records of THIS page `tolerantRecords` dropped (0 for any other array). Not derived from `meta.total`, which also differs when merely paginating. */
export function droppedRecords(records: readonly unknown[]): number {
  return droppedByPage.get(records) ?? 0;
}

/**
 * `z.array(record)` for backend list envelopes. The backend adds closed-enum members often (e.g.
 * `EXPIRED`), and with a plain array one unknown value fails the whole page. Here each record is
 * validated on its own: one whose only problem is an unknown enum value is dropped, logged and counted in telemetry, the rest are
 * shown. A malformed record (missing field, wrong type), a payload that is not an array or an envelope without `meta` still fails, and detail and
 * mutation responses stay strict. See "Closed backend enums" in CONTRACTS.md.
 */
export function tolerantRecords<T extends z.ZodType>(recordSchema: T, resource: Resource) {
  return z.array(z.unknown()).transform((records, ctx): z.output<T>[] => {
    const valid: z.output<T>[] = [];
    let dropped = 0;
    for (const record of records) {
      const parsed = recordSchema.safeParse(record);
      if (parsed.success) {
        valid.push(parsed.data);
        continue;
      }
      // Only an unknown enum member is tolerated; a missing field or a wrong type is a real contract break.
      if (parsed.error.issues.some((issue) => issue.code !== "invalid_value")) {
        ctx.issues.push({ code: "custom", message: `Registro ${resource} malformado`, input: record });
        return z.NEVER;
      }
      dropped += 1;
      recordTelemetryEvent({ name: "request_malformed_response", resource });
      const { id, status } = (typeof record === "object" && record ? record : {}) as { id?: unknown; status?: unknown };
      console.warn(`Registro ${resource} ${String(id ?? "?")} descartado: no respeta el contrato (status: ${String(status ?? "?")}).`);
    }
    droppedByPage.set(valid, dropped);
    return valid;
  });
}
