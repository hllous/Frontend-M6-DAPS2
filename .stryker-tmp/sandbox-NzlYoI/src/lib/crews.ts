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
import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { recordTelemetryEvent } from "./telemetry";
import { externalIdInput, externalIdListInput } from "@/lib/input-limits";
import { tolerantRecords } from "./tolerant-records";
export const crewTypeSchema = z.enum(stryMutAct_9fa48("7952") ? [] : (stryCov_9fa48("7952"), [stryMutAct_9fa48("7953") ? "" : (stryCov_9fa48("7953"), "MUNICIPAL"), stryMutAct_9fa48("7954") ? "" : (stryCov_9fa48("7954"), "COOPERATIVE"), stryMutAct_9fa48("7955") ? "" : (stryCov_9fa48("7955"), "CONTRACTOR")]));
export const shiftSchema = z.enum(stryMutAct_9fa48("7956") ? [] : (stryCov_9fa48("7956"), [stryMutAct_9fa48("7957") ? "" : (stryCov_9fa48("7957"), "MORNING"), stryMutAct_9fa48("7958") ? "" : (stryCov_9fa48("7958"), "AFTERNOON"), stryMutAct_9fa48("7959") ? "" : (stryCov_9fa48("7959"), "NIGHT")]));
export type CrewType = z.infer<typeof crewTypeSchema>;
export type Shift = z.infer<typeof shiftSchema>;
export const crewSpecialtySchema = z.enum(stryMutAct_9fa48("7960") ? [] : (stryCov_9fa48("7960"), [stryMutAct_9fa48("7961") ? "" : (stryCov_9fa48("7961"), "COLLECTION"), stryMutAct_9fa48("7962") ? "" : (stryCov_9fa48("7962"), "SWEEPING"), stryMutAct_9fa48("7963") ? "" : (stryCov_9fa48("7963"), "CLEANING"), stryMutAct_9fa48("7964") ? "" : (stryCov_9fa48("7964"), "RECYCLING"), stryMutAct_9fa48("7965") ? "" : (stryCov_9fa48("7965"), "TREES"), stryMutAct_9fa48("7966") ? "" : (stryCov_9fa48("7966"), "GREEN_SPACES"), stryMutAct_9fa48("7967") ? "" : (stryCov_9fa48("7967"), "INSPECTION")]));
export type CrewSpecialty = z.infer<typeof crewSpecialtySchema>;
export const crewSpecialtyLabels: Record<CrewSpecialty, string> = stryMutAct_9fa48("7968") ? {} : (stryCov_9fa48("7968"), {
  COLLECTION: stryMutAct_9fa48("7969") ? "" : (stryCov_9fa48("7969"), "Recolección"),
  SWEEPING: stryMutAct_9fa48("7970") ? "" : (stryCov_9fa48("7970"), "Barrido"),
  CLEANING: stryMutAct_9fa48("7971") ? "" : (stryCov_9fa48("7971"), "Limpieza"),
  RECYCLING: stryMutAct_9fa48("7972") ? "" : (stryCov_9fa48("7972"), "Reciclaje"),
  TREES: stryMutAct_9fa48("7973") ? "" : (stryCov_9fa48("7973"), "Arbolado"),
  GREEN_SPACES: stryMutAct_9fa48("7974") ? "" : (stryCov_9fa48("7974"), "Espacios verdes"),
  INSPECTION: stryMutAct_9fa48("7975") ? "" : (stryCov_9fa48("7975"), "Inspección")
});
export function crewSpecialtyLabel(specialty: CrewSpecialty | null) {
  if (stryMutAct_9fa48("7976")) {
    {}
  } else {
    stryCov_9fa48("7976");
    return specialty ? crewSpecialtyLabels[specialty] : stryMutAct_9fa48("7977") ? "" : (stryCov_9fa48("7977"), "Sin especialidad");
  }
}
const crewMemberSchema = z.object(stryMutAct_9fa48("7978") ? {} : (stryCov_9fa48("7978"), {
  userId: z.string(),
  displayName: z.string().nullable().default(null)
}));
export const crewSchema = z.object(stryMutAct_9fa48("7979") ? {} : (stryCov_9fa48("7979"), {
  id: z.string(),
  name: z.string(),
  crewType: crewTypeSchema,
  leaderUserId: z.string().nullable(),
  leaderName: z.string().nullable().default(null),
  members: z.array(crewMemberSchema).default(stryMutAct_9fa48("7980") ? ["Stryker was here"] : (stryCov_9fa48("7980"), [])),
  memberUserIds: z.array(z.string()).default(stryMutAct_9fa48("7981") ? ["Stryker was here"] : (stryCov_9fa48("7981"), [])),
  organizationId: z.string().nullable().default(null),
  organizationName: z.string().nullable().default(null),
  specialty: crewSpecialtySchema.nullable().default(null),
  homeZoneId: z.string().nullable().default(null),
  effectiveZoneId: z.string().nullable().default(null),
  membersCount: z.number().nullable().default(null),
  defaultShift: shiftSchema,
  active: z.boolean()
})).transform(crew => {
  if (stryMutAct_9fa48("7982")) {
    {}
  } else {
    stryCov_9fa48("7982");
    const members = crew.members.length ? crew.members : crew.memberUserIds.map(stryMutAct_9fa48("7983") ? () => undefined : (stryCov_9fa48("7983"), userId => stryMutAct_9fa48("7984") ? {} : (stryCov_9fa48("7984"), {
      userId,
      displayName: null
    })));
    return stryMutAct_9fa48("7985") ? {} : (stryCov_9fa48("7985"), {
      ...crew,
      members,
      memberUserIds: members.map(stryMutAct_9fa48("7986") ? () => undefined : (stryCov_9fa48("7986"), member => member.userId))
    });
  }
});
const crewWireSchema = crewSchema;
export type Crew = z.infer<typeof crewSchema>;
export type CrewQuery = {
  active?: boolean;
  crewType?: CrewType;
  defaultShift?: Shift;
  zoneId?: string;
  specialty?: CrewSpecialty;
  page?: number;
  pageSize?: number;
};
export type CrewsPage = {
  crews: Crew[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
export const createCrewInputSchema = z.object(stryMutAct_9fa48("7987") ? {} : (stryCov_9fa48("7987"), {
  name: stryMutAct_9fa48("7989") ? z.string().min(1, "El nombre es obligatorio.") : stryMutAct_9fa48("7988") ? z.string().trim().max(1, "El nombre es obligatorio.") : (stryCov_9fa48("7988", "7989"), z.string().trim().min(1, stryMutAct_9fa48("7990") ? "" : (stryCov_9fa48("7990"), "El nombre es obligatorio."))),
  crewType: crewTypeSchema,
  leaderUserId: externalIdInput(),
  organizationId: externalIdInput(),
  defaultShift: shiftSchema,
  specialty: z.enum(crewSpecialtySchema.options, stryMutAct_9fa48("7991") ? {} : (stryCov_9fa48("7991"), {
    error: stryMutAct_9fa48("7992") ? "" : (stryCov_9fa48("7992"), "La especialidad es obligatoria.")
  })),
  homeZoneId: stryMutAct_9fa48("7994") ? z.string().min(1).nullish() : stryMutAct_9fa48("7993") ? z.string().trim().max(1).nullish() : (stryCov_9fa48("7993", "7994"), z.string().trim().min(1).nullish())
}));
export type CreateCrewInput = z.infer<typeof createCrewInputSchema>;
// crewType is immutable in the backend (UpdateCrewDto has no such field), so an edit never carries it.
export const updateCrewInputSchema = createCrewInputSchema.omit(stryMutAct_9fa48("7995") ? {} : (stryCov_9fa48("7995"), {
  crewType: stryMutAct_9fa48("7996") ? false : (stryCov_9fa48("7996"), true),
  specialty: stryMutAct_9fa48("7997") ? false : (stryCov_9fa48("7997"), true)
})).extend(stryMutAct_9fa48("7998") ? {} : (stryCov_9fa48("7998"), {
  active: z.boolean(),
  specialty: crewSpecialtySchema.optional()
})).strict();
export type UpdateCrewInput = z.infer<typeof updateCrewInputSchema>;
export const addCrewMembersInputSchema = z.object(stryMutAct_9fa48("7999") ? {} : (stryCov_9fa48("7999"), {
  memberUserIds: externalIdListInput(stryMutAct_9fa48("8000") ? {} : (stryCov_9fa48("8000"), {
    emptyMessage: stryMutAct_9fa48("8001") ? "" : (stryCov_9fa48("8001"), "Seleccione al menos un integrante.")
  })).optional(),
  userIds: externalIdListInput(stryMutAct_9fa48("8002") ? {} : (stryCov_9fa48("8002"), {
    emptyMessage: stryMutAct_9fa48("8003") ? "" : (stryCov_9fa48("8003"), "Seleccione al menos un integrante.")
  })).optional(),
  members: stryMutAct_9fa48("8005") ? z.array(z.object({
    userId: externalIdInput(),
    displayName: z.string().trim().min(1).optional()
  }).strict()).max(1).max(100).optional() : stryMutAct_9fa48("8004") ? z.array(z.object({
    userId: externalIdInput(),
    displayName: z.string().trim().min(1).optional()
  }).strict()).min(1).min(100).optional() : (stryCov_9fa48("8004", "8005"), z.array(z.object(stryMutAct_9fa48("8006") ? {} : (stryCov_9fa48("8006"), {
    userId: externalIdInput(),
    displayName: stryMutAct_9fa48("8008") ? z.string().min(1).optional() : stryMutAct_9fa48("8007") ? z.string().trim().max(1).optional() : (stryCov_9fa48("8007", "8008"), z.string().trim().min(1).optional())
  })).strict()).min(1).max(100).optional())
})).strict().refine(stryMutAct_9fa48("8009") ? () => undefined : (stryCov_9fa48("8009"), value => Boolean(stryMutAct_9fa48("8012") ? (value.memberUserIds?.length || value.userIds?.length) && value.members?.length : stryMutAct_9fa48("8011") ? false : stryMutAct_9fa48("8010") ? true : (stryCov_9fa48("8010", "8011", "8012"), (stryMutAct_9fa48("8014") ? value.memberUserIds?.length && value.userIds?.length : stryMutAct_9fa48("8013") ? false : (stryCov_9fa48("8013", "8014"), (stryMutAct_9fa48("8015") ? value.memberUserIds.length : (stryCov_9fa48("8015"), value.memberUserIds?.length)) || (stryMutAct_9fa48("8016") ? value.userIds.length : (stryCov_9fa48("8016"), value.userIds?.length)))) || (stryMutAct_9fa48("8017") ? value.members.length : (stryCov_9fa48("8017"), value.members?.length))))), stryMutAct_9fa48("8018") ? "" : (stryCov_9fa48("8018"), "Seleccione al menos un integrante."));
export type AddCrewMembersInput = z.infer<typeof addCrewMembersInputSchema>;
export class CrewContractError extends Error {
  constructor(message: string, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("8019")) {
      {}
    } else {
      stryCov_9fa48("8019");
      super(message, options);
      this.name = stryMutAct_9fa48("8020") ? "" : (stryCov_9fa48("8020"), "CrewContractError");
    }
  }
}
export class CrewRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("8021")) {
      {}
    } else {
      stryCov_9fa48("8021");
      super(message, options);
      this.name = stryMutAct_9fa48("8022") ? "" : (stryCov_9fa48("8022"), "CrewRequestError");
      this.status = status;
    }
  }
}
const pageSchema = z.object(stryMutAct_9fa48("8023") ? {} : (stryCov_9fa48("8023"), {
  data: tolerantRecords(crewWireSchema, stryMutAct_9fa48("8024") ? "" : (stryCov_9fa48("8024"), "crews")),
  meta: z.object(stryMutAct_9fa48("8025") ? {} : (stryCov_9fa48("8025"), {
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number()
  }))
}));
const errorSchema = z.object(stryMutAct_9fa48("8026") ? {} : (stryCov_9fa48("8026"), {
  statusCode: z.number(),
  message: z.union(stryMutAct_9fa48("8027") ? [] : (stryCov_9fa48("8027"), [z.string(), z.array(z.string())])),
  error: z.string(),
  timestamp: z.string(),
  path: z.string()
}));
function queryString(query: CrewQuery) {
  if (stryMutAct_9fa48("8028")) {
    {}
  } else {
    stryCov_9fa48("8028");
    const params = new URLSearchParams();
    if (stryMutAct_9fa48("8031") ? query.active === undefined : stryMutAct_9fa48("8030") ? false : stryMutAct_9fa48("8029") ? true : (stryCov_9fa48("8029", "8030", "8031"), query.active !== undefined)) params.set(stryMutAct_9fa48("8033") ? "" : (stryCov_9fa48("8033"), "active"), String(query.active));
    if (stryMutAct_9fa48("8035") ? false : stryMutAct_9fa48("8034") ? true : (stryCov_9fa48("8034", "8035"), query.crewType)) params.set(stryMutAct_9fa48("8037") ? "" : (stryCov_9fa48("8037"), "crewType"), query.crewType);
    if (stryMutAct_9fa48("8039") ? false : stryMutAct_9fa48("8038") ? true : (stryCov_9fa48("8038", "8039"), query.defaultShift)) params.set(stryMutAct_9fa48("8041") ? "" : (stryCov_9fa48("8041"), "defaultShift"), query.defaultShift);
    if (stryMutAct_9fa48("8043") ? false : stryMutAct_9fa48("8042") ? true : (stryCov_9fa48("8042", "8043"), query.zoneId)) params.set(stryMutAct_9fa48("8045") ? "" : (stryCov_9fa48("8045"), "zoneId"), query.zoneId);
    if (stryMutAct_9fa48("8047") ? false : stryMutAct_9fa48("8046") ? true : (stryCov_9fa48("8046", "8047"), query.specialty)) params.set(stryMutAct_9fa48("8049") ? "" : (stryCov_9fa48("8049"), "specialty"), query.specialty);
    if (stryMutAct_9fa48("8052") ? query.page === undefined : stryMutAct_9fa48("8051") ? false : stryMutAct_9fa48("8050") ? true : (stryCov_9fa48("8050", "8051", "8052"), query.page !== undefined)) params.set(stryMutAct_9fa48("8054") ? "" : (stryCov_9fa48("8054"), "page"), String(query.page));
    if (stryMutAct_9fa48("8057") ? query.pageSize === undefined : stryMutAct_9fa48("8056") ? false : stryMutAct_9fa48("8055") ? true : (stryCov_9fa48("8055", "8056", "8057"), query.pageSize !== undefined)) params.set(stryMutAct_9fa48("8059") ? "" : (stryCov_9fa48("8059"), "pageSize"), String(query.pageSize));
    const value = params.toString();
    return value ? stryMutAct_9fa48("8060") ? `` : (stryCov_9fa48("8060"), `?${value}`) : stryMutAct_9fa48("8061") ? "Stryker was here!" : (stryCov_9fa48("8061"), "");
  }
}
async function requestJson(path: string, init?: RequestInit) {
  if (stryMutAct_9fa48("8062")) {
    {}
  } else {
    stryCov_9fa48("8062");
    let response: Response;
    try {
      if (stryMutAct_9fa48("8063")) {
        {}
      } else {
        stryCov_9fa48("8063");
        response = await authenticatedFetch(path, init);
      }
    } catch (cause) {
      if (stryMutAct_9fa48("8064")) {
        {}
      } else {
        stryCov_9fa48("8064");
        if (stryMutAct_9fa48("8066") ? false : stryMutAct_9fa48("8065") ? true : (stryCov_9fa48("8065", "8066"), cause instanceof NetworkFailureError)) recordTelemetryEvent(stryMutAct_9fa48("8068") ? {} : (stryCov_9fa48("8068"), {
          name: stryMutAct_9fa48("8069") ? "" : (stryCov_9fa48("8069"), "request_network_failure"),
          resource: stryMutAct_9fa48("8070") ? "" : (stryCov_9fa48("8070"), "crews")
        }));
        throw cause;
      }
    }
    let payload: unknown;
    try {
      if (stryMutAct_9fa48("8071")) {
        {}
      } else {
        stryCov_9fa48("8071");
        payload = await response.json();
      }
    } catch (cause) {
      if (stryMutAct_9fa48("8072")) {
        {}
      } else {
        stryCov_9fa48("8072");
        recordTelemetryEvent(stryMutAct_9fa48("8074") ? {} : (stryCov_9fa48("8074"), {
          name: stryMutAct_9fa48("8075") ? "" : (stryCov_9fa48("8075"), "request_malformed_response"),
          resource: stryMutAct_9fa48("8076") ? "" : (stryCov_9fa48("8076"), "crews")
        }));
        throw new CrewContractError(stryMutAct_9fa48("8078") ? "" : (stryCov_9fa48("8078"), "No se pudo obtener información válida de cuadrillas. Reintente en unos segundos."), stryMutAct_9fa48("8079") ? {} : (stryCov_9fa48("8079"), {
          cause
        }));
      }
    }
    if (stryMutAct_9fa48("8082") ? false : stryMutAct_9fa48("8081") ? true : stryMutAct_9fa48("8080") ? response.ok : (stryCov_9fa48("8080", "8081", "8082"), !response.ok)) {
      if (stryMutAct_9fa48("8083")) {
        {}
      } else {
        stryCov_9fa48("8083");
        const parsed = errorSchema.safeParse(payload);
        if (stryMutAct_9fa48("8086") ? false : stryMutAct_9fa48("8085") ? true : stryMutAct_9fa48("8084") ? parsed.success : (stryCov_9fa48("8084", "8085", "8086"), !parsed.success)) throw new CrewContractError(stryMutAct_9fa48("8088") ? "" : (stryCov_9fa48("8088"), "No se pudo obtener información válida. Reintente en unos segundos."), stryMutAct_9fa48("8089") ? {} : (stryCov_9fa48("8089"), {
          cause: parsed.error
        }));
        const message = Array.isArray(parsed.data.message) ? parsed.data.message.join(stryMutAct_9fa48("8090") ? "" : (stryCov_9fa48("8090"), " ")) : parsed.data.message;
        if (stryMutAct_9fa48("8091")) {
          ;
        } else {
          stryCov_9fa48("8091");
          throw new CrewRequestError(message, parsed.data.statusCode);
        }
      }
    }
    return payload;
  }
}
function resource(payload: unknown, message: string): Crew {
  if (stryMutAct_9fa48("8092")) {
    {}
  } else {
    stryCov_9fa48("8092");
    const raw = (stryMutAct_9fa48("8095") ? payload && typeof payload === "object" && "data" in payload || !("id" in payload) : stryMutAct_9fa48("8094") ? false : stryMutAct_9fa48("8093") ? true : (stryCov_9fa48("8093", "8094", "8095"), (stryMutAct_9fa48("8097") ? payload && typeof payload === "object" || "data" in payload : stryMutAct_9fa48("8096") ? true : (stryCov_9fa48("8096", "8097"), (stryMutAct_9fa48("8099") ? payload || typeof payload === "object" : stryMutAct_9fa48("8098") ? true : (stryCov_9fa48("8098", "8099"), payload && (stryMutAct_9fa48("8101") ? typeof payload !== "object" : stryMutAct_9fa48("8100") ? true : (stryCov_9fa48("8100", "8101"), typeof payload === (stryMutAct_9fa48("8102") ? "" : (stryCov_9fa48("8102"), "object")))))) && (stryMutAct_9fa48("8103") ? "" : (stryCov_9fa48("8103"), "data")) in payload)) && (stryMutAct_9fa48("8104") ? "id" in payload : (stryCov_9fa48("8104"), !((stryMutAct_9fa48("8105") ? "" : (stryCov_9fa48("8105"), "id")) in payload))))) ? (payload as {
      data: unknown;
    }).data : payload;
    const parsed = crewWireSchema.safeParse(raw);
    if (stryMutAct_9fa48("8108") ? false : stryMutAct_9fa48("8107") ? true : stryMutAct_9fa48("8106") ? parsed.success : (stryCov_9fa48("8106", "8107", "8108"), !parsed.success)) {
      if (stryMutAct_9fa48("8109")) {
        {}
      } else {
        stryCov_9fa48("8109");
        recordTelemetryEvent(stryMutAct_9fa48("8111") ? {} : (stryCov_9fa48("8111"), {
          name: stryMutAct_9fa48("8112") ? "" : (stryCov_9fa48("8112"), "request_malformed_response"),
          resource: stryMutAct_9fa48("8113") ? "" : (stryCov_9fa48("8113"), "crews")
        }));
        throw new CrewContractError(message, stryMutAct_9fa48("8115") ? {} : (stryCov_9fa48("8115"), {
          cause: parsed.error
        }));
      }
    }
    return parsed.data;
  }
}
export const crewsAdapter = stryMutAct_9fa48("8116") ? {} : (stryCov_9fa48("8116"), {
  async list(query: CrewQuery = {}): Promise<CrewsPage> {
    if (stryMutAct_9fa48("8117")) {
      {}
    } else {
      stryCov_9fa48("8117");
      const parsed = pageSchema.safeParse(await requestJson(stryMutAct_9fa48("8118") ? `` : (stryCov_9fa48("8118"), `/api/crews${queryString(query)}`)));
      if (stryMutAct_9fa48("8121") ? false : stryMutAct_9fa48("8120") ? true : stryMutAct_9fa48("8119") ? parsed.success : (stryCov_9fa48("8119", "8120", "8121"), !parsed.success)) {
        if (stryMutAct_9fa48("8122")) {
          {}
        } else {
          stryCov_9fa48("8122");
          recordTelemetryEvent(stryMutAct_9fa48("8124") ? {} : (stryCov_9fa48("8124"), {
            name: stryMutAct_9fa48("8125") ? "" : (stryCov_9fa48("8125"), "request_malformed_response"),
            resource: stryMutAct_9fa48("8126") ? "" : (stryCov_9fa48("8126"), "crews")
          }));
          throw new CrewContractError(stryMutAct_9fa48("8128") ? "" : (stryCov_9fa48("8128"), "No se pudo obtener información válida de la lista de cuadrillas. Reintente en unos segundos."), stryMutAct_9fa48("8129") ? {} : (stryCov_9fa48("8129"), {
            cause: parsed.error
          }));
        }
      }
      return stryMutAct_9fa48("8130") ? {} : (stryCov_9fa48("8130"), {
        crews: parsed.data.data,
        page: parsed.data.meta.page,
        pageSize: parsed.data.meta.pageSize,
        total: parsed.data.meta.total,
        totalPages: parsed.data.meta.totalPages
      });
    }
  },
  async get(id: string) {
    if (stryMutAct_9fa48("8131")) {
      {}
    } else {
      stryCov_9fa48("8131");
      return resource(await requestJson(stryMutAct_9fa48("8132") ? `` : (stryCov_9fa48("8132"), `/api/crews/${id}`)), stryMutAct_9fa48("8133") ? "" : (stryCov_9fa48("8133"), "No se pudo obtener información válida del detalle de cuadrilla. Reintente en unos segundos."));
    }
  },
  async create(input: CreateCrewInput) {
    if (stryMutAct_9fa48("8134")) {
      {}
    } else {
      stryCov_9fa48("8134");
      const parsed = createCrewInputSchema.safeParse(input);
      if (stryMutAct_9fa48("8137") ? false : stryMutAct_9fa48("8136") ? true : stryMutAct_9fa48("8135") ? parsed.success : (stryCov_9fa48("8135", "8136", "8137"), !parsed.success)) throw new CrewContractError(stryMutAct_9fa48("8139") ? "" : (stryCov_9fa48("8139"), "Los datos de la cuadrilla son inválidos."), stryMutAct_9fa48("8140") ? {} : (stryCov_9fa48("8140"), {
        cause: parsed.error
      }));
      return resource(await requestJson(stryMutAct_9fa48("8141") ? "" : (stryCov_9fa48("8141"), "/api/crews"), stryMutAct_9fa48("8142") ? {} : (stryCov_9fa48("8142"), {
        method: stryMutAct_9fa48("8143") ? "" : (stryCov_9fa48("8143"), "POST"),
        headers: stryMutAct_9fa48("8144") ? {} : (stryCov_9fa48("8144"), {
          "content-type": stryMutAct_9fa48("8145") ? "" : (stryCov_9fa48("8145"), "application/json")
        }),
        body: JSON.stringify(parsed.data)
      })), stryMutAct_9fa48("8146") ? "" : (stryCov_9fa48("8146"), "No se pudo obtener información válida de la creación de cuadrilla. Reintente en unos segundos."));
    }
  },
  async update(id: string, input: UpdateCrewInput) {
    if (stryMutAct_9fa48("8147")) {
      {}
    } else {
      stryCov_9fa48("8147");
      const parsed = updateCrewInputSchema.safeParse(input);
      if (stryMutAct_9fa48("8150") ? false : stryMutAct_9fa48("8149") ? true : stryMutAct_9fa48("8148") ? parsed.success : (stryCov_9fa48("8148", "8149", "8150"), !parsed.success)) throw new CrewContractError(stryMutAct_9fa48("8152") ? "" : (stryCov_9fa48("8152"), "Los datos editables de la cuadrilla son inválidos."), stryMutAct_9fa48("8153") ? {} : (stryCov_9fa48("8153"), {
        cause: parsed.error
      }));
      return resource(await requestJson(stryMutAct_9fa48("8154") ? `` : (stryCov_9fa48("8154"), `/api/crews/${id}`), stryMutAct_9fa48("8155") ? {} : (stryCov_9fa48("8155"), {
        method: stryMutAct_9fa48("8156") ? "" : (stryCov_9fa48("8156"), "PATCH"),
        headers: stryMutAct_9fa48("8157") ? {} : (stryCov_9fa48("8157"), {
          "content-type": stryMutAct_9fa48("8158") ? "" : (stryCov_9fa48("8158"), "application/json")
        }),
        body: JSON.stringify(parsed.data)
      })), stryMutAct_9fa48("8159") ? "" : (stryCov_9fa48("8159"), "No se pudo obtener información válida de la actualización de cuadrilla. Reintente en unos segundos."));
    }
  },
  async remove(id: string) {
    if (stryMutAct_9fa48("8160")) {
      {}
    } else {
      stryCov_9fa48("8160");
      return resource(await requestJson(stryMutAct_9fa48("8161") ? `` : (stryCov_9fa48("8161"), `/api/crews/${id}`), stryMutAct_9fa48("8162") ? {} : (stryCov_9fa48("8162"), {
        method: stryMutAct_9fa48("8163") ? "" : (stryCov_9fa48("8163"), "DELETE")
      })), stryMutAct_9fa48("8164") ? "" : (stryCov_9fa48("8164"), "No se pudo obtener información válida de la baja de cuadrilla. Reintente en unos segundos."));
    }
  },
  async addMembers(id: string, members: string[] | {
    userId: string;
    displayName?: string;
  }[]) {
    if (stryMutAct_9fa48("8165")) {
      {}
    } else {
      stryCov_9fa48("8165");
      const parsed = addCrewMembersInputSchema.safeParse((stryMutAct_9fa48("8168") ? typeof members[0] !== "string" : stryMutAct_9fa48("8167") ? false : stryMutAct_9fa48("8166") ? true : (stryCov_9fa48("8166", "8167", "8168"), typeof members[0] === (stryMutAct_9fa48("8169") ? "" : (stryCov_9fa48("8169"), "string")))) ? stryMutAct_9fa48("8170") ? {} : (stryCov_9fa48("8170"), {
        memberUserIds: members
      }) : stryMutAct_9fa48("8171") ? {} : (stryCov_9fa48("8171"), {
        members
      }));
      if (stryMutAct_9fa48("8174") ? false : stryMutAct_9fa48("8173") ? true : stryMutAct_9fa48("8172") ? parsed.success : (stryCov_9fa48("8172", "8173", "8174"), !parsed.success)) throw new CrewContractError(stryMutAct_9fa48("8176") ? "" : (stryCov_9fa48("8176"), "Los integrantes de la cuadrilla son inválidos."), stryMutAct_9fa48("8177") ? {} : (stryCov_9fa48("8177"), {
        cause: parsed.error
      }));
      return resource(await requestJson(stryMutAct_9fa48("8178") ? `` : (stryCov_9fa48("8178"), `/api/crews/${id}/members`), stryMutAct_9fa48("8179") ? {} : (stryCov_9fa48("8179"), {
        method: stryMutAct_9fa48("8180") ? "" : (stryCov_9fa48("8180"), "POST"),
        headers: stryMutAct_9fa48("8181") ? {} : (stryCov_9fa48("8181"), {
          "content-type": stryMutAct_9fa48("8182") ? "" : (stryCov_9fa48("8182"), "application/json")
        }),
        body: JSON.stringify(parsed.data)
      })), stryMutAct_9fa48("8183") ? "" : (stryCov_9fa48("8183"), "No se pudo obtener información válida del alta de integrantes. Reintente en unos segundos."));
    }
  },
  async removeMember(id: string, userId: string) {
    if (stryMutAct_9fa48("8184")) {
      {}
    } else {
      stryCov_9fa48("8184");
      return resource(await requestJson(stryMutAct_9fa48("8185") ? `` : (stryCov_9fa48("8185"), `/api/crews/${id}/members/${encodeURIComponent(userId)}`), stryMutAct_9fa48("8186") ? {} : (stryCov_9fa48("8186"), {
        method: stryMutAct_9fa48("8187") ? "" : (stryCov_9fa48("8187"), "DELETE")
      })), stryMutAct_9fa48("8188") ? "" : (stryCov_9fa48("8188"), "No se pudo obtener información válida de la baja del integrante. Reintente en unos segundos."));
    }
  }
});