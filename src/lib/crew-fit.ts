import type { Crew } from "./crews";

// Backend: src/modules/crews/crew-specialty.ts (SERVICE_TYPE_SPECIALTY).
const specialties: Record<string, Crew["specialty"]> = {
  "REC-DOM": "COLLECTION", "REC-VOL": "COLLECTION", "CONT-VAC": "COLLECTION",
  "REC-REC": "RECYCLING", "BAR-MEC": "SWEEPING", "BAR-MAN": "SWEEPING",
  "HIG-LAV": "CLEANING", "CONT-LAV": "CLEANING", "ARB-POD": "TREES",
  "ARB-CENSO": "TREES", "EV-RIEGO": "GREEN_SPACES", "EV-MANT": "GREEN_SPACES",
  "AMB-INSP": "INSPECTION",
};

export function crewFit(crew: Crew | undefined, zones: string[], code?: string) {
  return {
    zone: Boolean(crew?.effectiveZoneId && zones.length && !zones.includes(crew.effectiveZoneId)),
    specialty: Boolean(crew?.specialty && code && specialties[code] && crew.specialty !== specialties[code]),
  };
}

export function crewsInZoneFirst(crews: Crew[], zones: string[]) {
  return [...crews].sort((a, b) => Number(Boolean(b.effectiveZoneId && zones.includes(b.effectiveZoneId))) - Number(Boolean(a.effectiveZoneId && zones.includes(a.effectiveZoneId))));
}
