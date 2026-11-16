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
import { CrewContractError } from "./crews";
import { recordTelemetryEvent } from "./telemetry";
const dateOnly = z.string().regex(stryMutAct_9fa48("7854") ? /^\d{4}-\d{2}-\D{2}$/ : stryMutAct_9fa48("7853") ? /^\d{4}-\d{2}-\d$/ : stryMutAct_9fa48("7852") ? /^\d{4}-\D{2}-\d{2}$/ : stryMutAct_9fa48("7851") ? /^\d{4}-\d-\d{2}$/ : stryMutAct_9fa48("7850") ? /^\D{4}-\d{2}-\d{2}$/ : stryMutAct_9fa48("7849") ? /^\d-\d{2}-\d{2}$/ : stryMutAct_9fa48("7848") ? /^\d{4}-\d{2}-\d{2}/ : stryMutAct_9fa48("7847") ? /\d{4}-\d{2}-\d{2}$/ : (stryCov_9fa48("7847", "7848", "7849", "7850", "7851", "7852", "7853", "7854"), /^\d{4}-\d{2}-\d{2}$/), stryMutAct_9fa48("7855") ? "" : (stryCov_9fa48("7855"), "La fecha no es válida."));
export const crewZoneAssignmentSchema = z.object(stryMutAct_9fa48("7856") ? {} : (stryCov_9fa48("7856"), {
  id: z.string(),
  crewId: z.string(),
  zoneId: z.string(),
  validFrom: dateOnly,
  validTo: dateOnly.nullable().default(null),
  reason: z.string(),
  createdBy: z.string().nullable().default(null),
  createdAt: z.string().nullable().default(null)
}));
export type CrewZoneAssignment = z.infer<typeof crewZoneAssignmentSchema>;
export const createCrewZoneAssignmentInputSchema = z.object(stryMutAct_9fa48("7857") ? {} : (stryCov_9fa48("7857"), {
  zoneId: stryMutAct_9fa48("7859") ? z.string().min(1, "Elija la zona de destino.") : stryMutAct_9fa48("7858") ? z.string().trim().max(1, "Elija la zona de destino.") : (stryCov_9fa48("7858", "7859"), z.string().trim().min(1, stryMutAct_9fa48("7860") ? "" : (stryCov_9fa48("7860"), "Elija la zona de destino."))),
  validFrom: dateOnly.catch(stryMutAct_9fa48("7861") ? "Stryker was here!" : (stryCov_9fa48("7861"), "")).refine(Boolean, stryMutAct_9fa48("7862") ? "" : (stryCov_9fa48("7862"), "Indique la fecha de inicio.")),
  validTo: dateOnly.nullish(),
  reason: stryMutAct_9fa48("7865") ? z.string().min(1, "El motivo es obligatorio.").max(500, "El motivo admite hasta 500 caracteres.") : stryMutAct_9fa48("7864") ? z.string().trim().max(1, "El motivo es obligatorio.").max(500, "El motivo admite hasta 500 caracteres.") : stryMutAct_9fa48("7863") ? z.string().trim().min(1, "El motivo es obligatorio.").min(500, "El motivo admite hasta 500 caracteres.") : (stryCov_9fa48("7863", "7864", "7865"), z.string().trim().min(1, stryMutAct_9fa48("7866") ? "" : (stryCov_9fa48("7866"), "El motivo es obligatorio.")).max(500, stryMutAct_9fa48("7867") ? "" : (stryCov_9fa48("7867"), "El motivo admite hasta 500 caracteres.")))
})).refine(stryMutAct_9fa48("7868") ? () => undefined : (stryCov_9fa48("7868"), value => stryMutAct_9fa48("7871") ? !value.validTo && value.validTo >= value.validFrom : stryMutAct_9fa48("7870") ? false : stryMutAct_9fa48("7869") ? true : (stryCov_9fa48("7869", "7870", "7871"), (stryMutAct_9fa48("7872") ? value.validTo : (stryCov_9fa48("7872"), !value.validTo)) || (stryMutAct_9fa48("7875") ? value.validTo < value.validFrom : stryMutAct_9fa48("7874") ? value.validTo > value.validFrom : stryMutAct_9fa48("7873") ? false : (stryCov_9fa48("7873", "7874", "7875"), value.validTo >= value.validFrom)))), stryMutAct_9fa48("7876") ? {} : (stryCov_9fa48("7876"), {
  path: stryMutAct_9fa48("7877") ? [] : (stryCov_9fa48("7877"), [stryMutAct_9fa48("7878") ? "" : (stryCov_9fa48("7878"), "validTo")]),
  message: stryMutAct_9fa48("7879") ? "" : (stryCov_9fa48("7879"), "La fecha de fin no puede ser anterior a la de inicio.")
}));
export type CreateCrewZoneAssignmentInput = z.infer<typeof createCrewZoneAssignmentInputSchema>;
export class CrewZoneAssignmentRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    if (stryMutAct_9fa48("7880")) {
      {}
    } else {
      stryCov_9fa48("7880");
      super(message);
      this.name = stryMutAct_9fa48("7881") ? "" : (stryCov_9fa48("7881"), "CrewZoneAssignmentRequestError");
      this.status = status;
    }
  }
}
const errorSchema = z.object(stryMutAct_9fa48("7882") ? {} : (stryCov_9fa48("7882"), {
  statusCode: z.number(),
  message: z.union(stryMutAct_9fa48("7883") ? [] : (stryCov_9fa48("7883"), [z.string(), z.array(z.string())]))
}));
async function requestJson(path: string, init?: RequestInit) {
  if (stryMutAct_9fa48("7884")) {
    {}
  } else {
    stryCov_9fa48("7884");
    let response: Response;
    try {
      if (stryMutAct_9fa48("7885")) {
        {}
      } else {
        stryCov_9fa48("7885");
        response = await authenticatedFetch(path, init);
      }
    } catch (cause) {
      if (stryMutAct_9fa48("7886")) {
        {}
      } else {
        stryCov_9fa48("7886");
        if (stryMutAct_9fa48("7888") ? false : stryMutAct_9fa48("7887") ? true : (stryCov_9fa48("7887", "7888"), cause instanceof NetworkFailureError)) recordTelemetryEvent(stryMutAct_9fa48("7890") ? {} : (stryCov_9fa48("7890"), {
          name: stryMutAct_9fa48("7891") ? "" : (stryCov_9fa48("7891"), "request_network_failure"),
          resource: stryMutAct_9fa48("7892") ? "" : (stryCov_9fa48("7892"), "crews")
        }));
        throw cause;
      }
    }
    let payload: unknown;
    try {
      if (stryMutAct_9fa48("7893")) {
        {}
      } else {
        stryCov_9fa48("7893");
        payload = await response.json();
      }
    } catch (cause) {
      if (stryMutAct_9fa48("7894")) {
        {}
      } else {
        stryCov_9fa48("7894");
        recordTelemetryEvent(stryMutAct_9fa48("7896") ? {} : (stryCov_9fa48("7896"), {
          name: stryMutAct_9fa48("7897") ? "" : (stryCov_9fa48("7897"), "request_malformed_response"),
          resource: stryMutAct_9fa48("7898") ? "" : (stryCov_9fa48("7898"), "crews")
        }));
        throw new CrewContractError(stryMutAct_9fa48("7900") ? "" : (stryCov_9fa48("7900"), "No se pudo obtener información válida de reubicaciones. Reintente en unos segundos."), stryMutAct_9fa48("7901") ? {} : (stryCov_9fa48("7901"), {
          cause
        }));
      }
    }
    if (stryMutAct_9fa48("7904") ? false : stryMutAct_9fa48("7903") ? true : stryMutAct_9fa48("7902") ? response.ok : (stryCov_9fa48("7902", "7903", "7904"), !response.ok)) {
      if (stryMutAct_9fa48("7905")) {
        {}
      } else {
        stryCov_9fa48("7905");
        const parsed = errorSchema.safeParse(payload);
        if (stryMutAct_9fa48("7908") ? false : stryMutAct_9fa48("7907") ? true : stryMutAct_9fa48("7906") ? parsed.success : (stryCov_9fa48("7906", "7907", "7908"), !parsed.success)) throw new CrewContractError(stryMutAct_9fa48("7910") ? "" : (stryCov_9fa48("7910"), "No se pudo obtener información válida. Reintente en unos segundos."), stryMutAct_9fa48("7911") ? {} : (stryCov_9fa48("7911"), {
          cause: parsed.error
        }));
        throw new CrewZoneAssignmentRequestError(Array.isArray(parsed.data.message) ? parsed.data.message.join(stryMutAct_9fa48("7913") ? "" : (stryCov_9fa48("7913"), " ")) : parsed.data.message, parsed.data.statusCode);
      }
    }
    return payload;
  }
}
export const crewZoneAssignmentsAdapter = stryMutAct_9fa48("7914") ? {} : (stryCov_9fa48("7914"), {
  async list(crewId: string): Promise<CrewZoneAssignment[]> {
    if (stryMutAct_9fa48("7915")) {
      {}
    } else {
      stryCov_9fa48("7915");
      const payload = await requestJson(stryMutAct_9fa48("7916") ? `` : (stryCov_9fa48("7916"), `/api/crews/${encodeURIComponent(crewId)}/zone-assignments`));
      const parsed = z.array(crewZoneAssignmentSchema).safeParse(Array.isArray(payload) ? payload : stryMutAct_9fa48("7917") ? (payload as {
        data?: unknown;
      }).data : (stryCov_9fa48("7917"), (payload as {
        data?: unknown;
      })?.data));
      if (stryMutAct_9fa48("7920") ? false : stryMutAct_9fa48("7919") ? true : stryMutAct_9fa48("7918") ? parsed.success : (stryCov_9fa48("7918", "7919", "7920"), !parsed.success)) {
        if (stryMutAct_9fa48("7921")) {
          {}
        } else {
          stryCov_9fa48("7921");
          recordTelemetryEvent(stryMutAct_9fa48("7923") ? {} : (stryCov_9fa48("7923"), {
            name: stryMutAct_9fa48("7924") ? "" : (stryCov_9fa48("7924"), "request_malformed_response"),
            resource: stryMutAct_9fa48("7925") ? "" : (stryCov_9fa48("7925"), "crews")
          }));
          throw new CrewContractError(stryMutAct_9fa48("7927") ? "" : (stryCov_9fa48("7927"), "No se pudo obtener información válida del historial de reubicaciones. Reintente en unos segundos."), stryMutAct_9fa48("7928") ? {} : (stryCov_9fa48("7928"), {
            cause: parsed.error
          }));
        }
      }
      return parsed.data;
    }
  },
  async create(crewId: string, input: CreateCrewZoneAssignmentInput): Promise<CrewZoneAssignment> {
    if (stryMutAct_9fa48("7929")) {
      {}
    } else {
      stryCov_9fa48("7929");
      const parsedInput = createCrewZoneAssignmentInputSchema.safeParse(input);
      if (stryMutAct_9fa48("7932") ? false : stryMutAct_9fa48("7931") ? true : stryMutAct_9fa48("7930") ? parsedInput.success : (stryCov_9fa48("7930", "7931", "7932"), !parsedInput.success)) throw new CrewContractError(stryMutAct_9fa48("7934") ? "" : (stryCov_9fa48("7934"), "Los datos de la reubicación son inválidos."), stryMutAct_9fa48("7935") ? {} : (stryCov_9fa48("7935"), {
        cause: parsedInput.error
      }));
      const payload = await requestJson(stryMutAct_9fa48("7936") ? `` : (stryCov_9fa48("7936"), `/api/crews/${encodeURIComponent(crewId)}/zone-assignments`), stryMutAct_9fa48("7937") ? {} : (stryCov_9fa48("7937"), {
        method: stryMutAct_9fa48("7938") ? "" : (stryCov_9fa48("7938"), "POST"),
        headers: stryMutAct_9fa48("7939") ? {} : (stryCov_9fa48("7939"), {
          "content-type": stryMutAct_9fa48("7940") ? "" : (stryCov_9fa48("7940"), "application/json")
        }),
        body: JSON.stringify(parsedInput.data)
      }));
      const parsed = crewZoneAssignmentSchema.safeParse(payload);
      if (stryMutAct_9fa48("7943") ? false : stryMutAct_9fa48("7942") ? true : stryMutAct_9fa48("7941") ? parsed.success : (stryCov_9fa48("7941", "7942", "7943"), !parsed.success)) {
        if (stryMutAct_9fa48("7944")) {
          {}
        } else {
          stryCov_9fa48("7944");
          recordTelemetryEvent(stryMutAct_9fa48("7946") ? {} : (stryCov_9fa48("7946"), {
            name: stryMutAct_9fa48("7947") ? "" : (stryCov_9fa48("7947"), "request_malformed_response"),
            resource: stryMutAct_9fa48("7948") ? "" : (stryCov_9fa48("7948"), "crews")
          }));
          throw new CrewContractError(stryMutAct_9fa48("7950") ? "" : (stryCov_9fa48("7950"), "No se pudo obtener información válida de reubicación. Reintente en unos segundos."), stryMutAct_9fa48("7951") ? {} : (stryCov_9fa48("7951"), {
            cause: parsed.error
          }));
        }
      }
      return parsed.data;
    }
  }
});