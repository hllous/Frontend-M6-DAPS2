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
import { notifyMapInventoryChanged } from "./map-inventory-events";
import { z } from "zod";
import { authenticatedFetch, NetworkFailureError } from "./authenticated-fetch";
import { attachmentSchema, type Attachment, type Service, type ServiceStatus } from "./services";
import { recordTelemetryEvent } from "./telemetry";
import { withResponseCoordinates } from "./response-coordinates";
import { MAX_INT32, latitudeInput, longitudeInput } from "@/lib/input-limits";
import { tolerantRecords } from "./tolerant-records";
export { attachmentSchema, type Attachment };
export const containerTypeSchema = z.enum(stryMutAct_9fa48("7426") ? [] : (stryCov_9fa48("7426"), [stryMutAct_9fa48("7427") ? "" : (stryCov_9fa48("7427"), "HOUSEHOLD"), stryMutAct_9fa48("7428") ? "" : (stryCov_9fa48("7428"), "RECYCLABLE"), stryMutAct_9fa48("7429") ? "" : (stryCov_9fa48("7429"), "BULKY"), stryMutAct_9fa48("7430") ? "" : (stryCov_9fa48("7430"), "GREEN")]));
export type ContainerType = z.infer<typeof containerTypeSchema>;
export const containerStatusSchema = z.enum(stryMutAct_9fa48("7431") ? [] : (stryCov_9fa48("7431"), [stryMutAct_9fa48("7432") ? "" : (stryCov_9fa48("7432"), "ACTIVE"), stryMutAct_9fa48("7433") ? "" : (stryCov_9fa48("7433"), "OVERFLOWED"), stryMutAct_9fa48("7434") ? "" : (stryCov_9fa48("7434"), "DAMAGED"), stryMutAct_9fa48("7435") ? "" : (stryCov_9fa48("7435"), "UNDER_REPAIR"), stryMutAct_9fa48("7436") ? "" : (stryCov_9fa48("7436"), "RELOCATING"), stryMutAct_9fa48("7437") ? "" : (stryCov_9fa48("7437"), "REMOVED")]));
export type ContainerStatus = z.infer<typeof containerStatusSchema>;
export const damageTypeSchema = z.enum(stryMutAct_9fa48("7438") ? [] : (stryCov_9fa48("7438"), [stryMutAct_9fa48("7439") ? "" : (stryCov_9fa48("7439"), "STRUCTURAL"), stryMutAct_9fa48("7440") ? "" : (stryCov_9fa48("7440"), "BURNT"), stryMutAct_9fa48("7441") ? "" : (stryCov_9fa48("7441"), "LID_BROKEN"), stryMutAct_9fa48("7442") ? "" : (stryCov_9fa48("7442"), "WHEELS_BROKEN"), stryMutAct_9fa48("7443") ? "" : (stryCov_9fa48("7443"), "VANDALIZED"), stryMutAct_9fa48("7444") ? "" : (stryCov_9fa48("7444"), "MISSING")]));
export type DamageType = z.infer<typeof damageTypeSchema>;
export const severitySchema = z.enum(stryMutAct_9fa48("7445") ? [] : (stryCov_9fa48("7445"), [stryMutAct_9fa48("7446") ? "" : (stryCov_9fa48("7446"), "LOW"), stryMutAct_9fa48("7447") ? "" : (stryCov_9fa48("7447"), "MEDIUM"), stryMutAct_9fa48("7448") ? "" : (stryCov_9fa48("7448"), "HIGH"), stryMutAct_9fa48("7449") ? "" : (stryCov_9fa48("7449"), "CRITICAL")]));
export type Severity = z.infer<typeof severitySchema>;
export const containerSchema = withResponseCoordinates(stryMutAct_9fa48("7450") ? {} : (stryCov_9fa48("7450"), {
  id: z.string(),
  code: z.string(),
  containerType: containerTypeSchema,
  zoneId: z.string(),
  address: z.string().nullable(),
  capacityLiters: z.number(),
  status: containerStatusSchema,
  damageType: damageTypeSchema.nullable().optional(),
  severity: severitySchema.nullable().optional(),
  requiresPublicWorks: z.boolean().nullable().optional()
}));
export type Container = z.infer<typeof containerSchema>;
export type ContainerQuery = {
  status?: ContainerStatus;
  containerType?: ContainerType;
  zoneId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};
export type ContainersPage = {
  containers: Container[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
const capacityLitersInput = stryMutAct_9fa48("7451") ? z.number({
  message: "La capacidad debe ser un número."
}).int("La capacidad debe ser un número entero.").positive("La capacidad debe ser mayor a 0 litros.").min(MAX_INT32, `La capacidad no puede superar ${MAX_INT32.toLocaleString("es-AR")} litros.`) : (stryCov_9fa48("7451"), z.number(stryMutAct_9fa48("7452") ? {} : (stryCov_9fa48("7452"), {
  message: stryMutAct_9fa48("7453") ? "" : (stryCov_9fa48("7453"), "La capacidad debe ser un número.")
})).int(stryMutAct_9fa48("7454") ? "" : (stryCov_9fa48("7454"), "La capacidad debe ser un número entero.")).positive(stryMutAct_9fa48("7455") ? "" : (stryCov_9fa48("7455"), "La capacidad debe ser mayor a 0 litros.")).max(MAX_INT32, stryMutAct_9fa48("7456") ? `` : (stryCov_9fa48("7456"), `La capacidad no puede superar ${MAX_INT32.toLocaleString(stryMutAct_9fa48("7457") ? "" : (stryCov_9fa48("7457"), "es-AR"))} litros.`)));
export const createContainerInputSchema = z.object(stryMutAct_9fa48("7458") ? {} : (stryCov_9fa48("7458"), {
  code: stryMutAct_9fa48("7460") ? z.string().min(1, "El código es obligatorio.") : stryMutAct_9fa48("7459") ? z.string().trim().max(1, "El código es obligatorio.") : (stryCov_9fa48("7459", "7460"), z.string().trim().min(1, stryMutAct_9fa48("7461") ? "" : (stryCov_9fa48("7461"), "El código es obligatorio."))),
  containerType: containerTypeSchema,
  zoneId: stryMutAct_9fa48("7463") ? z.string().min(1, "La zona operativa es obligatoria.") : stryMutAct_9fa48("7462") ? z.string().trim().max(1, "La zona operativa es obligatoria.") : (stryCov_9fa48("7462", "7463"), z.string().trim().min(1, stryMutAct_9fa48("7464") ? "" : (stryCov_9fa48("7464"), "La zona operativa es obligatoria."))),
  address: stryMutAct_9fa48("7466") ? z.string().min(1, "La dirección es obligatoria.") : stryMutAct_9fa48("7465") ? z.string().trim().max(1, "La dirección es obligatoria.") : (stryCov_9fa48("7465", "7466"), z.string().trim().min(1, stryMutAct_9fa48("7467") ? "" : (stryCov_9fa48("7467"), "La dirección es obligatoria."))),
  lat: latitudeInput(),
  lng: longitudeInput(),
  capacityLiters: capacityLitersInput
}));
export type CreateContainerInput = z.infer<typeof createContainerInputSchema>;
export const updateContainerInputSchema = z.object(stryMutAct_9fa48("7468") ? {} : (stryCov_9fa48("7468"), {
  zoneId: stryMutAct_9fa48("7470") ? z.string().min(1, "La zona operativa es obligatoria.").optional() : stryMutAct_9fa48("7469") ? z.string().trim().max(1, "La zona operativa es obligatoria.").optional() : (stryCov_9fa48("7469", "7470"), z.string().trim().min(1, stryMutAct_9fa48("7471") ? "" : (stryCov_9fa48("7471"), "La zona operativa es obligatoria.")).optional()),
  address: stryMutAct_9fa48("7473") ? z.string().min(1, "La dirección es obligatoria.").optional() : stryMutAct_9fa48("7472") ? z.string().trim().max(1, "La dirección es obligatoria.").optional() : (stryCov_9fa48("7472", "7473"), z.string().trim().min(1, stryMutAct_9fa48("7474") ? "" : (stryCov_9fa48("7474"), "La dirección es obligatoria.")).optional()),
  lat: latitudeInput().optional(),
  lng: longitudeInput().optional(),
  capacityLiters: capacityLitersInput.optional()
}));
export type UpdateContainerInput = z.infer<typeof updateContainerInputSchema>;
export const reportDamageInputSchema = z.object(stryMutAct_9fa48("7475") ? {} : (stryCov_9fa48("7475"), {
  damageType: damageTypeSchema,
  severity: severitySchema,
  requiresPublicWorks: z.boolean().optional().default(stryMutAct_9fa48("7476") ? true : (stryCov_9fa48("7476"), false))
}));
export type ReportDamageInput = z.input<typeof reportDamageInputSchema>;
export const confirmRelocationInputSchema = z.object(stryMutAct_9fa48("7477") ? {} : (stryCov_9fa48("7477"), {
  address: stryMutAct_9fa48("7479") ? z.string().min(1, "La dirección es obligatoria.") : stryMutAct_9fa48("7478") ? z.string().trim().max(1, "La dirección es obligatoria.") : (stryCov_9fa48("7478", "7479"), z.string().trim().min(1, stryMutAct_9fa48("7480") ? "" : (stryCov_9fa48("7480"), "La dirección es obligatoria."))),
  lat: latitudeInput(),
  lng: longitudeInput(),
  zoneId: stryMutAct_9fa48("7482") ? z.string().min(1).optional() : stryMutAct_9fa48("7481") ? z.string().trim().max(1).optional() : (stryCov_9fa48("7481", "7482"), z.string().trim().min(1).optional())
}));
export type ConfirmRelocationInput = z.infer<typeof confirmRelocationInputSchema>;
export function findInFlightServiceForContainer(container: Container, services: Service[]): Service | undefined {
  if (stryMutAct_9fa48("7483")) {
    {}
  } else {
    stryCov_9fa48("7483");
    const inFlightStatuses: ServiceStatus[] = stryMutAct_9fa48("7484") ? [] : (stryCov_9fa48("7484"), [stryMutAct_9fa48("7485") ? "" : (stryCov_9fa48("7485"), "SCHEDULED"), stryMutAct_9fa48("7486") ? "" : (stryCov_9fa48("7486"), "RESCHEDULED"), stryMutAct_9fa48("7487") ? "" : (stryCov_9fa48("7487"), "IN_PROGRESS"), stryMutAct_9fa48("7488") ? "" : (stryCov_9fa48("7488"), "SUSPENDED")]);
    return services.find(stryMutAct_9fa48("7489") ? () => undefined : (stryCov_9fa48("7489"), s => stryMutAct_9fa48("7492") ? s.mode !== "ROUTE" && s.targetType === "CONTAINER" && (s.targetId === container.id || s.targetRef === container.code) || inFlightStatuses.includes(s.status) : stryMutAct_9fa48("7491") ? false : stryMutAct_9fa48("7490") ? true : (stryCov_9fa48("7490", "7491", "7492"), (stryMutAct_9fa48("7494") ? s.mode !== "ROUTE" && s.targetType === "CONTAINER" || s.targetId === container.id || s.targetRef === container.code : stryMutAct_9fa48("7493") ? true : (stryCov_9fa48("7493", "7494"), (stryMutAct_9fa48("7496") ? s.mode !== "ROUTE" || s.targetType === "CONTAINER" : stryMutAct_9fa48("7495") ? true : (stryCov_9fa48("7495", "7496"), (stryMutAct_9fa48("7498") ? s.mode === "ROUTE" : stryMutAct_9fa48("7497") ? true : (stryCov_9fa48("7497", "7498"), s.mode !== (stryMutAct_9fa48("7499") ? "" : (stryCov_9fa48("7499"), "ROUTE")))) && (stryMutAct_9fa48("7501") ? s.targetType !== "CONTAINER" : stryMutAct_9fa48("7500") ? true : (stryCov_9fa48("7500", "7501"), s.targetType === (stryMutAct_9fa48("7502") ? "" : (stryCov_9fa48("7502"), "CONTAINER")))))) && (stryMutAct_9fa48("7504") ? s.targetId === container.id && s.targetRef === container.code : stryMutAct_9fa48("7503") ? true : (stryCov_9fa48("7503", "7504"), (stryMutAct_9fa48("7506") ? s.targetId !== container.id : stryMutAct_9fa48("7505") ? false : (stryCov_9fa48("7505", "7506"), s.targetId === container.id)) || (stryMutAct_9fa48("7508") ? s.targetRef !== container.code : stryMutAct_9fa48("7507") ? false : (stryCov_9fa48("7507", "7508"), s.targetRef === container.code)))))) && inFlightStatuses.includes(s.status))));
  }
}
export class ContainerContractError extends Error {
  constructor(message: string, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("7509")) {
      {}
    } else {
      stryCov_9fa48("7509");
      super(message, options);
      this.name = stryMutAct_9fa48("7510") ? "" : (stryCov_9fa48("7510"), "ContainerContractError");
    }
  }
}
export class ContainerRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number, options?: {
    cause?: unknown;
  }) {
    if (stryMutAct_9fa48("7511")) {
      {}
    } else {
      stryCov_9fa48("7511");
      super(message, options);
      this.name = stryMutAct_9fa48("7512") ? "" : (stryCov_9fa48("7512"), "ContainerRequestError");
      this.status = status;
    }
  }
}
export const CONTAINER_STATUS_LABELS: Record<ContainerStatus, string> = stryMutAct_9fa48("7513") ? {} : (stryCov_9fa48("7513"), {
  ACTIVE: stryMutAct_9fa48("7514") ? "" : (stryCov_9fa48("7514"), "Activo"),
  OVERFLOWED: stryMutAct_9fa48("7515") ? "" : (stryCov_9fa48("7515"), "Desbordado"),
  DAMAGED: stryMutAct_9fa48("7516") ? "" : (stryCov_9fa48("7516"), "Dañado"),
  UNDER_REPAIR: stryMutAct_9fa48("7517") ? "" : (stryCov_9fa48("7517"), "En reparación"),
  RELOCATING: stryMutAct_9fa48("7518") ? "" : (stryCov_9fa48("7518"), "En reubicación"),
  REMOVED: stryMutAct_9fa48("7519") ? "" : (stryCov_9fa48("7519"), "Retirado")
});
export const CONTAINER_STATUS_CLASSES: Record<ContainerStatus, string> = stryMutAct_9fa48("7520") ? {} : (stryCov_9fa48("7520"), {
  ACTIVE: stryMutAct_9fa48("7521") ? "" : (stryCov_9fa48("7521"), "bg-[var(--color-success-fill)] text-[var(--color-success)] border-[var(--color-success-line)]"),
  OVERFLOWED: stryMutAct_9fa48("7522") ? "" : (stryCov_9fa48("7522"), "bg-[var(--color-warning-fill)] text-[var(--color-warning)] border-[var(--color-warning-line)]"),
  DAMAGED: stryMutAct_9fa48("7523") ? "" : (stryCov_9fa48("7523"), "bg-[var(--color-danger-fill)] text-[var(--color-danger)] border-[var(--color-danger-line)]"),
  UNDER_REPAIR: stryMutAct_9fa48("7524") ? "" : (stryCov_9fa48("7524"), "bg-[var(--color-warning-fill)] text-[var(--color-warning)] border-[var(--color-warning-line)]"),
  RELOCATING: stryMutAct_9fa48("7525") ? "" : (stryCov_9fa48("7525"), "bg-[var(--color-info-fill)] text-[var(--color-info)] border-[var(--color-info-line)]"),
  REMOVED: stryMutAct_9fa48("7526") ? "" : (stryCov_9fa48("7526"), "bg-[var(--color-danger-fill)] text-[var(--color-danger)] border-[var(--color-danger-line)]")
});
export const CONTAINER_TYPE_LABELS: Record<ContainerType, string> = stryMutAct_9fa48("7527") ? {} : (stryCov_9fa48("7527"), {
  HOUSEHOLD: stryMutAct_9fa48("7528") ? "" : (stryCov_9fa48("7528"), "Residuos domiciliarios"),
  RECYCLABLE: stryMutAct_9fa48("7529") ? "" : (stryCov_9fa48("7529"), "Materiales reciclables"),
  BULKY: stryMutAct_9fa48("7530") ? "" : (stryCov_9fa48("7530"), "Residuos voluminosos"),
  GREEN: stryMutAct_9fa48("7531") ? "" : (stryCov_9fa48("7531"), "Restos verdes")
});
export const DAMAGE_TYPE_LABELS: Record<DamageType, string> = stryMutAct_9fa48("7532") ? {} : (stryCov_9fa48("7532"), {
  STRUCTURAL: stryMutAct_9fa48("7533") ? "" : (stryCov_9fa48("7533"), "Estructural"),
  BURNT: stryMutAct_9fa48("7534") ? "" : (stryCov_9fa48("7534"), "Quemado"),
  LID_BROKEN: stryMutAct_9fa48("7535") ? "" : (stryCov_9fa48("7535"), "Tapa rota"),
  WHEELS_BROKEN: stryMutAct_9fa48("7536") ? "" : (stryCov_9fa48("7536"), "Ruedas rotas"),
  VANDALIZED: stryMutAct_9fa48("7537") ? "" : (stryCov_9fa48("7537"), "Vandalizado"),
  MISSING: stryMutAct_9fa48("7538") ? "" : (stryCov_9fa48("7538"), "Faltante")
});
export const SEVERITY_LABELS: Record<Severity, string> = stryMutAct_9fa48("7539") ? {} : (stryCov_9fa48("7539"), {
  LOW: stryMutAct_9fa48("7540") ? "" : (stryCov_9fa48("7540"), "Baja"),
  MEDIUM: stryMutAct_9fa48("7541") ? "" : (stryCov_9fa48("7541"), "Media"),
  HIGH: stryMutAct_9fa48("7542") ? "" : (stryCov_9fa48("7542"), "Alta"),
  CRITICAL: stryMutAct_9fa48("7543") ? "" : (stryCov_9fa48("7543"), "Crítica")
});
const containersEnvelopeSchema = z.object(stryMutAct_9fa48("7544") ? {} : (stryCov_9fa48("7544"), {
  data: tolerantRecords(containerSchema, stryMutAct_9fa48("7545") ? "" : (stryCov_9fa48("7545"), "containers")),
  meta: z.object(stryMutAct_9fa48("7546") ? {} : (stryCov_9fa48("7546"), {
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
    totalPages: z.number()
  }))
}));
const errorResponseSchema = z.object(stryMutAct_9fa48("7547") ? {} : (stryCov_9fa48("7547"), {
  statusCode: z.number(),
  message: z.union(stryMutAct_9fa48("7548") ? [] : (stryCov_9fa48("7548"), [z.string(), z.array(z.string())])),
  error: z.string(),
  timestamp: z.string(),
  path: z.string()
}));
function buildQueryString(query: ContainerQuery): string {
  if (stryMutAct_9fa48("7549")) {
    {}
  } else {
    stryCov_9fa48("7549");
    const params = new URLSearchParams();
    if (stryMutAct_9fa48("7551") ? false : stryMutAct_9fa48("7550") ? true : (stryCov_9fa48("7550", "7551"), query.status)) params.set(stryMutAct_9fa48("7553") ? "" : (stryCov_9fa48("7553"), "status"), query.status);
    if (stryMutAct_9fa48("7555") ? false : stryMutAct_9fa48("7554") ? true : (stryCov_9fa48("7554", "7555"), query.containerType)) params.set(stryMutAct_9fa48("7557") ? "" : (stryCov_9fa48("7557"), "containerType"), query.containerType);
    if (stryMutAct_9fa48("7559") ? false : stryMutAct_9fa48("7558") ? true : (stryCov_9fa48("7558", "7559"), query.zoneId)) params.set(stryMutAct_9fa48("7561") ? "" : (stryCov_9fa48("7561"), "zoneId"), query.zoneId);
    if (stryMutAct_9fa48("7563") ? false : stryMutAct_9fa48("7562") ? true : (stryCov_9fa48("7562", "7563"), query.search)) params.set(stryMutAct_9fa48("7565") ? "" : (stryCov_9fa48("7565"), "search"), query.search);
    if (stryMutAct_9fa48("7568") ? query.page === undefined : stryMutAct_9fa48("7567") ? false : stryMutAct_9fa48("7566") ? true : (stryCov_9fa48("7566", "7567", "7568"), query.page !== undefined)) params.set(stryMutAct_9fa48("7570") ? "" : (stryCov_9fa48("7570"), "page"), String(query.page));
    if (stryMutAct_9fa48("7573") ? query.pageSize === undefined : stryMutAct_9fa48("7572") ? false : stryMutAct_9fa48("7571") ? true : (stryCov_9fa48("7571", "7572", "7573"), query.pageSize !== undefined)) params.set(stryMutAct_9fa48("7575") ? "" : (stryCov_9fa48("7575"), "pageSize"), String(query.pageSize));
    const queryString = params.toString();
    return queryString ? stryMutAct_9fa48("7576") ? `` : (stryCov_9fa48("7576"), `?${queryString}`) : stryMutAct_9fa48("7577") ? "Stryker was here!" : (stryCov_9fa48("7577"), "");
  }
}
async function readJsonBody(response: Response): Promise<unknown> {
  if (stryMutAct_9fa48("7578")) {
    {}
  } else {
    stryCov_9fa48("7578");
    try {
      if (stryMutAct_9fa48("7579")) {
        {}
      } else {
        stryCov_9fa48("7579");
        return await response.json();
      }
    } catch (cause) {
      if (stryMutAct_9fa48("7580")) {
        {}
      } else {
        stryCov_9fa48("7580");
        recordTelemetryEvent(stryMutAct_9fa48("7582") ? {} : (stryCov_9fa48("7582"), {
          name: stryMutAct_9fa48("7583") ? "" : (stryCov_9fa48("7583"), "request_malformed_response"),
          resource: stryMutAct_9fa48("7584") ? "" : (stryCov_9fa48("7584"), "containers")
        }));
        throw new ContainerContractError(stryMutAct_9fa48("7586") ? "" : (stryCov_9fa48("7586"), "No se pudo obtener información válida de contenedores. Reintente en unos segundos."), stryMutAct_9fa48("7587") ? {} : (stryCov_9fa48("7587"), {
          cause
        }));
      }
    }
  }
}
function requestError(payload: unknown): ContainerRequestError | ContainerContractError {
  if (stryMutAct_9fa48("7588")) {
    {}
  } else {
    stryCov_9fa48("7588");
    const parsed = errorResponseSchema.safeParse(payload);
    if (stryMutAct_9fa48("7591") ? false : stryMutAct_9fa48("7590") ? true : stryMutAct_9fa48("7589") ? parsed.success : (stryCov_9fa48("7589", "7590", "7591"), !parsed.success)) {
      if (stryMutAct_9fa48("7592")) {
        {}
      } else {
        stryCov_9fa48("7592");
        recordTelemetryEvent(stryMutAct_9fa48("7594") ? {} : (stryCov_9fa48("7594"), {
          name: stryMutAct_9fa48("7595") ? "" : (stryCov_9fa48("7595"), "request_malformed_response"),
          resource: stryMutAct_9fa48("7596") ? "" : (stryCov_9fa48("7596"), "containers")
        }));
        return new ContainerContractError(stryMutAct_9fa48("7597") ? "" : (stryCov_9fa48("7597"), "No se pudo obtener información válida de contenedores. Reintente en unos segundos."), stryMutAct_9fa48("7598") ? {} : (stryCov_9fa48("7598"), {
          cause: parsed.error
        }));
      }
    }
    const message = Array.isArray(parsed.data.message) ? parsed.data.message.join(stryMutAct_9fa48("7599") ? "" : (stryCov_9fa48("7599"), " ")) : parsed.data.message;
    return new ContainerRequestError(message, parsed.data.statusCode);
  }
}
async function send(input: string, init?: RequestInit): Promise<unknown> {
  if (stryMutAct_9fa48("7600")) {
    {}
  } else {
    stryCov_9fa48("7600");
    let response: Response;
    try {
      if (stryMutAct_9fa48("7601")) {
        {}
      } else {
        stryCov_9fa48("7601");
        response = await authenticatedFetch(input, init);
      }
    } catch (cause) {
      if (stryMutAct_9fa48("7602")) {
        {}
      } else {
        stryCov_9fa48("7602");
        if (stryMutAct_9fa48("7604") ? false : stryMutAct_9fa48("7603") ? true : (stryCov_9fa48("7603", "7604"), cause instanceof NetworkFailureError)) {
          if (stryMutAct_9fa48("7605")) {
            {}
          } else {
            stryCov_9fa48("7605");
            recordTelemetryEvent(stryMutAct_9fa48("7607") ? {} : (stryCov_9fa48("7607"), {
              name: stryMutAct_9fa48("7608") ? "" : (stryCov_9fa48("7608"), "request_network_failure"),
              resource: stryMutAct_9fa48("7609") ? "" : (stryCov_9fa48("7609"), "containers")
            }));
          }
        }
        throw cause;
      }
    }
    const payload = await readJsonBody(response);
    if (stryMutAct_9fa48("7612") ? false : stryMutAct_9fa48("7611") ? true : stryMutAct_9fa48("7610") ? response.ok : (stryCov_9fa48("7610", "7611", "7612"), !response.ok)) throw requestError(payload);
    return payload;
  }
}
function parseContainer(payload: unknown, message: string): Container {
  if (stryMutAct_9fa48("7613")) {
    {}
  } else {
    stryCov_9fa48("7613");
    const parsed = containerSchema.safeParse(payload);
    if (stryMutAct_9fa48("7616") ? false : stryMutAct_9fa48("7615") ? true : stryMutAct_9fa48("7614") ? parsed.success : (stryCov_9fa48("7614", "7615", "7616"), !parsed.success)) {
      if (stryMutAct_9fa48("7617")) {
        {}
      } else {
        stryCov_9fa48("7617");
        recordTelemetryEvent(stryMutAct_9fa48("7619") ? {} : (stryCov_9fa48("7619"), {
          name: stryMutAct_9fa48("7620") ? "" : (stryCov_9fa48("7620"), "request_malformed_response"),
          resource: stryMutAct_9fa48("7621") ? "" : (stryCov_9fa48("7621"), "containers")
        }));
        throw new ContainerContractError(message, stryMutAct_9fa48("7623") ? {} : (stryCov_9fa48("7623"), {
          cause: parsed.error
        }));
      }
    }
    return parsed.data;
  }
}
export const containersAdapter = stryMutAct_9fa48("7624") ? {} : (stryCov_9fa48("7624"), {
  async list(query: ContainerQuery = {}): Promise<ContainersPage> {
    if (stryMutAct_9fa48("7625")) {
      {}
    } else {
      stryCov_9fa48("7625");
      const payload = await send(stryMutAct_9fa48("7626") ? `` : (stryCov_9fa48("7626"), `/api/containers${buildQueryString(query)}`));
      const parsed = containersEnvelopeSchema.safeParse(payload);
      if (stryMutAct_9fa48("7629") ? false : stryMutAct_9fa48("7628") ? true : stryMutAct_9fa48("7627") ? parsed.success : (stryCov_9fa48("7627", "7628", "7629"), !parsed.success)) {
        if (stryMutAct_9fa48("7630")) {
          {}
        } else {
          stryCov_9fa48("7630");
          recordTelemetryEvent(stryMutAct_9fa48("7632") ? {} : (stryCov_9fa48("7632"), {
            name: stryMutAct_9fa48("7633") ? "" : (stryCov_9fa48("7633"), "request_malformed_response"),
            resource: stryMutAct_9fa48("7634") ? "" : (stryCov_9fa48("7634"), "containers")
          }));
          throw new ContainerContractError(stryMutAct_9fa48("7636") ? "" : (stryCov_9fa48("7636"), "No se pudo obtener información válida de contenedores. Reintente en unos segundos."), stryMutAct_9fa48("7637") ? {} : (stryCov_9fa48("7637"), {
            cause: parsed.error
          }));
        }
      }
      return stryMutAct_9fa48("7638") ? {} : (stryCov_9fa48("7638"), {
        containers: parsed.data.data,
        page: parsed.data.meta.page,
        pageSize: parsed.data.meta.pageSize,
        total: parsed.data.meta.total,
        totalPages: parsed.data.meta.totalPages
      });
    }
  },
  async get(id: string): Promise<Container> {
    if (stryMutAct_9fa48("7639")) {
      {}
    } else {
      stryCov_9fa48("7639");
      return parseContainer(await send(stryMutAct_9fa48("7640") ? `` : (stryCov_9fa48("7640"), `/api/containers/${id}`)), stryMutAct_9fa48("7641") ? "" : (stryCov_9fa48("7641"), "No se pudo obtener información válida del detalle de contenedor. Reintente en unos segundos."));
    }
  },
  async create(input: CreateContainerInput): Promise<Container> {
    if (stryMutAct_9fa48("7642")) {
      {}
    } else {
      stryCov_9fa48("7642");
      const parsedInput = createContainerInputSchema.safeParse(input);
      if (stryMutAct_9fa48("7645") ? false : stryMutAct_9fa48("7644") ? true : stryMutAct_9fa48("7643") ? parsedInput.success : (stryCov_9fa48("7643", "7644", "7645"), !parsedInput.success)) {
        if (stryMutAct_9fa48("7646")) {
          {}
        } else {
          stryCov_9fa48("7646");
          throw new ContainerContractError(stryMutAct_9fa48("7648") ? "" : (stryCov_9fa48("7648"), "Los datos para registrar el contenedor son inválidos."), stryMutAct_9fa48("7649") ? {} : (stryCov_9fa48("7649"), {
            cause: parsedInput.error
          }));
        }
      }
      const saved = parseContainer(await send(stryMutAct_9fa48("7650") ? "" : (stryCov_9fa48("7650"), "/api/containers"), stryMutAct_9fa48("7651") ? {} : (stryCov_9fa48("7651"), {
        method: stryMutAct_9fa48("7652") ? "" : (stryCov_9fa48("7652"), "POST"),
        headers: stryMutAct_9fa48("7653") ? {} : (stryCov_9fa48("7653"), {
          "content-type": stryMutAct_9fa48("7654") ? "" : (stryCov_9fa48("7654"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      })), stryMutAct_9fa48("7655") ? "" : (stryCov_9fa48("7655"), "No se pudo obtener información válida de la creación de contenedor. Reintente en unos segundos."));
      if (stryMutAct_9fa48("7656")) {
        ;
      } else {
        stryCov_9fa48("7656");
        notifyMapInventoryChanged();
      }
      return saved;
    }
  },
  async update(id: string, input: UpdateContainerInput): Promise<Container> {
    if (stryMutAct_9fa48("7657")) {
      {}
    } else {
      stryCov_9fa48("7657");
      const parsedInput = updateContainerInputSchema.safeParse(input);
      if (stryMutAct_9fa48("7660") ? false : stryMutAct_9fa48("7659") ? true : stryMutAct_9fa48("7658") ? parsedInput.success : (stryCov_9fa48("7658", "7659", "7660"), !parsedInput.success)) {
        if (stryMutAct_9fa48("7661")) {
          {}
        } else {
          stryCov_9fa48("7661");
          throw new ContainerContractError(stryMutAct_9fa48("7663") ? "" : (stryCov_9fa48("7663"), "Los datos para actualizar el contenedor son inválidos."), stryMutAct_9fa48("7664") ? {} : (stryCov_9fa48("7664"), {
            cause: parsedInput.error
          }));
        }
      }
      const saved = parseContainer(await send(stryMutAct_9fa48("7665") ? `` : (stryCov_9fa48("7665"), `/api/containers/${id}`), stryMutAct_9fa48("7666") ? {} : (stryCov_9fa48("7666"), {
        method: stryMutAct_9fa48("7667") ? "" : (stryCov_9fa48("7667"), "PATCH"),
        headers: stryMutAct_9fa48("7668") ? {} : (stryCov_9fa48("7668"), {
          "content-type": stryMutAct_9fa48("7669") ? "" : (stryCov_9fa48("7669"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      })), stryMutAct_9fa48("7670") ? "" : (stryCov_9fa48("7670"), "No se pudo obtener información válida de la actualización de contenedor. Reintente en unos segundos."));
      if (stryMutAct_9fa48("7671")) {
        ;
      } else {
        stryCov_9fa48("7671");
        notifyMapInventoryChanged();
      }
      return saved;
    }
  },
  async reportOverflow(id: string): Promise<Container> {
    if (stryMutAct_9fa48("7672")) {
      {}
    } else {
      stryCov_9fa48("7672");
      return parseContainer(await send(stryMutAct_9fa48("7673") ? `` : (stryCov_9fa48("7673"), `/api/containers/${id}/report-overflow`), stryMutAct_9fa48("7674") ? {} : (stryCov_9fa48("7674"), {
        method: stryMutAct_9fa48("7675") ? "" : (stryCov_9fa48("7675"), "POST")
      })), stryMutAct_9fa48("7676") ? "" : (stryCov_9fa48("7676"), "No se pudo obtener información válida del reporte de desborde. Reintente en unos segundos."));
    }
  },
  async reportDamage(id: string, input: ReportDamageInput): Promise<Container> {
    if (stryMutAct_9fa48("7677")) {
      {}
    } else {
      stryCov_9fa48("7677");
      const parsedInput = reportDamageInputSchema.safeParse(input);
      if (stryMutAct_9fa48("7680") ? false : stryMutAct_9fa48("7679") ? true : stryMutAct_9fa48("7678") ? parsedInput.success : (stryCov_9fa48("7678", "7679", "7680"), !parsedInput.success)) {
        if (stryMutAct_9fa48("7681")) {
          {}
        } else {
          stryCov_9fa48("7681");
          throw new ContainerContractError(stryMutAct_9fa48("7683") ? "" : (stryCov_9fa48("7683"), "Los datos para reportar daño son inválidos."), stryMutAct_9fa48("7684") ? {} : (stryCov_9fa48("7684"), {
            cause: parsedInput.error
          }));
        }
      }
      return parseContainer(await send(stryMutAct_9fa48("7685") ? `` : (stryCov_9fa48("7685"), `/api/containers/${id}/report-damage`), stryMutAct_9fa48("7686") ? {} : (stryCov_9fa48("7686"), {
        method: stryMutAct_9fa48("7687") ? "" : (stryCov_9fa48("7687"), "POST"),
        headers: stryMutAct_9fa48("7688") ? {} : (stryCov_9fa48("7688"), {
          "content-type": stryMutAct_9fa48("7689") ? "" : (stryCov_9fa48("7689"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      })), stryMutAct_9fa48("7690") ? "" : (stryCov_9fa48("7690"), "No se pudo obtener información válida del reporte de daño. Reintente en unos segundos."));
    }
  },
  async startRepair(id: string): Promise<Container> {
    if (stryMutAct_9fa48("7691")) {
      {}
    } else {
      stryCov_9fa48("7691");
      return parseContainer(await send(stryMutAct_9fa48("7692") ? `` : (stryCov_9fa48("7692"), `/api/containers/${id}/start-repair`), stryMutAct_9fa48("7693") ? {} : (stryCov_9fa48("7693"), {
        method: stryMutAct_9fa48("7694") ? "" : (stryCov_9fa48("7694"), "POST")
      })), stryMutAct_9fa48("7695") ? "" : (stryCov_9fa48("7695"), "No se pudo obtener información válida del inicio de reparación. Reintente en unos segundos."));
    }
  },
  async completeRepair(id: string): Promise<Container> {
    if (stryMutAct_9fa48("7696")) {
      {}
    } else {
      stryCov_9fa48("7696");
      return parseContainer(await send(stryMutAct_9fa48("7697") ? `` : (stryCov_9fa48("7697"), `/api/containers/${id}/complete-repair`), stryMutAct_9fa48("7698") ? {} : (stryCov_9fa48("7698"), {
        method: stryMutAct_9fa48("7699") ? "" : (stryCov_9fa48("7699"), "POST")
      })), stryMutAct_9fa48("7700") ? "" : (stryCov_9fa48("7700"), "No se pudo obtener información válida de la finalización de reparación. Reintente en unos segundos."));
    }
  },
  async remove(id: string): Promise<Container> {
    if (stryMutAct_9fa48("7701")) {
      {}
    } else {
      stryCov_9fa48("7701");
      return parseContainer(await send(stryMutAct_9fa48("7702") ? `` : (stryCov_9fa48("7702"), `/api/containers/${id}/remove`), stryMutAct_9fa48("7703") ? {} : (stryCov_9fa48("7703"), {
        method: stryMutAct_9fa48("7704") ? "" : (stryCov_9fa48("7704"), "POST")
      })), stryMutAct_9fa48("7705") ? "" : (stryCov_9fa48("7705"), "No se pudo obtener información válida del retiro de contenedor. Reintente en unos segundos."));
    }
  },
  async uploadEvidence(params: {
    file: File;
    containerId: string;
    idempotencyKey?: string;
  }): Promise<Attachment> {
    if (stryMutAct_9fa48("7706")) {
      {}
    } else {
      stryCov_9fa48("7706");
      const key = stryMutAct_9fa48("7709") ? params.idempotencyKey && (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `idemp-${Date.now()}`) : stryMutAct_9fa48("7708") ? false : stryMutAct_9fa48("7707") ? true : (stryCov_9fa48("7707", "7708", "7709"), params.idempotencyKey || ((stryMutAct_9fa48("7712") ? typeof crypto !== "undefined" || crypto.randomUUID : stryMutAct_9fa48("7711") ? false : stryMutAct_9fa48("7710") ? true : (stryCov_9fa48("7710", "7711", "7712"), (stryMutAct_9fa48("7714") ? typeof crypto === "undefined" : stryMutAct_9fa48("7713") ? true : (stryCov_9fa48("7713", "7714"), typeof crypto !== (stryMutAct_9fa48("7715") ? "" : (stryCov_9fa48("7715"), "undefined")))) && crypto.randomUUID)) ? crypto.randomUUID() : stryMutAct_9fa48("7716") ? `` : (stryCov_9fa48("7716"), `idemp-${Date.now()}`)));
      const formData = new FormData();
      formData.append(stryMutAct_9fa48("7718") ? "" : (stryCov_9fa48("7718"), "file"), params.file);
      formData.append(stryMutAct_9fa48("7720") ? "" : (stryCov_9fa48("7720"), "fileName"), params.file.name);
      formData.append(stryMutAct_9fa48("7722") ? "" : (stryCov_9fa48("7722"), "ownerType"), stryMutAct_9fa48("7723") ? "" : (stryCov_9fa48("7723"), "CONTAINER"));
      formData.append(stryMutAct_9fa48("7725") ? "" : (stryCov_9fa48("7725"), "ownerId"), params.containerId);
      let response: Response;
      try {
        if (stryMutAct_9fa48("7726")) {
          {}
        } else {
          stryCov_9fa48("7726");
          response = await authenticatedFetch(stryMutAct_9fa48("7727") ? "" : (stryCov_9fa48("7727"), "/api/evidence"), stryMutAct_9fa48("7728") ? {} : (stryCov_9fa48("7728"), {
            method: stryMutAct_9fa48("7729") ? "" : (stryCov_9fa48("7729"), "POST"),
            headers: stryMutAct_9fa48("7730") ? {} : (stryCov_9fa48("7730"), {
              "Idempotency-Key": key
            }),
            body: formData
          }));
        }
      } catch (cause) {
        if (stryMutAct_9fa48("7731")) {
          {}
        } else {
          stryCov_9fa48("7731");
          if (stryMutAct_9fa48("7733") ? false : stryMutAct_9fa48("7732") ? true : (stryCov_9fa48("7732", "7733"), cause instanceof NetworkFailureError)) {
            if (stryMutAct_9fa48("7734")) {
              {}
            } else {
              stryCov_9fa48("7734");
              recordTelemetryEvent(stryMutAct_9fa48("7736") ? {} : (stryCov_9fa48("7736"), {
                name: stryMutAct_9fa48("7737") ? "" : (stryCov_9fa48("7737"), "request_network_failure"),
                resource: stryMutAct_9fa48("7738") ? "" : (stryCov_9fa48("7738"), "containers")
              }));
            }
          }
          throw cause;
        }
      }
      const payload = await readJsonBody(response);
      if (stryMutAct_9fa48("7741") ? false : stryMutAct_9fa48("7740") ? true : stryMutAct_9fa48("7739") ? response.ok : (stryCov_9fa48("7739", "7740", "7741"), !response.ok)) {
        if (stryMutAct_9fa48("7742")) {
          {}
        } else {
          stryCov_9fa48("7742");
          throw requestError(payload);
        }
      }
      const parsedAttachment = attachmentSchema.safeParse(payload);
      if (stryMutAct_9fa48("7745") ? false : stryMutAct_9fa48("7744") ? true : stryMutAct_9fa48("7743") ? parsedAttachment.success : (stryCov_9fa48("7743", "7744", "7745"), !parsedAttachment.success)) {
        if (stryMutAct_9fa48("7746")) {
          {}
        } else {
          stryCov_9fa48("7746");
          recordTelemetryEvent(stryMutAct_9fa48("7748") ? {} : (stryCov_9fa48("7748"), {
            name: stryMutAct_9fa48("7749") ? "" : (stryCov_9fa48("7749"), "request_malformed_response"),
            resource: stryMutAct_9fa48("7750") ? "" : (stryCov_9fa48("7750"), "containers")
          }));
          throw new ContainerContractError(stryMutAct_9fa48("7752") ? "" : (stryCov_9fa48("7752"), "La respuesta de subida de evidencia no respeta el esquema de Attachment."), stryMutAct_9fa48("7753") ? {} : (stryCov_9fa48("7753"), {
            cause: parsedAttachment.error
          }));
        }
      }
      return parsedAttachment.data;
    }
  },
  async getEvidence(containerId: string): Promise<Attachment[]> {
    if (stryMutAct_9fa48("7754")) {
      {}
    } else {
      stryCov_9fa48("7754");
      const payload = await send(stryMutAct_9fa48("7755") ? `` : (stryCov_9fa48("7755"), `/api/evidence?ownerType=CONTAINER&ownerId=${encodeURIComponent(containerId)}`));
      const parsed = z.array(attachmentSchema).safeParse(payload);
      if (stryMutAct_9fa48("7758") ? false : stryMutAct_9fa48("7757") ? true : stryMutAct_9fa48("7756") ? parsed.success : (stryCov_9fa48("7756", "7757", "7758"), !parsed.success)) {
        if (stryMutAct_9fa48("7759")) {
          {}
        } else {
          stryCov_9fa48("7759");
          recordTelemetryEvent(stryMutAct_9fa48("7761") ? {} : (stryCov_9fa48("7761"), {
            name: stryMutAct_9fa48("7762") ? "" : (stryCov_9fa48("7762"), "request_malformed_response"),
            resource: stryMutAct_9fa48("7763") ? "" : (stryCov_9fa48("7763"), "containers")
          }));
          throw new ContainerContractError(stryMutAct_9fa48("7765") ? "" : (stryCov_9fa48("7765"), "No se pudo obtener información válida de la evidencia de contenedores. Reintente en unos segundos."), stryMutAct_9fa48("7766") ? {} : (stryCov_9fa48("7766"), {
            cause: parsed.error
          }));
        }
      }
      return parsed.data;
    }
  },
  async empty(id: string): Promise<Container> {
    if (stryMutAct_9fa48("7767")) {
      {}
    } else {
      stryCov_9fa48("7767");
      return parseContainer(await send(stryMutAct_9fa48("7768") ? `` : (stryCov_9fa48("7768"), `/api/containers/${id}/empty`), stryMutAct_9fa48("7769") ? {} : (stryCov_9fa48("7769"), {
        method: stryMutAct_9fa48("7770") ? "" : (stryCov_9fa48("7770"), "POST")
      })), stryMutAct_9fa48("7771") ? "" : (stryCov_9fa48("7771"), "No se pudo obtener información válida del vaciado de contenedor. Reintente en unos segundos."));
    }
  },
  async relocate(id: string): Promise<Container> {
    if (stryMutAct_9fa48("7772")) {
      {}
    } else {
      stryCov_9fa48("7772");
      return parseContainer(await send(stryMutAct_9fa48("7773") ? `` : (stryCov_9fa48("7773"), `/api/containers/${id}/relocate`), stryMutAct_9fa48("7774") ? {} : (stryCov_9fa48("7774"), {
        method: stryMutAct_9fa48("7775") ? "" : (stryCov_9fa48("7775"), "POST")
      })), stryMutAct_9fa48("7776") ? "" : (stryCov_9fa48("7776"), "No se pudo obtener información válida del inicio de reubicación. Reintente en unos segundos."));
    }
  },
  async confirmRelocation(id: string, input: ConfirmRelocationInput): Promise<Container> {
    if (stryMutAct_9fa48("7777")) {
      {}
    } else {
      stryCov_9fa48("7777");
      const parsedInput = confirmRelocationInputSchema.safeParse(input);
      if (stryMutAct_9fa48("7780") ? false : stryMutAct_9fa48("7779") ? true : stryMutAct_9fa48("7778") ? parsedInput.success : (stryCov_9fa48("7778", "7779", "7780"), !parsedInput.success)) {
        if (stryMutAct_9fa48("7781")) {
          {}
        } else {
          stryCov_9fa48("7781");
          throw new ContainerContractError(stryMutAct_9fa48("7783") ? "" : (stryCov_9fa48("7783"), "Los datos para confirmar la reubicación son inválidos."), stryMutAct_9fa48("7784") ? {} : (stryCov_9fa48("7784"), {
            cause: parsedInput.error
          }));
        }
      }
      return parseContainer(await send(stryMutAct_9fa48("7785") ? `` : (stryCov_9fa48("7785"), `/api/containers/${id}/confirm-relocation`), stryMutAct_9fa48("7786") ? {} : (stryCov_9fa48("7786"), {
        method: stryMutAct_9fa48("7787") ? "" : (stryCov_9fa48("7787"), "POST"),
        headers: stryMutAct_9fa48("7788") ? {} : (stryCov_9fa48("7788"), {
          "content-type": stryMutAct_9fa48("7789") ? "" : (stryCov_9fa48("7789"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      })), stryMutAct_9fa48("7790") ? "" : (stryCov_9fa48("7790"), "No se pudo obtener información válida de la confirmación de reubicación. Reintente en unos segundos."));
    }
  }
});
export async function empty(id: string): Promise<Container> {
  if (stryMutAct_9fa48("7791")) {
    {}
  } else {
    stryCov_9fa48("7791");
    return containersAdapter.empty(id);
  }
}
export async function startRelocation(id: string): Promise<Container> {
  if (stryMutAct_9fa48("7792")) {
    {}
  } else {
    stryCov_9fa48("7792");
    return containersAdapter.relocate(id);
  }
}
export async function confirmRelocation(id: string, input: ConfirmRelocationInput): Promise<Container> {
  if (stryMutAct_9fa48("7793")) {
    {}
  } else {
    stryCov_9fa48("7793");
    return containersAdapter.confirmRelocation(id, input);
  }
}