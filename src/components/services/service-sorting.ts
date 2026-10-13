import type { Service } from "@/lib/services";
import { STATUS_ORDER } from "@/lib/services";

export type SortKey = "service" | "zone" | "status" | "crew" | "scheduled";
export type SortDir = "asc" | "desc";

function compareServices(a: Service, b: Service, key: SortKey): number {
  switch (key) {
    case "status":
      return STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
    case "service":
      return a.title.localeCompare(b.title);
    case "zone":
      return (a.zoneNames[0] ?? "").localeCompare(b.zoneNames[0] ?? "");
    case "crew":
      return (a.crewName ?? "zzz").localeCompare(b.crewName ?? "zzz");
    case "scheduled": {
      const aTime = `${a.scheduledDate} ${a.windowFrom ?? ""}`;
      const bTime = `${b.scheduledDate} ${b.windowFrom ?? ""}`;
      return aTime.localeCompare(bTime);
    }
  }
}

export function sortServices(services: Service[], key: SortKey, direction: SortDir): Service[] {
  return [...services].sort((a, b) => {
    const comparison = compareServices(a, b, key);
    return direction === "asc" ? comparison : -comparison;
  });
}
