// @ts-nocheck
function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import { z } from "zod";
import { authenticatedFetch } from "./authenticated-fetch";
import { environmentalInspectionFixtures, environmentalReportFixtures } from "./environmental-report-fixtures";
import type { RepairRequest } from "./repair-requests";
import { serviceFixtures } from "./services-fixtures";
import type { OperationalScenario } from "./scenarios";
import { affectedSectionSchema, streetClosureRequestSourceTypeSchema, type StreetClosureRequest } from "./street-closure-requests";
export type Referral = {
  kind: "REPAIR_REQUEST";
  destination: "M3";
  id: string;
  sourceType: "SERVICE";
  sourceId: string;
  sourceServiceId: string;
  sourceLabel: string;
  sourceHref: string;
  status: RepairRequest["status"];
  createdAt: string;
  updatedAt: string;
  request: RepairRequest;
} | {
  kind: "STREET_CLOSURE_REQUEST";
  destination: "M7";
  id: string;
  sourceType: StreetClosureRequest["sourceType"];
  sourceId: string;
  sourceServiceId?: string;
  sourceTreeInterventionId?: string;
  sourceLabel: string;
  sourceHref: string;
  status: StreetClosureRequest["status"];
  createdAt: string;
  updatedAt: string;
  request: StreetClosureRequest;
};
export type ReferralsPage = {
  referrals: Referral[];
  total: number;
  /** Records the BFF dropped because they did not match the contract. */
  invalid: number;
};
const referralSourceSchema = z.object(stryMutAct_9fa48("12852") ? {} : (stryCov_9fa48("12852"), {
  id: z.string(),
  label: z.string(),
  href: z.string()
}));
const referralSchema = z.discriminatedUnion(stryMutAct_9fa48("12853") ? "" : (stryCov_9fa48("12853"), "kind"), stryMutAct_9fa48("12854") ? [] : (stryCov_9fa48("12854"), [z.object(stryMutAct_9fa48("12855") ? {} : (stryCov_9fa48("12855"), {
  kind: z.literal(stryMutAct_9fa48("12856") ? "" : (stryCov_9fa48("12856"), "REPAIR_REQUEST")),
  destination: z.literal(stryMutAct_9fa48("12857") ? "" : (stryCov_9fa48("12857"), "M3")),
  id: z.string(),
  sourceType: z.literal(stryMutAct_9fa48("12858") ? "" : (stryCov_9fa48("12858"), "SERVICE")),
  sourceId: z.string(),
  sourceServiceId: z.string(),
  sourceLabel: z.string(),
  sourceHref: z.string(),
  status: z.enum(stryMutAct_9fa48("12859") ? [] : (stryCov_9fa48("12859"), [stryMutAct_9fa48("12860") ? "" : (stryCov_9fa48("12860"), "REQUESTED"), stryMutAct_9fa48("12861") ? "" : (stryCov_9fa48("12861"), "IN_PROGRESS"), stryMutAct_9fa48("12862") ? "" : (stryCov_9fa48("12862"), "CLOSED")])),
  createdAt: z.string(),
  updatedAt: z.string(),
  request: z.object(stryMutAct_9fa48("12863") ? {} : (stryCov_9fa48("12863"), {
    id: z.string(),
    damageType: z.string(),
    address: z.string().nullable(),
    severity: z.string(),
    publicSafetyRisk: z.boolean(),
    detectedInType: z.string(),
    detectedInId: z.string(),
    status: z.enum(stryMutAct_9fa48("12864") ? [] : (stryCov_9fa48("12864"), [stryMutAct_9fa48("12865") ? "" : (stryCov_9fa48("12865"), "REQUESTED"), stryMutAct_9fa48("12866") ? "" : (stryCov_9fa48("12866"), "IN_PROGRESS"), stryMutAct_9fa48("12867") ? "" : (stryCov_9fa48("12867"), "CLOSED")])),
    workOrderId: z.string().nullable().optional(),
    requestedAt: z.string()
  })).passthrough()
})), z.object(stryMutAct_9fa48("12868") ? {} : (stryCov_9fa48("12868"), {
  kind: z.literal(stryMutAct_9fa48("12869") ? "" : (stryCov_9fa48("12869"), "STREET_CLOSURE_REQUEST")),
  destination: z.literal(stryMutAct_9fa48("12870") ? "" : (stryCov_9fa48("12870"), "M7")),
  id: z.string(),
  sourceType: streetClosureRequestSourceTypeSchema,
  sourceId: z.string(),
  sourceServiceId: z.string().optional(),
  sourceTreeInterventionId: z.string().optional(),
  sourceLabel: z.string(),
  sourceHref: z.string(),
  status: z.enum(stryMutAct_9fa48("12871") ? [] : (stryCov_9fa48("12871"), [stryMutAct_9fa48("12872") ? "" : (stryCov_9fa48("12872"), "REQUESTED"), stryMutAct_9fa48("12873") ? "" : (stryCov_9fa48("12873"), "APPROVED"), stryMutAct_9fa48("12874") ? "" : (stryCov_9fa48("12874"), "REJECTED"), stryMutAct_9fa48("12875") ? "" : (stryCov_9fa48("12875"), "ENDED"), stryMutAct_9fa48("12876") ? "" : (stryCov_9fa48("12876"), "EXPIRED")])),
  createdAt: z.string(),
  updatedAt: z.string(),
  request: z.object(stryMutAct_9fa48("12877") ? {} : (stryCov_9fa48("12877"), {
    id: z.string(),
    reason: z.string(),
    sourceType: streetClosureRequestSourceTypeSchema,
    sourceId: z.string(),
    sourceModule: z.literal(stryMutAct_9fa48("12878") ? "" : (stryCov_9fa48("12878"), "M6")),
    closureType: z.enum(stryMutAct_9fa48("12879") ? [] : (stryCov_9fa48("12879"), [stryMutAct_9fa48("12880") ? "" : (stryCov_9fa48("12880"), "TOTAL"), stryMutAct_9fa48("12881") ? "" : (stryCov_9fa48("12881"), "PARTIAL")])).nullable(),
    requestedFrom: z.string().nullable(),
    requestedTo: z.string().nullable(),
    affectedSections: z.array(affectedSectionSchema),
    status: z.enum(stryMutAct_9fa48("12882") ? [] : (stryCov_9fa48("12882"), [stryMutAct_9fa48("12883") ? "" : (stryCov_9fa48("12883"), "REQUESTED"), stryMutAct_9fa48("12884") ? "" : (stryCov_9fa48("12884"), "APPROVED"), stryMutAct_9fa48("12885") ? "" : (stryCov_9fa48("12885"), "REJECTED"), stryMutAct_9fa48("12886") ? "" : (stryCov_9fa48("12886"), "ENDED"), stryMutAct_9fa48("12887") ? "" : (stryCov_9fa48("12887"), "EXPIRED")])),
    closureId: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string()
  })).passthrough()
}))]));
const referralsPageSchema = z.object(stryMutAct_9fa48("12888") ? {} : (stryCov_9fa48("12888"), {
  data: z.array(referralSchema),
  meta: z.object(stryMutAct_9fa48("12889") ? {} : (stryCov_9fa48("12889"), {
    total: z.number(),
    invalid: z.number().int().nonnegative().optional()
  }))
}));
export function getReferralSourceServiceIds(scenario: OperationalScenario): string[] | undefined {
  if (stryMutAct_9fa48("12890")) {
    {}
  } else {
    stryCov_9fa48("12890");
    if (stryMutAct_9fa48("12893") ? scenario.actor.kind !== "OFFICE" : stryMutAct_9fa48("12892") ? false : stryMutAct_9fa48("12891") ? true : (stryCov_9fa48("12891", "12892", "12893"), scenario.actor.kind === (stryMutAct_9fa48("12894") ? "" : (stryCov_9fa48("12894"), "OFFICE")))) return undefined;
    const serviceIds = stryMutAct_9fa48("12895") ? serviceFixtures.map(service => service.id) : (stryCov_9fa48("12895"), serviceFixtures.filter(stryMutAct_9fa48("12896") ? () => undefined : (stryCov_9fa48("12896"), service => stryMutAct_9fa48("12899") ? service.crewId !== scenario.actor.crewId : stryMutAct_9fa48("12898") ? false : stryMutAct_9fa48("12897") ? true : (stryCov_9fa48("12897", "12898", "12899"), service.crewId === scenario.actor.crewId))).map(stryMutAct_9fa48("12900") ? () => undefined : (stryCov_9fa48("12900"), service => service.id)));
    // ── Issue #137: EnvironmentalInspection referral visibility ──
    const inspectionIds = stryMutAct_9fa48("12901") ? environmentalInspectionFixtures.map(inspection => inspection.id) : (stryCov_9fa48("12901"), environmentalInspectionFixtures.filter(stryMutAct_9fa48("12902") ? () => undefined : (stryCov_9fa48("12902"), inspection => stryMutAct_9fa48("12905") ? inspection.serviceId || serviceIds.includes(inspection.serviceId) : stryMutAct_9fa48("12904") ? false : stryMutAct_9fa48("12903") ? true : (stryCov_9fa48("12903", "12904", "12905"), inspection.serviceId && serviceIds.includes(inspection.serviceId)))).map(stryMutAct_9fa48("12906") ? () => undefined : (stryCov_9fa48("12906"), inspection => inspection.id)));
    // ── End issue #137 ──
    return stryMutAct_9fa48("12907") ? [] : (stryCov_9fa48("12907"), [...serviceIds, ...inspectionIds]);
  }
}
export function isReferralVisibleToScenario(referral: Referral | {
  sourceServiceId: string;
}, scenario: OperationalScenario): boolean {
  if (stryMutAct_9fa48("12908")) {
    {}
  } else {
    stryCov_9fa48("12908");
    const serviceIds = getReferralSourceServiceIds(scenario);
    if (stryMutAct_9fa48("12911") ? serviceIds !== undefined : stryMutAct_9fa48("12910") ? false : stryMutAct_9fa48("12909") ? true : (stryCov_9fa48("12909", "12910", "12911"), serviceIds === undefined)) return stryMutAct_9fa48("12912") ? false : (stryCov_9fa48("12912"), true);
    if (stryMutAct_9fa48("12915") ? "sourceType" in referral || referral.sourceType === "TREE_INTERVENTION" : stryMutAct_9fa48("12914") ? false : stryMutAct_9fa48("12913") ? true : (stryCov_9fa48("12913", "12914", "12915"), (stryMutAct_9fa48("12916") ? "" : (stryCov_9fa48("12916"), "sourceType")) in referral && (stryMutAct_9fa48("12918") ? referral.sourceType !== "TREE_INTERVENTION" : stryMutAct_9fa48("12917") ? true : (stryCov_9fa48("12917", "12918"), referral.sourceType === (stryMutAct_9fa48("12919") ? "" : (stryCov_9fa48("12919"), "TREE_INTERVENTION")))))) return stryMutAct_9fa48("12920") ? true : (stryCov_9fa48("12920"), false);
    if (stryMutAct_9fa48("12923") ? "sourceTreeInterventionId" in referral || referral.sourceTreeInterventionId : stryMutAct_9fa48("12922") ? false : stryMutAct_9fa48("12921") ? true : (stryCov_9fa48("12921", "12922", "12923"), (stryMutAct_9fa48("12924") ? "" : (stryCov_9fa48("12924"), "sourceTreeInterventionId")) in referral && referral.sourceTreeInterventionId)) return stryMutAct_9fa48("12925") ? true : (stryCov_9fa48("12925"), false);
    const sourceServiceId = referral.sourceServiceId;
    return Boolean(stryMutAct_9fa48("12928") ? sourceServiceId || serviceIds.includes(sourceServiceId) : stryMutAct_9fa48("12927") ? false : stryMutAct_9fa48("12926") ? true : (stryCov_9fa48("12926", "12927", "12928"), sourceServiceId && serviceIds.includes(sourceServiceId)));
  }
}
export function isReferralVisibleToBackendSources(referral: Referral, sourceIds: ReadonlySet<string> | undefined): boolean {
  if (stryMutAct_9fa48("12929")) {
    {}
  } else {
    stryCov_9fa48("12929");
    if (stryMutAct_9fa48("12932") ? sourceIds !== undefined : stryMutAct_9fa48("12931") ? false : stryMutAct_9fa48("12930") ? true : (stryCov_9fa48("12930", "12931", "12932"), sourceIds === undefined)) return stryMutAct_9fa48("12933") ? false : (stryCov_9fa48("12933"), true);
    if (stryMutAct_9fa48("12936") ? referral.sourceType !== "TREE_INTERVENTION" : stryMutAct_9fa48("12935") ? false : stryMutAct_9fa48("12934") ? true : (stryCov_9fa48("12934", "12935", "12936"), referral.sourceType === (stryMutAct_9fa48("12937") ? "" : (stryCov_9fa48("12937"), "TREE_INTERVENTION")))) return stryMutAct_9fa48("12938") ? true : (stryCov_9fa48("12938"), false);
    return sourceIds.has(referral.sourceId);
  }
}
export function serviceSourceHref(serviceId: string): string {
  if (stryMutAct_9fa48("12939")) {
    {}
  } else {
    stryCov_9fa48("12939");
    return stryMutAct_9fa48("12940") ? `` : (stryCov_9fa48("12940"), `/app?destination=services&detail=${encodeURIComponent(serviceId)}`);
  }
}
function environmentalInspectionSourceHref(inspectionId: string): string {
  if (stryMutAct_9fa48("12941")) {
    {}
  } else {
    stryCov_9fa48("12941");
    const inspection = environmentalInspectionFixtures.find(stryMutAct_9fa48("12942") ? () => undefined : (stryCov_9fa48("12942"), candidate => stryMutAct_9fa48("12945") ? candidate.id !== inspectionId : stryMutAct_9fa48("12944") ? false : stryMutAct_9fa48("12943") ? true : (stryCov_9fa48("12943", "12944", "12945"), candidate.id === inspectionId)));
    const reportId = stryMutAct_9fa48("12946") ? inspection.reportId : (stryCov_9fa48("12946"), inspection?.reportId);
    const report = reportId ? environmentalReportFixtures.find(stryMutAct_9fa48("12947") ? () => undefined : (stryCov_9fa48("12947"), candidate => stryMutAct_9fa48("12950") ? candidate.id !== reportId : stryMutAct_9fa48("12949") ? false : stryMutAct_9fa48("12948") ? true : (stryCov_9fa48("12948", "12949", "12950"), candidate.id === reportId))) : undefined;
    return stryMutAct_9fa48("12951") ? `` : (stryCov_9fa48("12951"), `/app?destination=environment${report ? stryMutAct_9fa48("12952") ? `` : (stryCov_9fa48("12952"), `&detail=${encodeURIComponent(report.id)}`) : stryMutAct_9fa48("12953") ? "Stryker was here!" : (stryCov_9fa48("12953"), "")}&inspectionId=${encodeURIComponent(inspectionId)}`);
  }
}
export function treeInterventionSourceHref(interventionId: string): string {
  if (stryMutAct_9fa48("12954")) {
    {}
  } else {
    stryCov_9fa48("12954");
    return stryMutAct_9fa48("12955") ? `` : (stryCov_9fa48("12955"), `/app/catalog/tree-interventions?detail=${encodeURIComponent(interventionId)}`);
  }
}
export function referralFromRepairRequest(request: RepairRequest): Referral {
  if (stryMutAct_9fa48("12956")) {
    {}
  } else {
    stryCov_9fa48("12956");
    return mapRepairRequest(request, stryMutAct_9fa48("12957") ? false : (stryCov_9fa48("12957"), true));
  }
}
export function referralFromBackendRepairRequest(request: RepairRequest): Referral {
  if (stryMutAct_9fa48("12958")) {
    {}
  } else {
    stryCov_9fa48("12958");
    return mapRepairRequest(request, stryMutAct_9fa48("12959") ? true : (stryCov_9fa48("12959"), false));
  }
}
function mapRepairRequest(request: RepairRequest, useFixtures: boolean): Referral {
  if (stryMutAct_9fa48("12960")) {
    {}
  } else {
    stryCov_9fa48("12960");
    const source = request.sourceContext;
    const isInspection = stryMutAct_9fa48("12963") ? request.detectedInType !== "INSPECTION" : stryMutAct_9fa48("12962") ? false : stryMutAct_9fa48("12961") ? true : (stryCov_9fa48("12961", "12962", "12963"), request.detectedInType === (stryMutAct_9fa48("12964") ? "" : (stryCov_9fa48("12964"), "INSPECTION")));
    return stryMutAct_9fa48("12965") ? {} : (stryCov_9fa48("12965"), {
      kind: stryMutAct_9fa48("12966") ? "" : (stryCov_9fa48("12966"), "REPAIR_REQUEST"),
      destination: stryMutAct_9fa48("12967") ? "" : (stryCov_9fa48("12967"), "M3"),
      id: request.id,
      sourceType: stryMutAct_9fa48("12968") ? "" : (stryCov_9fa48("12968"), "SERVICE"),
      sourceId: request.detectedInId,
      sourceServiceId: request.detectedInId,
      sourceLabel: isInspection ? stryMutAct_9fa48("12969") ? "" : (stryCov_9fa48("12969"), "Inspección ambiental") : stryMutAct_9fa48("12970") ? source?.label && "Servicio de origen" : (stryCov_9fa48("12970"), (stryMutAct_9fa48("12971") ? source.label : (stryCov_9fa48("12971"), source?.label)) ?? (stryMutAct_9fa48("12972") ? "" : (stryCov_9fa48("12972"), "Servicio de origen"))),
      sourceHref: stryMutAct_9fa48("12973") ? source?.href && (isInspection ? useFixtures ? environmentalInspectionSourceHref(request.detectedInId) : `/app?destination=environment&inspectionId=${encodeURIComponent(request.detectedInId)}` : serviceSourceHref(request.detectedInId)) : (stryCov_9fa48("12973"), (stryMutAct_9fa48("12974") ? source.href : (stryCov_9fa48("12974"), source?.href)) ?? (isInspection ? useFixtures ? environmentalInspectionSourceHref(request.detectedInId) : stryMutAct_9fa48("12975") ? `` : (stryCov_9fa48("12975"), `/app?destination=environment&inspectionId=${encodeURIComponent(request.detectedInId)}`) : serviceSourceHref(request.detectedInId))),
      status: request.status,
      createdAt: stryMutAct_9fa48("12976") ? request.createdAt && request.requestedAt : (stryCov_9fa48("12976"), request.createdAt ?? request.requestedAt),
      updatedAt: stryMutAct_9fa48("12977") ? (request.updatedAt ?? request.createdAt) && request.requestedAt : (stryCov_9fa48("12977"), (stryMutAct_9fa48("12978") ? request.updatedAt && request.createdAt : (stryCov_9fa48("12978"), request.updatedAt ?? request.createdAt)) ?? request.requestedAt),
      request
    });
  }
}
export function referralFromStreetClosureRequest(request: StreetClosureRequest): Referral {
  if (stryMutAct_9fa48("12979")) {
    {}
  } else {
    stryCov_9fa48("12979");
    return stryMutAct_9fa48("12980") ? {} : (stryCov_9fa48("12980"), {
      kind: stryMutAct_9fa48("12981") ? "" : (stryCov_9fa48("12981"), "STREET_CLOSURE_REQUEST"),
      destination: stryMutAct_9fa48("12982") ? "" : (stryCov_9fa48("12982"), "M7"),
      id: request.id,
      sourceType: request.sourceType,
      sourceId: request.sourceId,
      ...((stryMutAct_9fa48("12985") ? request.sourceType !== "SERVICE" : stryMutAct_9fa48("12984") ? false : stryMutAct_9fa48("12983") ? true : (stryCov_9fa48("12983", "12984", "12985"), request.sourceType === (stryMutAct_9fa48("12986") ? "" : (stryCov_9fa48("12986"), "SERVICE")))) ? stryMutAct_9fa48("12987") ? {} : (stryCov_9fa48("12987"), {
        sourceServiceId: request.sourceId
      }) : stryMutAct_9fa48("12988") ? {} : (stryCov_9fa48("12988"), {
        sourceTreeInterventionId: request.sourceId
      })),
      sourceLabel: stryMutAct_9fa48("12989") ? request.sourceContext?.title && request.reason : (stryCov_9fa48("12989"), (stryMutAct_9fa48("12990") ? request.sourceContext.title : (stryCov_9fa48("12990"), request.sourceContext?.title)) ?? request.reason),
      sourceHref: (stryMutAct_9fa48("12993") ? request.sourceType !== "SERVICE" : stryMutAct_9fa48("12992") ? false : stryMutAct_9fa48("12991") ? true : (stryCov_9fa48("12991", "12992", "12993"), request.sourceType === (stryMutAct_9fa48("12994") ? "" : (stryCov_9fa48("12994"), "SERVICE")))) ? serviceSourceHref(request.sourceId) : treeInterventionSourceHref(request.sourceId),
      status: request.status,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      request
    });
  }
}
export class ReferralContractError extends Error {
  constructor(message: string, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("12995")) {
      {}
    } else {
      stryCov_9fa48("12995");
      super(message, options);
      this.name = stryMutAct_9fa48("12996") ? "" : (stryCov_9fa48("12996"), "ReferralContractError");
    }
  }
}
async function requestJson(path: string): Promise<unknown> {
  if (stryMutAct_9fa48("12997")) {
    {}
  } else {
    stryCov_9fa48("12997");
    const response = await authenticatedFetch(path);
    let payload: unknown;
    try {
      if (stryMutAct_9fa48("12998")) {
        {}
      } else {
        stryCov_9fa48("12998");
        payload = await response.json();
      }
    } catch (cause) {
      if (stryMutAct_9fa48("12999")) {
        {}
      } else {
        stryCov_9fa48("12999");
        throw new ReferralContractError(stryMutAct_9fa48("13001") ? "" : (stryCov_9fa48("13001"), "No se pudo obtener información válida de derivaciones. Reintente en unos segundos."), stryMutAct_9fa48("13002") ? {} : (stryCov_9fa48("13002"), {
          cause
        }));
      }
    }
    if (stryMutAct_9fa48("13005") ? false : stryMutAct_9fa48("13004") ? true : stryMutAct_9fa48("13003") ? response.ok : (stryCov_9fa48("13003", "13004", "13005"), !response.ok)) {
      if (stryMutAct_9fa48("13006")) {
        {}
      } else {
        stryCov_9fa48("13006");
        const message = (stryMutAct_9fa48("13009") ? payload && typeof payload === "object" || "message" in payload : stryMutAct_9fa48("13008") ? false : stryMutAct_9fa48("13007") ? true : (stryCov_9fa48("13007", "13008", "13009"), (stryMutAct_9fa48("13011") ? payload || typeof payload === "object" : stryMutAct_9fa48("13010") ? true : (stryCov_9fa48("13010", "13011"), payload && (stryMutAct_9fa48("13013") ? typeof payload !== "object" : stryMutAct_9fa48("13012") ? true : (stryCov_9fa48("13012", "13013"), typeof payload === (stryMutAct_9fa48("13014") ? "" : (stryCov_9fa48("13014"), "object")))))) && (stryMutAct_9fa48("13015") ? "" : (stryCov_9fa48("13015"), "message")) in payload)) ? String((payload as {
          message: unknown;
        }).message) : stryMutAct_9fa48("13016") ? "" : (stryCov_9fa48("13016"), "No se pudieron cargar las derivaciones.");
        if (stryMutAct_9fa48("13017")) {
          ;
        } else {
          stryCov_9fa48("13017");
          throw new ReferralContractError(message);
        }
      }
    }
    return payload;
  }
}
export const referralsAdapter = stryMutAct_9fa48("13018") ? {} : (stryCov_9fa48("13018"), {
  async list(): Promise<ReferralsPage> {
    if (stryMutAct_9fa48("13019")) {
      {}
    } else {
      stryCov_9fa48("13019");
      const parsed = referralsPageSchema.safeParse(await requestJson(stryMutAct_9fa48("13020") ? "" : (stryCov_9fa48("13020"), "/api/referrals")));
      if (stryMutAct_9fa48("13023") ? false : stryMutAct_9fa48("13022") ? true : stryMutAct_9fa48("13021") ? parsed.success : (stryCov_9fa48("13021", "13022", "13023"), !parsed.success)) throw new ReferralContractError(stryMutAct_9fa48("13025") ? "" : (stryCov_9fa48("13025"), "No se pudo obtener información válida de la lista de derivaciones. Reintente en unos segundos."), stryMutAct_9fa48("13026") ? {} : (stryCov_9fa48("13026"), {
        cause: parsed.error
      }));
      return stryMutAct_9fa48("13027") ? {} : (stryCov_9fa48("13027"), {
        referrals: parsed.data.data as Referral[],
        total: parsed.data.meta.total,
        invalid: stryMutAct_9fa48("13028") ? parsed.data.meta.invalid && 0 : (stryCov_9fa48("13028"), parsed.data.meta.invalid ?? 0)
      });
    }
  },
  async get(id: string): Promise<Referral> {
    if (stryMutAct_9fa48("13029")) {
      {}
    } else {
      stryCov_9fa48("13029");
      const parsed = referralSchema.safeParse(await requestJson(stryMutAct_9fa48("13030") ? `` : (stryCov_9fa48("13030"), `/api/referrals/${encodeURIComponent(id)}`)));
      if (stryMutAct_9fa48("13033") ? false : stryMutAct_9fa48("13032") ? true : stryMutAct_9fa48("13031") ? parsed.success : (stryCov_9fa48("13031", "13032", "13033"), !parsed.success)) throw new ReferralContractError(stryMutAct_9fa48("13035") ? "" : (stryCov_9fa48("13035"), "No se pudo obtener información válida del detalle de la derivación. Reintente en unos segundos."), stryMutAct_9fa48("13036") ? {} : (stryCov_9fa48("13036"), {
        cause: parsed.error
      }));
      return parsed.data as Referral;
    }
  }
});